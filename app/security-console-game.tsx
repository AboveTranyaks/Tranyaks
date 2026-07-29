"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ReplyKind = "info" | "empathy" | "business" | "pressure";
type GameMode = "intro" | "world" | "dialogue" | "tablet" | "tariff" | "office";
type OutfitId = "casual" | "manager" | "operator" | "rain";
type OfficeZone = "console" | "manager" | "rest" | "storage" | "garage";
type WeatherKind = "Ясно" | "Облачно" | "Дождь" | "Гроза";
type SurfaceKind = "Асфальт" | "Грунт" | "Трава";
type MovementState = "Покой" | "Шаг" | "Быстрый шаг" | "Бег трусцой";

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
  outfit?: OutfitId;
  ownedOutfits?: OutfitId[];
  carUpgrade?: number;
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

type Outfit = {
  id: OutfitId;
  name: string;
  subtitle: string;
  description: string;
  preview: string;
  price: number;
  trust: number;
  speed: number;
  energy: number;
  ground: number;
  top: number;
  outer: number;
  pants: number;
  shoes: number;
  hat?: boolean;
  glasses?: boolean;
  badge?: boolean;
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

const WORLD_KEY_POINTS = [
  { id: "office", label: "Офис охраны", short: "О", x: 92, z: -18, kind: "office" },
  { id: "shop", label: "Магазин", short: "М", x: 3, z: -22, kind: "service" },
  { id: "school", label: "Школа", short: "Ш", x: -72, z: 34, kind: "service" },
  { id: "river", label: "Река Кочеты", short: "Р", x: 0, z: 180, kind: "nature" },
  { id: "dinskaya", label: "Центр станицы Динской", short: "Д", x: 4000, z: -24, kind: "village" },
] as const;

const OUTFITS: Outfit[] = [
  {
    id: "casual",
    name: "Свой парень",
    subtitle: "Толстовка, джинсы, кроссовки",
    description: "Удобный комплект для долгих обходов и разговоров по-соседски.",
    preview: "linear-gradient(145deg, #b7cba1, #e9d7aa)",
    price: 0,
    trust: 3,
    speed: 1.03,
    energy: 0.95,
    ground: 1,
    top: 0x315c45,
    outer: 0x425b61,
    pants: 0x26394d,
    shoes: 0xf0eee7,
    hat: true,
  },
  {
    id: "manager",
    name: "Классический менеджер",
    subtitle: "Пиджак, брюки, туфли и очки",
    description: "Деловой образ повышает доверие, но не любит грязные просёлки.",
    preview: "linear-gradient(145deg, #9bafba, #ddd4c3)",
    price: 5000,
    trust: 10,
    speed: 0.96,
    energy: 1.05,
    ground: 1,
    top: 0xf0eee7,
    outer: 0x26394d,
    pants: 0x2d3541,
    shoes: 0x241d1a,
    glasses: true,
    badge: true,
  },
  {
    id: "operator",
    name: "Оперативник ГБР",
    subtitle: "Форма, разгрузка и трекинговые ботинки",
    description: "Практичная форма для тревожных выездов и уверенного шага по грунту.",
    preview: "linear-gradient(145deg, #78917f, #b7b99c)",
    price: 8500,
    trust: 8,
    speed: 1.01,
    energy: 0.98,
    ground: 1.05,
    top: 0x31526d,
    outer: 0x253d35,
    pants: 0x26302d,
    shoes: 0x3d332b,
    hat: true,
    badge: true,
  },
  {
    id: "rain",
    name: "Дождевой патруль",
    subtitle: "Ветровка, резиновые ботинки и кепка",
    description: "Лёгкая защита от непогоды с хорошим сцеплением на мокрой траве.",
    preview: "linear-gradient(145deg, #6e9692, #d5bd79)",
    price: 2600,
    trust: 4,
    speed: 0.98,
    energy: 0.94,
    ground: 1.08,
    top: 0x557d68,
    outer: 0xd39a4b,
    pants: 0x33475a,
    shoes: 0x27312d,
    hat: true,
  },
];

const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map((outfit) => [outfit.id, outfit])) as Record<OutfitId, Outfit>;

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mapPos = (value: number, extent: number) => `${50 + (value / extent) * 44}%`;
const worldMapX = (x: number) => `${clamp(((x + 180) / 4360) * 100, 2, 98)}%`;
const worldMapZ = (z: number) => `${clamp(50 - (z / 390) * 72, 8, 92)}%`;

function surfaceAt(x: number, z: number): SurfaceKind {
  if (Math.abs(z) <= 8) return "Асфальт";
  for (const centre of [0, 4000]) {
    if (Math.abs(x - (centre + 18)) <= 7 && z > -165 && z < 190) return "Асфальт";
    if (Math.abs(x - centre) <= 132 && (Math.abs(z - 72) <= 6 || Math.abs(z + 72) <= 5.5)) return "Грунт";
  }
  return "Трава";
}

function readSave(): SaveData {
  if (typeof window === "undefined") {
    return { money: 5000, reputation: 0, contracts: [], interests: {}, outfit: "casual", ownedOutfits: ["casual"], carUpgrade: 0 };
  }
  try {
    const raw = localStorage.getItem("security-console-save-v1");
    if (raw) return JSON.parse(raw) as SaveData;
  } catch {
    // A clean start is safer than a broken save.
  }
  return { money: 5000, reputation: 0, contracts: [], interests: {}, outfit: "casual", ownedOutfits: ["casual"], carUpgrade: 0 };
}

function residentsFromSave(save: SaveData): Resident[] {
  return RESIDENT_SEED.map((resident) => ({
    ...resident,
    interest: save.interests[resident.id] ?? 38 + ((resident.id * 7) % 13),
    signed: save.contracts.includes(resident.id),
  }));
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

function makeFieldVegetation(scene: THREE.Object3D) {
  const dummy = new THREE.Object3D();
  const grassGeometry = new THREE.ConeGeometry(0.16, 0.75, 4);
  const grass = new THREE.InstancedMesh(grassGeometry, mat(0x6f984f), 1800);
  grass.receiveShadow = true;
  for (let i = 0; i < 1800; i++) {
    const x = -175 + ((i * 73) % 4350);
    const side = i % 2 === 0 ? -1 : 1;
    const z = side * (16 + ((i * 47) % 172));
    dummy.position.set(x, 0.34, z);
    const insideVillage = Math.abs(x) < 190 || Math.abs(x - 4000) < 190;
    const scale = insideVillage ? 0.001 : 0.55 + ((i * 19) % 9) / 12;
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = (i * 0.73) % Math.PI;
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  scene.add(grass);

  const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.46, 2.8, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1.85, 0);
  const trunks = new THREE.InstancedMesh(trunkGeometry, mat(0x74583e), 240);
  const crowns = new THREE.InstancedMesh(crownGeometry, mat(0x5f8951), 240);
  trunks.castShadow = true;
  crowns.castShadow = true;
  for (let i = 0; i < 240; i++) {
    const x = -160 + ((i * 83) % 4320);
    const side = i % 2 === 0 ? -1 : 1;
    const distance = 28 + ((i * 41) % (side > 0 ? 115 : 145));
    const z = side * distance;
    const insideVillage = Math.abs(x) < 205 || Math.abs(x - 4000) < 205;
    const scale = insideVillage ? 0.001 : 0.72 + ((i * 13) % 8) / 16;
    dummy.position.set(x, 1.4 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.set(0, (i * 0.49) % Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 4.15 * scale;
    dummy.scale.set(scale, scale * 1.18, scale);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  scene.add(trunks, crowns);
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
  window1.name = "window";
  const window2 = window1.clone();
  window2.position.x = 2.8;
  window2.name = "window";
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
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0x50392f),
  );
  hair.position.y = 4.48;
  hair.scale.set(1.02, 0.56, 1.02);
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), mat(0x26302d));
  leftEye.position.set(-0.22, 4.25, 0.61);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.22;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 5), mat(0xd3a474));
  nose.position.set(0, 4.08, 0.68);
  nose.rotation.x = Math.PI / 2;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.045, 0.035), mat(0x8f4d48));
  mouth.position.set(0, 3.91, 0.64);
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 1.55, 6), mat(0xe2b883));
  leftArm.position.set(-0.95, 2.7, 0);
  leftArm.name = "leftArm";
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.95;
  rightArm.name = "rightArm";
  const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.35, 0.12), mat(color, 0.78));
  shirtFront.position.set(0, 2.72, 0.78);
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.82), mat(0x292d2b));
  leftShoe.position.set(-0.33, 0.15, 0.14);
  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.33;
  group.add(
    leftLeg,
    rightLeg,
    leftShoe,
    rightShoe,
    body,
    shirtFront,
    head,
    hair,
    leftEye,
    rightEye,
    nose,
    mouth,
    leftArm,
    rightArm,
  );
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
  leftShoe.name = "leftShoe";
  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.34;
  rightShoe.name = "rightShoe";

  const polo = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.88, 1.75, 7), mat(0x315c45));
  polo.position.y = 2.68;
  polo.name = "top";
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.62, 0.28), mat(0x425b61));
  jacket.position.set(0, 2.72, -0.5);
  jacket.name = "outer";

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
  hair.name = "hair";
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), mat(0x26302d));
  leftEye.position.set(-0.23, 4.48, 0.66);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.23;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.36, 5), mat(0xd5a879));
  nose.position.set(0, 4.38, 0.69);
  nose.rotation.x = Math.PI / 2;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.04), mat(0x8f4d48));
  mouth.position.set(0, 4.14, 0.67);

  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.02, 0.12), mat(0x26302d));
  tablet.position.set(0.82, 2.1, -0.5);
  tablet.rotation.z = -0.18;
  tablet.name = "tablet";
  tablet.visible = false;

  const cap = new THREE.Group();
  cap.name = "hat";
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.73, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x315c45));
  capTop.position.y = 4.79;
  capTop.scale.y = 0.42;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.48), mat(0x315c45));
  brim.position.set(0, 4.77, 0.48);
  cap.add(capTop, brim);

  const glasses = new THREE.Group();
  glasses.name = "glasses";
  for (const x of [-0.25, 0.25]) {
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.21, 0.035),
      new THREE.MeshStandardMaterial({ color: 0x26302d, transparent: true, opacity: 0.72, roughness: 0.18 }),
    );
    lens.position.set(x, 4.47, 0.69);
    glasses.add(lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.04), mat(0x26302d));
  bridge.position.set(0, 4.47, 0.7);
  glasses.add(bridge);
  glasses.visible = false;

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.06), mat(0xcce86b));
  badge.position.set(0.48, 2.92, 0.76);
  badge.name = "badge";
  badge.visible = false;

  hero.add(leftLeg, rightLeg, leftShoe, rightShoe, polo, jacket, leftArm, rightArm, neck, head, hair, leftEye, rightEye, nose, mouth, tablet, cap, glasses, badge);
  hero.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return hero;
}

function applyOutfit(hero: THREE.Group, outfit: Outfit) {
  const setColor = (name: string, color: number) => {
    const mesh = hero.getObjectByName(name);
    if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.color.setHex(color);
  };
  setColor("top", outfit.top);
  setColor("outer", outfit.outer);
  setColor("leftLeg", outfit.pants);
  setColor("rightLeg", outfit.pants);
  setColor("leftShoe", outfit.shoes);
  setColor("rightShoe", outfit.shoes);
  const hat = hero.getObjectByName("hat");
  const glasses = hero.getObjectByName("glasses");
  const badge = hero.getObjectByName("badge");
  if (hat) hat.visible = Boolean(outfit.hat);
  if (glasses) glasses.visible = Boolean(outfit.glasses);
  if (badge) badge.visible = Boolean(outfit.badge);
}

function animateHero(hero: THREE.Group, state: MovementState, now: number, fatigued: boolean, tabletOpen = false) {
  const moving = state !== "Покой";
  const cadence = state === "Бег трусцой" ? 0.017 : state === "Быстрый шаг" ? 0.014 : 0.01;
  const amplitude = state === "Бег трусцой" ? 0.68 : state === "Быстрый шаг" ? 0.52 : 0.4;
  const stride = moving ? Math.sin(now * cadence) * amplitude : Math.sin(now * 0.0012) * 0.035;
  const leftLeg = hero.getObjectByName("leftLeg");
  const rightLeg = hero.getObjectByName("rightLeg");
  const leftArm = hero.getObjectByName("leftArm");
  const rightArm = hero.getObjectByName("rightArm");
  const top = hero.getObjectByName("top");
  const outer = hero.getObjectByName("outer");
  const tablet = hero.getObjectByName("tablet");
  if (leftLeg) leftLeg.rotation.x = stride;
  if (rightLeg) rightLeg.rotation.x = -stride;
  if (leftArm) leftArm.rotation.x = -stride * 0.72;
  if (rightArm) rightArm.rotation.x = stride * 0.72;
  const lean = fatigued ? 0.16 : state === "Бег трусцой" ? -0.1 : 0;
  if (top) top.rotation.x = THREE.MathUtils.lerp(top.rotation.x, lean, 0.12);
  if (outer) outer.rotation.x = THREE.MathUtils.lerp(outer.rotation.x, lean, 0.12);
  if (tablet) tablet.visible = tabletOpen;
  hero.rotation.z = moving ? Math.sin(now * cadence) * 0.018 : Math.sin(now * 0.001) * 0.012;
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
  group.name = "carRoot";
  const visual = new THREE.Group();
  visual.name = "carVisual";
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 6.2), mat(0xc85f4c));
  body.position.y = 1.05;
  body.name = "carBody";
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.15, 3.1), mat(0x9bc1c7));
  cabin.position.set(0, 1.95, -0.25);
  cabin.geometry.rotateX(-0.05);
  const frontLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffe6ad, emissive: 0xffd37a, emissiveIntensity: 0.25 });
  const rearLightMaterial = new THREE.MeshStandardMaterial({ color: 0xa7352b, emissive: 0x7a0d08, emissiveIntensity: 0.2 });
  for (const x of [-1.03, 1.03]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.12), frontLightMaterial);
    front.position.set(x, 1.08, 3.15);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.12), rearLightMaterial);
    rear.position.set(x, 1.04, -3.15);
    visual.add(front, rear);
  }
  visual.add(body, cabin);
  for (const x of [-1.58, 1.58]) {
    for (const z of [-2.0, 2.0]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.42, 10),
        mat(0x26302d),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.64, z);
      wheel.name = z > 0 ? "frontWheel" : "rearWheel";
      visual.add(wheel);
    }
  }
  group.add(visual);
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
    carSteer: number;
    carSlip: number;
    fuel: number;
    odometer: number;
    wear: number;
    surface: SurfaceKind;
    lastForwardTap: number;
    fastWalkUntil: number;
    residents: Resident[];
    colliders: WorldCollider[];
    walkers: Walker[];
    nearest: Resident | null;
    time: number;
    yaw: number;
    pitch: number;
    zoom: number;
    cameraInputAt: number;
  }>({
    keys: new Set(),
    driving: false,
    carSpeed: 0,
    carSteer: 0,
    carSlip: 0,
    fuel: 40,
    odometer: 0,
    wear: 0,
    surface: "Асфальт",
    lastForwardTap: 0,
    fastWalkUntil: 0,
    residents: [],
    colliders: [],
    walkers: [],
    nearest: null,
    time: 8.25,
    yaw: Math.PI,
    pitch: 0.52,
    zoom: 14,
    cameraInputAt: 0,
  });

  const [initialSave] = useState<SaveData>(() => readSave());
  const initialOutfit = initialSave.outfit && OUTFIT_BY_ID[initialSave.outfit] ? initialSave.outfit : "casual";
  const initialOwned = Array.from(new Set<OutfitId>(["casual", ...(initialSave.ownedOutfits ?? [])])).filter((id) => Boolean(OUTFIT_BY_ID[id]));
  const initialCarUpgrade = clamp(initialSave.carUpgrade ?? 0, 0, 3);
  const [mode, setMode] = useState<GameMode>("intro");
  const modeRef = useRef<GameMode>("intro");
  const [energy, setEnergy] = useState(100);
  const energyRef = useRef(100);
  const [money, setMoney] = useState(initialSave.money);
  const [reputation, setReputation] = useState(initialSave.reputation);
  const [gameTime, setGameTime] = useState(8.25);
  const [driving, setDriving] = useState(false);
  const [nearCar, setNearCar] = useState(false);
  const [nearest, setNearest] = useState<Resident | null>(null);
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null);
  const [residents, setResidents] = useState<Resident[]>(() => residentsFromSave(initialSave));
  const residentsRef = useRef<Resident[]>(residents);
  const [npcLine, setNpcLine] = useState("");
  const [toast, setToast] = useState("");
  const [showTariff, setShowTariff] = useState(false);
  const [tabletTab, setTabletTab] = useState<"hero" | "wardrobe" | "clients" | "finance" | "map">("hero");
  const [playerPos, setPlayerPos] = useState({ x: -4, z: -2 });
  const [locationName, setLocationName] = useState<"Первореченское" | "станица Динская">("Первореченское");
  const [distanceToDinskaya, setDistanceToDinskaya] = useState(4);
  const [weather, setWeather] = useState<WeatherKind>("Ясно");
  const weatherRef = useRef<WeatherKind>("Ясно");
  const [movementState, setMovementState] = useState<MovementState>("Покой");
  const [carTelemetry, setCarTelemetry] = useState({ speed: 0, fuel: 40, surface: "Асфальт" as SurfaceKind, wear: 0 });
  const [outfitId, setOutfitId] = useState<OutfitId>(initialOutfit);
  const outfitRef = useRef<OutfitId>(initialOutfit);
  const [ownedOutfits, setOwnedOutfits] = useState<OutfitId[]>(initialOwned);
  const ownedOutfitsRef = useRef<OutfitId[]>(initialOwned);
  const [carUpgrade, setCarUpgrade] = useState(initialCarUpgrade);
  const carUpgradeRef = useRef(initialCarUpgrade);
  const [officeZone, setOfficeZone] = useState<OfficeZone>("console");
  const [coffeeReady, setCoffeeReady] = useState(true);
  const [equipment, setEquipment] = useState(6);
  const [officeMessage, setOfficeMessage] = useState("Офис готов к работе. Выберите помещение слева.");
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
        outfit: outfitRef.current,
        ownedOutfits: ownedOutfitsRef.current,
        carUpgrade: carUpgradeRef.current,
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
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    outfitRef.current = outfitId;
    const hero = engineRef.current.player;
    if (hero) applyOutfit(hero, OUTFIT_BY_ID[outfitId]);
  }, [outfitId]);

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

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      starPositions[i * 3] = ((i * 97) % 800) - 400;
      starPositions[i * 3 + 1] = 70 + ((i * 43) % 95);
      starPositions[i * 3 + 2] = ((i * 61) % 700) - 350;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xeaf3ff, size: 0.72, transparent: true, opacity: 0.88 }),
    );
    stars.visible = false;
    scene.add(stars);

    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(720 * 3);
    for (let i = 0; i < 720; i++) {
      rainPositions[i * 3] = ((i * 47) % 130) - 65;
      rainPositions[i * 3 + 1] = 3 + ((i * 31) % 48);
      rainPositions[i * 3 + 2] = ((i * 73) % 130) - 65;
    }
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rain = new THREE.Points(
      rainGeometry,
      new THREE.PointsMaterial({ color: 0xb8d9e4, size: 0.13, transparent: true, opacity: 0.62 }),
    );
    rain.visible = false;
    scene.add(rain);

    const dustPuffs: { mesh: THREE.Mesh; life: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const dustMaterial = new THREE.MeshStandardMaterial({
        color: 0xc4a878,
        roughness: 1,
        transparent: true,
        opacity: 0,
        flatShading: true,
      });
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), dustMaterial);
      puff.visible = false;
      scene.add(puff);
      dustPuffs.push({ mesh: puff, life: 0 });
    }
    let dustIndex = 0;
    let dustTimer = 0;
    const windowMaterials: THREE.MeshStandardMaterial[] = [];
    const lampMaterials: THREE.MeshStandardMaterial[] = [];

    engine.colliders = [];
    engine.walkers = [];

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4400, 420), mat(0x8fb277));
    ground.rotation.x = -Math.PI / 2;
    ground.position.x = 1950;
    ground.receiveShadow = true;
    scene.add(ground);
    makeFieldVegetation(scene);

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
      const house = makeHouse(scene, x, z, colors[i % colors.length], residentsRef.current[i].signed);
      house.traverse((part) => {
        if (part instanceof THREE.Mesh && part.name === "window" && part.material instanceof THREE.MeshStandardMaterial) {
          windowMaterials.push(part.material);
        }
      });
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
        const house = makeHouse(scene, x, z, houseColors[(startIndex + added) % houseColors.length], false);
        house.traverse((part) => {
          if (part instanceof THREE.Mesh && part.name === "window" && part.material instanceof THREE.MeshStandardMaterial) {
            windowMaterials.push(part.material);
          }
        });
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
      const glowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd88a,
        emissive: 0xffbf5a,
        emissiveIntensity: 0.1,
        roughness: 0.6,
        flatShading: true,
      });
      lampMaterials.push(glowMaterial);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), glowMaterial);
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
    makeRoadSign("ДИНСКАЯ", 205, -12);
    makeRoadSign("ПЕРВОРЕЧЕНСКОЕ 4 КМ", 3795, -12, true);

    const player = makeHero();
    player.position.set(-4, 0, -3);
    applyOutfit(player, OUTFIT_BY_ID[outfitRef.current]);
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
      if (e.code === "KeyW" && !e.repeat) {
        const tapNow = performance.now();
        if (tapNow - engine.lastForwardTap < 320) engine.fastWalkUntil = tapNow + 1500;
        engine.lastForwardTap = tapNow;
      }

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
          engine.yaw = car.rotation.y + Math.PI;
          engine.cameraInputAt = performance.now();
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
          energyRef.current = clamp(energyRef.current - 2, 0, 100);
          setEnergy(Math.round(energyRef.current));
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
        engine.cameraInputAt = performance.now();
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return;
      engine.cameraInputAt = performance.now();
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
      let currentMovement: MovementState = "Покой";

      if (canMove && engine.driving) {
        const throttle = (engine.keys.has("forward") ? 1 : 0) - (engine.keys.has("backward") ? 1 : 0);
        const steerInput = (engine.keys.has("left") ? 1 : 0) - (engine.keys.has("right") ? 1 : 0);
        const handbrake = engine.keys.has("brake");
        const surface = surfaceAt(car.position.x, car.position.z);
        engine.surface = surface;
        const gripBase = surface === "Асфальт" ? 1 : surface === "Грунт" ? 0.64 : 0.4;
        const wetGrip = weatherRef.current === "Дождь" || weatherRef.current === "Гроза" ? 0.78 : 1;
        const grip = gripBase * wetGrip * (handbrake ? 0.24 : 1);
        const maxSpeed = 30.6 * (1 + carUpgradeRef.current * 0.15);
        const acceleration = 6.2 * (1 + carUpgradeRef.current * 0.12) * (surface === "Трава" ? 0.72 : 1);
        if (throttle !== 0 && engine.fuel > 0) {
          const directionPenalty = Math.sign(throttle) !== Math.sign(engine.carSpeed) && Math.abs(engine.carSpeed) > 1 ? 1.65 : 1;
          engine.carSpeed += throttle * acceleration * directionPenalty * dt;
        } else {
          const rolling = surface === "Асфальт" ? 0.72 : surface === "Грунт" ? 1.25 : 2.15;
          const slow = rolling * dt + Math.abs(engine.carSpeed) * 0.018 * dt;
          engine.carSpeed = Math.abs(engine.carSpeed) <= slow ? 0 : engine.carSpeed - Math.sign(engine.carSpeed) * slow;
        }
        if (handbrake) engine.carSpeed *= Math.pow(0.47, dt);
        engine.carSpeed = clamp(engine.carSpeed, -9.2, maxSpeed);
        engine.carSteer = THREE.MathUtils.lerp(engine.carSteer, steerInput, 1 - Math.pow(0.0025, dt));
        if (Math.abs(engine.carSpeed) > 0.35) {
          const steerAuthority = 0.34 + clamp(Math.abs(engine.carSpeed) / 14, 0, 1) * 0.82;
          car.rotation.y += engine.carSteer * dt * steerAuthority * Math.sign(engine.carSpeed) * (0.7 + grip * 0.3);
        }
        const carDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
        const carSide = new THREE.Vector3(carDirection.z, 0, -carDirection.x);
        const slipTarget =
          engine.carSteer *
          Math.abs(engine.carSpeed) *
          (1 - grip) *
          (handbrake ? 0.42 : 0.12) *
          Math.sign(engine.carSpeed || 1);
        engine.carSlip = THREE.MathUtils.lerp(engine.carSlip, slipTarget, 1 - Math.pow(grip > 0.72 ? 0.0004 : 0.045, dt));
        const candidateX = car.position.x + (carDirection.x * engine.carSpeed + carSide.x * engine.carSlip) * dt;
        const candidateZ = car.position.z + (carDirection.z * engine.carSpeed + carSide.z * engine.carSlip) * dt;
        if (!isBlocked(candidateX, candidateZ, 2.25, false)) {
          car.position.x = clamp(candidateX, -180, 4180);
          car.position.z = clamp(candidateZ, -195, 195);
          const travelled = Math.abs(engine.carSpeed) * dt;
          engine.odometer += travelled / 1000;
          engine.fuel = Math.max(0, engine.fuel - travelled * 0.00006 * (1 + Math.abs(throttle) * 0.18));
        } else {
          const impact = Math.abs(engine.carSpeed);
          engine.carSpeed *= -0.12;
          engine.carSlip *= -0.2;
          engine.wear = clamp(engine.wear + impact * 0.025, 0, 100);
        }
        const carVisual = car.getObjectByName("carVisual");
        if (carVisual) {
          carVisual.rotation.z = THREE.MathUtils.lerp(carVisual.rotation.z, -engine.carSteer * clamp(Math.abs(engine.carSpeed) / 25, 0, 1) * 0.13, 1 - Math.pow(0.01, dt));
          carVisual.rotation.x = THREE.MathUtils.lerp(carVisual.rotation.x, -throttle * 0.035 + Math.sin(now * 0.016) * (surface === "Асфальт" ? 0.002 : 0.012), 1 - Math.pow(0.025, dt));
          carVisual.position.y = Math.sin(now * 0.013) * (surface === "Асфальт" ? 0.008 : 0.055);
        }
        car.traverse((part) => {
          if (part instanceof THREE.Mesh && (part.name === "frontWheel" || part.name === "rearWheel")) {
            part.rotation.x += engine.carSpeed * dt / 0.58;
          }
        });
        dustTimer -= dt;
        if (surface !== "Асфальт" && Math.abs(engine.carSpeed) > 5 && dustTimer <= 0) {
          const puff = dustPuffs[dustIndex];
          dustIndex = (dustIndex + 1) % dustPuffs.length;
          dustTimer = 0.075;
          puff.life = 1;
          puff.mesh.visible = true;
          puff.mesh.position.copy(car.position).add(carDirection.clone().multiplyScalar(-2.5));
          puff.mesh.position.y = 0.45;
          puff.mesh.scale.setScalar(0.7);
        }
        if (!mouseDown && now - engine.cameraInputAt > 1500) {
          engine.yaw = THREE.MathUtils.lerp(engine.yaw, car.rotation.y + Math.PI, 1 - Math.pow(0.06, dt));
        }
      } else if (canMove) {
        const forward = (engine.keys.has("forward") ? 1 : 0) - (engine.keys.has("backward") ? 1 : 0);
        const side = (engine.keys.has("right") ? 1 : 0) - (engine.keys.has("left") ? 1 : 0);
        const moving = Math.abs(forward) + Math.abs(side) > 0;
        const jogging = moving && engine.keys.has("sprint") && energyRef.current > 10;
        const fastWalking = moving && !jogging && now < engine.fastWalkUntil;
        currentMovement = jogging ? "Бег трусцой" : fastWalking ? "Быстрый шаг" : moving ? "Шаг" : "Покой";
        const outfit = OUTFIT_BY_ID[outfitRef.current];
        const surface = surfaceAt(player.position.x, player.position.z);
        const surfaceSpeed = surface === "Асфальт" ? 1 : surface === "Грунт" ? 0.95 * outfit.ground : 0.85 * outfit.ground;
        const fatigueSpeed = energyRef.current < 20 ? 0.7 : 1;
        const baseSpeed = jogging ? 3.5 : fastWalking ? 2.5 : 1.8;
        const speed = baseSpeed * outfit.speed * surfaceSpeed * fatigueSpeed;
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
          player.position.y = Math.abs(Math.sin(now * (jogging ? 0.017 : 0.011))) * (jogging ? 0.1 : 0.055);
          const energyCost = (jogging ? 1.5 : fastWalking ? 0.5 : 0.2) * outfit.energy;
          energyRef.current = clamp(energyRef.current - dt * energyCost, 0, 100);
        } else {
          player.position.y = THREE.MathUtils.lerp(player.position.y, 0, dt * 10);
          energyRef.current = clamp(energyRef.current + dt * 5, 0, 100);
        }
      }
      if (!engine.driving) {
        animateHero(player, currentMovement, now, energyRef.current < 20, modeRef.current === "tablet");
      }

      for (const puff of dustPuffs) {
        if (puff.life <= 0) continue;
        puff.life = Math.max(0, puff.life - dt * 0.85);
        puff.mesh.position.y += dt * 0.35;
        puff.mesh.scale.multiplyScalar(1 + dt * 1.15);
        if (puff.mesh.material instanceof THREE.MeshStandardMaterial) puff.mesh.material.opacity = puff.life * 0.42;
        if (puff.life <= 0) puff.mesh.visible = false;
      }

      // 06:00–21:00 lasts two real hours; the nine-hour night lasts 15 minutes.
      const isDay = engine.time >= 6 && engine.time < 21;
      engine.time += dt * (isDay ? 15 / 7200 : 9 / 900);
      if (engine.time >= 24) engine.time -= 24;
      const dayFactor = clamp(Math.sin(((engine.time - 5.5) / 24) * Math.PI * 2) * 0.65 + 0.45, 0.08, 1);
      const wetWeather = weatherRef.current === "Дождь" || weatherRef.current === "Гроза";
      const cloudFactor = weatherRef.current === "Облачно" ? 0.78 : wetWeather ? 0.58 : 1;
      const stormFlash = weatherRef.current === "Гроза" && Math.sin(now * 0.0017) > 0.994;
      sun.intensity = (0.35 + dayFactor * 2.7) * cloudFactor + (stormFlash ? 4.5 : 0);
      hemi.intensity = (0.35 + dayFactor * 1.8) * cloudFactor + (stormFlash ? 1.8 : 0);
      const dayColor = new THREE.Color(weatherRef.current === "Ясно" ? 0x91bfc1 : weatherRef.current === "Облачно" ? 0xa8b8b7 : 0x657f87);
      const sunsetColor = new THREE.Color(0xd88778);
      const nightColor = new THREE.Color(0x182940);
      let sky = nightColor.clone().lerp(dayColor, dayFactor);
      const sunsetStrength = clamp(1 - Math.abs(engine.time - 19.1) / 2.1, 0, 1);
      const dawnStrength = clamp(1 - Math.abs(engine.time - 6.4) / 1.5, 0, 1);
      sky = sky.lerp(sunsetColor, Math.max(sunsetStrength, dawnStrength) * 0.5);
      if (stormFlash) sky.lerp(new THREE.Color(0xe7eff6), 0.72);
      scene.background = sky;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(sky);
        scene.fog.near = weatherRef.current === "Гроза" ? 85 : wetWeather ? 115 : weatherRef.current === "Облачно" ? 145 : 170;
        scene.fog.far = weatherRef.current === "Гроза" ? 420 : wetWeather ? 560 : weatherRef.current === "Облачно" ? 720 : 900;
      }
      renderer.toneMappingExposure = 0.74 + dayFactor * 0.31 + (stormFlash ? 0.5 : 0);
      sun.color.setHex(sunsetStrength > 0.25 ? 0xffb071 : dayFactor < 0.25 ? 0xd0e0f0 : 0xfff0d4);
      stars.visible = dayFactor < 0.24 && !wetWeather;
      stars.position.set(focus.position.x, 0, focus.position.z);
      rain.visible = wetWeather;
      rain.position.set(focus.position.x, 0, focus.position.z);
      if (rain.visible) {
        const positions = rain.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i++) {
          let y = positions.getY(i) - dt * (weatherRef.current === "Гроза" ? 52 : 38);
          if (y < 0.4) y = 45 + ((i * 17) % 9);
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }
      const nightGlow = clamp(1 - dayFactor * 1.5, 0, 1);
      windowMaterials.forEach((material) => {
        material.emissive.setHex(0xffa857);
        material.emissiveIntensity = nightGlow * 1.25;
      });
      lampMaterials.forEach((material) => {
        material.emissiveIntensity = 0.1 + nightGlow * 2.2;
      });

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
        setNearCar(!engine.driving && player.position.distanceTo(car.position) < 5.2);
        setPlayerPos({ x: focus.position.x, z: focus.position.z });
        setMovementState(currentMovement);
        setCarTelemetry({
          speed: Math.round(Math.abs(engine.carSpeed) * 3.6),
          fuel: Math.round(engine.fuel * 10) / 10,
          surface: engine.surface,
          wear: Math.round(engine.wear),
        });
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
    const outfitTrust = Math.min(4, Math.round(OUTFIT_BY_ID[outfitRef.current].trust * 0.4));
    let change = (kind === current.hook ? 27 : kind === "pressure" ? -11 : 9) + outfitTrust;
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

  const handleOutfit = (outfit: Outfit) => {
    const isOwned = ownedOutfitsRef.current.includes(outfit.id);
    if (!isOwned) {
      if (money < outfit.price) {
        flash(`Для комплекта «${outfit.name}» не хватает ${(outfit.price - money).toLocaleString("ru-RU")} ₽`);
        return;
      }
      const nextMoney = money - outfit.price;
      const nextOwned = [...ownedOutfitsRef.current, outfit.id];
      ownedOutfitsRef.current = nextOwned;
      outfitRef.current = outfit.id;
      setOwnedOutfits(nextOwned);
      setOutfitId(outfit.id);
      setMoney(nextMoney);
      persist(residentsRef.current, nextMoney, reputation);
      flash(`Комплект «${outfit.name}» куплен и надет`);
      return;
    }
    outfitRef.current = outfit.id;
    setOutfitId(outfit.id);
    persist();
    flash(`Алексей переоделся: ${outfit.name}`);
  };

  const cycleWeather = () => {
    const order: WeatherKind[] = ["Ясно", "Облачно", "Дождь", "Гроза"];
    const next = order[(order.indexOf(weatherRef.current) + 1) % order.length];
    weatherRef.current = next;
    setWeather(next);
    flash(`Погода: ${next}`);
  };

  const handleOfficeAction = (action: "coffee" | "sleep" | "brochures" | "study" | "restock" | "upgrade") => {
    if (action === "coffee") {
      if (!coffeeReady) {
        setOfficeMessage("Кофемашина нагревается. Следующая чашка будет доступна позже.");
        return;
      }
      energyRef.current = clamp(energyRef.current + 15, 0, 100);
      setEnergy(Math.round(energyRef.current));
      setCoffeeReady(false);
      setOfficeMessage("Тёплый кофе восстановил 15 единиц энергии.");
      window.setTimeout(() => setCoffeeReady(true), 60000);
      return;
    }
    if (action === "sleep") {
      energyRef.current = 100;
      setEnergy(100);
      engineRef.current.time = (engineRef.current.time + 3) % 24;
      setOfficeMessage("Алексей отдохнул на диване три игровых часа. Энергия восстановлена.");
      return;
    }
    if (action === "brochures") {
      const nextRep = clamp(reputation + 1, 0, 100);
      setReputation(nextRep);
      persist(residentsRef.current, money, nextRep);
      setOfficeMessage("Подготовлена пачка буклетов. Репутация выросла на 1.");
      return;
    }
    if (action === "study") {
      if (money < 600) {
        setOfficeMessage("На обучающий курс сейчас не хватает 600 ₽.");
        return;
      }
      const nextMoney = money - 600;
      const nextRep = clamp(reputation + 2, 0, 100);
      setMoney(nextMoney);
      setReputation(nextRep);
      persist(residentsRef.current, nextMoney, nextRep);
      setOfficeMessage("Пройден короткий курс переговоров: −600 ₽, репутация +2.");
      return;
    }
    if (action === "restock") {
      if (money < 1500) {
        setOfficeMessage("Для пополнения склада нужно 1 500 ₽.");
        return;
      }
      const nextMoney = money - 1500;
      setMoney(nextMoney);
      setEquipment((value) => value + 10);
      persist(residentsRef.current, nextMoney, reputation);
      setOfficeMessage("На склад доставлены 10 комплектов датчиков.");
      return;
    }
    if (carUpgradeRef.current >= 3) {
      setOfficeMessage("Двигатель уже настроен до Stage 3.");
      return;
    }
    const price = 7000 + carUpgradeRef.current * 4500;
    if (money < price) {
      setOfficeMessage(`Для Stage ${carUpgradeRef.current + 1} нужно ${price.toLocaleString("ru-RU")} ₽.`);
      return;
    }
    const nextMoney = money - price;
    carUpgradeRef.current += 1;
    setCarUpgrade(carUpgradeRef.current);
    setMoney(nextMoney);
    persist(residentsRef.current, nextMoney, reputation);
    setOfficeMessage(`Двигатель улучшен до Stage ${carUpgradeRef.current}. Максимальная скорость и разгон выросли.`);
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
    setOfficeZone("console");
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
  const mapCenterX =
    playerPos.x < 220
      ? 0
      : playerPos.x > 3780
        ? 4000
        : Math.round(playerPos.x / 300) * 300;

  return (
    <main
      className={`game-shell ${
        weather === "Гроза"
          ? "weather-storm"
          : weather === "Дождь"
            ? "weather-rain"
            : weather === "Облачно"
              ? "weather-cloudy"
              : "weather-clear"
      }`}
      aria-label="Игра Пульт охраны"
    >
      <div className="world-viewport" ref={mountRef} aria-label="Трёхмерный посёлок" />
      {(weather === "Дождь" || weather === "Гроза") && (
        <div className={`weather-screen ${weather === "Гроза" ? "storm" : "rain"}`} aria-hidden="true" />
      )}
      {energy < 20 && mode === "world" && <div className="fatigue-vignette" aria-hidden="true" />}

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
            <small>{driving ? "За рулём" : movementState}{energy < 20 ? " · усталость" : ""}</small>
          </div>
          {driving && (
            <div className="vehicle-card">
              <div className="vehicle-speed"><b>{carTelemetry.speed}</b><span>км/ч</span></div>
              <div className="vehicle-data">
                <span>{carTelemetry.surface} · двигатель {carUpgrade + 1}/4</span>
                <span>Топливо {Math.round(carTelemetry.fuel)}% · износ {Math.round(carTelemetry.wear)}%</span>
                <div className="vehicle-gauge"><i style={{ width: `${carTelemetry.fuel}%` }} /></div>
              </div>
            </div>
          )}
          <div className="controls-hint">
            {driving ? (
              <><kbd>WASD</kbd> вести <kbd>Space</kbd> ручник <kbd>ПКМ</kbd> осмотреться <kbd>E</kbd> выйти</>
            ) : (
              <><kbd>WASD</kbd> двигаться <kbd>Shift</kbd> бег <kbd>ПКМ</kbd> камера <kbd>Tab</kbd> планшет</>
            )}
          </div>
          <div className="route-card">
            <b>{locationName}</b>
            <span>{locationName === "Первореченское" ? `До станицы Динской: ${distanceToDinskaya.toFixed(1)} км` : "Маршрут Первореченское — 4 км"}</span>
          </div>
          <div className="minimap" aria-label="Миникарта">
            <span className="compass-n">С</span>
            {Math.abs(mapCenterX) < 240 && <div className="map-river" />}
            <div className="map-road" />
            {(Math.abs(mapCenterX) < 240 || Math.abs(mapCenterX - 4000) < 240) && <div className="map-road vertical" />}
            {Math.abs(mapCenterX) < 240 && residents.map((r) => (
              <span key={`h-${r.id}`} className={`map-home ${r.signed ? "signed" : ""}`} style={{ left: mapPos(r.x - mapCenterX, 180), top: mapPos(-r.z, 190) }} />
            ))}
            {Math.abs(mapCenterX) < 240 && residents.filter((r) => !r.signed).map((r) => (
              <span key={`n-${r.id}`} className="map-npc" style={{ left: mapPos(r.x + 5 - mapCenterX, 180), top: mapPos(-(r.z + (r.z > 0 ? -5 : 5)), 190) }} />
            ))}
            {WORLD_KEY_POINTS.filter((point) => Math.abs(point.x - mapCenterX) < 180).map((point) => (
              <span
                key={`key-${point.id}`}
                className={`map-key map-key-${point.kind}`}
                title={point.label}
                style={{ left: mapPos(point.x - mapCenterX, 180), top: mapPos(-point.z, 190) }}
              >
                {point.short}
              </span>
            ))}
            <span className="map-player" style={{ left: mapPos(playerPos.x - mapCenterX, 180), top: mapPos(-playerPos.z, 190) }} />
          </div>
          {mode === "world" && (nearest || (driving && carTelemetry.speed < 5)) && (
            <div className="interaction-prompt">
              <span className="key">E</span>
              <span>{driving ? "Выйти из машины" : `Поговорить · ${nearest?.name}`}</span>
            </div>
          )}
          {mode === "world" && !driving && nearCar && !nearest && (
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
              <button className={`tablet-tab ${tabletTab === "wardrobe" ? "active" : ""}`} onClick={() => setTabletTab("wardrobe")}>Гардероб</button>
              <button className={`tablet-tab ${tabletTab === "clients" ? "active" : ""}`} onClick={() => setTabletTab("clients")}>Жители и договоры</button>
              <button className={`tablet-tab ${tabletTab === "finance" ? "active" : ""}`} onClick={() => setTabletTab("finance")}>Финансы</button>
              <button className={`tablet-tab ${tabletTab === "map" ? "active" : ""}`} onClick={() => setTabletTab("map")}>Карта и смена</button>
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
              {tabletTab === "wardrobe" && <>
                <div className="wardrobe-head">
                  <div>
                    <small>Кастомизация героя</small>
                    <h1>Гардероб Алексея</h1>
                    <p>Одежда меняет внешний вид и даёт небольшие ситуационные бонусы. Купленные комплекты сохраняются.</p>
                  </div>
                  <span className="outfit-current">Сейчас: {OUTFIT_BY_ID[outfitId].name}</span>
                </div>
                <div className="wardrobe-grid">
                  {OUTFITS.map((outfit) => {
                    const owned = ownedOutfits.includes(outfit.id);
                    const active = outfitId === outfit.id;
                    return (
                      <article key={outfit.id} className={`outfit-card ${active ? "active" : ""}`}>
                        <div className="outfit-preview" style={{ background: outfit.preview }}>
                          <span style={{ background: outfit.outer }} />
                          <i style={{ background: outfit.top }} />
                          <b style={{ background: outfit.pants }} />
                        </div>
                        <div className="outfit-copy">
                          <small>{outfit.subtitle}</small>
                          <h3>{outfit.name}</h3>
                          <p>{outfit.description}</p>
                          <div className="outfit-mods">
                            {outfit.trust !== 0 && <span>Доверие {outfit.trust > 0 ? "+" : ""}{outfit.trust}%</span>}
                            {outfit.speed !== 1 && <span>Скорость {outfit.speed > 1 ? "+" : ""}{Math.round((outfit.speed - 1) * 100)}%</span>}
                            {outfit.energy !== 1 && <span>Расход энергии {outfit.energy < 1 ? "−" : "+"}{Math.abs(Math.round((outfit.energy - 1) * 100))}%</span>}
                            {outfit.ground !== 1 && <span>Грунт +{Math.round((outfit.ground - 1) * 100)}%</span>}
                          </div>
                          <button
                            className={active ? "outfit-button active" : "outfit-button"}
                            onClick={() => handleOutfit(outfit)}
                            disabled={active}
                          >
                            {active ? "Надето" : owned ? "Надеть" : `Купить · ${outfit.price.toLocaleString("ru-RU")} ₽`}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
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
                  <button className="primary-btn" onClick={cycleWeather}>Сменить погоду: {weather}</button>
                  <button className="soft-btn" style={{ color: "#315c45", borderColor: "#bfc8b8" }} onClick={resetSave}>Начать заново</button>
                </div>
              </>}
              {tabletTab === "map" && <>
                <h1>Карта района</h1>
                <p>Первореченское и станица Динская · маршрут 4 км. Положение Алексея обновляется во время движения.</p>
                <div className="tablet-map-layout">
                  <div className="world-map" aria-label="Большая карта района">
                    <div className="world-map-field north" />
                    <div className="world-map-field south" />
                    <div className="world-map-road" />
                    <div className="world-map-cross first" />
                    <div className="world-map-cross second" />
                    <div className="world-map-river" />
                    <div className="world-village first"><b>Первореченское</b><small>офис · школа · магазин</small></div>
                    <div className="world-village second"><b>станица Динская</b><small>центр · школа · магазин</small></div>
                    {residents.map((resident) => (
                      <span
                        key={`tablet-house-${resident.id}`}
                        className={`world-house ${resident.signed ? "signed" : ""}`}
                        title={`${resident.address}${resident.signed ? " · охраняется" : " · потенциальный клиент"}`}
                        style={{ left: worldMapX(resident.x), top: worldMapZ(resident.z) }}
                      />
                    ))}
                    {WORLD_KEY_POINTS.map((point) => (
                      <span
                        key={`tablet-point-${point.id}`}
                        className={`world-point world-point-${point.kind}`}
                        title={point.label}
                        style={{ left: worldMapX(point.x), top: worldMapZ(point.z) }}
                      >
                        {point.short}
                      </span>
                    ))}
                    <span
                      className="world-player"
                      title="Алексей"
                      style={{ left: worldMapX(playerPos.x), top: worldMapZ(playerPos.z) }}
                    >
                      А
                    </span>
                  </div>
                  <aside className="map-legend">
                    <h3>Легенда</h3>
                    <div><i className="legend-player">А</i><span>Алексей</span></div>
                    <div><i className="legend-point">О</i><span>Ключевая точка</span></div>
                    <div><i className="legend-house" /><span>Дом клиента</span></div>
                    <div><i className="legend-house signed" /><span>Дом на охране</span></div>
                    <div><i className="legend-road" /><span>Основная дорога</span></div>
                    <small>Текущее место:<br /><b>{locationName}</b></small>
                  </aside>
                </div>
                <div className="map-progress">
                  <span>Открытие пульта: <b>{signedCount} / 10 договоров</b></span>
                  <span>{signedCount >= 10 ? "Пульт открыт" : `Осталось ${Math.max(0, 10 - signedCount)}`}</span>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                  <button className="primary-btn" onClick={() => startOffice(false)}>Начать смену на пульте</button>
                  <button className="soft-btn" style={{ color: "#315c45", borderColor: "#bfc8b8" }} onClick={() => startOffice(true)}>Учебная тревога</button>
                </div>
              </>}
            </div>
          </div>
        </section>
      )}

      {mode === "office" && (
        <section className={`overlay office office-${officeZone}`}>
          <aside className="office-side">
            <small>Охранное предприятие</small>
            <h2>«Пульт 01»</h2>
            <p>ПервоРеченское<br />Офис и гараж</p>
            <div className="office-nav">
              <button className={officeZone === "console" ? "active" : ""} onClick={() => setOfficeZone("console")}>● Пультовая</button>
              <button className={officeZone === "manager" ? "active" : ""} onClick={() => setOfficeZone("manager")}>Кабинет менеджера</button>
              <button className={officeZone === "rest" ? "active" : ""} onClick={() => setOfficeZone("rest")}>Комната отдыха</button>
              <button className={officeZone === "storage" ? "active" : ""} onClick={() => setOfficeZone("storage")}>Склад оборудования</button>
              <button className={officeZone === "garage" ? "active" : ""} onClick={() => setOfficeZone("garage")}>Гараж</button>
            </div>
            <button className="office-exit" onClick={() => setMode("world")}>E · Выйти из офиса</button>
          </aside>
          <div className="office-main">
            {officeZone === "console" && <>
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
            </>}
            {officeZone === "manager" && (
              <div className="office-room">
                <div className="office-header">
                  <div><small>Рабочая зона</small><h1>Кабинет менеджера</h1></div>
                  <span className="live-pill calm">Дела фирмы</span>
                </div>
                <p className="office-room-message">{officeMessage}</p>
                <div className="office-zone-grid">
                  <button className="office-zone-card desk" onClick={() => handleOfficeAction("brochures")}>
                    <span>▤</span><b>Подготовить буклеты</b><small>Собрать материалы для встреч · репутация +1</small>
                  </button>
                  <button className="office-zone-card books" onClick={() => handleOfficeAction("study")}>
                    <span>▥</span><b>Курс переговоров</b><small>Учебник и видеокурс · 600 ₽ · репутация +2</small>
                  </button>
                  <div className="office-zone-card passive">
                    <span>◷</span><b>План на смену</b><small>{signedCount}/10 объектов · доход {monthlyIncome.toLocaleString("ru-RU")} ₽/мес.</small>
                  </div>
                </div>
              </div>
            )}
            {officeZone === "rest" && (
              <div className="office-room">
                <div className="office-header">
                  <div><small>Уютный уголок</small><h1>Комната отдыха</h1></div>
                  <span className="live-pill calm">Тихо</span>
                </div>
                <p className="office-room-message">{officeMessage}</p>
                <div className="office-zone-grid">
                  <button className="office-zone-card coffee" onClick={() => handleOfficeAction("coffee")} disabled={!coffeeReady}>
                    <span>☕</span><b>{coffeeReady ? "Сварить кофе" : "Кофе готовится"}</b><small>Энергия +15 · кофемашине нужна минута</small>
                  </button>
                  <button className="office-zone-card sofa" onClick={() => handleOfficeAction("sleep")}>
                    <span>▰</span><b>Отдохнуть на диване</b><small>Полностью восстановить энергию · время +3 часа</small>
                  </button>
                  <div className="office-zone-card passive radio">
                    <span>◉</span><b>Радио посёлка</b><small>Спокойная музыка и сводка погоды: {weather.toLowerCase()}</small>
                  </div>
                </div>
              </div>
            )}
            {officeZone === "storage" && (
              <div className="office-room">
                <div className="office-header">
                  <div><small>Учёт комплектов</small><h1>Склад оборудования</h1></div>
                  <span className="live-pill calm">{equipment} комплектов</span>
                </div>
                <p className="office-room-message">{officeMessage}</p>
                <div className="office-zone-grid">
                  <button className="office-zone-card storage" onClick={() => handleOfficeAction("restock")}>
                    <span>▦</span><b>Закупить 10 комплектов</b><small>Датчики, сирены и контрольные блоки · 1 500 ₽</small>
                  </button>
                  <div className="office-zone-card passive">
                    <span>⌁</span><b>На складе</b><small>{equipment} монтажных комплектов · хватит на {equipment} новых объектов</small>
                  </div>
                  <div className="office-zone-card passive">
                    <span>⊙</span><b>Резерв питания</b><small>Генератор исправен · связь стабильна</small>
                  </div>
                </div>
              </div>
            )}
            {officeZone === "garage" && (
              <div className="office-room">
                <div className="office-header">
                  <div><small>Мастерская</small><h1>Гараж и старая «девятка»</h1></div>
                  <span className="live-pill calm">Двигатель {carUpgrade + 1}/4</span>
                </div>
                <p className="office-room-message">{officeMessage}</p>
                <div className="garage-stage">
                  <div className="garage-car"><i /><span /><b /></div>
                  <div>
                    <small>Состояние автомобиля</small>
                    <h3>Топливо {Math.round(carTelemetry.fuel)}% · износ {Math.round(carTelemetry.wear)}%</h3>
                    <p>Улучшение повышает тягу и максимальную скорость. На грунте машина всё равно требует аккуратной работы рулём.</p>
                    <button className="garage-upgrade" onClick={() => handleOfficeAction("upgrade")} disabled={carUpgrade >= 3}>
                      {carUpgrade >= 3 ? "Максимальная комплектация" : `Установить улучшение · ${(7000 + carUpgrade * 4500).toLocaleString("ru-RU")} ₽`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
