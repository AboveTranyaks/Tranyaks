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
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 5.4, 8), mat(bodyColor));
  body.position.y = 2.7;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.8, 4), mat(signed ? 0x6f9861 : 0xb2614f));
  roof.position.y = 7.0;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.2), mat(0x76513c));
  door.position.set(0, 1.45, 4.08);
  const windowMat = mat(signed ? 0xcce86b : 0x9ccddd);
  const window1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.22), windowMat);
  window1.position.set(-2.5, 3.2, 4.1);
  const window2 = window1.clone();
  window2.position.x = 2.5;
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
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 1.8, 6), mat(0x385064));
  legs.position.y = 0.9;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.92, 2.0, 7), mat(color));
  body.position.y = 2.65;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.67, 1), mat(0xe2b883));
  head.position.y = 4.15;
  group.add(legs, body, head);
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return group;
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
  const [tabletTab, setTabletTab] = useState<"clients" | "finance" | "map">("clients");
  const [playerPos, setPlayerPos] = useState({ x: -4, z: -2 });
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
    scene.fog = new THREE.Fog(0x91bfc1, 75, 185);
    engine.scene = scene;

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 500);
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

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 190), mat(0x8fb277));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    box(scene, [220, 0.18, 13], [0, 0.1, 0], 0xa9a49a, -0.035);
    box(scene, [13, 0.19, 130], [18, 0.12, 26], 0xb7ad98, 0.07);
    box(scene, [9, 0.2, 65], [-42, 0.13, 29], 0xc2ae8a, -0.08);
    for (let x = -98; x < 105; x += 10) {
      box(scene, [5, 0.03, 0.28], [x, 0.23, -0.3 - x * 0.035], 0xe1ded4, -0.035);
    }

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x5fabb8,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-118, 0.2, 62),
      new THREE.Vector3(-80, 0.2, 48),
      new THREE.Vector3(-42, 0.2, 66),
      new THREE.Vector3(0, 0.2, 78),
      new THREE.Vector3(47, 0.2, 66),
      new THREE.Vector3(118, 0.2, 82),
    ]);
    const river = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 6.5, 8, false), riverMat);
    scene.add(river);

    for (let i = 0; i < 62; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = -112 + ((i * 31) % 224);
      const z = side * (60 + ((i * 17) % 25));
      makeTree(scene, x, z, 0.75 + ((i * 9) % 7) / 14);
    }

    const houses: [number, number][] = residentsRef.current.map((r) => [r.x, r.z]);
    houses.forEach(([x, z], i) => {
      const colors = [0xe1b47d, 0xd89073, 0xd6c98a, 0x8eaf9a, 0xc7a3a3];
      makeHouse(scene, x, z, colors[i % colors.length], residentsRef.current[i].signed);
      box(scene, [13, 0.42, 0.28], [x, 0.5, z + (z > 0 ? -6.4 : 6.4)], 0x806f55);
    });

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

    const player = makePerson(0xcce86b);
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

    let last = performance.now();
    let uiTick = 0;
    let mouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      engine.keys.add(key);
      if (["tab", " "].includes(key)) e.preventDefault();

      if (key === "tab" && modeRef.current === "world") {
        setMode("tablet");
        return;
      }
      if ((key === "tab" || key === "escape") && modeRef.current === "tablet") {
        setMode("world");
        return;
      }
      if (key === "escape" && modeRef.current === "dialogue") {
        setMode("world");
        setActiveNpcId(null);
        return;
      }
      if (key === "e" && modeRef.current === "world") {
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
      if (modeRef.current === "dialogue" && ["1", "2", "3", "4"].includes(key)) {
        const index = Number(key) - 1;
        const button = document.querySelector<HTMLButtonElement>(`[data-choice="${index}"]`);
        button?.click();
      }
      if (key === "h" && engine.driving) {
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

    const onKeyUp = (e: KeyboardEvent) => engine.keys.delete(e.key.toLowerCase());
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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    let animation = 0;
    const animate = (now: number) => {
      animation = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const canMove = modeRef.current === "world";
      const focus = engine.driving ? car : player;

      if (canMove && engine.driving) {
        const throttle = (engine.keys.has("w") ? 1 : 0) - (engine.keys.has("s") ? 1 : 0);
        const steer = (engine.keys.has("a") ? 1 : 0) - (engine.keys.has("d") ? 1 : 0);
        engine.carSpeed += throttle * 18 * dt;
        engine.carSpeed *= engine.keys.has(" ") ? Math.pow(0.25, dt * 6) : Math.pow(0.55, dt);
        engine.carSpeed = clamp(engine.carSpeed, -9, 26);
        if (Math.abs(engine.carSpeed) > 0.35) {
          car.rotation.y += steer * dt * 1.45 * Math.sign(engine.carSpeed) * clamp(Math.abs(engine.carSpeed) / 8, 0.4, 1);
        }
        car.translateZ(engine.carSpeed * dt);
        car.position.x = clamp(car.position.x, -112, 112);
        car.position.z = clamp(car.position.z, -55, 68);
        engine.yaw = THREE.MathUtils.lerp(engine.yaw, car.rotation.y + Math.PI, dt * 1.2);
      } else if (canMove) {
        const forward = (engine.keys.has("w") ? 1 : 0) - (engine.keys.has("s") ? 1 : 0);
        const side = (engine.keys.has("d") ? 1 : 0) - (engine.keys.has("a") ? 1 : 0);
        const moving = Math.abs(forward) + Math.abs(side) > 0;
        const sprinting = moving && engine.keys.has("shift") && energyRef.current > 0.5;
        const speed = sprinting ? 12.5 : energyRef.current <= 0 ? 3.4 : 6.3;
        if (moving) {
          const angle = engine.yaw;
          const dx = (Math.sin(angle) * forward + Math.cos(angle) * side) * speed * dt;
          const dz = (Math.cos(angle) * forward - Math.sin(angle) * side) * speed * dt;
          player.position.x = clamp(player.position.x + dx, -112, 112);
          player.position.z = clamp(player.position.z + dz, -55, 68);
          player.rotation.y = Math.atan2(dx, dz);
          player.position.y = Math.abs(Math.sin(now * 0.012)) * 0.08;
          if (sprinting) {
            const nextEnergy = clamp(energyRef.current - dt * 2.9, 0, 100);
            energyRef.current = nextEnergy;
          } else {
            energyRef.current = clamp(energyRef.current + dt * 0.22, 0, 100);
          }
        } else {
          player.position.y = THREE.MathUtils.lerp(player.position.y, 0, dt * 10);
          energyRef.current = clamp(energyRef.current + dt * 0.45, 0, 100);
        }
      }

      engine.time += dt * 0.085;
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
        const marker = resident.mesh.getObjectByName("marker");
        if (marker) marker.position.y = 5.7 + Math.sin(now * 0.003 + i) * 0.18;
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
      }
      renderer.render(scene, camera);
    };
    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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

  return (
    <main className="game-shell" aria-label="Игра Пульт охраны">
      <div ref={mountRef} aria-label="Трёхмерный посёлок" />

      {mode !== "intro" && mode !== "office" && (
        <div className="hud" aria-hidden={mode !== "world"}>
          <div className="brand">
            <div className="brand-mark">⌂</div>
            <div><strong>Пульт охраны</strong><small>ПервоРеченское</small></div>
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
          <div className="minimap" aria-label="Миникарта">
            <span className="compass-n">С</span>
            <div className="map-river" />
            <div className="map-road" />
            <div className="map-road vertical" />
            {residents.map((r) => (
              <span key={`h-${r.id}`} className={`map-home ${r.signed ? "signed" : ""}`} style={{ left: mapPos(r.x, 120), top: mapPos(r.z, 90) }} />
            ))}
            {residents.filter((r) => !r.signed).map((r) => (
              <span key={`n-${r.id}`} className="map-npc" style={{ left: mapPos(r.x + 5, 120), top: mapPos(r.z + (r.z > 0 ? -5 : 5), 90) }} />
            ))}
            <span className="map-player" style={{ left: mapPos(playerPos.x, 120), top: mapPos(playerPos.z, 90) }} />
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
            <p>Небольшой посёлок у реки. Десять домов, десять разных характеров и одна цель: заслужить доверие жителей и открыть собственный пульт наблюдения.</p>
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
              <button className={`tablet-tab ${tabletTab === "clients" ? "active" : ""}`} onClick={() => setTabletTab("clients")}>Жители и договоры</button>
              <button className={`tablet-tab ${tabletTab === "finance" ? "active" : ""}`} onClick={() => setTabletTab("finance")}>Финансы</button>
              <button className={`tablet-tab ${tabletTab === "map" ? "active" : ""}`} onClick={() => setTabletTab("map")}>Смена и прогресс</button>
              <button className="tablet-tab tablet-close" onClick={() => setMode("world")}>← Вернуться в игру</button>
            </aside>
            <div className="tablet-content">
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
