"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ReplyKind = "info" | "empathy" | "business" | "pressure";
type GameMode = "intro" | "world" | "dialogue" | "tablet" | "tariff" | "office";

type Resident = {
  id: number;
  name: string;
  archetype: string;
  address: string;
  need: string;
  hook: ReplyKind;
  greeting: string;
  x: number;
  z: number;
  color: number;
  interest: number;
  signed: boolean;
  mesh?: THREE.Group;
};

type SaveData = {
  money: number;
  reputation: number;
  contracts: number[];
  interests: Record<number, number>;
};

type InputAction = "forward" | "backward" | "left" | "right" | "sprint" | "brake";

type WorldCollider = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  kind: "house" | "npc" | "landmark";
};

type Walker = {
  mesh: THREE.Group;
  minX: number;
  maxX: number;
  laneZ: number;
  direction: 1 | -1;
  speed: number;
};

const RESIDENT_SEED: Omit<Resident, "interest" | "signed">[] = [
  { id: 1, name: "Семён Петрович", archetype: "Недоверчивый", address: "Садовая, 5", need: "гараж с инструментами", hook: "info", greeting: "Я своими руками сигналку поставлю. Чем ваша лучше?", x: -48, z: 20, color: 0x68809a },
  { id: 2, name: "Мария Ивановна", archetype: "Дружелюбная", address: "Садовая, 8", need: "безопасность семьи", hook: "empathy", greeting: "Охрана — дело хорошее. Но соседи у нас вроде тихие…", x: -24, z: -17, color: 0xd98c72 },
  { id: 3, name: "Алина", archetype: "Занятая", address: "Новая, 12", need: "монтаж за один день", hook: "business", greeting: "У меня две минуты. Только коротко и по делу.", x: 8, z: 19, color: 0xb1719f },
  { id: 4, name: "Дядя Коля", archetype: "Экономный", address: "Лесная, 3", need: "минимальная цена", hook: "empathy", greeting: "Сразу предупреждаю: лишних денег у меня нет.", x: 32, z: -18, color: 0xb48b55 },
  { id: 5, name: "Пётр", archetype: "Осторожный", address: "Речная, 7", need: "защита без ложных тревог", hook: "info", greeting: "А если кот ночью пройдёт? Мне каждый раз просыпаться?", x: 57, z: 19, color: 0x73926e },
  { id: 6, name: "Светлана", archetype: "Состоятельная", address: "Набережная, 2", need: "премиальная система", hook: "business", greeting: "Мне нужна система, которая не испортит фасад.", x: 70, z: -18, color: 0xcc8e69 },
  { id: 7, name: "Василий", archetype: "Скептик", address: "Октябрьская, 14", need: "проверенная статистика", hook: "info", greeting: "Цифры покажите. Рекламу я и по телевизору видел.", x: -70, z: -18, color: 0x6d7e74 },
  { id: 8, name: "Ольга", archetype: "Молодая мама", address: "Школьная, 4", need: "безопасность детей", hook: "empathy", greeting: "После школы дети иногда остаются дома одни.", x: 18, z: 52, color: 0xd8898d },
  { id: 9, name: "Геннадий", archetype: "Вредный", address: "Полевая, 9", need: "спокойствие для питомцев", hook: "pressure", greeting: "Опять продавцы… Кошек моих только не пугайте.", x: -13, z: 54, color: 0x826c63 },
  { id: 10, name: "Андрей", archetype: "Практичный", address: "Советская, 21", need: "защита автомобиля", hook: "business", greeting: "Машина во дворе. Камера номера ночью увидит?", x: 47, z: 53, color: 0x5e8294 },
];

const TARIFFS = [
  { name: "Эконом", price: 490, bonus: 490, note: "Датчик двери и тревожная кнопка" },
  { name: "Стандарт", price: 890, bonus: 890, note: "Периметр, дым и выезд ГБР", recommended: true },
  { name: "Премиум", price: 1490, bonus: 1490, note: "Камеры, приложение и приоритетный выезд" },
];

const REPLIES: { kind: ReplyKind; label: string }[] = [
  { kind: "info", label: "В соседнем районе число краж выросло. Покажу реальные цифры." },
  { kind: "empathy", label: "Понимаю вас. Дом — это прежде всего спокойствие семьи." },
  { kind: "business", label: "Монтаж за день, приложение и выезд группы — без лишних хлопот." },
  { kind: "pressure", label: "Откладывать опасно: следующая тревога может быть уже этой ночью." },
];

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mapPos = (value: number, extent: number) => `${50 + (value / extent) * 44}%`;

function readSave(): SaveData {
  if (typeof window === "undefined") {
    return { money: 5000, reputation: 0, contracts: [], interests: {} };
  }
  try {
    const raw = localStorage.getItem("security-console-save-v1");
    if (raw) return JSON.parse(raw) as SaveData;
  } catch {
    // A clean start is safer than a broken save.
  }
  return { money: 5000, reputation: 0, contracts: [], interests: {} };
}

function mat(color: number, roughness = 0.86) {
  return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
}

function box(
  scene: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  color: number,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color));
  mesh.position.set(...pos);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeTree(scene: THREE.Object3D, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35 * scale, 0.48 * scale, 2.8 * scale, 6),
    mat(0x74583e),
  );
  trunk.position.y = 1.4 * scale;
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.0 * scale, 0),
    mat(0x668e58),
  );
  crown.position.y = 4.1 * scale;
  crown.scale.set(1, 1.25, 1);
  group.add(trunk, crown);
  group.position.set(x, 0, z);
  group.rotation.y = (x * z) % 2;
  scene.add(group);
}

function makeHouse(
  scene: THREE.Object3D,
  x: number,
  z: number,
  bodyColor: number,
  signed: boolean,
) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 8.2, 9), mat(bodyColor));
  body.position.y = 4.1;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.9, 4.2, 4), mat(signed ? 0x6f9861 : 0xb2614f));
  roof.position.y = 10.1;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.3, 0.2), mat(0x76513c));
  door.position.set(0, 1.7, 4.58);
  const windowMat = mat(signed ? 0xcce86b : 0x9ccddd);
  const window1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.22), windowMat);
  window1.position.set(-2.8, 4.3, 4.6);
  const window2 = window1.clone();
  window2.position.x = 2.8;
  group.add(body, roof, door, window1, window2);
  group.position.set(x, 0, z);
  group.rotation.y = z > 0 ? Math.PI : 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(group);
  return group;
}

function makePerson(color: number) {
  const group = new THREE.Group();
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.31, 1.75, 6), mat(0x385064));
  leftLeg.position.set(-0.33, 0.9, 0);
  leftLeg.name = "leftLeg";
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.33;
  rightLeg.name = "rightLeg";
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.92, 2.0, 7), mat(color));
  body.position.y = 2.65;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.67, 1), mat(0xe2b883));
  head.position.y = 4.15;
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 1.55, 6), mat(0xe2b883));
  leftArm.position.set(-0.95, 2.7, 0);
  leftArm.name = "leftArm";
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.95;
  rightArm.name = "rightArm";
  group.add(leftLeg, rightLeg, body, head, leftArm, rightArm);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

function makeHero() {
  const hero = new THREE.Group();
  hero.name = "Алексей";

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.65, 0.62), mat(0x26394d));
  leftLeg.position.set(-0.34, 1.05, 0);
  leftLeg.name = "leftLeg";
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.34;
  rightLeg.name = "rightLeg";

  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.95), mat(0xf0eee7));
  leftShoe.position.set(-0.34, 0.2, 0.13);
  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.34;

  const polo = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.88, 1.75, 7), mat(0x315c45));
  polo.position.y = 2.68;
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.62, 0.28), mat(0x425b61));
  jacket.position.set(0, 2.72, -0.5);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.65, 6), mat(0xe2b883));
  leftArm.position.set(-1.0, 2.7, 0);
  leftArm.rotation.z = -0.08;
  leftArm.name = "leftArm";
  const rightArm = leftArm.clone();
  rightArm.position.x = 1.0;
  rightArm.rotation.z = 0.08;
  rightArm.name = "rightArm";

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.4, 7), mat(0xe2b883));
  neck.position.y = 3.72;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1), mat(0xe2b883));
  head.position.y = 4.42;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x49362e));
  hair.position.y = 4.66;
  hair.scale.set(1.02, 0.48, 1.02);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 5), mat(0xd5a879));
  nose.position.set(0, 4.38, 0.69);
  nose.rotation.x = Math.PI / 2;

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.02, 0.12), mat(0x26302d));
  tablet.position.set(0.82, 2.1, -0.5);
  tablet.rotation.z = -0.18;

  hero.add(leftLeg, rightLeg, leftShoe, rightShoe, polo, jacket, leftArm, rightArm, neck, head, hair, nose, tablet);
  hero.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return hero;
}

function animateHero(hero: THREE.Group, moving: boolean, now: number, sprinting: boolean) {
  const stride = moving ? Math.sin(now * (sprinting ? 0.018 : 0.012)) * (sprinting ? 0.72 : 0.46) : 0;
  const leftLeg = hero.getObjectByName("leftLeg");
  const rightLeg = hero.getObjectByName("rightLeg");
  const leftArm = hero.getObjectByName("leftArm");
  const rightArm = hero.getObjectByName("rightArm");
  if (leftLeg) leftLeg.rotation.x = stride;
  if (rightLeg) rightLeg.rotation.x = -stride;
  if (leftArm) leftArm.rotation.x = -stride * 0.72;
  if (rightArm) rightArm.rotation.x = stride * 0.72;
}

function actionForCode(code: string): InputAction | null {
  if (code === "KeyW") return "forward";
  if (code === "KeyS") return "backward";
  if (code === "KeyA") return "left";
  if (code === "KeyD") return "right";
  if (code === "ShiftLeft" || code === "ShiftRight") return "sprint";
  if (code === "Space") return "brake";
  return null;
}

function personWalkCycle(person: THREE.Group, moving: boolean, now: number, phase = 0) {
  const stride = moving ? Math.sin(now * 0.008 + phase) * 0.55 : Math.sin(now * 0.0015 + phase) * 0.04;
  const leftLeg = person.getObjectByName("leftLeg");
  const rightLeg = person.getObjectByName("rightLeg");
  const leftArm = person.getObjectByName("leftArm");
  const rightArm = person.getObjectByName("rightArm");
  if (leftLeg) leftLeg.rotation.x = stride;
  if (rightLeg) rightLeg.rotation.x = -stride;
  if (leftArm) leftArm.rotation.x = -stride * 0.7;
  if (rightArm) rightArm.rotation.x = stride * 0.7;
}

function touchesBox(x: number, z: number, radius: number, collider: WorldCollider) {
  const nearestX = clamp(x, collider.x - collider.halfX, collider.x + collider.halfX);
  const nearestZ = clamp(z, collider.z - collider.halfZ, collider.z + collider.halfZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function makeCar() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 6.2), mat(0xc85f4c));
  body.position.y = 1.05;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.15, 3.1), mat(0x9bc1c7));
  cabin.position.set(0, 1.95, -0.25);
  cabin.geometry.rotateX(-0.05);
  group.add(body, cabin);
  for (const x of [-1.58, 1.58]) {
    for (const z of [-2.0, 2.0]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.42, 10),
        mat(0x26302d),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.64, z);
      group.add(wheel);
    }
  }
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
}

export default function SecurityConsoleGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    player?: THREE.Group;
    car?: THREE.Group;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    keys: Set<string>;
    driving: boolean;
    carSpeed: number;
    residents: Resident[];
    colliders: WorldCollider[];
    walkers: Walker[];
    nearest: Resident | null;
    time: number;
    yaw: number;
    pitch: number;
    zoom: number;
  }>({
    keys: new Set(),
    driving: false,
    carSpeed: 0,
    residents: [],
    colliders: [],
    walkers: [],
    nearest: null,
    time: 8.25,
    yaw: Math.PI,
    pitch: 0.52,
    zoom: 14,
  });

  const [mode, setMode] = useState<GameMode>("intro");
  const modeRef = useRef<GameMode>("intro");
  const [energy, setEnergy] = useState(100);
  const energyRef = useRef(100);
  const [money, setMoney] = useState(5000);
  const [reputation, setReputation] = useState(0);
  const [gameTime, setGameTime] = useState(8.25);
  const [driving, setDriving] = useState(false);
  const [nearest, setNearest] = useState<Resident | null>(null);
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const residentsRef = useRef<Resident[]>([]);
  const [npcLine, setNpcLine] = useState("");
  const [toast, setToast] = useState("");
  const [showTariff, setShowTariff] = useState(false);
  const [tabletTab, setTabletTab] = useState<"hero" | "clients" | "finance" | "map">("hero");
  const [playerPos, setPlayerPos] = useState({ x: -4, z: -2 });
  const [locationName, setLocationName] = useState<"Первореченское" | "станица Динская">("Первореченское");
  const [distanceToDinskaya, setDistanceToDinskaya] = useState(4);
  const [weather, setWeather] = useState<"Ясно" | "Облачно" | "Дождь">("Ясно");
  const [alarm, setAlarm] = useState<null | { type: string; address: string; correct: string }>(null);
  const [alarmResult, setAlarmResult] = useState("Система в норме. Ожидаем сигнал.");

  const signedCount = residents.filter((r) => r.signed).length;
  const monthlyIncome = residents.filter((r) => r.signed).length * 890;
  const activeNpc = residents.find((r) => r.id === activeNpcId) ?? null;

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const persist = useCallback(
    (nextResidents = residentsRef.current, nextMoney = money, nextRep = reputation) => {
      const save: SaveData = {
        money: nextMoney,
        reputation: nextRep,
        contracts: nextResidents.filter((r) => r.signed).map((r) => r.id),
        interests: Object.fromEntries(nextResidents.map((r) => [r.id, r.interest])),
      };
      localStorage.setItem("security-console-save-v1", JSON.stringify(save));
    },
    [money, reputation],
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    const save = readSave();
    setMoney(save.money);
    setReputation(save.reputation);
    const initial = RESIDENT_SEED.map((r) => ({
      ...r,
      interest: save.interests[r.id] ?? 38 + ((r.id * 7) % 13),
      signed: save.contracts.includes(r.id),
    }));
    residentsRef.current = initial;
    setResidents(initial);
  }, []);

  useEffect(() => {
    if (!mountRef.current || residentsRef.current.length === 0) return;
    const mount = mountRef.current;
    const engine = engineRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x91bfc1);
    scene.fog = new THREE.Fog(0x91bfc1, 170, 900);
    engine.scene = scene;

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 6000);
    engine.camera = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "game-canvas";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);
    engine.renderer = renderer;

    const hemi = new THREE.HemisphereLight(0xc9e5e1, 0x536b48, 2.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2b0, 3.0);
    sun.position.set(-45, 70, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    scene.add(sun);

    engine.colliders = [];
    engine.walkers = [];

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4400, 420), mat(0x8fb277));
    ground.rotation.x = -Math.PI / 2;
    ground.position.x = 1950;
    ground.receiveShadow = true;
    scene.add(ground);

    // Four-kilometre route and straight centre markings.
    box(scene, [4300, 0.18, 14], [1950, 0.1, 0], 0xa9a49a);
    for (let x = -145; x <= 4145; x += 14) {
      box(scene, [6, 0.03, 0.28], [x, 0.23, 0], 0xe9e5da);
    }
    for (const centreX of [0, 4000]) {
      box(scene, [13, 0.19, 350], [centreX + 18, 0.12, 15], 0xb7ad98);
      box(scene, [260, 0.19, 10], [centreX, 0.13, 72], 0xb7ad98);
      box(scene, [220, 0.19, 9], [centreX, 0.13, -72], 0xc2ae8a);
    }

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x5fabb8,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-175, 0.18, 184),
      new THREE.Vector3(-105, 0.18, 172),
      new THREE.Vector3(-35, 0.18, 188),
      new THREE.Vector3(38, 0.18, 176),
      new THREE.Vector3(108, 0.18, 190),
      new THREE.Vector3(175, 0.18, 181),
    ]);
    const river = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 6.5, 8, false), riverMat);
    scene.add(river);

    // Trees stay on dry land; none are generated inside the river corridor.
    for (let i = 0; i < 96; i++) {
      const villageX = i < 48 ? 0 : 4000;
      const localX = -165 + ((i * 37) % 330);
      const z = -168 - ((i * 13) % 20);
      makeTree(scene, villageX + localX, z, 0.72 + ((i * 9) % 7) / 14);
    }
    for (let x = 260; x < 3740; x += 120) {
      makeTree(scene, x, -27, 0.72);
      makeTree(scene, x + 48, 29, 0.8);
    }

    const houses: [number, number][] = residentsRef.current.map((r) => [r.x, r.z]);
    houses.forEach(([x, z], i) => {
      const colors = [0xe1b47d, 0xd89073, 0xd6c98a, 0x8eaf9a, 0xc7a3a3];
      makeHouse(scene, x, z, colors[i % colors.length], residentsRef.current[i].signed);
      engine.colliders.push({ x, z, halfX: 5.4, halfZ: 4.9, kind: "house" });
      box(scene, [13, 0.42, 0.28], [x, 0.5, z + (z > 0 ? -6.4 : 6.4)], 0x806f55);
    });

    const houseColors = [0xe1b47d, 0xd89073, 0xd6c98a, 0x8eaf9a, 0xc7a3a3, 0x9bb8c2];
    const addNeighbourhood = (centreX: number, count: number, startIndex: number) => {
      const candidates: [number, number][] = [];
      const columns = [-145, -116, -87, -58, -29, 0, 29, 58, 87, 116, 145];
      const rows = [-150, -116, -84, -42, 42, 84, 116, 150];
      for (const z of rows) {
        for (const localX of columns) candidates.push([centreX + localX, z]);
      }
      let added = 0;
      for (const [x, z] of candidates) {
        if (added >= count) break;
        const overlapsLead = houses.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 15);
        if (centreX === 0 && overlapsLead) continue;
        makeHouse(scene, x, z, houseColors[(startIndex + added) % houseColors.length], false);
        engine.colliders.push({ x, z, halfX: 5.4, halfZ: 4.9, kind: "house" });
        added += 1;
      }
    };
    addNeighbourhood(0, 40, 10);
    addNeighbourhood(4000, 50, 50);

    // Центр посёлка: магазин, школа, остановка и детская площадка.
    box(scene, [15, 5.4, 10], [3, 2.7, -22], 0xe0b56f);
    box(scene, [16.5, 0.65, 11.5], [3, 5.72, -22], 0xa95849);
    box(scene, [9.5, 0.45, 1.8], [3, 4.35, -16.85], 0xcce86b);
    box(scene, [2.1, 2.9, 0.25], [3, 1.55, -16.82], 0x6e4c35);
    box(scene, [2.6, 1.75, 0.25], [-1.2, 3.0, -16.8], 0x9ed4dc);
    box(scene, [2.6, 1.75, 0.25], [7.2, 3.0, -16.8], 0x9ed4dc);

    box(scene, [23, 6.5, 12], [-72, 3.25, 34], 0xd8cf9b);
    box(scene, [24.5, 1.3, 13.5], [-72, 7.0, 34], 0x557d68);
    for (const x of [-79, -74.5, -69.5, -65]) {
      box(scene, [2.5, 1.9, 0.25], [x, 3.3, 27.9], 0x9ed4dc);
    }

    box(scene, [7.5, 0.32, 3.2], [-20, 0.18, 30], 0xd2c39e);
    box(scene, [0.32, 3.4, 0.32], [-23, 1.7, 30], 0x49685a);
    box(scene, [0.32, 3.4, 0.32], [-17, 1.7, 30], 0x49685a);
    box(scene, [6.4, 0.3, 0.3], [-20, 3.3, 30], 0x49685a);
    box(scene, [2.8, 0.25, 1.15], [-20, 1.05, 29], 0xe38b58, 0.12);

    for (let x = -88; x <= 88; x += 22) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.6, 6), mat(0x374943));
      pole.position.y = 2.3;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), mat(0xffd88a));
      glow.position.y = 4.7;
      lamp.add(pole, glow);
      lamp.position.set(x, 0, 7.6 - x * 0.035);
      scene.add(lamp);
    }

    box(scene, [18, 7, 13], [92, 3.5, -18], 0x446f59);
    box(scene, [8, 1.1, 0.4], [92, 6.2, -11.3], 0xcce86b);
    const officeSign = document.createElement("canvas");
    officeSign.width = 256;
    officeSign.height = 64;
    const ctx = officeSign.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#cce86b";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "#254434";
      ctx.font = "bold 29px Arial";
      ctx.textAlign = "center";
      ctx.fillText("ПУЛЬТ ОХРАНЫ", 128, 42);
    }
    const signTexture = new THREE.CanvasTexture(officeSign);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.7, 1.9),
      new THREE.MeshBasicMaterial({ map: signTexture }),
    );
    sign.position.set(92, 6.2, -11.08);
    scene.add(sign);
    engine.colliders.push(
      { x: 3, z: -22, halfX: 8, halfZ: 5.5, kind: "landmark" },
      { x: -72, z: 34, halfX: 12, halfZ: 6.5, kind: "landmark" },
      { x: 92, z: -18, halfX: 9.5, halfZ: 7, kind: "landmark" },
    );

    // The second settlement has its own recognisable centre.
    box(scene, [18, 6.4, 12], [4000, 3.2, -24], 0xd9b36f);
    box(scene, [19.5, 1.0, 13.5], [4000, 6.85, -24], 0x76564b);
    box(scene, [2.2, 3.2, 0.3], [4000, 1.65, -17.85], 0x6e4c35);
    box(scene, [24, 7.2, 13], [3928, 3.6, 42], 0xd4ca98);
    box(scene, [25.5, 1.2, 14.5], [3928, 7.35, 42], 0x557d68);
    engine.colliders.push(
      { x: 4000, z: -24, halfX: 9.5, halfZ: 6.5, kind: "landmark" },
      { x: 3928, z: 42, halfX: 12.5, halfZ: 7, kind: "landmark" },
    );

    const makeRoadSign = (text: string, x: number, z: number, faceWest = false) => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 128;
      const signCtx = canvas.getContext("2d");
      if (signCtx) {
        signCtx.fillStyle = "#f4efe0";
        signCtx.fillRect(0, 0, canvas.width, canvas.height);
        signCtx.strokeStyle = "#263f37";
        signCtx.lineWidth = 14;
        signCtx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
        signCtx.fillStyle = "#263f37";
        signCtx.font = "bold 50px Arial";
        signCtx.textAlign = "center";
        signCtx.fillText(text, canvas.width / 2, 82);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 2),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      );
      board.position.set(x, 4.2, z);
      board.rotation.y = faceWest ? -Math.PI / 2 : Math.PI / 2;
      scene.add(board);
      box(scene, [0.22, 4, 0.22], [x, 2, z - 3.5], 0x33423d);
      box(scene, [0.22, 4, 0.22], [x, 2, z + 3.5], 0x33423d);
    };
    makeRoadSign("ДИНСКАЯ 4 КМ", 205, -12);
    makeRoadSign("ПЕРВОРЕЧЕНСКОЕ 4 КМ", 3795, -12, true);

    const player = makeHero();
    player.position.set(-4, 0, -3);
    scene.add(player);
    engine.player = player;

    const car = makeCar();
    car.position.set(-13, 0, -5.5);
    car.rotation.y = Math.PI / 2;
    scene.add(car);
    engine.car = car;

    residentsRef.current.forEach((resident) => {
      const npc = makePerson(resident.color);
      npc.position.set(resident.x + 5, 0, resident.z + (resident.z > 0 ? -5 : 5));
      if (resident.signed) npc.scale.setScalar(0.92);
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        mat(resident.signed ? 0xcce86b : 0xf28c55),
      );
      marker.name = "marker";
      marker.position.y = 5.7;
      npc.add(marker);
      resident.mesh = npc;
      scene.add(npc);
    });
    engine.residents = residentsRef.current;

    const walkerColors = [0x6e8fa0, 0xc78678, 0x738c67, 0xa0789a, 0xb99561, 0x667b96];
    for (const villageX of [0, 4000]) {
      for (let i = 0; i < 12; i++) {
        const walker = makePerson(walkerColors[i % walkerColors.length]);
        const laneZ = i % 2 === 0 ? -10.5 : 10.5;
        const minX = villageX - 150;
        const maxX = villageX + 150;
        const direction = (i % 3 === 0 ? -1 : 1) as 1 | -1;
        walker.position.set(minX + ((i * 29) % 280), 0, laneZ);
        walker.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(walker);
        engine.walkers.push({
          mesh: walker,
          minX,
          maxX,
          laneZ,
          direction,
          speed: 0.75 + (i % 4) * 0.14,
        });
      }
    }

    let last = performance.now();
    let uiTick = 0;
    let mouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const action = actionForCode(e.code);
      if (action) engine.keys.add(action);
      if (e.code === "Tab" || e.code === "Space") e.preventDefault();

      if (e.code === "Tab" && modeRef.current === "world") {
        engine.keys.clear();
        setMode("tablet");
        return;
      }
      if ((e.code === "Tab" || e.code === "Escape") && modeRef.current === "tablet") {
        engine.keys.clear();
        setMode("world");
        return;
      }
      if (e.code === "Escape" && modeRef.current === "dialogue") {
        engine.keys.clear();
        setMode("world");
        setActiveNpcId(null);
        return;
      }
      if (e.code === "KeyE" && modeRef.current === "world" && !e.repeat) {
        const focus = engine.driving ? engine.car : engine.player;
        if (!focus) return;
        if (!engine.driving && engine.car && focus.position.distanceTo(engine.car.position) < 5.2) {
          engine.driving = true;
          player.visible = false;
          setDriving(true);
          flash("Вы сели в старый седан");
          return;
        }
        if (engine.driving && Math.abs(engine.carSpeed) < 1.2) {
          engine.driving = false;
          player.visible = true;
          player.position.copy(car.position).add(new THREE.Vector3(3, 0, 0));
          setDriving(false);
          flash("Вы вышли из машины");
          return;
        }
        if (engine.nearest && !engine.nearest.signed) {
          setActiveNpcId(engine.nearest.id);
          setNpcLine(engine.nearest.greeting);
          setMode("dialogue");
        }
      }
      if (modeRef.current === "dialogue" && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
        const index = Number(e.code.slice(-1)) - 1;
        const button = document.querySelector<HTMLButtonElement>(`[data-choice="${index}"]`);
        button?.click();
      }
      if (e.code === "KeyH" && engine.driving && !e.repeat) {
        try {
          const audio = new AudioContext();
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = "square";
          oscillator.frequency.value = 210;
          gain.gain.value = 0.05;
          oscillator.connect(gain).connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.18);
        } catch {
          // Sound is optional.
        }
      }
    };

    const clearInput = () => engine.keys.clear();
    const onKeyUp = (e: KeyboardEvent) => {
      const action = actionForCode(e.code);
      if (action) engine.keys.delete(action);
    };
    const onVisibilityChange = () => {
      if (document.hidden) clearInput();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        mouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return;
      engine.yaw -= (e.clientX - lastMouseX) * 0.006;
      engine.pitch = clamp(engine.pitch + (e.clientY - lastMouseY) * 0.004, 0.18, 1.02);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onMouseUp = () => (mouseDown = false);
    const onWheel = (e: WheelEvent) => {
      engine.zoom = clamp(engine.zoom + e.deltaY * 0.01, 8, engine.driving ? 24 : 19);
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    const isBlocked = (x: number, z: number, radius: number, includeCar: boolean) => {
      if (engine.colliders.some((collider) => touchesBox(x, z, radius, collider))) return true;
      for (const resident of engine.residents) {
        if (resident.mesh && Math.hypot(x - resident.mesh.position.x, z - resident.mesh.position.z) < radius + 0.78) {
          return true;
        }
      }
      for (const walker of engine.walkers) {
        if (Math.hypot(x - walker.mesh.position.x, z - walker.mesh.position.z) < radius + 0.72) {
          return true;
        }
      }
      if (includeCar && Math.hypot(x - car.position.x, z - car.position.z) < radius + 2.25) return true;
      return false;
    };

    let animation = 0;
    const animate = (now: number) => {
      animation = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const canMove = modeRef.current === "world";
      const focus = engine.driving ? car : player;

      if (canMove && engine.driving) {
        const throttle = (engine.keys.has("forward") ? 1 : 0) - (engine.keys.has("backward") ? 1 : 0);
        const steer = (engine.keys.has("left") ? 1 : 0) - (engine.keys.has("right") ? 1 : 0);
        engine.carSpeed += throttle * 18 * dt;
        engine.carSpeed *= engine.keys.has("brake") ? Math.pow(0.25, dt * 6) : Math.pow(0.55, dt);
        engine.carSpeed = clamp(engine.carSpeed, -9, 26);
        if (Math.abs(engine.carSpeed) > 0.35) {
          car.rotation.y += steer * dt * 1.45 * Math.sign(engine.carSpeed) * clamp(Math.abs(engine.carSpeed) / 8, 0.4, 1);
        }
        const carDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
        const candidateX = car.position.x + carDirection.x * engine.carSpeed * dt;
        const candidateZ = car.position.z + carDirection.z * engine.carSpeed * dt;
        if (!isBlocked(candidateX, candidateZ, 2.25, false)) {
          car.position.x = clamp(candidateX, -180, 4180);
          car.position.z = clamp(candidateZ, -195, 195);
        } else {
          engine.carSpeed *= -0.16;
        }
        engine.yaw = THREE.MathUtils.lerp(engine.yaw, car.rotation.y + Math.PI, dt * 1.2);
      } else if (canMove) {
        const forward = (engine.keys.has("forward") ? 1 : 0) - (engine.keys.has("backward") ? 1 : 0);
        const side = (engine.keys.has("right") ? 1 : 0) - (engine.keys.has("left") ? 1 : 0);
        const moving = Math.abs(forward) + Math.abs(side) > 0;
        const sprinting = moving && engine.keys.has("sprint") && energyRef.current > 0.5;
        const speed = sprinting ? 5 : energyRef.current <= 0 ? 1.25 : 2;
        if (moving) {
          const angle = engine.yaw;
          const length = Math.max(1, Math.hypot(forward, side));
          const dx = ((-Math.sin(angle) * forward + Math.cos(angle) * side) / length) * speed * dt;
          const dz = ((-Math.cos(angle) * forward - Math.sin(angle) * side) / length) * speed * dt;
          const nextX = clamp(player.position.x + dx, -180, 4180);
          const nextZ = clamp(player.position.z + dz, -195, 195);
          if (!isBlocked(nextX, player.position.z, 0.62, true)) player.position.x = nextX;
          if (!isBlocked(player.position.x, nextZ, 0.62, true)) player.position.z = nextZ;
          player.rotation.y = Math.atan2(dx, dz);
          player.position.y = Math.abs(Math.sin(now * 0.012)) * 0.08;
          if (sprinting) {
            const nextEnergy = clamp(energyRef.current - dt * 2.9, 0, 100);
            energyRef.current = nextEnergy;
          } else {
            energyRef.current = clamp(energyRef.current + dt * 0.22, 0, 100);
          }
          animateHero(player, true, now, sprinting);
        } else {
          player.position.y = THREE.MathUtils.lerp(player.position.y, 0, dt * 10);
          energyRef.current = clamp(energyRef.current + dt * 0.45, 0, 100);
          animateHero(player, false, now, false);
        }
      }

      // 06:00–21:00 lasts two real hours; the nine-hour night lasts 15 minutes.
      const isDay = engine.time >= 6 && engine.time < 21;
      engine.time += dt * (isDay ? 15 / 7200 : 9 / 900);
      if (engine.time >= 24) engine.time -= 24;
      const dayFactor = clamp(Math.sin(((engine.time - 5.5) / 24) * Math.PI * 2) * 0.65 + 0.45, 0.08, 1);
      sun.intensity = 0.35 + dayFactor * 2.7;
      hemi.intensity = 0.35 + dayFactor * 1.8;
      const dayColor = new THREE.Color(0x91bfc1);
      const nightColor = new THREE.Color(0x182940);
      const sky = nightColor.clone().lerp(dayColor, dayFactor);
      scene.background = sky;
      if (scene.fog) scene.fog.color.copy(sky);

      engine.residents.forEach((resident, i) => {
        if (!resident.mesh) return;
        resident.mesh.rotation.y = Math.sin(now * 0.0004 + i) * 0.35;
        personWalkCycle(resident.mesh, false, now, i);
        const marker = resident.mesh.getObjectByName("marker");
        if (marker) marker.position.y = 5.7 + Math.sin(now * 0.003 + i) * 0.18;
      });
      engine.walkers.forEach((walker, i) => {
        const nextX = walker.mesh.position.x + walker.direction * walker.speed * dt;
        if (nextX <= walker.minX || nextX >= walker.maxX) {
          walker.direction = walker.direction === 1 ? -1 : 1;
        } else {
          walker.mesh.position.x = nextX;
        }
        walker.mesh.position.z = walker.laneZ;
        walker.mesh.rotation.y = walker.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        personWalkCycle(walker.mesh, true, now, i * 0.7);
      });

      if (canMove && !engine.driving) {
        let closest: Resident | null = null;
        let closestDistance = 5.2;
        for (const resident of engine.residents) {
          if (!resident.mesh || resident.signed) continue;
          const distance = resident.mesh.position.distanceTo(player.position);
          if (distance < closestDistance) {
            closest = resident;
            closestDistance = distance;
          }
        }
        engine.nearest = closest;
      } else {
        engine.nearest = null;
      }

      const target = focus.position.clone();
      target.y += engine.driving ? 2.2 : 3.0;
      const distance = engine.zoom + (engine.driving ? 4 : 0);
      const cameraOffset = new THREE.Vector3(
        Math.sin(engine.yaw) * Math.cos(engine.pitch) * distance,
        Math.sin(engine.pitch) * distance + 2,
        Math.cos(engine.yaw) * Math.cos(engine.pitch) * distance,
      );
      camera.position.lerp(target.clone().add(cameraOffset), 1 - Math.pow(0.0008, dt));
      camera.lookAt(target);

      uiTick += dt;
      if (uiTick > 0.12) {
        uiTick = 0;
        setEnergy(Math.round(energyRef.current));
        setGameTime(engine.time);
        setNearest(engine.nearest);
        setPlayerPos({ x: focus.position.x, z: focus.position.z });
        const inDinskaya = focus.position.x > 2000;
        setLocationName(inDinskaya ? "станица Динская" : "Первореченское");
        setDistanceToDinskaya(Math.max(0, Math.round(Math.abs(4000 - focus.position.x) / 100) / 10));
      }
      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [flash, residents.length]);

  const handleReply = (kind: ReplyKind) => {
    if (!activeNpc) return;
    const current = residentsRef.current.find((r) => r.id === activeNpc.id);
    if (!current) return;
    let change = kind === current.hook ? 27 : kind === "pressure" ? -11 : 9;
    if (current.archetype === "Вредный" && kind === "pressure") change = 26;
    current.interest = clamp(current.interest + change, 0, 100);
    setResidents([...residentsRef.current]);
    if (change > 20) {
      setNpcLine(`Вот это уже ближе к делу. ${current.need[0].toUpperCase() + current.need.slice(1)} — именно то, что меня волнует.`);
      flash(`Точный подход: +${change}% интереса`);
    } else if (change < 0) {
      setNpcLine("Вот запугивать меня не надо. Давайте без этого.");
      flash(`${change}% интереса — реплика не подошла`);
    } else {
      setNpcLine("Звучит разумно. Расскажите чуть подробнее.");
      flash(`+${change}% интереса`);
    }
    persist(residentsRef.current);
  };

  const signContract = (tariffIndex: number) => {
    if (!activeNpc) return;
    const resident = residentsRef.current.find((r) => r.id === activeNpc.id);
    if (!resident) return;
    resident.signed = true;
    const price = TARIFFS[tariffIndex].bonus;
    const nextMoney = money + 250;
    const nextRep = reputation + 8;
    setMoney(nextMoney);
    setReputation(nextRep);
    setResidents([...residentsRef.current]);
    setShowTariff(false);
    setMode("world");
    setActiveNpcId(null);
    if (resident.mesh) {
      const marker = resident.mesh.getObjectByName("marker") as THREE.Mesh | undefined;
      if (marker) marker.material = mat(0xcce86b);
    }
    persist(residentsRef.current, nextMoney, nextRep);
    flash(`Договор «${TARIFFS[tariffIndex].name}» подписан · +250 ₽ · +8 репутации`);
    if (residentsRef.current.filter((r) => r.signed).length === 10) {
      window.setTimeout(() => flash("Все 10 объектов подключены — пульт охраны открыт!"), 2600);
    }
    void price;
  };

  const startOffice = (demo = false) => {
    if (!demo && signedCount < 10) {
      flash(`До открытия пульта нужно ещё ${10 - signedCount} договоров`);
      return;
    }
    setMode("office");
    setAlarmResult(demo ? "Учебная смена запущена. Сигнал поступит через секунду." : "Смена началась. Все объекты на связи.");
    setAlarm(null);
    window.setTimeout(() => {
      setAlarm({ type: "Датчик движения", address: "Садовая, 5 · гараж", correct: "call" });
    }, 1100);
  };

  const handleAlarm = (action: string) => {
    if (!alarm) return;
    if (action === alarm.correct) {
      const nextMoney = money + 450;
      const nextRep = reputation + 5;
      setMoney(nextMoney);
      setReputation(nextRep);
      setAlarmResult("Клиент подтвердил: во дворе рабочие. Ложная тревога снята · +450 ₽");
      flash("Правильное решение · репутация +5");
      persist(residentsRef.current, nextMoney, nextRep);
    } else {
      setMoney((v) => Math.max(0, v - 300));
      setAlarmResult("Лишний выезд. Штраф за ложное реагирование · −300 ₽");
      flash("Решение оказалось слишком дорогим");
    }
    setAlarm(null);
    window.setTimeout(() => {
      setAlarm({ type: "Пожарный датчик", address: "Новая, 12 · кухня", correct: "fire" });
    }, 5200);
  };

  const resetSave = () => {
    localStorage.removeItem("security-console-save-v1");
    window.location.reload();
  };

  const timeLabel = useMemo(() => {
    const hour = Math.floor(gameTime);
    const minute = Math.floor((gameTime - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }, [gameTime]);
  const mapCenterX = locationName === "станица Динская" ? 4000 : 0;

  return (
    <main className="game-shell" aria-label="Игра Пульт охраны">
      <div className="world-viewport" ref={mountRef} aria-label="Трёхмерный посёлок" />

      {mode !== "intro" && mode !== "office" && (
        <div className="hud" aria-hidden={mode !== "world"}>
          <div className="brand">
            <div className="brand-mark">⌂</div>
            <div><strong>Пульт охраны</strong><small>{locationName}</small></div>
          </div>
          <div className="hero-card">
            <div className="hero-avatar">А</div>
            <div><strong>Алексей</strong><small>Основатель · уровень 1</small></div>
            <span>Наблюдательность 1/5</span>
          </div>
          <div className="top-status">
            <div className="glass-chip"><span>Пн · {weather}</span><b>{timeLabel}</b></div>
            <div className="glass-chip"><span>Репутация</span><b>★ {reputation}</b></div>
            <div className="glass-chip"><span>Баланс</span><b>{money.toLocaleString("ru-RU")} ₽</b></div>
            <div className="glass-chip"><span>Договоры</span><b>{signedCount} / 10</b></div>
          </div>
          <div className="energy-card">
            <div className="energy-label"><span>Энергия менеджера</span><b>{energy}%</b></div>
            <div className="energy-track"><div className="energy-fill" style={{ width: `${energy}%` }} /></div>
          </div>
          <div className="controls-hint">
            <kbd>WASD</kbd> двигаться <kbd>Shift</kbd> бег <kbd>ПКМ</kbd> камера <kbd>Tab</kbd> планшет
          </div>
          <div className="route-card">
            <b>{locationName}</b>
            <span>{locationName === "Первореченское" ? `До станицы Динской: ${distanceToDinskaya.toFixed(1)} км` : "Маршрут Первореченское — 4 км"}</span>
          </div>
          <div className="minimap" aria-label="Миникарта">
            <span className="compass-n">С</span>
            {locationName === "Первореченское" && <div className="map-river" />}
            <div className="map-road" />
            <div className="map-road vertical" />
            {locationName === "Первореченское" && residents.map((r) => (
              <span key={`h-${r.id}`} className={`map-home ${r.signed ? "signed" : ""}`} style={{ left: mapPos(r.x, 120), top: mapPos(r.z, 90) }} />
            ))}
            {locationName === "Первореченское" && residents.filter((r) => !r.signed).map((r) => (
              <span key={`n-${r.id}`} className="map-npc" style={{ left: mapPos(r.x + 5, 120), top: mapPos(r.z + (r.z > 0 ? -5 : 5), 90) }} />
            ))}
            <span className="map-player" style={{ left: mapPos(playerPos.x - mapCenterX, 180), top: mapPos(playerPos.z, 190) }} />
          </div>
          {mode === "world" && (nearest || (driving && Math.abs(engineRef.current.carSpeed) < 1.2)) && (
            <div className="interaction-prompt">
              <span className="key">E</span>
              <span>{driving ? "Выйти из машины" : `Поговорить · ${nearest?.name}`}</span>
            </div>
          )}
          {mode === "world" && !driving && engineRef.current.car && engineRef.current.player &&
            engineRef.current.player.position.distanceTo(engineRef.current.car.position) < 5.2 && !nearest && (
            <div className="interaction-prompt"><span className="key">E</span><span>Сесть в старый седан</span></div>
          )}
        </div>
      )}

      {mode === "intro" && (
        <section className="overlay intro">
          <div className="intro-copy">
            <div className="eyebrow">● Играбельный low-poly прототип</div>
            <h1>Пульт <em>охраны</em></h1>
            <p>Алексей вернулся в Первореченское. Впереди два посёлка, сто домов, четыре километра дороги и одна цель: заслужить доверие жителей и открыть собственный пульт наблюдения.</p>
            <div className="intro-actions">
              <button className="primary-btn" onClick={() => setMode("world")}>Выйти в посёлок →</button>
              <button className="soft-btn" onClick={() => startOffice(true)}>Демо пульта</button>
            </div>
          </div>
          <aside className="intro-card">
            <div className="mission-ticket">
              <small>Задача на сегодня · 08:15</small>
              <h3>Первые договоры</h3>
              <div className="mission-step"><i>1</i><span>Найдите жителей по оранжевым маркерам</span></div>
              <div className="mission-step"><i>2</i><span>Подберите реплику под характер клиента</span></div>
              <div className="mission-step"><i>3</i><span>Подключите 10 объектов и откройте пульт</span></div>
            </div>
          </aside>
        </section>
      )}

      {mode === "dialogue" && activeNpc && (
        <section className="overlay dialogue" aria-label={`Диалог с ${activeNpc.name}`}>
          <div className="dialogue-panel">
            <div className="dialogue-head">
              <div className="portrait">●</div>
              <div className="dialogue-name"><strong>{activeNpc.name}</strong><span>{activeNpc.archetype} · {activeNpc.address}</span></div>
              <div className="interest">
                <div className="interest-top"><span>Заинтересованность</span><b>{activeNpc.interest}%</b></div>
                <div className="interest-track"><div className="interest-fill" style={{ width: `${activeNpc.interest}%` }} /></div>
              </div>
            </div>
            <p className="npc-line">«{npcLine}»</p>
            <span className="insight">Наблюдательность: кажется, его волнует {activeNpc.need}</span>
            <div className="choices">
              {REPLIES.map((reply, i) => (
                <button key={reply.kind} data-choice={i} className="choice-btn" onClick={() => handleReply(reply.kind)}>
                  <b>{i + 1}</b>{reply.label}
                </button>
              ))}
            </div>
            <div className="dialogue-footer">
              <span>Esc — закончить разговор</span>
              <button className="sign-btn" disabled={activeNpc.interest < 70} onClick={() => setShowTariff(true)}>
                {activeNpc.interest >= 70 ? "Предложить договор →" : `Нужно ещё ${70 - activeNpc.interest}%`}
              </button>
            </div>
          </div>
        </section>
      )}

      {showTariff && activeNpc && (
        <section className="overlay tariff-modal">
          <div className="tariff-card">
            <h2>Выберите тариф</h2>
            <p>{activeNpc.name} готов подписать договор. Ежемесячная плата станет доходом фирмы.</p>
            <div className="tariffs">
              {TARIFFS.map((tariff, i) => (
                <button key={tariff.name} className={`tariff-btn ${tariff.recommended ? "recommended" : ""}`} onClick={() => signContract(i)}>
                  <span>{tariff.recommended ? "Рекомендуем" : "Тариф"}</span>
                  <b>{tariff.name}</b>
                  <small>{tariff.note}<br /><br />{tariff.price} ₽ / месяц</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {mode === "tablet" && (
        <section className="overlay tablet">
          <div className="tablet-frame">
            <aside className="tablet-sidebar">
              <h2>Мой пульт</h2>
              <button className={`tablet-tab ${tabletTab === "hero" ? "active" : ""}`} onClick={() => setTabletTab("hero")}>Алексей и навыки</button>
              <button className={`tablet-tab ${tabletTab === "clients" ? "active" : ""}`} onClick={() => setTabletTab("clients")}>Жители и договоры</button>
              <button className={`tablet-tab ${tabletTab === "finance" ? "active" : ""}`} onClick={() => setTabletTab("finance")}>Финансы</button>
              <button className={`tablet-tab ${tabletTab === "map" ? "active" : ""}`} onClick={() => setTabletTab("map")}>Смена и прогресс</button>
              <button className="tablet-tab tablet-close" onClick={() => setMode("world")}>← Вернуться в игру</button>
            </aside>
            <div className="tablet-content">
              {tabletTab === "hero" && <>
                <div className="hero-profile-head">
                  <div className="hero-profile-avatar">А</div>
                  <div><small>Главный герой</small><h1>Алексей</h1><p>30 лет · вернулся домой, чтобы открыть охранное предприятие</p></div>
                </div>
                <div className="skill-grid">
                  <div className="skill-box"><span>Красноречие</span><b>2 / 10</b><small>Успешные переговоры</small></div>
                  <div className="skill-box"><span>Наблюдательность</span><b>1 / 5</b><small>Скрытые потребности NPC</small></div>
                  <div className="skill-box"><span>Выносливость</span><b>{energy} / 100</b><small>Бег и активность</small></div>
                  <div className="skill-box"><span>Репутация</span><b>{reputation} / 100</b><small>{reputation < 20 ? "Новичок" : "Знакомое лицо"}</small></div>
                  <div className="skill-box"><span>Техническая грамотность</span><b>1 / 10</b><small>Работа за пультом</small></div>
                </div>
                <div className="perk-strip">
                  <strong>Будущая специализация</strong>
                  <span>Дипломат</span><span>Технарь</span><span>Драйвер</span>
                </div>
                <p className="hero-story">Алексей вырос в ПервоРеченском, затем работал менеджером в городском ЧОПе. Услышав о кражах в родном посёлке, он вернулся со старой машиной, небольшим капиталом и намерением снова заслужить доверие соседей.</p>
              </>}
              {tabletTab === "clients" && <>
                <h1>Жители посёлка</h1>
                <p>{signedCount} из 10 объектов подключено к будущему пульту.</p>
                <div className="client-grid">
                  {residents.map((r) => (
                    <div key={r.id} className="client-card">
                      <span className="client-avatar">●</span>
                      <div><strong>{r.name}</strong><small>{r.address} · интерес {r.interest}%</small></div>
                      <span className={`client-state ${r.signed ? "signed" : ""}`}>{r.signed ? "Охраняется" : "Лид"}</span>
                    </div>
                  ))}
                </div>
              </>}
              {tabletTab === "finance" && <>
                <h1>Финансовый отчёт</h1>
                <p>Короткая сводка текущего игрового месяца.</p>
                <div className="finance-row">
                  <div className="finance-box"><span>Баланс</span><b>{money.toLocaleString("ru-RU")} ₽</b></div>
                  <div className="finance-box"><span>Доход / месяц</span><b>{monthlyIncome.toLocaleString("ru-RU")} ₽</b></div>
                  <div className="finance-box"><span>Репутация</span><b>{reputation} ★</b></div>
                </div>
                <div className="finance-row">
                  <button className="primary-btn" onClick={() => setWeather(weather === "Ясно" ? "Облачно" : weather === "Облачно" ? "Дождь" : "Ясно")}>Сменить погоду: {weather}</button>
                  <button className="soft-btn" style={{ color: "#315c45", borderColor: "#bfc8b8" }} onClick={resetSave}>Начать заново</button>
                </div>
              </>}
              {tabletTab === "map" && <>
                <h1>Открытие пульта</h1>
                <p>Пульт централизованного наблюдения откроется после 10 активных договоров.</p>
                <div className="finance-row">
                  <div className="finance-box"><span>Прогресс</span><b>{signedCount} / 10</b></div>
                  <div className="finance-box"><span>Осталось</span><b>{Math.max(0, 10 - signedCount)}</b></div>
                  <div className="finance-box"><span>Статус</span><b>{signedCount >= 10 ? "Открыт" : "Закрыт"}</b></div>
                </div>
                <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
                  <button className="primary-btn" onClick={() => startOffice(false)}>Начать смену на пульте</button>
                  <button className="soft-btn" style={{ color: "#315c45", borderColor: "#bfc8b8" }} onClick={() => startOffice(true)}>Учебная тревога</button>
                </div>
              </>}
            </div>
          </div>
        </section>
      )}

      {mode === "office" && (
        <section className="overlay office">
          <aside className="office-side">
            <small>Оперативный дежурный</small>
            <h2>Пульт 01</h2>
            <p>ПервоРеченское<br />Смена 20:00–08:00</p>
            <div className="office-nav">
              <div className="active">● Объекты</div>
              <div>История событий</div>
              <div>Экипажи ГБР</div>
              <div>Оборудование</div>
            </div>
            <button className="office-exit" onClick={() => setMode("world")}>E · Встать из-за пульта</button>
          </aside>
          <div className="office-main">
            <div className="office-header">
              <div><small>Центр наблюдения</small><h1>Состояние объектов</h1></div>
              <span className="live-pill">● Система онлайн</span>
            </div>
            <div className="monitor-grid">
              <div className="monitor-card">
                <h3>Карта посёлка · {Math.max(signedCount, 10)} объектов</h3>
                <div className="office-map">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className={`office-dot ${alarm && i === 0 ? "alert" : ""}`} style={{ left: `${10 + ((i * 23) % 82)}%`, top: `${18 + ((i * 37) % 68)}%` }} />
                  ))}
                </div>
              </div>
              <div className="monitor-card">
                <h3>Последние события</h3>
                <div className="events-list">
                  <div className="event-row"><i /><span>Садовая, 8 · взят под охрану</span><small>20:04</small></div>
                  <div className="event-row"><i /><span>Новая, 12 · канал связи ОК</span><small>19:57</small></div>
                  <div className="event-row"><i /><span>Речная, 7 · тест датчиков</span><small>19:42</small></div>
                  <div className="event-row"><i /><span>ГБР-1 · на маршруте</span><small>19:30</small></div>
                </div>
              </div>
            </div>
            <div className={`alarm-card ${alarm ? "" : "idle"}`}>
              <div className="alarm-top"><b>{alarm ? "⚠ Входящий сигнал" : "Журнал реакции"}</b><small>{timeLabel}</small></div>
              <h3>{alarm ? alarm.type : alarmResult}</h3>
              <p>{alarm ? alarm.address : "Следующий сигнал появится автоматически."}</p>
              {alarm && <div className="alarm-actions">
                <button className="alarm-action" onClick={() => handleAlarm("call")}>Позвонить клиенту</button>
                <button className="alarm-action primary" onClick={() => handleAlarm("gbr")}>Отправить ГБР</button>
                <button className="alarm-action" onClick={() => handleAlarm("self")}>Выехать лично</button>
                <button className="alarm-action" onClick={() => handleAlarm("fire")}>Вызвать пожарных</button>
              </div>}
            </div>
          </div>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
