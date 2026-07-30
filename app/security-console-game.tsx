"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import * as THREE from "three";

type ReplyKind = "info" | "empathy" | "business" | "pressure";
type GameMode = "intro" | "network" | "world" | "dialogue" | "tablet" | "map" | "pause" | "tariff" | "office" | "station" | "transit";
type OutfitId = "casual" | "manager" | "operator" | "rain";
type OfficeZone = "console" | "manager" | "rest" | "storage" | "garage";
type WeatherKind = "Ясно" | "Облачно" | "Дождь" | "Гроза";
type SurfaceKind = "Асфальт" | "Грунт" | "Трава";
type MovementState = "Покой" | "Шаг" | "Быстрый шаг" | "Бег трусцой";
type TabletTab = "hero" | "quests" | "wardrobe" | "clients" | "contracts" | "development" | "fleet" | "shops" | "finance" | "profile" | "rating" | "saves";
type SaveSlotId = "auto" | "slot1" | "slot2" | "slot3";
type PrivacyMode = "all" | "summary" | "hidden";
type AvatarId = "avatar_01" | "avatar_02" | "avatar_03" | "avatar_04";
type DistrictId = "central" | "residential" | "industrial" | "elite";
type VehicleId = "old_sedan" | "oka" | "granta" | "camry" | "largus" | "niva" | "pickup" | "gazelle" | "supra" | "enduro";
type DrivingSide = "right" | "left";

type StaffState = {
  dispatchers: number;
  gbrCrews: number;
  technicians: number;
  salesManagers: number;
  cleaners: number;
};

type LoanState = {
  principal: number;
  months: number;
} | null;

type QuestStatus = "active" | "completed" | "failed";
type QuestCategory = "main" | "side" | "dynamic" | "daily";
type QuestProgress = {
  id: string;
  status: QuestStatus;
  tracked: boolean;
  read: boolean;
};

type DailyMetric = "contracts" | "talks" | "alarms" | "drive_km" | "drifts" | "office_actions" | "upgrades" | "profit";
type DailyChallengeProgress = {
  id: string;
  metric: DailyMetric;
  progress: number;
  claimed: boolean;
  tracked: boolean;
};
type DailyChallengeState = {
  lastUpdateDate: string;
  lastLoginDate: string;
  streakCount: number;
  previousIds: string[];
  bonusClaimed: boolean;
  activeChallenges: DailyChallengeProgress[];
};

type NetworkPlayer = {
  id: string;
  name: string;
  avatar: AvatarId;
  x: number;
  z: number;
  rotation: number;
  role: "Менеджер" | "Оператор" | "ГБР";
  host: boolean;
};

type NetworkChatMessage = {
  id: string;
  author: string;
  text: string;
  sentAt: string;
};

type AlarmEvent = {
  scenario: "false" | "intrusion" | "fire" | "panic";
  type: string;
  address: string;
  client: string;
  tariff: "Эконом" | "Стандарт" | "Премиум";
  sensors: string[];
  history: string;
  correct: "call" | "gbr" | "fire" | "police";
  timeout: number;
};

type PlayerProfile = {
  id: string;
  nickname: string;
  avatar: AvatarId;
  privacy: PrivacyMode;
  createdAt: string;
};

type PlayerStatistics = {
  totalContracts: number;
  alarmsResponded: number;
  falseAlarms: number;
  successfulPreventions: number;
  kmWalked: number;
  kmDriven: number;
  maxIncome: number;
  playTimeSeconds: number;
  citizenRating: number;
};

type MapNote = {
  id: string;
  text: string;
  x: number;
  z: number;
};

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
  energy?: number;
  gameTime?: number;
  weather?: WeatherKind;
  playerPos?: { x: number; z: number };
  carPos?: { x: number; z: number };
  carFuel?: number;
  carWear?: number;
  profile?: PlayerProfile;
  statistics?: PlayerStatistics;
  achievements?: string[];
  mapNotes?: MapNote[];
  extendedContracts?: string[];
  openedBranches?: DistrictId[];
  staff?: StaffState;
  ownedVehicles?: VehicleId[];
  currentVehicle?: VehicleId | null;
  loan?: LoanState;
  businessMonth?: number;
  officeRented?: boolean;
  quests?: QuestProgress[];
  dailyChallenges?: DailyChallengeState;
  vehicleSiren?: boolean;
  carClean?: boolean;
  seasonalTires?: boolean;
};

type SaveEnvelope = {
  version: "2.0.0";
  slot: SaveSlotId;
  saveName: string;
  savedAt: string;
  checksum: string;
  data: SaveData;
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

type TrafficVehicle = {
  mesh: THREE.Group;
  direction: 1 | -1;
  speed: number;
  laneZ: number;
  minX: number;
  maxX: number;
};

type BusPassenger = {
  mesh: THREE.Group;
  stopIndex: number;
  direction: 1 | -1;
  targetStop: number;
  state: "waiting" | "boarding" | "riding" | "exiting";
  progress: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

type TrafficIncident = {
  title: string;
  detail: string;
  fine: number;
};

type BusStopSpec = {
  id: "pervorechenskoe" | "highway" | "dinskaya";
  name: string;
  x: number;
  z: number;
};

type StationService =
  | "fuel10"
  | "fuel20"
  | "fuelFull"
  | "wash"
  | "oil"
  | "tires"
  | "coffee"
  | "snack"
  | "battery"
  | "map"
  | "leaflets";

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

type DistrictSpec = {
  id: DistrictId;
  name: string;
  subtitle: string;
  x: number;
  reputation: number;
  contracts: number;
  openingCost: number;
  monthlyRent: number;
  color: string;
};

type SecurityObject = {
  id: string;
  district: DistrictId;
  name: string;
  address: string;
  objectType: string;
  commercial: boolean;
  installation: [number, number];
  monthly: [number, number];
};

type VehicleSpec = {
  id: VehicleId;
  name: string;
  className: string;
  price: number;
  usedPrice: number;
  maxSpeed: number;
  fuelUse: number;
  capacity: number;
  description: string;
};

const DISTRICTS: DistrictSpec[] = [
  { id: "central", name: "Центральный район", subtitle: "Первореченское", x: 0, reputation: 0, contracts: 10, openingCost: 0, monthlyRent: 5000, color: "#8fb6a5" },
  { id: "residential", name: "Жилой район", subtitle: "Новые кварталы", x: 1350, reputation: 25, contracts: 20, openingCost: 20000, monthlyRent: 7000, color: "#c7ad78" },
  { id: "industrial", name: "Промышленный район", subtitle: "Склады и производства", x: 2700, reputation: 45, contracts: 35, openingCost: 35000, monthlyRent: 9000, color: "#88929b" },
  { id: "elite", name: "Элитный район", subtitle: "ст. Динская", x: 4000, reputation: 65, contracts: 50, openingCost: 50000, monthlyRent: 12000, color: "#b99c79" },
];

const RESIDENTIAL_PRICES = [
  { type: "Частный дом", install: [3000, 15000] as [number, number], monthly: [500, 3000] as [number, number] },
  { type: "Таунхаус", install: [2500, 12000] as [number, number], monthly: [400, 2500] as [number, number] },
  { type: "Квартира", install: [2000, 10000] as [number, number], monthly: [300, 2000] as [number, number] },
  { type: "Коттедж", install: [5000, 22000] as [number, number], monthly: [800, 4500] as [number, number] },
  { type: "Особняк", install: [10000, 45000] as [number, number], monthly: [1500, 8000] as [number, number] },
  { type: "Дача", install: [2000, 8000] as [number, number], monthly: [250, 1200] as [number, number] },
];

const COMMERCIAL_PRICES = [
  { type: "Продуктовый магазин", install: [12000, 25000] as [number, number], monthly: [3000, 6000] as [number, number] },
  { type: "Аптека", install: [15000, 30000] as [number, number], monthly: [4000, 8000] as [number, number] },
  { type: "Кафе", install: [18000, 35000] as [number, number], monthly: [5000, 10000] as [number, number] },
  { type: "Автосервис", install: [14000, 28000] as [number, number], monthly: [3500, 7000] as [number, number] },
  { type: "Склад", install: [25000, 50000] as [number, number], monthly: [6000, 12000] as [number, number] },
  { type: "Школа", install: [30000, 60000] as [number, number], monthly: [10000, 20000] as [number, number] },
];

const SECURITY_OBJECTS: SecurityObject[] = DISTRICTS.flatMap((district, districtIndex) =>
  Array.from({ length: 15 }, (_, index) => {
    const commercial = index >= 10;
    const price = commercial
      ? COMMERCIAL_PRICES[(index + districtIndex) % COMMERCIAL_PRICES.length]
      : RESIDENTIAL_PRICES[(index + districtIndex) % RESIDENTIAL_PRICES.length];
    const street = ["Садовая", "Новая", "Школьная", "Промышленная", "Кленовая"][index % 5];
    return {
      id: `${district.id}-${index + 1}`,
      district: district.id,
      name: commercial ? price.type : `${price.type} № ${districtIndex * 15 + index + 1}`,
      address: `${street}, ${districtIndex * 20 + index + 1}`,
      objectType: price.type,
      commercial,
      installation: price.install,
      monthly: price.monthly,
    };
  }),
);

const VEHICLES: VehicleSpec[] = [
  { id: "old_sedan", name: "Старый седан", className: "Стартовый", price: 15000, usedPrice: 9000, maxSpeed: 90, fuelUse: 8.8, capacity: 4, description: "Верный, простой и уже ваш." },
  { id: "oka", name: "Ока city", className: "Микролитражка", price: 25000, usedPrice: 12000, maxSpeed: 80, fuelUse: 3.5, capacity: 2, description: "Экономична и удобна на узких улицах." },
  { id: "granta", name: "Лада Гранта", className: "Седан эконом", price: 45000, usedPrice: 25000, maxSpeed: 150, fuelUse: 6, capacity: 4, description: "Надёжная рабочая машина менеджера." },
  { id: "camry", name: "Toyota Camry", className: "Седан бизнес", price: 90000, usedPrice: 55000, maxSpeed: 190, fuelUse: 8.5, capacity: 4, description: "Повышает доверие премиальных клиентов." },
  { id: "largus", name: "Лада Ларгус", className: "Универсал", price: 65000, usedPrice: 35000, maxSpeed: 155, fuelUse: 7, capacity: 5, description: "Перевозит до 200 кг оборудования." },
  { id: "niva", name: "Нива 4×4", className: "Внедорожник", price: 70000, usedPrice: 40000, maxSpeed: 135, fuelUse: 10, capacity: 4, description: "Уверенно идёт по грунту и полям." },
  { id: "pickup", name: "УАЗ Пикап", className: "Пикап", price: 80000, usedPrice: 45000, maxSpeed: 145, fuelUse: 11, capacity: 2, description: "Перевозит до 500 кг и мобильный пульт." },
  { id: "gazelle", name: "Газель ГБР", className: "Фургон", price: 120000, usedPrice: 70000, maxSpeed: 125, fuelUse: 14, capacity: 6, description: "Экипаж ГБР и до 1000 кг оборудования." },
  { id: "supra", name: "Supra lowpoly", className: "Спорткар", price: 180000, usedPrice: 100000, maxSpeed: 230, fuelUse: 15, capacity: 2, description: "Очень быстрая, престижная и непрактичная." },
  { id: "enduro", name: "Эндуро 250", className: "Мотоцикл", price: 35000, usedPrice: 20000, maxSpeed: 125, fuelUse: 3, capacity: 1, description: "Проезжает по тропинкам, но не возит груз." },
];

const VEHICLE_BY_ID = Object.fromEntries(VEHICLES.map((vehicle) => [vehicle.id, vehicle])) as Record<VehicleId, VehicleSpec>;
const EMPTY_STAFF: StaffState = { dispatchers: 0, gbrCrews: 0, technicians: 0, salesManagers: 0, cleaners: 0 };
const STAFF_ROLES = [
  { key: "dispatchers", name: "Диспетчер", salary: 8000, description: "Обрабатывает обычные тревоги." },
  { key: "gbrCrews", name: "Экипаж ГБР", salary: 12000, description: "Выезжает на реальные угрозы." },
  { key: "technicians", name: "Техник", salary: 7000, description: "Обслуживает оборудование клиентов." },
  { key: "salesManagers", name: "Менеджер продаж", salary: 6000, description: "Готовит новые договоры." },
  { key: "cleaners", name: "Уборщик", salary: 2000, description: "Поддерживает офис и настроение команды." },
] as const;

const QUESTS = [
  {
    id: "quest_first_car",
    category: "main" as QuestCategory,
    icon: "★",
    title: "Дела на колёсах",
    short: "Накопить 20 000 ₽ и купить первый автомобиль.",
    full: "Алексей приехал в Первореченское рейсовым автобусом. Пока личной машины нет, нужно ходить пешком, пользоваться маршрутом №21 и накопить на первые колёса.",
    reward: "Достижение «Первые колёса» · доступ к заданиям по вождению",
    target: { x: 1390, z: 34, label: "Автосалон" },
  },
  {
    id: "quest_open_office",
    category: "main" as QuestCategory,
    icon: "★",
    title: "Открыть своё дело",
    short: "Набрать первые договоры и арендовать центральный офис.",
    full: "Алексей вернулся домой с 15 000 ₽ и без автомобиля. Чтобы запустить пульт, нужно убедить жителей доверить ему первые десять объектов и оформить офис.",
    reward: "5 000 ₽ · +20 репутации · режим пульта",
    target: { x: 92, z: -18, label: "Центральный офис" },
  },
  {
    id: "quest_garage_secrets",
    category: "side" as QuestCategory,
    icon: "!",
    title: "Гаражные тайны",
    short: "Помочь Семёну Петровичу с датчиком в гараже.",
    full: "Семён согласен испытать систему, если Алексей лично проверит гараж и привезёт комплект датчиков.",
    reward: "2 000 ₽ · гаечный ключ · +5 репутации",
    target: { x: -48, z: 20, label: "Гараж Семёна Петровича" },
  },
  {
    id: "quest_false_alarm_wave",
    category: "dynamic" as QuestCategory,
    icon: "⚡",
    title: "Эпидемия ложных тревог",
    short: "Проверить серию подозрительных срабатываний.",
    full: "В районе участились одиночные сигналы движения. Сравните журнал пульта и правильно обработайте три тревоги.",
    reward: "4 500 ₽ · +8 репутации",
    target: { x: 18, z: 52, label: "Проблемный объект" },
  },
  {
    id: "quest_daily_sales",
    category: "daily" as QuestCategory,
    icon: "◷",
    title: "Два договора за день",
    short: "Заключить два новых договора.",
    full: "Ежедневная задача отдела продаж. Хороший способ пополнить оборотные средства.",
    reward: "1 000 ₽ · +2 репутации",
    target: { x: 3, z: -22, label: "Доска объявлений" },
  },
  {
    id: "quest_competitor",
    category: "main" as QuestCategory,
    icon: "★",
    title: "Конкурент",
    short: "Подготовиться к противостоянию с ЧОП «Витязь».",
    full: "После первого успешного месяца конкуренты пытаются переманить клиентов. Поговорите с тремя жильцами, найдите свидетельства и подготовьтесь к собранию.",
    reward: "Уникальный значок · +30 репутации",
    target: { x: 1350, z: 20, label: "Собрание жильцов" },
  },
] as const;

const DEFAULT_QUESTS: QuestProgress[] = [
  { id: "quest_first_car", status: "active", tracked: true, read: false },
  { id: "quest_open_office", status: "active", tracked: true, read: false },
  { id: "quest_false_alarm_wave", status: "active", tracked: false, read: true },
  { id: "quest_daily_sales", status: "active", tracked: false, read: true },
];

const DAILY_CHALLENGES = [
  { id: "daily_contracts", category: "manager", icon: "●", title: "День контрактов", description: "Заключите 2 новых договора", metric: "contracts" as DailyMetric, target: 2, money: 600, reputation: 18 },
  { id: "daily_talks", category: "manager", icon: "●", title: "Соседская дипломатия", description: "Поговорите с 5 жителями", metric: "talks" as DailyMetric, target: 5, money: 450, reputation: 15 },
  { id: "daily_alarms", category: "console", icon: "◆", title: "Быстрая реакция", description: "Обработайте 3 тревоги", metric: "alarms" as DailyMetric, target: 3, money: 800, reputation: 25 },
  { id: "daily_shift", category: "console", icon: "◆", title: "Дежурный", description: "Примите решение по одной тревоге", metric: "alarms" as DailyMetric, target: 1, money: 500, reputation: 14 },
  { id: "daily_drive", category: "driving", icon: "◉", title: "Драйв", description: "Проедьте 10 км", metric: "drive_km" as DailyMetric, target: 10, money: 700, reputation: 20 },
  { id: "daily_drift", category: "driving", icon: "◉", title: "Король дрифта", description: "Совершите 5 управляемых заносов", metric: "drifts" as DailyMetric, target: 5, money: 650, reputation: 18 },
  { id: "daily_mechanic", category: "driving", icon: "◉", title: "Механик", description: "Улучшите или купите автомобиль", metric: "upgrades" as DailyMetric, target: 1, money: 550, reputation: 16 },
  { id: "daily_office", category: "universal", icon: "★", title: "Порядок в офисе", description: "Выполните 2 действия в офисе", metric: "office_actions" as DailyMetric, target: 2, money: 400, reputation: 12 },
  { id: "daily_profit", category: "universal", icon: "★", title: "Финансист", description: "Заработайте 5 000 ₽", metric: "profit" as DailyMetric, target: 5000, money: 800, reputation: 22 },
] as const;

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function createDailyChallenges(previous: DailyChallengeState | undefined, officeAvailable: boolean, hasVehicle: boolean): DailyChallengeState {
  const today = localDateKey();
  if (previous?.lastUpdateDate === today && (hasVehicle || previous.activeChallenges.every((challenge) => challenge.metric !== "drive_km" && challenge.metric !== "drifts" && challenge.metric !== "upgrades"))) return previous;
  const previousIds = previous?.activeChallenges.map((challenge) => challenge.id) ?? [];
  const categories = hasVehicle
    ? officeAvailable
      ? ["manager", "console", "driving", "universal"]
      : ["manager", "manager", "driving", "universal"]
    : officeAvailable
      ? ["manager", "console", "universal", "manager"]
      : ["manager", "manager", "universal", "universal"];
  const seed = Number(today.replaceAll("-", ""));
  const selectedIds: string[] = [];
  const activeChallenges = categories.map((category, index) => {
    const available = DAILY_CHALLENGES.filter((challenge) => challenge.category === category && !previousIds.includes(challenge.id) && !selectedIds.includes(challenge.id));
    const fallback = DAILY_CHALLENGES.filter((challenge) => challenge.category === category && !selectedIds.includes(challenge.id));
    const pool = available.length ? available : fallback;
    const selected = pool[(seed + index * 7) % pool.length];
    selectedIds.push(selected.id);
    return { id: selected.id, metric: selected.metric, progress: 0, claimed: false, tracked: index < 2 };
  });
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = previous?.lastLoginDate === localDateKey(yesterday);
  return {
    lastUpdateDate: today,
    lastLoginDate: today,
    streakCount: continued ? previous.streakCount : 0,
    previousIds,
    bonusClaimed: false,
    activeChallenges,
  };
}

function createAlarmEvent(): AlarmEvent {
  const roll = Math.random();
  const tariff = (["Эконом", "Стандарт", "Премиум"] as const)[Math.floor(Math.random() * 3)];
  const timeout = tariff === "Эконом" ? 45 : tariff === "Стандарт" ? 60 : 90;
  if (roll < 0.7) return { scenario: "false", type: "Датчик движения", address: "Садовая, 5 · гараж", client: "Семён Петрович", tariff, sensors: ["Движение: гараж"], history: "1 ложная тревога · обслуживание 12 дней назад", correct: "call", timeout };
  if (roll < 0.85) return { scenario: "intrusion", type: "Проникновение", address: "Новая, 12 · первый этаж", client: "Алина", tariff, sensors: ["Открытие окна", "Движение: холл", "Разбитие стекла"], history: "Ранее сигналов не было", correct: "gbr", timeout };
  if (roll < 0.95) return { scenario: "fire", type: "Пожарная тревога", address: "Школьная, 4 · кухня", client: "Ольга", tariff, sensors: ["Дым", "Температура +18°C", "Дым: коридор"], history: "Датчики проверены 4 дня назад", correct: "fire", timeout };
  return { scenario: "panic", type: "Кнопка паники", address: "Советская, 21 · двор", client: "Андрей", tariff: "Премиум", sensors: ["Ручная тревога", "Шум у входа"], history: "Высший приоритет · клиент на связи", correct: "police", timeout: 90 };
}

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
  { id: "residential-office", label: "Жилой филиал", short: "О", x: 1350, z: -34, kind: "office" },
  { id: "dealer", label: "Автосалон", short: "А", x: 1390, z: 34, kind: "service" },
  { id: "industrial-office", label: "Промышленный филиал", short: "О", x: 2700, z: -34, kind: "office" },
  { id: "warehouse", label: "Складской комплекс", short: "С", x: 2745, z: 42, kind: "service" },
  { id: "bank", label: "Банк", short: "Б", x: 3970, z: 26, kind: "service" },
  { id: "gas-pervorechenskoe", label: "АЗС «Первореченская»", short: "АЗС", x: 250, z: -34, kind: "service" },
  { id: "gas-dinskaya", label: "АЗС «Динская»", short: "АЗС", x: 3750, z: 34, kind: "service" },
  { id: "bus-pervorechenskoe", label: "Остановка «Первореченское»", short: "А", x: 125, z: -18, kind: "transit" },
  { id: "bus-highway", label: "Остановка «Трасса»", short: "А", x: 2000, z: -18, kind: "transit" },
  { id: "bus-dinskaya", label: "Остановка «Динская»", short: "А", x: 3875, z: -18, kind: "transit" },
  { id: "river", label: "Река Кочеты", short: "Р", x: 0, z: 180, kind: "nature" },
  { id: "dinskaya", label: "Центр станицы Динской", short: "Д", x: 4000, z: -24, kind: "village" },
] as const;

const BUS_STOPS: BusStopSpec[] = [
  { id: "pervorechenskoe", name: "село Первореченское", x: 125, z: -18 },
  { id: "highway", name: "Трасса · промежуточная", x: 2000, z: -18 },
  { id: "dinskaya", name: "ст. Динская", x: 3875, z: -18 },
];

const DRIVING_SIDE: DrivingSide = "right";
const BUS_STOP_DWELL_GAME_MINUTES = 5;
const laneZForDirection = (direction: 1 | -1, offset: number) =>
  DRIVING_SIDE === "right"
    ? direction > 0
      ? offset
      : -offset
    : direction > 0
      ? -offset
      : offset;
// The main road is viewed along its X axis: the screen-right lane is +Z.
// Civilian cars therefore move forward (+X) on +Z and toward the player on -Z.
const civilianTrafficDirectionForLane = (laneZ: number): 1 | -1 => (laneZ > 0 ? 1 : -1);

const GAS_STATIONS = [
  { id: "pervorechenskoe", name: "АЗС «Первореченская»", x: 250, z: -34 },
  { id: "dinskaya", name: "АЗС «Динская»", x: 3750, z: 34 },
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
const worldMapXPct = (x: number) => clamp(((x + 180) / 4360) * 100, 2, 98);
const worldMapZPct = (z: number) => clamp(50 - (z / 390) * 72, 8, 92);
const worldMapX = (x: number) => `${worldMapXPct(x)}%`;
const worldMapZ = (z: number) => `${worldMapZPct(z)}%`;
const formatDistance = (distance: number) => distance < 1000 ? `${Math.round(distance)} м` : `${(distance / 1000).toFixed(1)} км`;
const DEFAULT_PLAYER_POSITION = { x: -4, z: -2 };
const DEFAULT_CAR_POSITION = { x: 0, z: -7 };
const LEGACY_SAVE_KEY = "security-console-save-v1";
const ACTIVE_SAVE_KEY = "security-console-active-save-v2";
const SAVE_SLOT_PREFIX = "security-console-slot-v2-";
const PROFILE_KEY = "security-console-profile-v2";
const STATISTICS_QUEUE_KEY = "security-console-statistics-queue-v1";

const EMPTY_STATS: PlayerStatistics = {
  totalContracts: 0,
  alarmsResponded: 0,
  falseAlarms: 0,
  successfulPreventions: 0,
  kmWalked: 0,
  kmDriven: 0,
  maxIncome: 0,
  playTimeSeconds: 0,
  citizenRating: 3.5,
};

const ACHIEVEMENTS = [
  { id: "first_contract", title: "Первый контракт", description: "Подпишите первого клиента." },
  { id: "first_wheels", title: "Первые колёса", description: "Купите первый личный автомобиль." },
  { id: "trusted_manager", title: "Заслуженное доверие", description: "Достигните 50 очков репутации." },
  { id: "road_trip", title: "Знаю каждую дорогу", description: "Проедьте 5 километров." },
  { id: "night_owl", title: "Ночной ястреб", description: "Успешно обработайте тревогу." },
] as const;

const LEADERBOARD_SEED: { rank: number; playerName: string; avatar: AvatarId; value: number; trend: "up" | "same" | "down" }[] = [];
const FUEL_TANK_LITERS = 40;

const DEFAULT_SAVE: SaveData = {
  money: 15000,
  reputation: 0,
  contracts: [],
  interests: {},
  outfit: "casual",
  ownedOutfits: ["casual"],
  carUpgrade: 0,
  energy: 100,
  gameTime: 8.25,
  weather: "Ясно",
  playerPos: DEFAULT_PLAYER_POSITION,
  carPos: DEFAULT_CAR_POSITION,
  carFuel: 0,
  carWear: 0,
  statistics: EMPTY_STATS,
  achievements: [],
  mapNotes: [],
  extendedContracts: [],
  openedBranches: ["central"],
  staff: EMPTY_STAFF,
  ownedVehicles: [],
  currentVehicle: null,
  loan: null,
  businessMonth: 1,
  officeRented: false,
  quests: DEFAULT_QUESTS,
  dailyChallenges: createDailyChallenges(undefined, false, false),
  vehicleSiren: false,
  carClean: false,
  seasonalTires: false,
};

function checksum(data: SaveData) {
  const text = JSON.stringify(data);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function migrateSave(value: Partial<SaveData> | null | undefined): SaveData {
  const ownedVehicles = Array.isArray(value?.ownedVehicles)
    ? value.ownedVehicles.filter((vehicle): vehicle is VehicleId => Boolean(VEHICLE_BY_ID[vehicle]))
    : [];
  const currentVehicle =
    value?.currentVehicle && VEHICLE_BY_ID[value.currentVehicle] && ownedVehicles.includes(value.currentVehicle)
      ? value.currentVehicle
      : ownedVehicles[0] ?? null;
  return {
    ...DEFAULT_SAVE,
    ...value,
    contracts: Array.isArray(value?.contracts) ? value.contracts : [],
    interests: value?.interests ?? {},
    ownedOutfits: Array.isArray(value?.ownedOutfits) ? value.ownedOutfits : ["casual"],
    statistics: { ...EMPTY_STATS, ...(value?.statistics ?? {}) },
    achievements: Array.isArray(value?.achievements) ? value.achievements : [],
    mapNotes: Array.isArray(value?.mapNotes) ? value.mapNotes : [],
    extendedContracts: Array.isArray(value?.extendedContracts) ? value.extendedContracts : [],
    openedBranches: Array.isArray(value?.openedBranches) ? value.openedBranches : ["central"],
    staff: { ...EMPTY_STAFF, ...(value?.staff ?? {}) },
    ownedVehicles,
    currentVehicle,
    loan: value?.loan ?? null,
    businessMonth: value?.businessMonth ?? 1,
    officeRented: value?.officeRented ?? false,
    quests: Array.isArray(value?.quests) ? value.quests : DEFAULT_QUESTS,
    dailyChallenges: createDailyChallenges(value?.dailyChallenges, value?.officeRented ?? false, ownedVehicles.length > 0),
    vehicleSiren: value?.vehicleSiren ?? false,
    carClean: value?.carClean ?? false,
    seasonalTires: value?.seasonalTires ?? false,
    carFuel: value?.carFuel === undefined ? (ownedVehicles.length > 0 ? 20 : 0) : clamp(value.carFuel > FUEL_TANK_LITERS ? value.carFuel / 100 * FUEL_TANK_LITERS : value.carFuel, 0, FUEL_TANK_LITERS),
  };
}

function createProfile(): PlayerProfile {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `player-${Date.now()}`,
    nickname: "Алексей",
    avatar: "avatar_01",
    privacy: "all",
    createdAt: new Date().toISOString(),
  };
}

function readProfile(): PlayerProfile {
  if (typeof window === "undefined") return { id: "local-player", nickname: "Алексей", avatar: "avatar_01", privacy: "all", createdAt: "2026-01-01T00:00:00.000Z" };
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return JSON.parse(saved) as PlayerProfile;
  } catch {
    // The profile is recreated if local storage was damaged.
  }
  const profile = createProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

function readEnvelope(slot: SaveSlotId): SaveEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${SAVE_SLOT_PREFIX}${slot}`);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (envelope.version !== "2.0.0" || checksum(envelope.data) !== envelope.checksum) return null;
    return { ...envelope, data: migrateSave(envelope.data) };
  } catch {
    return null;
  }
}

function writeEnvelope(slot: SaveSlotId, saveName: string, data: SaveData) {
  const migrated = migrateSave(data);
  const envelope: SaveEnvelope = {
    version: "2.0.0",
    slot,
    saveName,
    savedAt: new Date().toISOString(),
    checksum: checksum(migrated),
    data: migrated,
  };
  localStorage.setItem(`${SAVE_SLOT_PREFIX}${slot}`, JSON.stringify(envelope));
  localStorage.setItem(ACTIVE_SAVE_KEY, JSON.stringify(migrated));
  return envelope;
}

function queueStatistics(profile: PlayerProfile, statistics: PlayerStatistics) {
  if (typeof window === "undefined") return;
  const packet = { player_id: profile.id, created_at: new Date().toISOString(), statistics, checksum: checksum({ ...DEFAULT_SAVE, profile, statistics }) };
  localStorage.setItem(STATISTICS_QUEUE_KEY, JSON.stringify([packet]));
}

function surfaceAt(x: number, z: number): SurfaceKind {
  if (Math.abs(z) <= 8) return "Асфальт";
  for (const centre of DISTRICTS.map((district) => district.x)) {
    if (Math.abs(x - (centre + 18)) <= 7 && z > -165 && z < 190) return "Асфальт";
    if (Math.abs(x - centre) <= 132 && (Math.abs(z - 72) <= 6 || Math.abs(z + 72) <= 5.5)) return "Грунт";
  }
  return "Трава";
}

function readSave(): SaveData {
  if (typeof window === "undefined") return DEFAULT_SAVE;
  try {
    const active = localStorage.getItem(ACTIVE_SAVE_KEY);
    if (active) return migrateSave(JSON.parse(active) as SaveData);
    const autosave = readEnvelope("auto");
    if (autosave) return autosave.data;
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacy) return migrateSave(JSON.parse(legacy) as SaveData);
  } catch {
    // A clean start is safer than a broken save.
  }
  return DEFAULT_SAVE;
}

function residentsFromSave(save: SaveData): Resident[] {
  return RESIDENT_SEED.map((resident) => ({
    ...resident,
    interest: save.interests[resident.id] ?? 38 + ((resident.id * 7) % 13),
    signed: save.contracts.includes(resident.id),
  }));
}

function resolveCarSpawnPosition(playerPosition = DEFAULT_PLAYER_POSITION, savedCarPosition = DEFAULT_CAR_POSITION) {
  const valid = Number.isFinite(savedCarPosition.x) && Number.isFinite(savedCarPosition.z);
  const tooFarAway = valid && Math.hypot(savedCarPosition.x - playerPosition.x, savedCarPosition.z - playerPosition.z) > 500;
  if (valid && !tooFarAway) return savedCarPosition;
  return {
    x: clamp(playerPosition.x + 4, -175, 4175),
    z: clamp(playerPosition.z - 5, -190, 190),
  };
}

function clearGameStorage(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
  keys.filter((key) => key.startsWith("security-console-") || key.startsWith("pult-ohrany-")).forEach((key) => storage.removeItem(key));
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
  const grassGeometry = new THREE.ConeGeometry(0.18, 0.88, 4);
  const grass = new THREE.InstancedMesh(grassGeometry, mat(0x4f9f43), 3000);
  grass.receiveShadow = true;
  for (let i = 0; i < 3000; i++) {
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
  const trunks = new THREE.InstancedMesh(trunkGeometry, mat(0x74583e), 380);
  const crowns = new THREE.InstancedMesh(crownGeometry, mat(0x43823d), 380);
  trunks.castShadow = true;
  crowns.castShadow = true;
  for (let i = 0; i < 380; i++) {
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
  leftShoe.name = "leftShoe";
  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.33;
  rightShoe.name = "rightShoe";
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
  group.scale.setScalar(0.6);
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
  hero.scale.setScalar(0.6);
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
  const leftShoe = hero.getObjectByName("leftShoe");
  const rightShoe = hero.getObjectByName("rightShoe");
  const top = hero.getObjectByName("top");
  const outer = hero.getObjectByName("outer");
  const tablet = hero.getObjectByName("tablet");
  if (leftLeg) leftLeg.rotation.x = stride;
  if (rightLeg) rightLeg.rotation.x = -stride;
  if (leftArm) leftArm.rotation.x = -stride * 0.72;
  if (rightArm) rightArm.rotation.x = stride * 0.72;
  if (leftShoe) leftShoe.rotation.x = stride * 0.82;
  if (rightShoe) rightShoe.rotation.x = -stride * 0.82;
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
  const leftShoe = person.getObjectByName("leftShoe");
  const rightShoe = person.getObjectByName("rightShoe");
  if (leftLeg) leftLeg.rotation.x = stride;
  if (rightLeg) rightLeg.rotation.x = -stride;
  if (leftArm) leftArm.rotation.x = -stride * 0.7;
  if (rightArm) rightArm.rotation.x = stride * 0.7;
  if (leftShoe) leftShoe.rotation.x = stride * 0.78;
  if (rightShoe) rightShoe.rotation.x = -stride * 0.78;
}

function touchesBox(x: number, z: number, radius: number, collider: WorldCollider) {
  const nearestX = clamp(x, collider.x - collider.halfX, collider.x + collider.halfX);
  const nearestZ = clamp(z, collider.z - collider.halfZ, collider.z + collider.halfZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

function makeCar(bodyColor = 0xc85f4c, withDriver = false) {
  const group = new THREE.Group();
  group.name = "carRoot";
  const visual = new THREE.Group();
  visual.name = "carVisual";
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 6.2), mat(bodyColor));
  body.position.y = 1.05;
  body.name = "carBody";
  const cabinMaterial = new THREE.MeshStandardMaterial({
    color: 0x9bc1c7,
    roughness: 0.26,
    transparent: withDriver,
    opacity: withDriver ? 0.68 : 1,
    flatShading: true,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.15, 3.1), cabinMaterial);
  cabin.position.set(0, 1.95, -0.25);
  cabin.geometry.rotateX(-0.05);
  const frontLightMaterial = new THREE.MeshStandardMaterial({ color: 0xffe6ad, emissive: 0xffd37a, emissiveIntensity: 0.25 });
  const rearLightMaterial = new THREE.MeshStandardMaterial({ color: 0xa7352b, emissive: 0x7a0d08, emissiveIntensity: 0.2 });
  for (const x of [-1.03, 1.03]) {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.12), frontLightMaterial);
    front.position.set(x, 1.08, 3.15);
    front.name = "headlight";
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.12), rearLightMaterial);
    rear.position.set(x, 1.04, -3.15);
    visual.add(front, rear);
  }
  if (withDriver) {
    const driver = new THREE.Group();
    driver.name = "trafficDriver";
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.82, 6), mat(0x476b58));
    torso.position.y = 1.75;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), mat(0xdfb27f));
    head.position.y = 2.42;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4d372d));
    hair.position.y = 2.55;
    hair.scale.y = 0.45;
    // Left-hand steering wheel for right-hand traffic. The driver is seated
    // below the roofline so the head stays inside the transparent cabin.
    driver.position.set(-0.68, -0.62, 0.38);
    driver.add(torso, head, hair);
    visual.add(driver);
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

function makeTextBoard(text: string, width = 512, height = 128, background = "#f5f0df", foreground = "#28463b") {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.fillStyle = foreground;
    context.font = `bold ${text.length > 22 ? 25 : 43}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeBusStop(stop: BusStopSpec) {
  const group = new THREE.Group();
  group.name = `busStop-${stop.id}`;
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 3.2), mat(0x5f8577));
  shelter.position.y = 3.4;
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 3.2, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x9bc9c4, transparent: true, opacity: 0.62, roughness: 0.3 }),
  );
  back.position.set(0, 1.75, -1.48);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 0.9), mat(0x916b45));
  bench.position.set(0, 0.9, -0.7);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 0.2), mat(0x7d5a3c));
  benchBack.position.set(0, 1.35, -1.14);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.25), new THREE.MeshBasicMaterial({ map: makeTextBoard(`АВТОБУС · ${stop.name}`), side: THREE.FrontSide }));
  sign.position.set(0, 2.65, -1.37);
  const routePlate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.14), mat(0xf0b44e));
  routePlate.position.set(2.85, 2.0, -1.55);
  for (const x of [-3.15, 3.15]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), mat(0x314842));
    support.position.set(x, 1.7, -1.35);
    group.add(support);
  }
  group.add(shelter, back, bench, benchBack, sign, routePlate);
  group.position.set(stop.x, 0, stop.z);
  group.traverse((part) => {
    if (part instanceof THREE.Mesh) {
      part.castShadow = true;
      part.receiveShadow = true;
    }
  });
  return group;
}

function makeBus() {
  const group = new THREE.Group();
  group.name = "publicBus";
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.8, 9.2), mat(0xd7ad55));
  body.position.y = 1.8;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.35, 9.35), mat(0xf0e7cf));
  roof.position.y = 3.35;
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x8fbfc5, transparent: true, opacity: 0.68, roughness: 0.25 });
  for (const z of [-3.1, -1.2, 0.7, 2.6]) {
    for (const x of [-1.77, 1.77]) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 1.35), windowMaterial);
      window.position.set(x, 2.25, z);
      group.add(window);
    }
  }
  const route = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.72), new THREE.MeshBasicMaterial({ map: makeTextBoard("ДИНСКАЯ — ПЕРВОРЕЧЕНСКОЕ"), side: THREE.DoubleSide }));
  route.position.set(0, 2.62, 4.62);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.15, 0.12), mat(0x426b68));
  // The curb-side door is on local -X when the bus travels forward (+Z).
  door.position.set(-1.15, 1.48, 4.66);
  door.name = "busDoor";
  const driver = makePerson(0x4e6f5d);
  driver.scale.setScalar(0.42);
  // Driver and steering wheel are on the left for Russian right-hand traffic.
  driver.position.set(-0.85, 0.6, 2.8);
  driver.name = "busDriver";
  group.add(body, roof, route, door, driver);
  for (const x of [-1.78, 1.78]) {
    for (const z of [-3.1, 3.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.4, 10), mat(0x252b29));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.72, z);
      wheel.name = "busWheel";
      group.add(wheel);
    }
  }
  group.traverse((part) => {
    if (part instanceof THREE.Mesh) part.castShadow = true;
  });
  return group;
}

function makeGasStation(name: string, x: number, z: number) {
  const group = new THREE.Group();
  group.name = name;
  const lot = new THREE.Mesh(new THREE.BoxGeometry(38, 0.18, 28), mat(0x8f928d));
  lot.position.y = 0.09;
  lot.receiveShadow = true;
  const shop = new THREE.Mesh(new THREE.BoxGeometry(12, 5.2, 8), mat(0xe4d2a2));
  shop.position.set(8, 2.6, 6);
  const shopWindowMaterial = new THREE.MeshStandardMaterial({ color: 0xaed9db, emissive: 0xffbd66, emissiveIntensity: 0.08, roughness: 0.32 });
  shopWindowMaterial.name = "stationWindowMaterial";
  const shopWindow = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.2, 0.15), shopWindowMaterial);
  shopWindow.position.set(8, 2.8, 1.93);
  shopWindow.name = "stationWindow";
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(17, 0.7, 9), mat(0x4d8069));
  canopy.position.set(-6, 5.2, -3);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.4), new THREE.MeshBasicMaterial({ map: makeTextBoard(name, 640, 120, "#315c45", "#d8f46d"), side: THREE.DoubleSide }));
  sign.position.set(8, 5.0, 1.85);
  for (const columnX of [-12, 0]) {
    const support = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5, 7), mat(0xe7e3d8));
    support.position.set(columnX, 2.5, -3);
    group.add(support);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.25, 1.15), mat(0xf3eee1));
    pump.position.set(columnX, 1.15, -3);
    const display = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.08), mat(0x263d37));
    display.position.set(columnX, 1.55, -2.39);
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffe5a4, emissive: 0xffc55c, emissiveIntensity: 0.12 });
    lampMaterial.name = "stationLampMaterial";
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 1.1), lampMaterial);
    lamp.position.set(columnX, 4.75, -3);
    lamp.name = "stationLamp";
    group.add(pump, display, lamp);
  }
  const wash = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), mat(0x789b96));
  wash.position.set(12, 2.5, -7);
  const washDoor = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.7, 0.18), mat(0x5e7778));
  washDoor.position.set(12, 2.0, -2.92);
  group.add(lot, shop, shopWindow, canopy, sign, wash, washDoor);
  group.position.set(x, 0, z);
  group.traverse((part) => {
    if (part instanceof THREE.Mesh) {
      part.castShadow = true;
      part.receiveShadow = true;
    }
  });
  return group;
}

export default function SecurityConsoleGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{
    player?: THREE.Group;
    car?: THREE.Group;
    bus?: THREE.Group;
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
    traffic: TrafficVehicle[];
    busPassengers: BusPassenger[];
    remoteMeshes: Map<string, THREE.Group>;
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
    fuel: 0,
    odometer: 0,
    wear: 0,
    surface: "Асфальт",
    lastForwardTap: 0,
    fastWalkUntil: 0,
    residents: [],
    colliders: [],
    walkers: [],
    traffic: [],
    busPassengers: [],
    remoteMeshes: new Map(),
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
  const initialPlayerPosition = initialSave.playerPos ?? DEFAULT_PLAYER_POSITION;
  const initialCarPosition = resolveCarSpawnPosition(initialPlayerPosition, initialSave.carPos ?? DEFAULT_CAR_POSITION);
  const [initialProfile] = useState<PlayerProfile>(() => initialSave.profile ?? readProfile());
  const [mode, setMode] = useState<GameMode>("intro");
  const modeRef = useRef<GameMode>("intro");
  const [energy, setEnergy] = useState(initialSave.energy ?? 100);
  const energyRef = useRef(initialSave.energy ?? 100);
  const [money, setMoney] = useState(initialSave.money);
  const moneyRef = useRef(initialSave.money);
  const [reputation, setReputation] = useState(initialSave.reputation);
  const [gameTime, setGameTime] = useState(initialSave.gameTime ?? 8.25);
  const [driving, setDriving] = useState(false);
  const [nearCar, setNearCar] = useState(false);
  const [nearest, setNearest] = useState<Resident | null>(null);
  const [nearStationId, setNearStationId] = useState<string | null>(null);
  const [nearBusStopId, setNearBusStopId] = useState<BusStopSpec["id"] | null>(null);
  const [stationMenu, setStationMenu] = useState<(typeof GAS_STATIONS)[number]["id"] | null>(null);
  const [transitMenu, setTransitMenu] = useState<BusStopSpec["id"] | null>(null);
  const [serviceBusy, setServiceBusy] = useState("");
  const [busPos, setBusPos] = useState({ x: BUS_STOPS[0].x, z: -3.5 });
  const [busEtaMinutes, setBusEtaMinutes] = useState(0);
  const [busReadyAtStop, setBusReadyAtStop] = useState(false);
  const [activeNpcId, setActiveNpcId] = useState<number | null>(null);
  const [residents, setResidents] = useState<Resident[]>(() => residentsFromSave(initialSave));
  const residentsRef = useRef<Resident[]>(residents);
  const [npcLine, setNpcLine] = useState("");
  const [toast, setToast] = useState("");
  const [showTariff, setShowTariff] = useState(false);
  const [tabletTab, setTabletTab] = useState<TabletTab>("hero");
  const [playerPos, setPlayerPos] = useState(initialPlayerPosition);
  const [carPos, setCarPos] = useState(initialCarPosition);
  const [locationName, setLocationName] = useState("село Первореченское");
  const [weather, setWeather] = useState<WeatherKind>(initialSave.weather ?? "Ясно");
  const weatherRef = useRef<WeatherKind>(initialSave.weather ?? "Ясно");
  const [movementState, setMovementState] = useState<MovementState>("Покой");
  const [playerSpeedKmh, setPlayerSpeedKmh] = useState(0);
  const [carTelemetry, setCarTelemetry] = useState({ speed: 0, fuel: initialSave.carFuel ?? 0, surface: "Асфальт" as SurfaceKind, wear: initialSave.carWear ?? 0 });
  const [outfitId, setOutfitId] = useState<OutfitId>(initialOutfit);
  const outfitRef = useRef<OutfitId>(initialOutfit);
  const [ownedOutfits, setOwnedOutfits] = useState<OutfitId[]>(initialOwned);
  const ownedOutfitsRef = useRef<OutfitId[]>(initialOwned);
  const [carUpgrade, setCarUpgrade] = useState(initialCarUpgrade);
  const carUpgradeRef = useRef(initialCarUpgrade);
  const [vehicleSiren, setVehicleSiren] = useState(initialSave.vehicleSiren ?? false);
  const vehicleSirenRef = useRef(vehicleSiren);
  const [carClean, setCarClean] = useState(initialSave.carClean ?? false);
  const carCleanRef = useRef(carClean);
  const [seasonalTires, setSeasonalTires] = useState(initialSave.seasonalTires ?? false);
  const seasonalTiresRef = useRef(seasonalTires);
  const [officeZone, setOfficeZone] = useState<OfficeZone>("console");
  const [coffeeReady, setCoffeeReady] = useState(true);
  const [equipment, setEquipment] = useState(6);
  const [officeMessage, setOfficeMessage] = useState("Офис готов к работе. Выберите помещение слева.");
  const [alarm, setAlarm] = useState<AlarmEvent | null>(null);
  const [alarmSeconds, setAlarmSeconds] = useState(0);
  const [alarmResult, setAlarmResult] = useState("Система в норме. Ожидаем сигнал.");
  const [profile, setProfile] = useState<PlayerProfile>(initialProfile);
  const profileRef = useRef(profile);
  const [statistics, setStatistics] = useState<PlayerStatistics>(() => ({
    ...EMPTY_STATS,
    ...(initialSave.statistics ?? {}),
    totalContracts: Math.max(initialSave.contracts.length, initialSave.statistics?.totalContracts ?? 0),
  }));
  const statisticsRef = useRef(statistics);
  const [achievements, setAchievements] = useState<string[]>(initialSave.achievements ?? []);
  const achievementsRef = useRef(achievements);
  const [mapNotes, setMapNotes] = useState<MapNote[]>(initialSave.mapNotes ?? []);
  const mapNotesRef = useRef(mapNotes);
  const [extendedContracts, setExtendedContracts] = useState<string[]>(initialSave.extendedContracts ?? []);
  const extendedContractsRef = useRef(extendedContracts);
  const [openedBranches, setOpenedBranches] = useState<DistrictId[]>(initialSave.openedBranches ?? ["central"]);
  const openedBranchesRef = useRef(openedBranches);
  const [staff, setStaff] = useState<StaffState>(initialSave.staff ?? EMPTY_STAFF);
  const staffRef = useRef(staff);
  const [ownedVehicles, setOwnedVehicles] = useState<VehicleId[]>(initialSave.ownedVehicles ?? []);
  const ownedVehiclesRef = useRef(ownedVehicles);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleId | null>(initialSave.currentVehicle ?? null);
  const currentVehicleRef = useRef(currentVehicle);
  const [rentalActive, setRentalActive] = useState(false);
  const [loan, setLoan] = useState<LoanState>(initialSave.loan ?? null);
  const loanRef = useRef(loan);
  const [businessMonth, setBusinessMonth] = useState(initialSave.businessMonth ?? 1);
  const businessMonthRef = useRef(businessMonth);
  const [officeRented, setOfficeRented] = useState(initialSave.officeRented ?? false);
  const officeRentedRef = useRef(officeRented);
  const [quests, setQuests] = useState<QuestProgress[]>(initialSave.quests ?? DEFAULT_QUESTS);
  const questsRef = useRef(quests);
  const questStatusesRef = useRef<Record<string, QuestStatus>>(Object.fromEntries(quests.map((quest) => [quest.id, quest.status])));
  const [questFilter, setQuestFilter] = useState<"all" | QuestCategory | "completed">("all");
  const [selectedQuestId, setSelectedQuestId] = useState("quest_first_car");
  const [questView, setQuestView] = useState<"journal" | "daily">("journal");
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeState>(() => createDailyChallenges(initialSave.dailyChallenges, initialSave.officeRented ?? false, (initialSave.ownedVehicles?.length ?? 0) > 0));
  const dailyChallengesRef = useRef(dailyChallenges);
  const dailyDistanceRef = useRef(initialSave.statistics?.kmDriven ?? 0);
  const [dailyResetLabel, setDailyResetLabel] = useState("");
  const [networkRoomCode, setNetworkRoomCode] = useState("");
  const [networkRoomInput, setNetworkRoomInput] = useState("");
  const [networkRegion, setNetworkRegion] = useState("Europe");
  const [networkVisibility, setNetworkVisibility] = useState<"open" | "friends">("open");
  const [networkMaxPlayers, setNetworkMaxPlayers] = useState(4);
  const [networkIsHost, setNetworkIsHost] = useState(false);
  const [networkPlayers, setNetworkPlayers] = useState<NetworkPlayer[]>([]);
  const networkPlayersRef = useRef(networkPlayers);
  const networkChannelRef = useRef<BroadcastChannel | null>(null);
  const isResettingRef = useRef(false);
  const [networkChat, setNetworkChat] = useState<NetworkChatMessage[]>([]);
  const [trafficIncident, setTrafficIncident] = useState<TrafficIncident | null>(null);
  const firstCarReminderRef = useRef(false);
  const [networkChatInput, setNetworkChatInput] = useState("");
  const [saveSlots, setSaveSlots] = useState<Record<SaveSlotId, SaveEnvelope | null>>(() => ({
    auto: readEnvelope("auto"),
    slot1: readEnvelope("slot1"),
    slot2: readEnvelope("slot2"),
    slot3: readEnvelope("slot3"),
  }));
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all_time" | "monthly" | "weekly">("all_time");
  const [leaderboardCategory, setLeaderboardCategory] = useState<"reputation" | "clients" | "income" | "prevention_rate" | "level">("reputation");
  const [mapLayers, setMapLayers] = useState({ clients: true, vehicles: true, points: true, notes: true });
  const [minimapRotates, setMinimapRotates] = useState(true);
  const [selectedMapObject, setSelectedMapObject] = useState<string | null>(null);
  const [mapWaypoint, setMapWaypoint] = useState<{ x: number; z: number; label: string } | null>(null);

  useEffect(() => {
    moneyRef.current = money;
  }, [money]);

  const signedCount = residents.filter((r) => r.signed).length;
  const totalContracts = signedCount + extendedContracts.length;
  const incomeMultiplier = dailyChallenges.streakCount >= 30 ? 1.05 : 1;
  const monthlyIncome = Math.round((
    signedCount * 890 +
    SECURITY_OBJECTS.filter((object) => {
      if (!extendedContracts.includes(object.id)) return false;
      if (object.objectType !== "Дача") return true;
      const calendarMonth = ((businessMonth - 1) % 12) + 1;
      return calendarMonth >= 4 && calendarMonth <= 9;
    }).reduce((sum, object) => sum + object.monthly[0], 0)
  ) * incomeMultiplier);
  const staffExpense = STAFF_ROLES.reduce((sum, role) => sum + staff[role.key] * role.salary, 0);
  const branchExpense = DISTRICTS.filter((district) => openedBranches.includes(district.id) && (district.id !== "central" || officeRented)).reduce((sum, district) => sum + district.monthlyRent, 0);
  const monthlyExpenses = staffExpense + branchExpense + (ownedVehicles.length >= 3 ? 5000 : 0);
  const selectedQuest = QUESTS.find((quest) => quest.id === selectedQuestId) ?? QUESTS[0];
  const activeNpc = residents.find((r) => r.id === activeNpcId) ?? null;
  const leaderboardValue =
    leaderboardCategory === "clients"
      ? totalContracts
      : leaderboardCategory === "income"
        ? statistics.maxIncome
        : leaderboardCategory === "prevention_rate"
          ? statistics.alarmsResponded > 0
            ? Math.round(statistics.successfulPreventions / statistics.alarmsResponded * 100)
            : 0
          : leaderboardCategory === "level"
            ? Math.max(1, Math.floor(reputation / 10) + 1)
            : reputation;

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const updateDailyChallenge = useCallback((metric: DailyMetric, amount = 1) => {
    const next = {
      ...dailyChallengesRef.current,
      activeChallenges: dailyChallengesRef.current.activeChallenges.map((challenge) => {
        if (challenge.metric !== metric || challenge.claimed) return challenge;
        const definition = DAILY_CHALLENGES.find((item) => item.id === challenge.id);
        if (!definition) return challenge;
        const wasComplete = challenge.progress >= definition.target;
        const progress = Math.min(definition.target, challenge.progress + amount);
        if (!wasComplete && progress >= definition.target) window.setTimeout(() => flash(`Ежедневное испытание выполнено: ${definition.title}`), 0);
        return { ...challenge, progress };
      }),
    };
    dailyChallengesRef.current = next;
    setDailyChallenges(next);
  }, [flash]);
  const updateDailyChallengeRef = useRef(updateDailyChallenge);
  useEffect(() => {
    updateDailyChallengeRef.current = updateDailyChallenge;
  }, [updateDailyChallenge]);

  const persist = useCallback(
    (nextResidents = residentsRef.current, nextMoney = money, nextRep = reputation, slot: SaveSlotId = "auto", saveName = "Автосохранение") => {
      if (isResettingRef.current) return;
      const engine = engineRef.current;
      const save: SaveData = {
        money: nextMoney,
        reputation: nextRep,
        contracts: nextResidents.filter((r) => r.signed).map((r) => r.id),
        interests: Object.fromEntries(nextResidents.map((r) => [r.id, r.interest])),
        outfit: outfitRef.current,
        ownedOutfits: ownedOutfitsRef.current,
        carUpgrade: carUpgradeRef.current,
        energy: energyRef.current,
        gameTime: engine.time,
        weather: weatherRef.current,
        playerPos: engine.player ? { x: engine.player.position.x, z: engine.player.position.z } : initialSave.playerPos,
        carPos: engine.car ? { x: engine.car.position.x, z: engine.car.position.z } : initialSave.carPos,
        carFuel: engine.fuel,
        carWear: engine.wear,
        profile: profileRef.current,
        statistics: statisticsRef.current,
        achievements: achievementsRef.current,
        mapNotes: mapNotesRef.current,
        extendedContracts: extendedContractsRef.current,
        openedBranches: openedBranchesRef.current,
        staff: staffRef.current,
        ownedVehicles: ownedVehiclesRef.current,
        currentVehicle: currentVehicleRef.current,
        loan: loanRef.current,
        businessMonth: businessMonthRef.current,
        officeRented: officeRentedRef.current,
        quests: questsRef.current,
        dailyChallenges: dailyChallengesRef.current,
        vehicleSiren: vehicleSirenRef.current,
        carClean: carCleanRef.current,
        seasonalTires: seasonalTiresRef.current,
      };
      const envelope = writeEnvelope(slot, saveName, save);
      setSaveSlots((current) => ({ ...current, [slot]: envelope }));
    },
    [money, reputation],
  );
  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const unlockAchievement = useCallback((id: string) => {
    if (achievementsRef.current.includes(id)) return;
    const next = [...achievementsRef.current, id];
    achievementsRef.current = next;
    setAchievements(next);
    const title = ACHIEVEMENTS.find((item) => item.id === id)?.title ?? "Новое достижение";
    flash(`Достижение: ${title}`);
    window.setTimeout(() => persistRef.current(), 0);
  }, [flash]);

  const manualSave = (slot: SaveSlotId) => {
    persist(residentsRef.current, money, reputation, slot, `Первореченское · ${locationName}`);
    flash(`Игра сохранена: ${slot === "auto" ? "автосохранение" : `слот ${slot.slice(-1)}`}`);
  };

  const loadSlot = (slot: SaveSlotId) => {
    const envelope = readEnvelope(slot);
    if (!envelope) return;
    localStorage.setItem(ACTIVE_SAVE_KEY, JSON.stringify(envelope.data));
    window.location.reload();
  };

  const deleteSlot = (slot: SaveSlotId) => {
    if (slot === "auto") return;
    localStorage.removeItem(`${SAVE_SLOT_PREFIX}${slot}`);
    setSaveSlots((current) => ({ ...current, [slot]: null }));
    flash(`Слот ${slot.slice(-1)} очищен`);
  };

  const addMapNote = () => {
    const text = window.prompt("Короткая заметка для этой точки:");
    if (!text?.trim()) return;
    const note: MapNote = { id: `note-${Date.now()}`, text: text.trim().slice(0, 80), x: playerPos.x, z: playerPos.z };
    const next = [...mapNotesRef.current, note];
    mapNotesRef.current = next;
    setMapNotes(next);
    persistRef.current();
    flash("Метка добавлена на карту");
  };

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
    profileRef.current = profile;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    statisticsRef.current = statistics;
  }, [statistics]);

  useEffect(() => {
    achievementsRef.current = achievements;
  }, [achievements]);

  useEffect(() => {
    mapNotesRef.current = mapNotes;
  }, [mapNotes]);

  useEffect(() => {
    extendedContractsRef.current = extendedContracts;
    openedBranchesRef.current = openedBranches;
    staffRef.current = staff;
    ownedVehiclesRef.current = ownedVehicles;
    currentVehicleRef.current = currentVehicle;
    loanRef.current = loan;
    businessMonthRef.current = businessMonth;
    officeRentedRef.current = officeRented;
    questsRef.current = quests;
  }, [extendedContracts, openedBranches, staff, ownedVehicles, currentVehicle, loan, businessMonth, officeRented, quests]);

  useEffect(() => {
    dailyChallengesRef.current = dailyChallenges;
  }, [dailyChallenges]);

  useEffect(() => {
    vehicleSirenRef.current = vehicleSiren;
    carCleanRef.current = carClean;
    seasonalTiresRef.current = seasonalTires;
  }, [carClean, seasonalTires, vehicleSiren]);

  useEffect(() => {
    networkPlayersRef.current = networkPlayers;
  }, [networkPlayers]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const remaining = Math.max(0, next.getTime() - now.getTime());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      setDailyResetLabel(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!alarm) {
      setAlarmSeconds(0);
      return;
    }
    setAlarmSeconds(alarm.timeout);
    const timer = window.setInterval(() => {
      setAlarmSeconds((seconds) => {
        if (seconds > 1) return seconds - 1;
        window.clearInterval(timer);
        setAlarm(null);
        setMoney((value) => Math.max(0, value - 1500));
        setReputation((value) => Math.max(0, value - 10));
        setAlarmResult("Время реакции истекло · штраф 1 500 ₽ · репутация −10");
        flash("Тревога пропущена");
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [alarm, flash]);

  const sendNetworkMessage = useCallback((payload: Record<string, unknown>) => {
    networkChannelRef.current?.postMessage({ ...payload, senderId: profileRef.current.id });
  }, []);

  useEffect(() => {
    if (!networkRoomCode) return;
    if (typeof BroadcastChannel === "undefined") {
      flash("Этот браузер не поддерживает локальный кооператив");
      setNetworkRoomCode("");
      return;
    }
    const channel = new BroadcastChannel(`pult-ohrany-${networkRoomCode}`);
    networkChannelRef.current = channel;
    const localPlayer = (): NetworkPlayer => ({
      id: profileRef.current.id,
      name: profileRef.current.nickname,
      avatar: profileRef.current.avatar,
      x: engineRef.current.player?.position.x ?? playerPos.x,
      z: engineRef.current.player?.position.z ?? playerPos.z,
      rotation: engineRef.current.player?.rotation.y ?? 0,
      role: modeRef.current === "office" ? "Оператор" : engineRef.current.driving ? "ГБР" : "Менеджер",
      host: networkIsHost,
    });
    const upsertPlayer = (player: NetworkPlayer) => setNetworkPlayers((current) => {
      const without = current.filter((item) => item.id !== player.id);
      return [...without, player].slice(0, networkMaxPlayers);
    });
    upsertPlayer(localPlayer());
    channel.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      const message = event.data;
      if (message.senderId === profileRef.current.id) return;
      if (message.type === "presence" || message.type === "state") {
        upsertPlayer(message.player as NetworkPlayer);
      }
      if (message.type === "request-world" && networkIsHost) {
        channel.postMessage({
          type: "world",
          senderId: profileRef.current.id,
          contracts: residentsRef.current.filter((resident) => resident.signed).map((resident) => resident.id),
          extendedContracts: extendedContractsRef.current,
          money,
          reputation,
          weather: weatherRef.current,
          gameTime: engineRef.current.time,
          drivingSide: DRIVING_SIDE,
        });
      }
      if (message.type === "world" && !networkIsHost) {
        const contractIds = message.contracts as number[];
        residentsRef.current.forEach((resident) => { resident.signed = contractIds.includes(resident.id); });
        setResidents([...residentsRef.current]);
        const syncedExtended = (message.extendedContracts as string[]) ?? [];
        extendedContractsRef.current = syncedExtended;
        setExtendedContracts(syncedExtended);
        setMoney(Number(message.money ?? money));
        setReputation(Number(message.reputation ?? reputation));
        weatherRef.current = message.weather as WeatherKind;
        setWeather(message.weather as WeatherKind);
        engineRef.current.time = Number(message.gameTime ?? engineRef.current.time);
      }
      if (message.type === "start") setMode("world");
      if (message.type === "contract") {
        const resident = residentsRef.current.find((item) => item.id === Number(message.residentId));
        if (resident) {
          resident.signed = true;
          setResidents([...residentsRef.current]);
        }
      }
      if (message.type === "extended-contract") {
        const objectId = String(message.objectId);
        if (!extendedContractsRef.current.includes(objectId)) {
          extendedContractsRef.current = [...extendedContractsRef.current, objectId];
          setExtendedContracts(extendedContractsRef.current);
        }
      }
      if (message.type === "alarm") setAlarm(message.alarm as AlarmEvent);
      if (message.type === "economy") {
        setMoney(Number(message.money ?? money));
        setReputation(Number(message.reputation ?? reputation));
      }
      if (message.type === "world-sync" && !networkIsHost) {
        engineRef.current.time = Number(message.gameTime ?? engineRef.current.time);
        weatherRef.current = message.weather as WeatherKind;
        setWeather(message.weather as WeatherKind);
      }
      if (message.type === "chat") setNetworkChat((current) => [...current.slice(-29), message.chat as NetworkChatMessage]);
      if (message.type === "leave") setNetworkPlayers((current) => current.filter((player) => player.id !== message.senderId));
    };
    channel.postMessage({ type: "presence", senderId: profileRef.current.id, player: localPlayer() });
    channel.postMessage({ type: "request-world", senderId: profileRef.current.id });
    let syncTicks = 0;
    const syncTimer = window.setInterval(() => {
      const player = localPlayer();
      upsertPlayer(player);
      channel.postMessage({ type: "state", senderId: profileRef.current.id, player });
      syncTicks += 1;
      if (networkIsHost && syncTicks % 120 === 0) channel.postMessage({ type: "world-sync", senderId: profileRef.current.id, gameTime: engineRef.current.time, weather: weatherRef.current, drivingSide: DRIVING_SIDE });
    }, 250);
    return () => {
      channel.postMessage({ type: "leave", senderId: profileRef.current.id });
      window.clearInterval(syncTimer);
      channel.close();
      networkChannelRef.current = null;
    };
  }, [flash, networkIsHost, networkMaxPlayers, networkRoomCode]);

  useEffect(() => {
    const scene = engineRef.current.scene;
    if (!scene) return;
    const remoteIds = new Set(networkPlayers.filter((player) => player.id !== profile.id).map((player) => player.id));
    engineRef.current.remoteMeshes.forEach((mesh, id) => {
      if (!remoteIds.has(id)) {
        scene.remove(mesh);
        engineRef.current.remoteMeshes.delete(id);
      }
    });
    networkPlayers.forEach((networkPlayer) => {
      if (networkPlayer.id === profile.id) return;
      let mesh = engineRef.current.remoteMeshes.get(networkPlayer.id);
      if (!mesh) {
        mesh = makeHero();
        applyOutfit(mesh, OUTFIT_BY_ID.casual);
        scene.add(mesh);
        engineRef.current.remoteMeshes.set(networkPlayer.id, mesh);
      }
      mesh.position.set(networkPlayer.x, 0, networkPlayer.z);
      mesh.rotation.y = networkPlayer.rotation;
    });
  }, [networkPlayers, profile.id]);

  useEffect(() => {
    setQuests((current) => current.map((quest) => {
      const completed =
        (quest.id === "quest_first_car" && ownedVehicles.length > 0) ||
        (quest.id === "quest_open_office" && signedCount >= 10 && officeRented) ||
        (quest.id === "quest_garage_secrets" && residents[0]?.signed) ||
        (quest.id === "quest_false_alarm_wave" && statistics.alarmsResponded >= 3) ||
        (quest.id === "quest_daily_sales" && totalContracts >= 2);
      return completed && quest.status !== "completed" ? { ...quest, status: "completed" } : quest;
    }));
  }, [officeRented, ownedVehicles.length, residents, signedCount, statistics.alarmsResponded, totalContracts]);

  useEffect(() => {
    if (ownedVehicles.length === 0 && money >= 20000 && !firstCarReminderRef.current) {
      firstCarReminderRef.current = true;
      window.setTimeout(() => flash("Вы почти можете позволить себе Оку! Автосалон отмечен на карте."), 0);
    }
    if (ownedVehicles.length > 0) firstCarReminderRef.current = false;
  }, [flash, money, ownedVehicles.length]);

  useEffect(() => {
    quests.forEach((progress) => {
      if (progress.status === "completed" && questStatusesRef.current[progress.id] !== "completed") {
        const definition = QUESTS.find((quest) => quest.id === progress.id);
        window.setTimeout(() => flash(`Задание выполнено: ${definition?.title ?? progress.id} · ${definition?.reward ?? "награда получена"}`), 0);
      }
      questStatusesRef.current[progress.id] = progress.status;
    });
    questsRef.current = quests;
  }, [flash, quests]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!isResettingRef.current) persist();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [persist]);

  useEffect(() => {
    const interval = window.setInterval(() => queueStatistics(profileRef.current, statisticsRef.current), 300_000);
    return () => window.clearInterval(interval);
  }, []);

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
    sun.shadow.bias = -0.00035;
    const sunTarget = new THREE.Object3D();
    sun.target = sunTarget;
    scene.add(sunTarget);
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

    const clouds: THREE.Group[] = [];
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f0e7,
      roughness: 1,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    for (let i = 0; i < 30; i++) {
      const cloud = new THREE.Group();
      const pieces = 3 + (i % 3);
      for (let j = 0; j < pieces; j++) {
        const piece = new THREE.Mesh(new THREE.IcosahedronGeometry(5.2 + ((i + j) % 4), 1), cloudMaterial);
        piece.position.set(j * 6 - pieces * 2.5, Math.sin(j * 1.7) * 1.6, (j % 2) * 2.5);
        piece.scale.y = 0.62;
        piece.castShadow = true;
        cloud.add(piece);
      }
      cloud.position.set(-150 + ((i * 157) % 4300), 54 + ((i * 11) % 24), -145 + ((i * 47) % 290));
      scene.add(cloud);
      clouds.push(cloud);
    }

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
    const headlightMaterials: THREE.MeshStandardMaterial[] = [];

    engine.colliders = [];
    engine.walkers = [];
    engine.traffic = [];
    engine.busPassengers = [];

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4400, 420), mat(0x78ad5d));
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
    for (const centreX of DISTRICTS.map((district) => district.x)) {
      // Country roads sit slightly below the main asphalt, so intersections
      // do not create a raised lip across the carriageway.
      box(scene, [13, 0.12, 350], [centreX + 18, 0.08, 15], 0xb7ad98);
      box(scene, [260, 0.12, 10], [centreX, 0.08, 72], 0xb7ad98);
      box(scene, [220, 0.12, 9], [centreX, 0.08, -72], 0xc2ae8a);
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
    for (let i = 0; i < 160; i++) {
      const villageX = i < 80 ? 0 : 4000;
      const localX = -165 + ((i * 37) % 330);
      const z = -168 - ((i * 13) % 20);
      makeTree(scene, villageX + localX, z, 0.72 + ((i * 9) % 7) / 14);
    }
    for (let x = 260; x < 3740; x += 80) {
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
    addNeighbourhood(0, 15, 10);
    addNeighbourhood(1350, 25, 25);
    addNeighbourhood(2700, 25, 50);
    addNeighbourhood(4000, 25, 75);

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

    // Utility corridor: poles every 60 m, a street lamp on every second pole,
    // and three gently sagging wires between adjacent supports.
    const wireMaterial = new THREE.LineBasicMaterial({ color: 0x273b36, transparent: true, opacity: 0.78 });
    const poleXs: number[] = [];
    for (let x = -150; x <= 4150; x += 60) {
      poleXs.push(x);
      const pole = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 8, 7), mat(0x4a453b));
      mast.position.y = 4;
      mast.castShadow = true;
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.2), mat(0x3a3934));
      crossbar.position.y = 7.35;
      crossbar.castShadow = true;
      pole.add(mast, crossbar);
      if ((poleXs.length - 1) % 2 === 0) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), mat(0x3a3934));
        arm.position.set(-0.72, 6.8, -0.4);
        arm.rotation.z = -0.12;
        const lampMaterial = new THREE.MeshStandardMaterial({
          color: 0xffdc8d,
          emissive: 0xffb64b,
          emissiveIntensity: 0.08,
          roughness: 0.5,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 5), lampMaterial);
        bulb.position.set(-1.45, 6.63, -0.4);
        lampMaterials.push(lampMaterial);
        pole.add(arm, bulb);
      }
      pole.position.set(x, 0, 15);
      scene.add(pole);
    }
    for (let i = 0; i < poleXs.length - 1; i++) {
      const x1 = poleXs[i];
      const x2 = poleXs[i + 1];
      for (const zOffset of [-1.25, 0, 1.25]) {
        const wire = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, 7.45, 15 + zOffset),
            new THREE.Vector3((x1 + x2) / 2, 6.95, 15 + zOffset),
            new THREE.Vector3(x2, 7.45, 15 + zOffset),
          ]),
          wireMaterial,
        );
        scene.add(wire);
      }
    }

    BUS_STOPS.forEach((stop) => {
      const southStop = makeBusStop(stop);
      scene.add(southStop);
      const northStop = makeBusStop({ ...stop, z: 18 });
      northStop.rotation.y = Math.PI;
      scene.add(northStop);
      engine.colliders.push(
        { x: stop.x, z: -18, halfX: 3.6, halfZ: 1.8, kind: "landmark" },
        { x: stop.x, z: 18, halfX: 3.6, halfZ: 1.8, kind: "landmark" },
      );
    });

    GAS_STATIONS.forEach((station, stationIndex) => {
      const gasStation = makeGasStation(station.name, station.x, station.z);
      gasStation.rotation.y = station.z > 0 ? Math.PI : 0;
      gasStation.traverse((part) => {
        if (!(part instanceof THREE.Mesh) || !(part.material instanceof THREE.MeshStandardMaterial)) return;
        if (part.name === "stationWindow") windowMaterials.push(part.material);
        if (part.name === "stationLamp") lampMaterials.push(part.material);
      });
      scene.add(gasStation);
      engine.colliders.push(
        { x: station.x + (station.z > 0 ? -8 : 8), z: station.z + (station.z > 0 ? -6 : 6), halfX: 6.2, halfZ: 4.2, kind: "landmark" },
        { x: station.x + (station.z > 0 ? -12 : 12), z: station.z + (station.z > 0 ? 7 : -7), halfX: 4.2, halfZ: 4.2, kind: "landmark" },
      );
      const cashier = makePerson(stationIndex === 0 ? 0x4f795f : 0x8a645d);
      cashier.position.set(station.x + (station.z > 0 ? -2 : 2), 0, station.z + (station.z > 0 ? -11 : 11));
      cashier.rotation.y = station.z > 0 ? Math.PI : 0;
      scene.add(cashier);
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

    // Distinct service centres make the two unlockable districts readable from the road.
    box(scene, [24, 8, 15], [1350, 4, -34], 0xb68f6a);
    box(scene, [26, 1.2, 17], [1350, 8.5, -34], 0x6e765f);
    box(scene, [30, 6.5, 18], [1390, 3.25, 34], 0xd8d5ca);
    box(scene, [31, 0.8, 19], [1390, 6.85, 34], 0x66889a);
    box(scene, [34, 8, 22], [2700, 4, -34], 0x69737b);
    box(scene, [35, 1.2, 23], [2700, 8.5, -34], 0x414b53);
    box(scene, [48, 9, 24], [2745, 4.5, 42], 0x8a735f);
    box(scene, [49, 1.0, 25], [2745, 9.5, 42], 0x4b555a);
    engine.colliders.push(
      { x: 1350, z: -34, halfX: 12.5, halfZ: 8, kind: "landmark" },
      { x: 1390, z: 34, halfX: 15.5, halfZ: 9.5, kind: "landmark" },
      { x: 2700, z: -34, halfX: 17.5, halfZ: 11.5, kind: "landmark" },
      { x: 2745, z: 42, halfX: 24.5, halfZ: 12.5, kind: "landmark" },
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
        signCtx.font = `bold ${text.length > 18 ? 40 : 50}px Arial`;
        signCtx.textAlign = "center";
        signCtx.fillText(text, canvas.width / 2, 82);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(text.length > 18 ? 13 : 10, 2),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
      );
      board.position.set(x, 4.2, z);
      board.rotation.y = faceWest ? -Math.PI / 2 : Math.PI / 2;
      scene.add(board);
      box(scene, [0.22, 4, 0.22], [x, 2, z - 3.5], 0x33423d);
      box(scene, [0.22, 4, 0.22], [x, 2, z + 3.5], 0x33423d);
    };
    makeRoadSign("ДИНСКАЯ", 205, -12);
    makeRoadSign("СЕЛО ПЕРВОРЕЧЕНСКОЕ", 3795, 14, true);

    const player = makeHero();
    player.position.set(initialPlayerPosition.x, 0, initialPlayerPosition.z);
    applyOutfit(player, OUTFIT_BY_ID[outfitRef.current]);
    scene.add(player);
    engine.player = player;

    const car = makeCar();
    car.position.set(initialCarPosition.x, 0, initialCarPosition.z);
    car.rotation.y = Math.PI / 2;
    car.visible = currentVehicleRef.current !== null;
    scene.add(car);
    engine.car = car;
    engine.time = initialSave.gameTime ?? 8.25;
    engine.fuel = initialSave.carFuel ?? 0;
    engine.wear = initialSave.carWear ?? 0;

    residentsRef.current.forEach((resident) => {
      const npc = makePerson(resident.color);
      npc.position.set(resident.x + 5, 0, resident.z + (resident.z > 0 ? -5 : 5));
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
    console.info(`[NPCSpawner] Создано базовых NPC: ${engine.residents.length}`);

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

    const trafficColors = [0x587e91, 0xd39a4b, 0x6f8c68, 0x8b6688, 0xc65d4d, 0xd4d0bd];
    for (let i = 0; i < 14; i++) {
      const laneZ = i % 2 === 0 ? -3.2 : 3.2;
      const direction = civilianTrafficDirectionForLane(laneZ);
      const trafficCar = makeCar(trafficColors[i % trafficColors.length], true);
      trafficCar.scale.setScalar(0.82 + (i % 3) * 0.05);
      trafficCar.position.set(-130 + ((i * 317) % 4260), 0, laneZ);
      trafficCar.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      trafficCar.traverse((part) => {
        if (part instanceof THREE.Mesh && part.name === "headlight" && part.material instanceof THREE.MeshStandardMaterial) {
          headlightMaterials.push(part.material);
        }
      });
      scene.add(trafficCar);
      engine.traffic.push({
        mesh: trafficCar,
        direction,
        speed: 6.5 + (i % 5) * 0.65,
        laneZ,
        minX: -170,
        maxX: 4170,
      });
    }

    const bus = makeBus();
    bus.position.set(BUS_STOPS[0].x, 0, laneZForDirection(1, 3.8));
    bus.rotation.y = Math.PI / 2;
    scene.add(bus);
    engine.bus = bus;
    let busDirection: 1 | -1 = 1;
    let busCurrentStop = 0;
    let busNextStop = 1;
    let busDwellGameHours = BUS_STOP_DWELL_GAME_MINUTES / 60;
    let lastBusGameTime = engine.time;
    let busServiceKey = "";

    const passengerColors = [0x6e8fa0, 0xc78678, 0x738c67, 0xa0789a, 0xb99561, 0x667b96];
    BUS_STOPS.forEach((stop, stopIndex) => {
      const directions: (1 | -1)[] = stopIndex === 0 ? [1, 1, 1, 1] : stopIndex === BUS_STOPS.length - 1 ? [-1, -1, -1, -1] : [1, 1, -1, -1];
      directions.forEach((direction, passengerIndex) => {
        const passenger = makePerson(passengerColors[(stopIndex * 4 + passengerIndex) % passengerColors.length]);
        passenger.scale.setScalar(0.54);
        const waitingZ = laneZForDirection(direction, 15.4);
        passenger.position.set(stop.x - 2.1 + passengerIndex * 1.35, 0, waitingZ);
        passenger.rotation.y = direction > 0 ? 0 : Math.PI;
        passenger.name = `busPassenger-${stop.id}-${passengerIndex}`;
        scene.add(passenger);
        engine.busPassengers.push({
          mesh: passenger,
          stopIndex,
          direction,
          targetStop: stopIndex,
          state: "waiting",
          progress: 0,
          start: passenger.position.clone(),
          end: passenger.position.clone(),
        });
      });
    });

    let last = performance.now();
    let uiTick = 0;
    let statisticsTick = 0;
    let driftSeconds = 0;
    let previousGameTime = engine.time;
    let mouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastCollisionAt = 0;
    let nextViolationCheck = 0;
    let wrongLaneSeconds = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const editingText = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if (editingText && e.code !== "Escape") return;
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
        setMode("map");
        return;
      }
      if ((e.code === "Tab" || e.code === "Escape") && modeRef.current === "map") {
        engine.keys.clear();
        setMode("world");
        return;
      }
      if (e.code === "KeyP" && modeRef.current === "world") {
        engine.keys.clear();
        setMode("tablet");
        return;
      }
      if ((e.code === "KeyP" || e.code === "Escape") && modeRef.current === "tablet") {
        engine.keys.clear();
        setMode("world");
        return;
      }
      if (e.code === "Escape" && modeRef.current === "world") {
        engine.keys.clear();
        setMode("pause");
        return;
      }
      if (e.code === "Escape" && modeRef.current === "pause") {
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
      if (e.code === "Escape" && (modeRef.current === "station" || modeRef.current === "transit")) {
        engine.keys.clear();
        setStationMenu(null);
        setTransitMenu(null);
        setMode("world");
        return;
      }
      if (e.code === "KeyE" && modeRef.current === "world" && !e.repeat) {
        const focus = engine.driving ? engine.car : engine.player;
        if (!focus) return;
        const closestStation = GAS_STATIONS.reduce((closest, station) =>
          Math.hypot(focus.position.x - station.x, focus.position.z - station.z) <
          Math.hypot(focus.position.x - closest.x, focus.position.z - closest.z)
            ? station
            : closest,
        );
        if (Math.hypot(focus.position.x - closestStation.x, focus.position.z - closestStation.z) < 24 && (!engine.driving || Math.abs(engine.carSpeed) < 1.2)) {
          engine.keys.clear();
          setStationMenu(closestStation.id);
          setMode("station");
          return;
        }
        const closestStop = BUS_STOPS.reduce((closest, stop) =>
          Math.hypot(focus.position.x - stop.x, Math.abs(focus.position.z) - 18) <
          Math.hypot(focus.position.x - closest.x, Math.abs(focus.position.z) - 18)
            ? stop
            : closest,
        );
        if (!engine.driving && Math.hypot(focus.position.x - closestStop.x, Math.abs(focus.position.z) - 18) < 9) {
          engine.keys.clear();
          setTransitMenu(closestStop.id);
          setMode("transit");
          return;
        }
        if (!engine.driving && currentVehicleRef.current && engine.car?.visible && focus.position.distanceTo(engine.car.position) < 5.2) {
          engine.driving = true;
          engine.yaw = car.rotation.y + Math.PI;
          engine.cameraInputAt = performance.now();
          player.visible = false;
          setDriving(true);
          flash(`Вы сели в ${VEHICLE_BY_ID[currentVehicleRef.current].name.toLowerCase()}`);
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
          updateDailyChallengeRef.current("talks");
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

    const applyTrafficPenalty = (title: string, detail: string, fine: number, reputationLoss: number) => {
      if (fine > 0) {
        const nextMoney = moneyRef.current - fine;
        moneyRef.current = nextMoney;
        setMoney(nextMoney);
      }
      if (reputationLoss > 0) setReputation((value) => Math.max(0, value - reputationLoss));
      setTrafficIncident({ title, detail, fine });
      window.setTimeout(() => setTrafficIncident(null), 5200);
      flash(fine > 0 ? `${title} · штраф ${fine.toLocaleString("ru-RU")} ₽` : title);
    };

    const collisionKindAt = (x: number, z: number, radius: number) => {
      if (engine.residents.some((resident) => resident.mesh && Math.hypot(x - resident.mesh.position.x, z - resident.mesh.position.z) < radius + 0.78)) return "pedestrian";
      if (engine.walkers.some((walker) => Math.hypot(x - walker.mesh.position.x, z - walker.mesh.position.z) < radius + 0.72)) return "pedestrian";
      if (engine.busPassengers.some((passenger) => passenger.mesh.visible && passenger.state !== "riding" && Math.hypot(x - passenger.mesh.position.x, z - passenger.mesh.position.z) < radius + 0.72)) return "pedestrian";
      if (engine.traffic.some((vehicle) => Math.hypot(x - vehicle.mesh.position.x, z - vehicle.mesh.position.z) < radius + 2.2)) return "vehicle";
      if (bus.visible && Math.hypot(x - bus.position.x, z - bus.position.z) < radius + 4.2) return "bus";
      return "object";
    };

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
      for (const passenger of engine.busPassengers) {
        if (passenger.mesh.visible && passenger.state !== "riding" && Math.hypot(x - passenger.mesh.position.x, z - passenger.mesh.position.z) < radius + 0.72) {
          return true;
        }
      }
      for (const trafficVehicle of engine.traffic) {
        if (Math.hypot(x - trafficVehicle.mesh.position.x, z - trafficVehicle.mesh.position.z) < radius + 2.2) {
          return true;
        }
      }
      if (bus.visible && Math.hypot(x - bus.position.x, z - bus.position.z) < radius + 4.2) return true;
      if (includeCar && car.visible && Math.hypot(x - car.position.x, z - car.position.z) < radius + 2.25) return true;
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
      let currentWalkSpeedKmh = 0;

      if (canMove && engine.driving) {
        const activeVehicle = currentVehicleRef.current ? VEHICLE_BY_ID[currentVehicleRef.current] : VEHICLE_BY_ID.oka;
        const throttle = (engine.keys.has("forward") ? 1 : 0) - (engine.keys.has("backward") ? 1 : 0);
        const steerInput = (engine.keys.has("left") ? 1 : 0) - (engine.keys.has("right") ? 1 : 0);
        const handbrake = engine.keys.has("brake");
        const surface = surfaceAt(car.position.x, car.position.z);
        engine.surface = surface;
        const gripBase = surface === "Асфальт" ? 1 : surface === "Грунт" ? 0.64 : 0.4;
        const wetGrip = weatherRef.current === "Дождь" || weatherRef.current === "Гроза" ? 0.78 : 1;
        const grip = gripBase * wetGrip * (handbrake ? 0.24 : 1);
        const damageSpeedFactor = engine.wear >= 70 ? 0.72 : engine.wear >= 35 ? 0.88 : 1;
        const maxSpeed = (activeVehicle.maxSpeed / 3.6) * (1 + carUpgradeRef.current * 0.15) * damageSpeedFactor;
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
        if (Math.abs(engine.carSlip) > 2.4 && Math.abs(engine.carSpeed) > 4) {
          driftSeconds += dt;
          if (driftSeconds >= 1) {
            updateDailyChallengeRef.current("drifts");
            driftSeconds = -2;
          }
        } else {
          driftSeconds = Math.max(0, driftSeconds);
        }
        const candidateX = car.position.x + (carDirection.x * engine.carSpeed + carSide.x * engine.carSlip) * dt;
        const candidateZ = car.position.z + (carDirection.z * engine.carSpeed + carSide.z * engine.carSlip) * dt;
        if (!isBlocked(candidateX, candidateZ, 2.25, false)) {
          car.position.x = clamp(candidateX, -180, 4180);
          car.position.z = clamp(candidateZ, -195, 195);
          const travelled = Math.abs(engine.carSpeed) * dt;
          engine.odometer += travelled / 1000;
          statisticsRef.current.kmDriven += travelled / 1000;
          engine.fuel = Math.max(
            0,
            engine.fuel - (travelled / 100_000) * activeVehicle.fuelUse * (1 + Math.abs(throttle) * 0.18) * (engine.wear >= 60 ? 1.25 : 1),
          );
          const speedKmh = Math.abs(engine.carSpeed) * 3.6;
          const residential = car.position.x < 450 || car.position.x > 3550;
          const speedLimit = residential ? 60 : 90;
          if (now >= nextViolationCheck && speedKmh > speedLimit + 4) {
            nextViolationCheck = now + 9000;
            const cameraChance = residential ? 0.3 : 0.1;
            if (Math.random() < cameraChance) applyTrafficPenalty("Камера зафиксировала превышение", `Разрешено ${speedLimit} км/ч · ваша скорость ${Math.round(speedKmh)} км/ч`, 500, 0);
          }
          const travelDirectionX = carDirection.x * Math.sign(engine.carSpeed || 1);
          const onMainRoad = Math.abs(car.position.z) < 8;
          const wrongRightHandLane = onMainRoad && ((travelDirectionX > 0.25 && car.position.z < -0.7) || (travelDirectionX < -0.25 && car.position.z > 0.7));
          wrongLaneSeconds = wrongRightHandLane && speedKmh > 8 ? wrongLaneSeconds + dt : Math.max(0, wrongLaneSeconds - dt * 2);
          if (wrongLaneSeconds >= 4 && now >= nextViolationCheck) {
            wrongLaneSeconds = 0;
            nextViolationCheck = now + 12000;
            applyTrafficPenalty("Выезд на встречную полосу", "В игре действует правостороннее движение", 1500, 3);
          }
        } else {
          const impact = Math.abs(engine.carSpeed);
          const impactKmh = impact * 3.6;
          const collisionKind = collisionKindAt(candidateX, candidateZ, 2.25);
          engine.carSpeed *= -0.12;
          engine.carSlip *= -0.2;
          if (now - lastCollisionAt > 1600) {
            lastCollisionAt = now;
            if (collisionKind === "pedestrian") {
              engine.wear = clamp(engine.wear + 35, 0, 100);
              applyTrafficPenalty("Опасное ДТП с пешеходом", "Движение остановлено. Вызваны полиция и скорая помощь.", 10000, 50);
            } else if (impactKmh < 15) {
              engine.wear = clamp(engine.wear + 1, 0, 100);
              applyTrafficPenalty("Лёгкое столкновение", "На кузове появились царапины · износ +1%", 0, 0);
            } else if (impactKmh <= 40) {
              engine.wear = clamp(engine.wear + 10, 0, 100);
              applyTrafficPenalty("Среднее ДТП", `${collisionKind === "vehicle" || collisionKind === "bus" ? "Столкновение с транспортом" : "Удар о препятствие"} · износ +10%`, 1000, 5);
            } else {
              engine.wear = clamp(engine.wear + 30, 0, 100);
              engine.fuel = Math.max(0, engine.fuel - 3);
              applyTrafficPenalty("Серьёзное ДТП", "Сильное повреждение · износ +30% · утечка 3 л топлива", 3000, 15);
            }
          }
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
        const baseSpeed = jogging ? 3.5 : fastWalking ? 2.5 : 1.35;
        const speed = baseSpeed * outfit.speed * surfaceSpeed * fatigueSpeed;
        currentWalkSpeedKmh = moving ? speed * 3.6 : 0;
        if (moving) {
          const angle = engine.yaw;
          const length = Math.max(1, Math.hypot(forward, side));
          const dx = ((-Math.sin(angle) * forward + Math.cos(angle) * side) / length) * speed * dt;
          const dz = ((-Math.cos(angle) * forward - Math.sin(angle) * side) / length) * speed * dt;
          const nextX = clamp(player.position.x + dx, -180, 4180);
          const nextZ = clamp(player.position.z + dz, -195, 195);
          if (!isBlocked(nextX, player.position.z, 0.62, true)) player.position.x = nextX;
          if (!isBlocked(player.position.x, nextZ, 0.62, true)) player.position.z = nextZ;
          statisticsRef.current.kmWalked += Math.hypot(dx, dz) / 1000;
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
      const worldClockActive = modeRef.current !== "intro" && modeRef.current !== "pause";
      if (worldClockActive) {
        engine.time += dt * (isDay ? 15 / 7200 : 9 / 900);
      }
      if (engine.time >= 24) engine.time -= 24;
      if (previousGameTime < 8 && engine.time >= 8) persistRef.current();
      previousGameTime = engine.time;
      if (modeRef.current !== "intro" && modeRef.current !== "pause") statisticsRef.current.playTimeSeconds += dt;
      const dayFactor = clamp(Math.sin(((engine.time - 5.5) / 24) * Math.PI * 2) * 0.65 + 0.45, 0.08, 1);
      const wetWeather = weatherRef.current === "Дождь" || weatherRef.current === "Гроза";
      const cloudFactor = weatherRef.current === "Облачно" ? 0.78 : wetWeather ? 0.58 : 1;
      const stormFlash = weatherRef.current === "Гроза" && Math.sin(now * 0.0017) > 0.994;
      sun.intensity = (0.35 + dayFactor * 2.7) * cloudFactor + (stormFlash ? 4.5 : 0);
      hemi.intensity = (0.35 + dayFactor * 1.8) * cloudFactor + (stormFlash ? 1.8 : 0);
      sun.position.set(focus.position.x - 45, 70, focus.position.z - 30);
      sunTarget.position.set(focus.position.x, 0, focus.position.z);
      sunTarget.updateMatrixWorld();
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
      clouds.forEach((cloud, index) => {
        cloud.position.x += dt * (0.65 + (index % 4) * 0.08);
        if (cloud.position.x > 4185) cloud.position.x = -185;
        cloudMaterial.opacity = weatherRef.current === "Ясно" ? 0.82 : wetWeather ? 0.96 : 0.9;
      });
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
      headlightMaterials.forEach((material) => {
        material.emissiveIntensity = 0.12 + nightGlow * 3.8;
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
      engine.traffic.forEach((trafficVehicle) => {
        trafficVehicle.mesh.position.x += trafficVehicle.direction * trafficVehicle.speed * dt;
        if (trafficVehicle.mesh.position.x > trafficVehicle.maxX) trafficVehicle.mesh.position.x = trafficVehicle.minX;
        if (trafficVehicle.mesh.position.x < trafficVehicle.minX) trafficVehicle.mesh.position.x = trafficVehicle.maxX;
        trafficVehicle.mesh.position.z = trafficVehicle.laneZ;
        trafficVehicle.mesh.rotation.y = trafficVehicle.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
        trafficVehicle.mesh.traverse((part) => {
          if (part instanceof THREE.Mesh && (part.name === "frontWheel" || part.name === "rearWheel")) {
            part.rotation.x += trafficVehicle.direction * trafficVehicle.speed * dt / 0.58;
          }
        });
      });
      const busOperating = engine.time >= 6 && engine.time < 23;
      const busClockActive = modeRef.current === "world";
      const busGameTimeDelta = busClockActive ? (engine.time - lastBusGameTime + 24) % 24 : 0;
      lastBusGameTime = engine.time;
      bus.visible = busOperating;
      if (busOperating) {
        if (busDwellGameHours > 0) {
          busDwellGameHours = Math.max(0, busDwellGameHours - busGameTimeDelta);
          const serviceKey = `${busCurrentStop}:${busDirection}`;
          if (serviceKey !== busServiceKey) {
            busServiceKey = serviceKey;
            engine.busPassengers.forEach((passenger, passengerIndex) => {
              if (passenger.state === "riding" && passenger.targetStop === busCurrentStop) {
                passenger.state = "exiting";
                passenger.progress = 0;
                passenger.mesh.visible = true;
                passenger.start.set(bus.position.x + (busDirection > 0 ? 2.5 : -2.5), 0, bus.position.z + laneZForDirection(busDirection, 1.6));
                passenger.end.set(BUS_STOPS[busCurrentStop].x - 2 + (passengerIndex % 4) * 1.25, 0, laneZForDirection(busDirection, 15.4));
                passenger.mesh.position.copy(passenger.start);
              } else if (passenger.state === "waiting" && passenger.stopIndex === busCurrentStop && passenger.direction === busDirection) {
                passenger.state = "boarding";
                passenger.progress = 0;
                passenger.start.copy(passenger.mesh.position);
                passenger.end.set(bus.position.x + (busDirection > 0 ? 2.5 : -2.5), 0, bus.position.z + laneZForDirection(busDirection, 1.6));
                const remainingStops = busDirection > 0 ? BUS_STOPS.length - 1 - busCurrentStop : busCurrentStop;
                const rideCount = Math.max(1, Math.min(remainingStops, 1 + (passengerIndex % 2)));
                passenger.targetStop = busCurrentStop + busDirection * rideCount;
              }
            });
          }
        } else if (busClockActive) {
          const targetX = BUS_STOPS[busNextStop].x;
          const remaining = targetX - bus.position.x;
          const busSpeed = 16.67;
          if (Math.abs(remaining) <= busSpeed * dt) {
            bus.position.x = targetX;
            busCurrentStop = busNextStop;
            busDwellGameHours = BUS_STOP_DWELL_GAME_MINUTES / 60;
            if (busCurrentStop === BUS_STOPS.length - 1) busDirection = -1;
            if (busCurrentStop === 0) busDirection = 1;
            busNextStop = busCurrentStop + busDirection;
          } else {
            bus.position.x += Math.sign(remaining) * busSpeed * dt;
            busServiceKey = "";
          }
        }
        bus.position.z = laneZForDirection(busDirection, 3.8);
        bus.rotation.y = busDirection > 0 ? Math.PI / 2 : -Math.PI / 2;
        const busDoor = bus.getObjectByName("busDoor");
        if (busDoor) busDoor.position.x = THREE.MathUtils.lerp(busDoor.position.x, busDwellGameHours > 0 ? -1.72 : -1.15, 0.08);
        if (busClockActive && busDwellGameHours <= 0) {
          bus.traverse((part) => {
            if (part instanceof THREE.Mesh && part.name === "busWheel") {
              part.rotation.x += busDirection * 16.67 * dt / 0.68;
            }
          });
        }
      }
      engine.busPassengers.forEach((passenger, passengerIndex) => {
        if (passenger.state !== "boarding" && passenger.state !== "exiting") return;
        passenger.progress = Math.min(1, passenger.progress + dt / 2.4);
        passenger.mesh.position.lerpVectors(passenger.start, passenger.end, passenger.progress);
        passenger.mesh.rotation.y = Math.atan2(passenger.end.x - passenger.start.x, passenger.end.z - passenger.start.z);
        personWalkCycle(passenger.mesh, true, now, passengerIndex * 0.55);
        if (passenger.progress >= 1) {
          if (passenger.state === "boarding") {
            passenger.state = "riding";
            passenger.mesh.visible = false;
          } else {
            passenger.state = "waiting";
            passenger.stopIndex = passenger.targetStop;
            passenger.direction = passenger.stopIndex === 0 ? 1 : passenger.stopIndex === BUS_STOPS.length - 1 ? -1 : (busDirection === 1 ? -1 : 1);
            passenger.mesh.position.z = laneZForDirection(passenger.direction, 15.4);
            passenger.mesh.visible = true;
          }
        }
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
      statisticsTick += dt;
      if (uiTick > 0.12) {
        uiTick = 0;
        setEnergy(Math.round(energyRef.current));
        setGameTime(engine.time);
        setNearest(engine.nearest);
        setNearCar(Boolean(currentVehicleRef.current) && car.visible && !engine.driving && player.position.distanceTo(car.position) < 5.2);
        setPlayerPos({ x: focus.position.x, z: focus.position.z });
        setCarPos({ x: car.position.x, z: car.position.z });
        setMovementState(currentMovement);
        setPlayerSpeedKmh(Math.round(currentWalkSpeedKmh * 10) / 10);
        setCarTelemetry({
          speed: Math.round(Math.abs(engine.carSpeed) * 3.6),
          fuel: Math.round(engine.fuel * 100) / 100,
          surface: engine.surface,
          wear: Math.round(engine.wear),
        });
        const nearbyStop = BUS_STOPS.reduce((closest, stop) =>
          Math.hypot(focus.position.x - stop.x, Math.abs(focus.position.z) - 18) <
          Math.hypot(focus.position.x - closest.x, Math.abs(focus.position.z) - 18)
            ? stop
            : closest,
        );
        const stopDistance = Math.hypot(focus.position.x - nearbyStop.x, Math.abs(focus.position.z) - 18);
        setNearBusStopId(stopDistance < 12 ? nearbyStop.id : null);
        const nearbyStation = GAS_STATIONS.reduce((closest, station) =>
          Math.hypot(focus.position.x - station.x, focus.position.z - station.z) <
          Math.hypot(focus.position.x - closest.x, focus.position.z - closest.z)
            ? station
            : closest,
        );
        setNearStationId(Math.hypot(focus.position.x - nearbyStation.x, focus.position.z - nearbyStation.z) < 28 ? nearbyStation.id : null);
        setBusPos({ x: bus.position.x, z: bus.position.z });
        setBusReadyAtStop(busOperating && busDwellGameHours > 0 && Math.abs(bus.position.x - nearbyStop.x) < 20);
        setBusEtaMinutes(
          busOperating
            ? Math.max(0, Math.ceil(Math.abs(bus.position.x - nearbyStop.x) / 16.67 / 60))
            : -1,
        );
        setLocationName(
          focus.position.x < 450
            ? "село Первореченское"
            : focus.position.x > 3550
              ? "ст. Динская"
              : "трасса Первореченское — Динская",
        );
      }
      if (statisticsTick > 1) {
        statisticsTick = 0;
        const dailyDistance = Math.max(0, statisticsRef.current.kmDriven - dailyDistanceRef.current);
        if (dailyDistance > 0) updateDailyChallengeRef.current("drive_km", dailyDistance);
        dailyDistanceRef.current = statisticsRef.current.kmDriven;
        statisticsRef.current.maxIncome = Math.max(statisticsRef.current.maxIncome, residentsRef.current.filter((resident) => resident.signed).length * 890);
        setStatistics({ ...statisticsRef.current });
        if (statisticsRef.current.kmDriven >= 5) unlockAchievement("road_trip");
        if (reputation >= 50) unlockAchievement("trusted_manager");
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
    const vehicleTrust = currentVehicleRef.current === "camry" ? 3 : 0;
    const cleanCarTrust = carCleanRef.current ? 2 : 0;
    const presentationTrust = kind === "pressure" ? 0 : vehicleTrust + cleanCarTrust;
    let change = (kind === current.hook ? 27 : kind === "pressure" ? -11 : 9) + outfitTrust + presentationTrust;
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
      updateDailyChallenge("office_actions");
      window.setTimeout(() => setCoffeeReady(true), 60000);
      return;
    }
    if (action === "sleep") {
      energyRef.current = 100;
      setEnergy(100);
      engineRef.current.time = (engineRef.current.time + 3) % 24;
      setOfficeMessage("Алексей отдохнул на диване три игровых часа. Энергия восстановлена.");
      updateDailyChallenge("office_actions");
      return;
    }
    if (action === "brochures") {
      const nextRep = clamp(reputation + 1, 0, 100);
      setReputation(nextRep);
      persist(residentsRef.current, money, nextRep);
      setOfficeMessage("Подготовлена пачка буклетов. Репутация выросла на 1.");
      updateDailyChallenge("office_actions");
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
      updateDailyChallenge("office_actions");
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
      updateDailyChallenge("office_actions");
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
    updateDailyChallenge("upgrades");
    updateDailyChallenge("office_actions");
  };

  const signContract = (tariffIndex: number) => {
    if (!activeNpc) return;
    const resident = residentsRef.current.find((r) => r.id === activeNpc.id);
    if (!resident) return;
    resident.signed = true;
    const price = TARIFFS[tariffIndex].bonus;
    const garageQuestReward = resident.id === 1 && questsRef.current.some((quest) => quest.id === "quest_garage_secrets" && quest.status === "active") ? 2000 : 0;
    const nextMoney = money + 250 + garageQuestReward;
    const nextRep = clamp(reputation + 8 + (garageQuestReward ? 5 : 0), 0, 100);
    residentsRef.current.forEach((neighbor) => {
      if (!neighbor.signed && neighbor.id !== resident.id && Math.hypot(neighbor.x - resident.x, neighbor.z - resident.z) < 42) {
        neighbor.interest = clamp(neighbor.interest + 10, 0, 100);
      }
    });
    setMoney(nextMoney);
    setReputation(nextRep);
    setResidents([...residentsRef.current]);
    setShowTariff(false);
    setMode("world");
    setActiveNpcId(null);
    statisticsRef.current.totalContracts = residentsRef.current.filter((item) => item.signed).length;
    setStatistics({ ...statisticsRef.current });
    if (resident.mesh) {
      const marker = resident.mesh.getObjectByName("marker") as THREE.Mesh | undefined;
      if (marker) marker.material = mat(0xcce86b);
    }
    persist(residentsRef.current, nextMoney, nextRep);
    updateDailyChallenge("contracts");
    updateDailyChallenge("profit", 250 + garageQuestReward);
    sendNetworkMessage({ type: "contract", residentId: resident.id });
    sendNetworkMessage({ type: "economy", money: nextMoney, reputation: nextRep });
    unlockAchievement("first_contract");
    if (nextRep >= 50) unlockAchievement("trusted_manager");
    flash(garageQuestReward ? "Задание «Гаражные тайны» выполнено · +2 000 ₽ · гаечный ключ" : `Договор «${TARIFFS[tariffIndex].name}» подписан · +250 ₽ · +8 репутации`);
    if (residentsRef.current.filter((r) => r.signed).length === 10) {
      window.setTimeout(() => flash("Все 10 объектов подключены — пульт охраны открыт!"), 2600);
    }
    void price;
  };

  const startOffice = (demo = false) => {
    if (!demo && (!officeRented || totalContracts < 1)) {
      flash(officeRented ? "Для дежурства нужен хотя бы один активный договор" : "Сначала арендуйте центральный офис");
      return;
    }
    setOfficeZone("console");
    persist();
    setMode("office");
    setAlarmResult(demo ? "Учебная смена запущена. Сигнал поступит через секунду." : "Смена началась. Все объекты на связи.");
    setAlarm(null);
    window.setTimeout(() => {
      const nextAlarm = createAlarmEvent();
      setAlarm(nextAlarm);
      sendNetworkMessage({ type: "alarm", alarm: nextAlarm });
    }, 1100);
  };

  const handleAlarm = (action: string) => {
    if (!alarm) return;
    statisticsRef.current.alarmsResponded += 1;
    updateDailyChallenge("alarms");
    if (action === "self") {
      setMapWaypoint({ x: 18, z: 52, label: `Личный выезд · ${alarm.address}` });
      setAlarmResult("Алексей принял вызов лично. Пульт остался без оператора.");
      setAlarm(null);
      setMode("world");
      flash("Маршрут на тревожный объект построен");
      return;
    }
    const correct = action === alarm.correct || (alarm.scenario === "panic" && action === "gbr") || (alarm.scenario === "intrusion" && action === "police");
    if (correct) {
      const reward = alarm.scenario === "panic" ? 1800 : alarm.scenario === "fire" ? 1200 : alarm.scenario === "intrusion" ? 1000 : 450;
      const repReward = alarm.scenario === "panic" ? 12 : alarm.scenario === "false" ? 4 : 8;
      const nextMoney = money + reward;
      const nextRep = clamp(reputation + repReward, 0, 100);
      setMoney(nextMoney);
      setReputation(nextRep);
      setAlarmResult(alarm.scenario === "false" ? "Клиент подтвердил ложную тревогу. Сигнал снят без выезда." : alarm.scenario === "fire" ? "Пожарные вызваны, клиент предупреждён. Объект спасён." : alarm.scenario === "panic" ? "ГБР и полиция приняли вызов высшего приоритета." : "Экипаж направлен, полиция предупреждена. Проникновение остановлено.");
      flash(`Правильное решение · +${reward.toLocaleString("ru-RU")} ₽ · репутация +${repReward}`);
      if (alarm.scenario === "false") statisticsRef.current.falseAlarms += 1;
      statisticsRef.current.successfulPreventions += 1;
      unlockAchievement("night_owl");
      persist(residentsRef.current, nextMoney, nextRep);
    } else {
      const seriousReset = action === "reset" && alarm.scenario !== "false";
      const penalty = seriousReset ? 2500 : alarm.scenario === "false" && action === "gbr" ? 500 : 700;
      const nextMoney = Math.max(0, money - penalty);
      const nextRep = Math.max(0, reputation - (seriousReset ? 15 : 4));
      setMoney(nextMoney);
      setReputation(nextRep);
      setAlarmResult(seriousReset ? "Реальная угроза ошибочно сброшена. Клиент требует разбирательства." : "Решение не соответствует признакам сигнала.");
      flash(`Ошибка реагирования · −${penalty.toLocaleString("ru-RU")} ₽`);
      persist(residentsRef.current, nextMoney, nextRep);
    }
    setStatistics({ ...statisticsRef.current });
    setAlarm(null);
    window.setTimeout(() => {
      const nextAlarm = createAlarmEvent();
      setAlarm(nextAlarm);
      sendNetworkMessage({ type: "alarm", alarm: nextAlarm });
    }, 5200);
  };

  const toggleQuestTracking = (questId: string) => {
    const currentQuest = questsRef.current.find((quest) => quest.id === questId);
    if (!currentQuest) return;
    const trackedCount = questsRef.current.filter((quest) => quest.tracked && quest.status === "active").length;
    if (!currentQuest.tracked && trackedCount >= 3) {
      flash("Одновременно можно отслеживать не более трёх заданий");
      return;
    }
    const next = questsRef.current.map((quest) => quest.id === questId ? { ...quest, tracked: !quest.tracked, read: true } : quest);
    questsRef.current = next;
    setQuests(next);
    persistRef.current();
  };

  const acceptQuest = (questId: string) => {
    if (questsRef.current.some((quest) => quest.id === questId)) return;
    const next = [...questsRef.current, { id: questId, status: "active" as QuestStatus, tracked: questsRef.current.filter((quest) => quest.tracked).length < 3, read: false }];
    questsRef.current = next;
    setQuests(next);
    persistRef.current();
    const definition = QUESTS.find((quest) => quest.id === questId);
    flash(`Новое задание: ${definition?.title ?? "поручение"}`);
  };

  const toggleDailyTracking = (challengeId: string) => {
    const challenge = dailyChallengesRef.current.activeChallenges.find((item) => item.id === challengeId);
    if (!challenge) return;
    const trackedCount = dailyChallengesRef.current.activeChallenges.filter((item) => item.tracked).length;
    if (!challenge.tracked && trackedCount >= 2) {
      flash("На HUD можно закрепить только два ежедневных испытания");
      return;
    }
    const next = {
      ...dailyChallengesRef.current,
      activeChallenges: dailyChallengesRef.current.activeChallenges.map((item) => item.id === challengeId ? { ...item, tracked: !item.tracked } : item),
    };
    dailyChallengesRef.current = next;
    setDailyChallenges(next);
    persistRef.current();
  };

  const claimDailyChallenge = (challengeId: string) => {
    const challenge = dailyChallengesRef.current.activeChallenges.find((item) => item.id === challengeId);
    const definition = DAILY_CHALLENGES.find((item) => item.id === challengeId);
    if (!challenge || !definition || challenge.claimed || challenge.progress < definition.target) return;
    const wasFirstClaim = !dailyChallengesRef.current.activeChallenges.some((item) => item.claimed);
    const claimedChallenges = dailyChallengesRef.current.activeChallenges.map((item) => item.id === challengeId ? { ...item, claimed: true, tracked: false } : item);
    const claimedCount = claimedChallenges.filter((item) => item.claimed).length;
    const bonusEarned = claimedCount >= 3 && !dailyChallengesRef.current.bonusClaimed;
    const nextStreak = wasFirstClaim ? dailyChallengesRef.current.streakCount + 1 : dailyChallengesRef.current.streakCount;
    const nextDaily = {
      ...dailyChallengesRef.current,
      streakCount: nextStreak,
      bonusClaimed: dailyChallengesRef.current.bonusClaimed || bonusEarned,
      activeChallenges: claimedChallenges,
    };
    dailyChallengesRef.current = nextDaily;
    setDailyChallenges(nextDaily);
    const nextMoney = money + definition.money + (bonusEarned ? 1000 : 0);
    const nextRep = clamp(reputation + definition.reputation + (bonusEarned ? 50 : 0), 0, 100);
    setMoney(nextMoney);
    setReputation(nextRep);
    persist(residentsRef.current, nextMoney, nextRep);
    const streakReward = nextStreak === 3 ? " · кружка «Лучший менеджер»" : nextStreak === 7 ? " · наклейки «Пламя»" : nextStreak === 14 ? " · костюм «Ветеран»" : nextStreak === 30 ? " · золотой значок и +5% дохода" : "";
    flash(`${definition.title}: награда получена${bonusEarned ? " · ежедневная премия +1 000 ₽" : ""}${streakReward}`);
  };

  const showQuestOnMap = (questId: string) => {
    const definition = QUESTS.find((quest) => quest.id === questId);
    if (!definition) return;
    setMapWaypoint(definition.target);
    setSelectedMapObject(`Задание: ${definition.title} · ${definition.short}`);
    setMode("map");
  };

  const rentCentralOffice = () => {
    if (signedCount < 10) {
      flash(`Для аренды офиса нужно ещё ${10 - signedCount} договоров`);
      return;
    }
    officeRentedRef.current = true;
    setOfficeRented(true);
    const nextMoney = money + 5000;
    const nextRep = clamp(reputation + 20, 0, 100);
    setMoney(nextMoney);
    setReputation(nextRep);
    persist(residentsRef.current, nextMoney, nextRep);
    updateDailyChallenge("profit", 5000);
    flash("Центральный офис открыт · награда за квест +5 000 ₽ и +20 репутации");
  };

  const signExtendedContract = (object: SecurityObject, premium = false) => {
    const district = DISTRICTS.find((item) => item.id === object.district);
    if (!district || extendedContractsRef.current.includes(object.id)) return;
    if (reputation < district.reputation || (district.id !== "central" && totalContracts < district.contracts)) {
      flash(`Район пока закрыт: нужно ${district.reputation} репутации`);
      return;
    }
    if (object.district !== "central" && !openedBranchesRef.current.includes(object.district)) {
      flash("Сначала откройте филиал в этом районе");
      return;
    }
    const nextContracts = [...extendedContractsRef.current, object.id];
    const nextMoney = money + object.installation[premium ? 1 : 0];
    const nextRep = clamp(reputation + (object.commercial ? 4 : 2), 0, 100);
    extendedContractsRef.current = nextContracts;
    setExtendedContracts(nextContracts);
    setMoney(nextMoney);
    setReputation(nextRep);
    statisticsRef.current.totalContracts = signedCount + nextContracts.length;
    setStatistics({ ...statisticsRef.current });
    persist(residentsRef.current, nextMoney, nextRep);
    updateDailyChallenge("contracts");
    updateDailyChallenge("profit", object.installation[premium ? 1 : 0]);
    sendNetworkMessage({ type: "extended-contract", objectId: object.id });
    sendNetworkMessage({ type: "economy", money: nextMoney, reputation: nextRep });
    flash(`${object.name}: договор подписан · монтаж оплачен`);
  };

  const openBranch = (district: DistrictSpec) => {
    if (openedBranchesRef.current.includes(district.id)) return;
    if (reputation < district.reputation || totalContracts < district.contracts || money < district.openingCost) {
      flash(`Нужно: ${district.reputation} репутации, ${district.contracts} договоров и ${district.openingCost.toLocaleString("ru-RU")} ₽`);
      return;
    }
    const next = [...openedBranchesRef.current, district.id];
    const nextMoney = money - district.openingCost;
    openedBranchesRef.current = next;
    setOpenedBranches(next);
    setMoney(nextMoney);
    persist(residentsRef.current, nextMoney, reputation);
    updateDailyChallenge("upgrades");
    flash(`Филиал «${district.name}» открыт`);
  };

  const hireStaff = (role: typeof STAFF_ROLES[number]) => {
    const activeOffices = openedBranchesRef.current.filter((id) => id !== "central").length + (officeRentedRef.current ? 1 : 0);
    const limit = role.key === "technicians" ? 2 : role.key === "dispatchers" || role.key === "gbrCrews" || role.key === "salesManagers" ? Math.max(1, activeOffices) : Math.max(1, activeOffices * 2);
    if (staffRef.current[role.key] >= limit) {
      flash(`Лимит для текущей сети: ${limit}. Откройте следующий филиал.`);
      return;
    }
    const next = { ...staffRef.current, [role.key]: staffRef.current[role.key] + 1 };
    staffRef.current = next;
    setStaff(next);
    persistRef.current();
    flash(`${role.name} принят в штат · ${role.salary.toLocaleString("ru-RU")} ₽/мес.`);
  };

  const rentOkaForDay = () => {
    if (ownedVehiclesRef.current.length > 0 || rentalActive) {
      flash("Аренда доступна, когда нет личного автомобиля");
      return;
    }
    if (moneyRef.current < 500) {
      flash("Для аренды нужно 500 ₽");
      return;
    }
    const nextMoney = moneyRef.current - 500;
    moneyRef.current = nextMoney;
    currentVehicleRef.current = "oka";
    setMoney(nextMoney);
    setCurrentVehicle("oka");
    setRentalActive(true);
    engineRef.current.fuel = 20;
    if (engineRef.current.car) {
      engineRef.current.car.visible = true;
      if (engineRef.current.player) engineRef.current.car.position.set(engineRef.current.player.position.x + 6, 0, engineRef.current.player.position.z);
    }
    setCarTelemetry((value) => ({ ...value, fuel: 20, wear: 15 }));
    flash("Ока арендована до конца игрового дня · 500 ₽");
  };

  const buyVehicle = (vehicle: VehicleSpec, used = false) => {
    if (ownedVehiclesRef.current.includes(vehicle.id)) {
      currentVehicleRef.current = vehicle.id;
      setCurrentVehicle(vehicle.id);
      if (engineRef.current.car) engineRef.current.car.visible = true;
      flash(`${vehicle.name} выбран`);
      return;
    }
    const price = used ? vehicle.usedPrice : vehicle.price;
    if (money < price) {
      flash(`Не хватает ${(price - money).toLocaleString("ru-RU")} ₽`);
      return;
    }
    const firstVehicle = ownedVehiclesRef.current.length === 0;
    const nextOwned = [...ownedVehiclesRef.current, vehicle.id];
    const nextMoney = money - price;
    ownedVehiclesRef.current = nextOwned;
    currentVehicleRef.current = vehicle.id;
    setOwnedVehicles(nextOwned);
    setCurrentVehicle(vehicle.id);
    setRentalActive(false);
    setMoney(nextMoney);
    if (engineRef.current.car) {
      engineRef.current.car.visible = true;
      if (firstVehicle && engineRef.current.player) {
        engineRef.current.car.position.set(engineRef.current.player.position.x + 6, 0, engineRef.current.player.position.z);
        engineRef.current.car.rotation.y = Math.PI / 2;
      }
    }
    if (firstVehicle) {
      engineRef.current.fuel = 20;
      setCarTelemetry((value) => ({ ...value, fuel: 20 }));
      unlockAchievement("first_wheels");
    }
    if (used) engineRef.current.wear = 30 + ((vehicle.price / 1000) % 21);
    persist(residentsRef.current, nextMoney, reputation);
    updateDailyChallenge("upgrades");
    flash(`${vehicle.name} куплен${used ? " с пробегом" : ""}`);
  };

  const tradeInCurrentVehicle = () => {
    if (!currentVehicleRef.current) {
      flash("Сначала купите автомобиль");
      return;
    }
    if (ownedVehiclesRef.current.length <= 1) {
      flash("Нельзя продать единственный автомобиль");
      return;
    }
    const vehicle = VEHICLE_BY_ID[currentVehicleRef.current];
    const wearFactor = clamp(1 - engineRef.current.wear / 100, 0.35, 1);
    const upgradeFactor = 1 + carUpgradeRef.current * 0.05;
    const value = Math.round(vehicle.price * 0.6 * wearFactor * upgradeFactor);
    const nextOwned = ownedVehiclesRef.current.filter((id) => id !== vehicle.id);
    const nextVehicle = nextOwned[0];
    const nextMoney = money + value;
    ownedVehiclesRef.current = nextOwned;
    currentVehicleRef.current = nextVehicle;
    setOwnedVehicles(nextOwned);
    setCurrentVehicle(nextVehicle);
    setMoney(nextMoney);
    engineRef.current.wear = 0;
    persist(residentsRef.current, nextMoney, reputation);
    flash(`${vehicle.name} принят по trade‑in · +${value.toLocaleString("ru-RU")} ₽`);
  };

  const serviceVehicle = (action: "fuel" | "wash" | "repair" | "tires" | "siren") => {
    if (!currentVehicleRef.current) {
      flash("В гараже пока нет автомобиля");
      return;
    }
    const prices = {
      fuel: Math.max(0, Math.round((FUEL_TANK_LITERS - engineRef.current.fuel) * 50)),
      wash: 200,
      repair: Math.max(500, Math.round(engineRef.current.wear / 100 * 15000)),
      tires: 2000,
      siren: 8000,
    };
    const price = prices[action];
    if (action === "siren" && vehicleSirenRef.current) return flash("Мигалка и сирена уже установлены");
    if (action === "tires" && seasonalTiresRef.current) return flash("Сезонные шины уже установлены");
    if (money < price) return flash(`Для обслуживания нужно ${price.toLocaleString("ru-RU")} ₽`);
    const nextMoney = money - price;
    setMoney(nextMoney);
    if (action === "fuel") {
      engineRef.current.fuel = FUEL_TANK_LITERS;
      setCarTelemetry((value) => ({ ...value, fuel: FUEL_TANK_LITERS }));
      updateDailyChallenge("upgrades");
    }
    if (action === "wash") {
      carCleanRef.current = true;
      setCarClean(true);
    }
    if (action === "repair") {
      engineRef.current.wear = 0;
      setCarTelemetry((value) => ({ ...value, wear: 0 }));
      updateDailyChallenge("upgrades");
    }
    if (action === "tires") {
      seasonalTiresRef.current = true;
      setSeasonalTires(true);
    }
    if (action === "siren") {
      vehicleSirenRef.current = true;
      setVehicleSiren(true);
    }
    persist(residentsRef.current, nextMoney, reputation);
    flash(`${action === "fuel" ? "Бак заправлен" : action === "wash" ? "Машина вымыта" : action === "repair" ? "Автомобиль отремонтирован" : action === "tires" ? "Шины заменены" : "Мигалка и сирена установлены"} · −${price.toLocaleString("ru-RU")} ₽`);
  };

  const buyStationService = (service: StationService) => {
    if (serviceBusy) return;
    if ((service.startsWith("fuel") || service === "wash" || service === "oil" || service === "tires") && !currentVehicleRef.current) {
      flash("Сначала нужен автомобиль");
      return;
    }
    const currentFuel = engineRef.current.fuel;
    const fuelLiters =
      service === "fuel10"
        ? Math.min(10, FUEL_TANK_LITERS - currentFuel)
        : service === "fuel20"
          ? Math.min(20, FUEL_TANK_LITERS - currentFuel)
          : service === "fuelFull"
            ? Math.max(0, FUEL_TANK_LITERS - currentFuel)
            : 0;
    const prices: Record<StationService, number> = {
      fuel10: Math.round(fuelLiters * 50),
      fuel20: Math.round(fuelLiters * 50),
      fuelFull: Math.round(fuelLiters * 50),
      wash: 200,
      oil: 100,
      tires: 50,
      coffee: 50,
      snack: 30,
      battery: 100,
      map: 250,
      leaflets: 500,
    };
    const price = prices[service];
    if (price <= 0 && service.startsWith("fuel")) {
      flash("Бак уже полный");
      return;
    }
    if (moneyRef.current < price) {
      flash(`Не хватает ${(price - moneyRef.current).toLocaleString("ru-RU")} ₽`);
      return;
    }
    const nextMoney = moneyRef.current - price;
    moneyRef.current = nextMoney;
    setMoney(nextMoney);
    const animated = service.startsWith("fuel") || service === "wash";
    setServiceBusy(service === "wash" ? "Автомойка работает…" : service.startsWith("fuel") ? "Заправляем автомобиль…" : "Обслуживание…");
    window.setTimeout(() => {
      let nextReputation = reputation;
      if (service.startsWith("fuel")) {
        engineRef.current.fuel = clamp(engineRef.current.fuel + fuelLiters, 0, FUEL_TANK_LITERS);
        setCarTelemetry((value) => ({ ...value, fuel: Math.round(engineRef.current.fuel * 100) / 100 }));
      }
      if (service === "wash") {
        carCleanRef.current = true;
        setCarClean(true);
      }
      if (service === "oil") {
        engineRef.current.wear = clamp(engineRef.current.wear - 2, 0, 100);
        setCarTelemetry((value) => ({ ...value, wear: Math.round(engineRef.current.wear) }));
      }
      if (service === "tires") {
        seasonalTiresRef.current = true;
        setSeasonalTires(true);
      }
      if (service === "coffee" || service === "snack") {
        energyRef.current = clamp(energyRef.current + (service === "coffee" ? 15 : 5), 0, 100);
        setEnergy(Math.round(energyRef.current));
      }
      if (service === "battery") setEquipment((value) => value + 1);
      if (service === "map") {
        setMapLayers((value) => ({ ...value, points: true }));
        setSelectedMapObject("Карта местности куплена: тропинки и сервисные точки отмечены.");
      }
      if (service === "leaflets") {
        nextReputation = clamp(reputation + 2, 0, 100);
        setReputation(nextReputation);
      }
      persist(residentsRef.current, nextMoney, nextReputation);
      setServiceBusy("");
      flash(`${animated ? "Готово" : "Покупка оформлена"} · −${price.toLocaleString("ru-RU")} ₽`);
    }, animated ? 3200 : 500);
  };

  const rideBusTo = (destinationId: BusStopSpec["id"]) => {
    if (!transitMenu || !busReadyAtStop) return;
    const source = BUS_STOPS.find((stop) => stop.id === transitMenu);
    const destination = BUS_STOPS.find((stop) => stop.id === destinationId);
    if (!source || !destination || source.id === destination.id || !engineRef.current.player) return;
    const intercity = (source.id === "pervorechenskoe" && destination.id === "dinskaya") || (source.id === "dinskaya" && destination.id === "pervorechenskoe");
    const fare = intercity ? 150 : 50;
    if (moneyRef.current < fare) {
      flash(`Для поездки нужно ${fare} ₽`);
      return;
    }
    const nextMoney = moneyRef.current - fare;
    moneyRef.current = nextMoney;
    setMoney(nextMoney);
    engineRef.current.player.position.set(destination.x, 0, destination.z + (destination.z > 0 ? 5 : -5));
    setPlayerPos({ x: destination.x, z: destination.z });
    setTransitMenu(null);
    setMode("world");
    persist(residentsRef.current, nextMoney, reputation);
    flash(`Автобус прибыл: ${destination.name} · −${fare} ₽`);
  };

  const buyStoreItem = (kind: "batteries" | "food" | "tools" | "book" | "leaflets" | "billboard" | "radio") => {
    const prices = { batteries: 1000, food: 100, tools: 3000, book: 2000, leaflets: 500, billboard: 10000, radio: 3000 };
    const price = prices[kind];
    if (money < price) return flash(`Не хватает ${(price - money).toLocaleString("ru-RU")} ₽`);
    const nextMoney = money - price;
    let nextRep = reputation;
    if (kind === "batteries") setEquipment((value) => value + 10);
    if (kind === "tools") setEquipment((value) => value + 5);
    if (kind === "food") {
      energyRef.current = clamp(energyRef.current + 20, 0, 100);
      setEnergy(Math.round(energyRef.current));
    }
    if (kind === "book") nextRep = clamp(nextRep + 2, 0, 100);
    if (kind === "leaflets") nextRep = clamp(nextRep + 1, 0, 100);
    if (kind === "billboard") nextRep = clamp(nextRep + 8, 0, 100);
    if (kind === "radio") nextRep = clamp(nextRep + 4, 0, 100);
    setMoney(nextMoney);
    setReputation(nextRep);
    persist(residentsRef.current, nextMoney, nextRep);
    updateDailyChallenge("office_actions");
    flash(`Покупка оформлена · −${price.toLocaleString("ru-RU")} ₽`);
  };

  const closeBusinessMonth = () => {
    const interest = loanRef.current ? Math.round(loanRef.current.principal * 0.1) : 0;
    const result = monthlyIncome - monthlyExpenses - interest;
    const nextMoney = money + result;
    const nextMonth = businessMonthRef.current + 1;
    setMoney(nextMoney);
    setBusinessMonth(nextMonth);
    businessMonthRef.current = nextMonth;
    if (officeRentedRef.current && !questsRef.current.some((quest) => quest.id === "quest_competitor")) {
      const nextQuests = [...questsRef.current, { id: "quest_competitor", status: "active" as QuestStatus, tracked: false, read: false }];
      questsRef.current = nextQuests;
      setQuests(nextQuests);
      window.setTimeout(() => flash("Новое сюжетное задание: «Конкурент»"), 500);
    }
    if (loanRef.current) {
      loanRef.current = { principal: loanRef.current.principal + interest, months: loanRef.current.months + 1 };
      setLoan(loanRef.current);
    }
    const passiveSales = Math.min(2, staffRef.current.salesManagers);
    if (passiveSales > 0) {
      const leads = SECURITY_OBJECTS.filter((object) => openedBranchesRef.current.includes(object.district) && !extendedContractsRef.current.includes(object.id)).slice(0, passiveSales);
      if (leads.length) {
        extendedContractsRef.current = [...extendedContractsRef.current, ...leads.map((lead) => lead.id)];
        setExtendedContracts(extendedContractsRef.current);
        statisticsRef.current.totalContracts = signedCount + extendedContractsRef.current.length;
        setStatistics({ ...statisticsRef.current });
        window.setTimeout(() => flash(`Менеджер продаж привёл ${leads.length} новых клиентов`), 700);
      }
    }
    persist(residentsRef.current, nextMoney, reputation);
    if (result > 0) updateDailyChallenge("profit", result);
    sendNetworkMessage({ type: "economy", money: nextMoney, reputation });
    flash(`Месяц закрыт: ${result >= 0 ? "+" : ""}${result.toLocaleString("ru-RU")} ₽`);
  };

  const takeLoan = (amount: number) => {
    if (loanRef.current) {
      flash("Сначала погасите действующий кредит");
      return;
    }
    const nextLoan = { principal: amount, months: 0 };
    loanRef.current = nextLoan;
    setLoan(nextLoan);
    const nextMoney = money + amount;
    setMoney(nextMoney);
    persist(residentsRef.current, nextMoney, reputation);
    flash(`Банк выдал ${amount.toLocaleString("ru-RU")} ₽ под 10% в месяц`);
  };

  const createNetworkRoom = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setNetworkIsHost(true);
    setNetworkRoomCode(code);
    setNetworkRoomInput(code);
    flash(`Комната ${code} создана`);
  };

  const joinNetworkRoom = () => {
    const code = networkRoomInput.trim().toUpperCase();
    if (code.length < 4) {
      flash("Введите код комнаты");
      return;
    }
    setNetworkIsHost(false);
    setNetworkRoomCode(code);
    flash(`Подключение к комнате ${code}`);
  };

  const leaveNetworkRoom = () => {
    sendNetworkMessage({ type: "leave" });
    setNetworkRoomCode("");
    setNetworkPlayers([]);
    setNetworkChat([]);
    setNetworkIsHost(false);
    setMode("intro");
  };

  const startNetworkGame = () => {
    if (!networkIsHost) return;
    sendNetworkMessage({ type: "start" });
    setMode("world");
  };

  const sendNetworkChat = () => {
    const text = networkChatInput.trim().slice(0, 120);
    if (!text) return;
    const chat: NetworkChatMessage = { id: `chat-${Date.now()}`, author: profile.nickname, text, sentAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
    setNetworkChat((current) => [...current.slice(-29), chat]);
    sendNetworkMessage({ type: "chat", chat });
    setNetworkChatInput("");
  };

  const FullResetAndRestart = () => {
    if (!window.confirm("Сбросить игру полностью? Будут удалены профиль, деньги, договоры, районы, транспорт, задания, статистика и все слоты сохранений.")) return;
    isResettingRef.current = true;
    try {
      networkChannelRef.current?.postMessage({ type: "leave", senderId: profileRef.current.id });
      networkChannelRef.current?.close();
      networkChannelRef.current = null;
    } catch {
      // The room may already be closed; reset must continue regardless.
    }
    try {
      clearGameStorage(localStorage);
      clearGameStorage(sessionStorage);
    } catch {
      // Storage can be unavailable in privacy mode; the in-memory restart still proceeds.
    }
    const cleanStart = migrateSave({
      ...DEFAULT_SAVE,
      money: 15000,
      reputation: 0,
      contracts: [],
      interests: {},
      playerPos: { ...DEFAULT_PLAYER_POSITION },
      carPos: { ...DEFAULT_CAR_POSITION },
      statistics: { ...EMPTY_STATS },
      achievements: [],
      extendedContracts: [],
      openedBranches: ["central"],
      staff: { ...EMPTY_STAFF },
      ownedVehicles: [],
      currentVehicle: null,
      loan: null,
      businessMonth: 1,
      officeRented: false,
      quests: DEFAULT_QUESTS.map((quest) => ({ ...quest })),
      dailyChallenges: createDailyChallenges(undefined, false, false),
      carFuel: 0,
      carWear: 0,
    });
    try {
      localStorage.setItem(ACTIVE_SAVE_KEY, JSON.stringify(cleanStart));
    } catch {
      // If storage is unavailable, readSave() will still use DEFAULT_SAVE after reload.
    }
    console.info(`[GameReset] Полный сброс выполнен. При перезапуске будет создано NPC: ${RESIDENT_SEED.length}`);
    window.location.reload();
  };

  const timeLabel = useMemo(() => {
    const hour = Math.floor(gameTime);
    const minute = Math.floor((gameTime - hour) * 60);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }, [gameTime]);
  const mapCenterX = playerPos.x;
  const waypointDistance = mapWaypoint ? Math.hypot(mapWaypoint.x - playerPos.x, mapWaypoint.z - playerPos.z) : null;
  const mapRouteStyle = useMemo(() => {
    if (!mapWaypoint) return undefined;
    const startX = worldMapXPct(playerPos.x);
    const startY = worldMapZPct(playerPos.z);
    const endX = worldMapXPct(mapWaypoint.x);
    const endY = worldMapZPct(mapWaypoint.z);
    const dx = endX - startX;
    const dy = endY - startY;
    if (![startX, startY, endX, endY, dx, dy].every(Number.isFinite)) return undefined;
    return {
      left: `${startX}%`,
      top: `${startY}%`,
      width: `${Math.hypot(dx, dy)}%`,
      transform: `rotate(${Math.atan2(dy, dx)}rad)`,
    };
  }, [mapWaypoint, playerPos.x, playerPos.z]);
  const placeWaypointFromMap = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const xRatio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const zRatio = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    const waypoint = { x: xRatio * 4360 - 180, z: ((50 - zRatio * 100) / 72) * 390, label: "Пользовательская точка" };
    setMapWaypoint(waypoint);
    setSelectedMapObject("Маршрут построен. ПКМ по карте перенесёт точку.");
  };

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

      {mode !== "intro" && mode !== "network" && mode !== "office" && (
        <div className="hud" aria-hidden={mode !== "world"}>
          <div className="brand">
            <div className="brand-mark">⌂</div>
            <div><strong>Пульт охраны</strong><small>{locationName}</small></div>
          </div>
          <div className="hero-card">
            <div className={`hero-avatar ${profile.avatar}`}>{profile.nickname.slice(0, 1).toUpperCase()}</div>
            <div><strong>{profile.nickname}</strong><small>Основатель · уровень {Math.max(1, Math.floor(reputation / 10) + 1)}</small></div>
            <span>Наблюдательность 1/5</span>
          </div>
          <div className="top-status">
            <div className="glass-chip"><span>Пн · {weather}</span><b>{timeLabel}</b></div>
            <div className="glass-chip"><span>Репутация</span><b>★ {reputation}</b></div>
            <div className="glass-chip"><span>Баланс</span><b>{money.toLocaleString("ru-RU")} ₽</b></div>
            <div className="glass-chip"><span>Договоры</span><b>{totalContracts}</b></div>
          </div>
          <div className="energy-card">
            <div className="energy-label"><span>Энергия менеджера</span><b>{energy}%</b></div>
            <div className="energy-track"><div className="energy-fill" style={{ width: `${energy}%` }} /></div>
            <small>{driving ? "За рулём" : `${movementState}${playerSpeedKmh > 0 ? ` · ${playerSpeedKmh.toFixed(1)} км/ч` : ""}`}{energy < 20 ? " · усталость" : ""}</small>
          </div>
          {driving && (
            <div className="vehicle-card">
              <div className="vehicle-speed"><b>{carTelemetry.speed}</b><span>км/ч</span></div>
              <div className="vehicle-data">
                <span>{carTelemetry.surface} · двигатель {carUpgrade + 1}/4</span>
                <span>Топливо {carTelemetry.fuel.toFixed(2)} л · износ {Math.round(carTelemetry.wear)}%</span>
                <div className="vehicle-gauge"><i style={{ width: `${clamp(carTelemetry.fuel / FUEL_TANK_LITERS * 100, 0, 100)}%` }} /></div>
              </div>
            </div>
          )}
          <div className="controls-hint">
            {driving ? (
              <><kbd>WASD</kbd> вести <kbd>Space</kbd> ручник <kbd>ПКМ</kbd> осмотреться <kbd>E</kbd> выйти</>
            ) : (
              <><kbd>WASD</kbd> двигаться <kbd>Shift</kbd> бег <kbd>Tab</kbd> карта <kbd>P</kbd> планшет</>
            )}
          </div>
          <div className="route-card">
            <b>{locationName}</b>
            <span>Трасса: село Первореченское — станица Динская</span>
          </div>
          <div className="quest-hud">
            {quests.filter((quest) => quest.tracked && quest.status === "active").slice(0, 3).map((progress) => {
              const definition = QUESTS.find((quest) => quest.id === progress.id);
              if (!definition) return null;
              const value = progress.id === "quest_first_car" ? Math.min(money, 20000) : progress.id === "quest_open_office" ? signedCount : progress.id === "quest_daily_sales" ? Math.min(totalContracts, 2) : progress.id === "quest_false_alarm_wave" ? Math.min(statistics.alarmsResponded, 3) : residents[0]?.signed ? 1 : 0;
              const target = progress.id === "quest_first_car" ? 20000 : progress.id === "quest_open_office" ? 10 : progress.id === "quest_daily_sales" ? 2 : progress.id === "quest_false_alarm_wave" ? 3 : 1;
              return <div key={progress.id}><b>📋 {definition.title}</b><span>• {definition.short} · {value}/{target}</span></div>;
            })}
          </div>
          {trafficIncident && <div className="traffic-incident"><b>{trafficIncident.title}</b><span>{trafficIncident.detail}</span><strong>{trafficIncident.fine > 0 ? `−${trafficIncident.fine.toLocaleString("ru-RU")} ₽` : "Без штрафа"}</strong></div>}
          <div className="daily-hud">
            {dailyChallenges.activeChallenges.filter((challenge) => challenge.tracked && !challenge.claimed).slice(0, 2).map((challenge) => {
              const definition = DAILY_CHALLENGES.find((item) => item.id === challenge.id);
              if (!definition) return null;
              return <div key={challenge.id}><i>{definition.icon}</i><span><b>{definition.title}</b><small>{challenge.progress.toFixed(definition.metric === "drive_km" ? 1 : 0)} / {definition.target}</small></span></div>;
            })}
          </div>
          {networkRoomCode && <div className="coop-hud"><b>CO-OP · {networkRoomCode}</b>{networkPlayers.map((player) => <span key={player.id}><i />{player.name} · {player.role}</span>)}</div>}
          <div className="minimap" aria-label="Миникарта">
            <span className="compass-n">С</span>
            <div className="minimap-layer" style={{ transform: minimapRotates ? `rotate(${-engineRef.current.yaw}rad)` : "none" }}>
            <div className="map-road" />
            {residents.filter((r) => Math.hypot(r.x - playerPos.x, r.z - playerPos.z) <= 80).map((r) => (
              <span key={`h-${r.id}`} className={`map-home ${r.signed ? "signed" : ""}`} style={{ left: mapPos(r.x - mapCenterX, 80), top: mapPos(playerPos.z - r.z, 80) }} />
            ))}
            {residents.filter((r) => !r.signed && Math.hypot(r.x - playerPos.x, r.z - playerPos.z) <= 80).map((r) => (
              <span key={`n-${r.id}`} className="map-npc" style={{ left: mapPos(r.x + 5 - mapCenterX, 80), top: mapPos(playerPos.z - r.z, 80) }} />
            ))}
            {WORLD_KEY_POINTS.filter((point) => Math.hypot(point.x - playerPos.x, point.z - playerPos.z) <= 80).map((point) => (
              <span
                key={`key-${point.id}`}
                className={`map-key map-key-${point.kind}`}
                title={point.label}
                style={{ left: mapPos(point.x - mapCenterX, 80), top: mapPos(playerPos.z - point.z, 80) }}
              >
                {point.short}
              </span>
            ))}
            {quests.filter((quest) => quest.tracked && quest.status === "active").map((progress) => {
              const definition = QUESTS.find((quest) => quest.id === progress.id);
              if (!definition || Math.hypot(definition.target.x - playerPos.x, definition.target.z - playerPos.z) > 80) return null;
              return <span key={`quest-mini-${progress.id}`} className={`map-quest map-quest-${definition.category}`} style={{ left: mapPos(definition.target.x - playerPos.x, 80), top: mapPos(playerPos.z - definition.target.z, 80) }}>!</span>;
            })}
            {networkPlayers.filter((player) => player.id !== profile.id && Math.hypot(player.x - playerPos.x, player.z - playerPos.z) <= 80).map((player) => <span key={`coop-mini-${player.id}`} className="map-coop-player" title={player.name} style={{ left: mapPos(player.x - playerPos.x, 80), top: mapPos(playerPos.z - player.z, 80) }}>{player.name.slice(0, 1)}</span>)}
            {mapWaypoint && waypointDistance !== null && waypointDistance <= 80 && <span className="map-waypoint-mini" title={mapWaypoint.label} style={{ left: mapPos(mapWaypoint.x - playerPos.x, 80), top: mapPos(playerPos.z - mapWaypoint.z, 80) }}>◎</span>}
            {Math.hypot(busPos.x - playerPos.x, busPos.z - playerPos.z) <= 80 && <span className="map-bus" title="Рейсовый автобус" style={{ left: mapPos(busPos.x - playerPos.x, 80), top: mapPos(playerPos.z - busPos.z, 80) }}>А</span>}
            </div>
            {quests.filter((quest) => quest.tracked && quest.status === "active").map((progress) => {
              const definition = QUESTS.find((quest) => quest.id === progress.id);
              if (!definition || Math.hypot(definition.target.x - playerPos.x, definition.target.z - playerPos.z) <= 80) return null;
              const angle = Math.atan2(playerPos.z - definition.target.z, definition.target.x - playerPos.x) - (minimapRotates ? engineRef.current.yaw : 0);
              return <span key={`quest-edge-${progress.id}`} className={`map-quest-edge map-quest-${definition.category}`} title={definition.title} style={{ left: `${50 + Math.cos(angle) * 42}%`, top: `${50 + Math.sin(angle) * 42}%`, transform: `translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad)` }}>▲</span>;
            })}
            {mapWaypoint && waypointDistance !== null && waypointDistance > 80 && (() => {
              const angle = Math.atan2(playerPos.z - mapWaypoint.z, mapWaypoint.x - playerPos.x) - (minimapRotates ? engineRef.current.yaw : 0);
              return <span className="map-waypoint-edge" title={mapWaypoint.label} style={{ left: `${50 + Math.cos(angle) * 44}%`, top: `${50 + Math.sin(angle) * 38}%`, transform: `translate(-50%, -50%) rotate(${angle + Math.PI / 2}rad)` }}>▲</span>;
            })()}
            <span className="map-player" style={{ left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${minimapRotates ? 0 : engineRef.current.yaw}rad)` }} />
            {mapWaypoint && waypointDistance !== null && <span className="minimap-distance">◎ {formatDistance(waypointDistance)}</span>}
          </div>
          {mode === "world" && nearStationId && (!driving || carTelemetry.speed < 5) && (
            <div className="interaction-prompt">
              <span className="key">E</span>
              <span>АЗС · заправка и сервис</span>
            </div>
          )}
          {mode === "world" && !nearStationId && !driving && nearBusStopId && (
            <div className="interaction-prompt">
              <span className="key">E</span>
              <span>{busEtaMinutes < 0 ? "Автобусы с 06:00" : busReadyAtStop ? "Сесть в автобус" : `Автобус примерно через ${busEtaMinutes} мин`}</span>
            </div>
          )}
          {mode === "world" && !nearStationId && !nearBusStopId && (nearest || (driving && carTelemetry.speed < 5)) && (
            <div className="interaction-prompt">
              <span className="key">E</span>
              <span>{driving ? "Выйти из машины" : `Поговорить · ${nearest?.name}`}</span>
            </div>
          )}
          {mode === "world" && !driving && currentVehicle && nearCar && !nearest && !nearStationId && !nearBusStopId && (
            <div className="interaction-prompt"><span className="key">E</span><span>Сесть в {VEHICLE_BY_ID[currentVehicle].name.toLowerCase()}</span></div>
          )}
        </div>
      )}

      {mode === "station" && stationMenu && (
        <section className="overlay service-overlay">
          <div className="service-modal">
            <header>
              <div><small>Круглосуточная автоматическая станция</small><h1>{GAS_STATIONS.find((station) => station.id === stationMenu)?.name}</h1></div>
              <button onClick={() => { setStationMenu(null); setMode("world"); }}>×</button>
            </header>
            <div className="station-status">
              <span>Бак <b>{carTelemetry.fuel.toFixed(2)} / {FUEL_TANK_LITERS} л</b></span>
              <span>Баланс <b>{money.toLocaleString("ru-RU")} ₽</b></span>
              <span>Магазин <b>{gameTime >= 7 && gameTime < 23 ? "открыт до 23:00" : "закрыт · с 07:00"}</b></span>
            </div>
            {serviceBusy && <div className="service-progress"><span>{serviceBusy}</span></div>}
            <div className="station-sections">
              <article>
                <h2>⛽ Топливо · 50 ₽/л</h2>
                <p>Бак рассчитан на 40 литров. Оплата списывается перед заправкой.</p>
                <div><button onClick={() => buyStationService("fuel10")}>10 литров</button><button onClick={() => buyStationService("fuel20")}>20 литров</button><button onClick={() => buyStationService("fuelFull")}>Полный бак</button></div>
              </article>
              <article>
                <h2>Сервис и мойка</h2>
                <p>Мойка повышает впечатление клиентов, обслуживание уменьшает износ.</p>
                <div><button onClick={() => buyStationService("wash")}>Мойка · 200 ₽</button><button onClick={() => buyStationService("oil")}>Масло · 100 ₽</button><button onClick={() => buyStationService("tires")}>Шины · 50 ₽</button></div>
              </article>
              <article className={gameTime >= 7 && gameTime < 23 ? "" : "closed"}>
                <h2>Магазин и кафе</h2>
                <p>Кофе, снеки, батарейки, карта района и рекламные буклеты.</p>
                <div>
                  <button disabled={gameTime < 7 || gameTime >= 23} onClick={() => buyStationService("coffee")}>Кофе · 50 ₽</button>
                  <button disabled={gameTime < 7 || gameTime >= 23} onClick={() => buyStationService("snack")}>Снек · 30 ₽</button>
                  <button disabled={gameTime < 7 || gameTime >= 23} onClick={() => buyStationService("battery")}>Батарейка · 100 ₽</button>
                  <button disabled={gameTime < 7 || gameTime >= 23} onClick={() => buyStationService("map")}>Карта · 250 ₽</button>
                  <button disabled={gameTime < 7 || gameTime >= 23} onClick={() => buyStationService("leaflets")}>Буклеты · 500 ₽</button>
                </div>
              </article>
            </div>
            <footer><span>Esc · вернуться к автомобилю</span><button onClick={() => { setStationMenu(null); setMode("world"); }}>Закрыть</button></footer>
          </div>
        </section>
      )}

      {mode === "transit" && transitMenu && (
        <section className="overlay service-overlay transit-overlay">
          <div className="service-modal transit-modal">
            <header>
              <div><small>Маршрут №21 · 06:00–23:00</small><h1>Динская — Первореченское</h1></div>
              <button onClick={() => { setTransitMenu(null); setMode("world"); }}>×</button>
            </header>
            <div className={`bus-arrival ${busReadyAtStop ? "ready" : ""}`}>
              <b>{busEtaMinutes < 0 ? "Движение автобусов завершено" : busReadyAtStop ? "Автобус на остановке · двери открыты" : `Ближайший автобус примерно через ${busEtaMinutes} мин`}</b>
              <span>Стоянка длится 5 игровых минут. Оплата: 50 ₽ до промежуточной остановки, 150 ₽ между населёнными пунктами.</span>
            </div>
            <div className="bus-route-list">
              {BUS_STOPS.map((stop, index) => (
                <button key={stop.id} disabled={!busReadyAtStop || stop.id === transitMenu} onClick={() => rideBusTo(stop.id)}>
                  <i>{index + 1}</i><span><b>{stop.name}</b><small>{stop.id === transitMenu ? "Вы здесь" : "Выбрать остановку"}</small></span>
                </button>
              ))}
            </div>
            <footer><span>Правостороннее движение · двери открываются со стороны тротуара.</span><button onClick={() => { setTransitMenu(null); setMode("world"); }}>Не ехать</button></footer>
          </div>
        </section>
      )}

      {mode === "intro" && (
        <section className="overlay intro">
          <div className="intro-copy">
            <div className="eyebrow">● Играбельный low-poly прототип</div>
            <h1>Пульт <em>охраны</em></h1>
            <p>Алексей приехал в Первореченское рейсовым автобусом — без личной машины, но с 15 000 ₽ и планом открыть охранное предприятие. Первые маршруты предстоит пройти пешком или проехать на автобусе №21.</p>
            <div className="intro-actions">
              <button className="primary-btn" onClick={() => setMode("world")}>Выйти в посёлок →</button>
              <button className="soft-btn" onClick={() => startOffice(true)}>Демо пульта</button>
              <button className="soft-btn" onClick={() => setMode("network")}>Сетевая игра · до 4 игроков</button>
            </div>
          </div>
          <aside className="intro-card">
            <div className="mission-ticket">
              <small>Задача на сегодня · 08:15</small>
              <h3>Старт без автомобиля</h3>
              <div className="mission-step"><i>1</i><span>Осмотритесь и найдите ближайшую остановку</span></div>
              <div className="mission-step"><i>2</i><span>Заключайте договоры пешком или ездите автобусом</span></div>
              <div className="mission-step"><i>3</i><span>Накопите 20 000 ₽ и купите первые колёса</span></div>
            </div>
          </aside>
        </section>
      )}

      {mode === "network" && (
        <section className="overlay network-overlay">
          <div className="network-shell">
            <header>
              <div><small>Кооперативный режим</small><h1>Общее охранное предприятие</h1><p>Работайте вместе: один игрок ведёт переговоры, другой дежурит за пультом, третий выезжает на тревогу.</p></div>
              <button onClick={leaveNetworkRoom}>← Главное меню</button>
            </header>
            {!networkRoomCode ? <div className="network-setup">
              <article>
                <i>＋</i><h2>Создать игру</h2>
                <label>Регион<select value={networkRegion} onChange={(event) => setNetworkRegion(event.target.value)}><option>Europe</option><option>Asia</option><option>US East</option></select></label>
                <label>Игроков<select value={networkMaxPlayers} onChange={(event) => setNetworkMaxPlayers(Number(event.target.value))}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>
                <label>Видимость<select value={networkVisibility} onChange={(event) => setNetworkVisibility(event.target.value as "open" | "friends")}><option value="open">Открытая</option><option value="friends">Только друзья</option></select></label>
                <button className="primary-btn" onClick={createNetworkRoom}>Создать комнату</button>
              </article>
              <article>
                <i>→</i><h2>Присоединиться</h2><p>Введите шестизначный код комнаты от создателя игры.</p>
                <input value={networkRoomInput} maxLength={8} placeholder="КОД КОМНАТЫ" onChange={(event) => setNetworkRoomInput(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") joinNetworkRoom(); }} />
                <button className="primary-btn" onClick={joinNetworkRoom}>Подключиться</button>
              </article>
            </div> : <div className="network-lobby">
              <div className="network-room-panel">
                <div className="room-code"><small>Код комнаты</small><b>{networkRoomCode}</b><span>{networkRegion} · {networkVisibility === "open" ? "открытая" : "для друзей"} · до {networkMaxPlayers} игроков</span></div>
                <h2>Команда</h2>
                <div className="network-player-grid">
                  {networkPlayers.map((player) => <article key={player.id}><div className={`profile-avatar-large ${player.avatar}`}>{player.name.slice(0, 1).toUpperCase()}</div><span><b>{player.name}{player.host ? " · хозяин" : ""}</b><small>{player.role}</small></span><i>●</i></article>)}
                  {Array.from({ length: Math.max(0, networkMaxPlayers - networkPlayers.length) }).map((_, index) => <article className="empty" key={`empty-${index}`}><div>＋</div><span><b>Свободное место</b><small>Ожидание игрока</small></span></article>)}
                </div>
                <div className="network-lobby-actions">{networkIsHost ? <button className="primary-btn" onClick={startNetworkGame}>Начать совместную игру</button> : <span>Ожидаем запуска от хозяина комнаты…</span>}<button className="soft-btn" onClick={leaveNetworkRoom}>Покинуть комнату</button></div>
                <small className="network-note">В статической WebGL-версии работает кооператив между вкладками одного браузера через BroadcastChannel. Сетевой транспорт Photon/WebSocket можно подключить без изменения игрового интерфейса.</small>
              </div>
              <aside className="network-chat">
                <h3>Чат команды</h3><div>{networkChat.length ? networkChat.map((message) => <p key={message.id}><small>{message.sentAt}</small><b>{message.author}</b><span>{message.text}</span></p>) : <em>Напишите первое сообщение команде.</em>}</div>
                <form onSubmit={(event) => { event.preventDefault(); sendNetworkChat(); }}><input value={networkChatInput} placeholder="Сообщение…" onChange={(event) => setNetworkChatInput(event.target.value)} /><button>Отправить</button></form>
              </aside>
            </div>}
          </div>
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
            {activeNpc.id === 1 && activeNpc.interest >= 50 && !quests.some((quest) => quest.id === "quest_garage_secrets") && <div className="quest-offer">
              <span>!</span><div><small>У меня к тебе дело…</small><b>Гаражные тайны</b><p>Помогите Семёну установить датчик и найти старую коробку с инструментами.</p></div>
              <button onClick={() => acceptQuest("quest_garage_secrets")}>Принять</button>
              <button onClick={() => flash("Семён подождёт. К поручению можно вернуться позже.")}>Отказаться</button>
            </div>}
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
              <button className={`tablet-tab ${tabletTab === "quests" ? "active" : ""}`} onClick={() => setTabletTab("quests")}>Задания {quests.some((quest) => !quest.read) ? "●" : ""}</button>
              <button className={`tablet-tab ${tabletTab === "wardrobe" ? "active" : ""}`} onClick={() => setTabletTab("wardrobe")}>Гардероб</button>
              <button className={`tablet-tab ${tabletTab === "clients" ? "active" : ""}`} onClick={() => setTabletTab("clients")}>Жители и договоры</button>
              <button className={`tablet-tab ${tabletTab === "contracts" ? "active" : ""}`} onClick={() => setTabletTab("contracts")}>Новые объекты</button>
              <button className={`tablet-tab ${tabletTab === "development" ? "active" : ""}`} onClick={() => setTabletTab("development")}>Филиалы и штат</button>
              <button className={`tablet-tab ${tabletTab === "fleet" ? "active" : ""}`} onClick={() => setTabletTab("fleet")}>Автопарк</button>
              <button className={`tablet-tab ${tabletTab === "shops" ? "active" : ""}`} onClick={() => setTabletTab("shops")}>Магазины и услуги</button>
              <button className={`tablet-tab ${tabletTab === "finance" ? "active" : ""}`} onClick={() => setTabletTab("finance")}>Финансы</button>
              <button className={`tablet-tab ${tabletTab === "profile" ? "active" : ""}`} onClick={() => setTabletTab("profile")}>Профиль и статистика</button>
              <button className={`tablet-tab ${tabletTab === "rating" ? "active" : ""}`} onClick={() => setTabletTab("rating")}>Рейтинг</button>
              <button className={`tablet-tab ${tabletTab === "saves" ? "active" : ""}`} onClick={() => setTabletTab("saves")}>Сохранения</button>
              <button className="tablet-tab tablet-close" onClick={() => setMode("world")}>P · Вернуться в игру</button>
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
              {tabletTab === "quests" && <>
                <div className="quest-mode-tabs">
                  <button className={questView === "journal" ? "active" : ""} onClick={() => setQuestView("journal")}>Журнал квестов</button>
                  <button className={questView === "daily" ? "active" : ""} onClick={() => setQuestView("daily")}>Ежедневные испытания · 🔥 {dailyChallenges.streakCount}</button>
                </div>
                {questView === "journal" ? <div className="quest-journal">
                <div className="quest-list-panel">
                  <div className="quest-journal-head"><small>Журнал Алексея</small><h1>Задания</h1></div>
                  <div className="quest-filters">
                    {(["all", "main", "side", "dynamic", "completed"] as const).map((filter) => (
                      <button key={filter} className={questFilter === filter ? "active" : ""} onClick={() => setQuestFilter(filter)}>
                        {filter === "all" ? "Все" : filter === "main" ? "Основные" : filter === "side" ? "Побочные" : filter === "dynamic" ? "Динамические" : "Завершённые"}
                      </button>
                    ))}
                  </div>
                  <div className="quest-list">
                    {quests.filter((progress) => {
                      const definition = QUESTS.find((quest) => quest.id === progress.id);
                      if (!definition) return false;
                      if (questFilter === "completed") return progress.status === "completed";
                      return questFilter === "all" || definition.category === questFilter;
                    }).map((progress) => {
                      const definition = QUESTS.find((quest) => quest.id === progress.id)!;
                      return <button key={progress.id} className={`${selectedQuestId === progress.id ? "active" : ""} ${progress.status}`} onClick={() => {
                        setSelectedQuestId(progress.id);
                        const next = questsRef.current.map((quest) => quest.id === progress.id ? { ...quest, read: true } : quest);
                        questsRef.current = next;
                        setQuests(next);
                      }}>
                        <i className={`quest-icon ${definition.category}`}>{definition.icon}</i>
                        <span><b>{definition.title}</b><small>{progress.status === "completed" ? "Выполнено" : definition.short}</small></span>
                        {!progress.read && <em />}
                      </button>;
                    })}
                  </div>
                </div>
                <div className="quest-detail-panel">
                  <div className={`quest-detail-icon ${selectedQuest.category}`}>{selectedQuest.icon}</div>
                  <small>{selectedQuest.category === "main" ? "Основное задание" : selectedQuest.category === "side" ? "Побочное задание" : selectedQuest.category === "dynamic" ? "Динамическое событие" : "Ежедневная задача"}</small>
                  <h1>{selectedQuest.title}</h1>
                  <p>{selectedQuest.full}</p>
                  <h3>Цели</h3>
                  <div className="quest-objectives">
                    {selectedQuest.id === "quest_first_car" && <>
                      <div className={money >= 20000 ? "done" : ""}><i>{money >= 20000 ? "✓" : ""}</i><span>Накопить 20 000 ₽</span><b>{Math.min(money, 20000).toLocaleString("ru-RU")} / 20 000 ₽</b></div>
                      <div className={ownedVehicles.length > 0 ? "done" : ""}><i>{ownedVehicles.length > 0 ? "✓" : ""}</i><span>Купить первый автомобиль</span><b>{ownedVehicles.length > 0 ? "1/1" : "0/1"}</b></div>
                      <div className="quest-bus-hint"><i>А</i><span>До автосалона можно доехать автобусом №21. Остановки отмечены на карте.</span><b>06:00–23:00</b></div>
                    </>}
                    {selectedQuest.id === "quest_open_office" && <>
                      <div className={signedCount >= 10 ? "done" : ""}><i>{signedCount >= 10 ? "✓" : ""}</i><span>Заключить 10 договоров</span><b>{signedCount}/10</b></div>
                      <div className={officeRented ? "done" : ""}><i>{officeRented ? "✓" : ""}</i><span>Арендовать центральный офис</span><b>{officeRented ? "1/1" : "0/1"}</b></div>
                    </>}
                    {selectedQuest.id === "quest_garage_secrets" && <div className={residents[0]?.signed ? "done" : ""}><i>{residents[0]?.signed ? "✓" : ""}</i><span>Заключить договор с Семёном и проверить гараж</span><b>{residents[0]?.signed ? "1/1" : "0/1"}</b></div>}
                    {selectedQuest.id === "quest_false_alarm_wave" && <div className={statistics.alarmsResponded >= 3 ? "done" : ""}><i>{statistics.alarmsResponded >= 3 ? "✓" : ""}</i><span>Правильно обработать три сигнала</span><b>{Math.min(statistics.alarmsResponded, 3)}/3</b></div>}
                    {selectedQuest.id === "quest_daily_sales" && <div className={totalContracts >= 2 ? "done" : ""}><i>{totalContracts >= 2 ? "✓" : ""}</i><span>Заключить два договора</span><b>{Math.min(totalContracts, 2)}/2</b></div>}
                    {selectedQuest.id === "quest_competitor" && <div><i /><span>Открыть офис и завершить первый месяц</span><b>{officeRented && businessMonth > 1 ? "1/1" : "0/1"}</b></div>}
                  </div>
                  <div className="quest-reward"><small>Награда</small><b>{selectedQuest.reward}</b></div>
                  <div className="quest-actions">
                    <button className="primary-btn" onClick={() => toggleQuestTracking(selectedQuest.id)}>
                      {quests.find((quest) => quest.id === selectedQuest.id)?.tracked ? "Не отслеживать" : "Отслеживать"}
                    </button>
                    <button className="soft-btn" onClick={() => showQuestOnMap(selectedQuest.id)}>Показать на карте</button>
                    {selectedQuest.id === "quest_open_office" && !officeRented && <button className="soft-btn" disabled={signedCount < 10} onClick={rentCentralOffice}>Арендовать офис</button>}
                  </div>
                </div>
              </div> : <div className="daily-challenges-page">
                <header><div><small>Ежедневник менеджера</small><h1>Четыре дела на сегодня</h1><p>Испытания обновляются по реальному календарю и не накапливаются.</p></div><div className="daily-streak"><b>🔥 Серия: {dailyChallenges.streakCount} дней</b><span>Обновление через {dailyResetLabel}</span></div></header>
                <div className="daily-bonus-progress"><span>Ежедневная премия: выполнить 3 из 4</span><b>{dailyChallenges.activeChallenges.filter((challenge) => challenge.claimed).length} / 3</b><i><em style={{ width: `${Math.min(100, dailyChallenges.activeChallenges.filter((challenge) => challenge.claimed).length / 3 * 100)}%` }} /></i><small>{dailyChallenges.bonusClaimed ? "Конверт с премией получен: +1 000 ₽ и +50 репутации" : "Награда выдаётся вместе с третьим забранным испытанием"}</small></div>
                <div className="streak-roadmap"><h3>Награды за серию</h3><p>Заходите в игру несколько дней подряд — полученные награды сохраняются в профиле.</p>{[{ d: 3, r: "Кружка «Лучший менеджер»" }, { d: 7, r: "Наклейки «Пламя»" }, { d: 14, r: "Костюм «Ветеран»" }, { d: 30, r: "Золотой значок · +5% дохода" }].map((reward) => <div className={dailyChallenges.streakCount >= reward.d ? "done" : ""} key={reward.d}><b>{reward.d} дней</b><span>{reward.r}</span></div>)}</div>
                <div className="daily-challenge-grid">
                  {dailyChallenges.activeChallenges.map((challenge) => {
                    const definition = DAILY_CHALLENGES.find((item) => item.id === challenge.id)!;
                    const percent = Math.min(100, challenge.progress / definition.target * 100);
                    return <article key={challenge.id} className={`${challenge.claimed ? "claimed" : ""} ${percent >= 100 ? "complete" : ""}`}>
                      <div className={`daily-icon daily-${definition.category}`}>{definition.icon}</div>
                      <small>{definition.category === "manager" ? "Менеджер" : definition.category === "console" ? "Пульт" : definition.category === "driving" ? "Вождение" : "Общее"}</small>
                      <h2>{definition.title}</h2><p>{definition.description}</p>
                      <div className="daily-progress"><span><i style={{ width: `${percent}%` }} /></span><b>{challenge.progress.toFixed(definition.metric === "drive_km" ? 1 : 0)} / {definition.target}</b></div>
                      <div className="daily-reward"><span>Награда</span><b>{definition.money} ₽ · +{definition.reputation} репутации</b></div>
                      <div><button className="soft-btn" disabled={challenge.claimed} onClick={() => toggleDailyTracking(challenge.id)}>{challenge.tracked ? "Убрать с HUD" : "Отслеживать"}</button><button className="primary-btn" disabled={challenge.claimed || percent < 100} onClick={() => claimDailyChallenge(challenge.id)}>{challenge.claimed ? "Получено" : "Забрать"}</button></div>
                    </article>;
                  })}
                </div>
              </div>}
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
                <p>{totalContracts} объектов под охраной, из них {signedCount} — первые личные договоры Алексея.</p>
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
              {tabletTab === "contracts" && <>
                <div className="section-heading"><div><small>Расширение клиентской базы</small><h1>Новые объекты</h1></div><b>{totalContracts} договоров</b></div>
                <p>Жилые и коммерческие предложения появляются по мере роста репутации и открытия филиалов.</p>
                {DISTRICTS.map((district) => {
                  const unlocked = reputation >= district.reputation && (district.id === "central" || totalContracts >= district.contracts);
                  return <section className={`district-contracts ${unlocked ? "" : "locked"}`} key={district.id}>
                    <header style={{ borderColor: district.color }}><div><small>{district.subtitle}</small><h2>{district.name}</h2></div><span>{unlocked ? openedBranches.includes(district.id) || district.id === "central" ? "Доступен" : "Нужен филиал" : `★ ${district.reputation}`}</span></header>
                    <div className="security-object-grid">
                      {SECURITY_OBJECTS.filter((object) => object.district === district.id).slice(0, 6).map((object) => {
                        const signed = extendedContracts.includes(object.id);
                        return <article key={object.id} className={signed ? "signed" : ""}>
                          <small>{object.objectType} · {object.address}</small><h3>{object.name}</h3>
                          <p>Монтаж от {object.installation[0].toLocaleString("ru-RU")} ₽ · абонплата от {object.monthly[0].toLocaleString("ru-RU")} ₽/мес.</p>
                          <div>
                            <button disabled={!unlocked || signed} onClick={() => signExtendedContract(object)}>{signed ? "Под охраной" : "Базовый пакет"}</button>
                            <button disabled={!unlocked || signed} onClick={() => signExtendedContract(object, true)}>Расширенный</button>
                          </div>
                        </article>;
                      })}
                    </div>
                  </section>;
                })}
              </>}
              {tabletTab === "development" && <>
                <div className="section-heading"><div><small>Сеть предприятия</small><h1>Филиалы и штат</h1></div><b>{openedBranches.length} / {DISTRICTS.length}</b></div>
                <div className="branch-grid">
                  {DISTRICTS.map((district) => {
                    const opened = openedBranches.includes(district.id);
                    return <article key={district.id} className={opened ? "opened" : ""} style={{ borderTopColor: district.color }}>
                      <small>{district.subtitle}</small><h3>{district.name}</h3>
                      <p>Требования: ★ {district.reputation} · {district.contracts} договоров</p>
                      <b>{district.openingCost.toLocaleString("ru-RU")} ₽</b><span>аренда {district.monthlyRent.toLocaleString("ru-RU")} ₽/мес.</span>
                      <button disabled={opened && (district.id !== "central" || officeRented)} onClick={() => district.id === "central" ? rentCentralOffice() : openBranch(district)}>{opened ? district.id === "central" && !officeRented ? "Арендовать офис" : "Филиал открыт" : "Открыть филиал"}</button>
                    </article>;
                  })}
                </div>
                <h2>Сотрудники</h2>
                <div className="staff-grid">
                  {STAFF_ROLES.map((role) => <article key={role.key}><div><small>{role.description}</small><h3>{role.name}</h3></div><b>{staff[role.key]} чел.</b><span>{role.salary.toLocaleString("ru-RU")} ₽/мес.</span><button onClick={() => hireStaff(role)}>Нанять</button></article>)}
                </div>
                <div className="shift-schedule"><div><small>Расписание дежурств</small><h3>Ближайшая смена · 20:00–08:00</h3><p>{officeRented ? `${totalContracts} объектов на связи. Можно автоматически прибыть в офис.` : "Сначала арендуйте центральный офис."}</p></div><button className="primary-btn" disabled={!officeRented || totalContracts < 1} onClick={() => startOffice()}>Начать смену</button></div>
              </>}
              {tabletTab === "fleet" && <>
                <div className="section-heading"><div><small>Автосалон и служебный гараж</small><h1>Автопарк</h1></div><b>{currentVehicle ? `${VEHICLE_BY_ID[currentVehicle].name}${rentalActive ? " · аренда" : ""}` : "Нет автомобиля"}</b></div>
                {ownedVehicles.length === 0 && !rentalActive && <div className="empty-garage-panel">
                  <div><small>Парковочное место свободно</small><h2>У вас нет автомобиля</h2><p>Купите машину в автосалоне или пользуйтесь автобусом №21. До первой покупки задания по вождению не появляются.</p></div>
                  <div><button className="primary-btn" onClick={rentOkaForDay}>Арендовать Оку на день · 500 ₽</button>{!loan && <button className="soft-btn" onClick={() => takeLoan(10000)}>Кредит 10 000 ₽ · 10%/мес.</button>}</div>
                </div>}
                <div className="vehicle-shop-grid">
                  {VEHICLES.map((vehicle) => {
                    const owned = ownedVehicles.includes(vehicle.id);
                    return <article key={vehicle.id} className={`${owned ? "owned" : ""} ${currentVehicle === vehicle.id ? "active" : ""}`}>
                      <div className={`vehicle-silhouette vehicle-${vehicle.id}`}><i /><span /></div>
                      <small>{vehicle.className}</small><h3>{vehicle.name}</h3><p>{vehicle.description}</p>
                      <div className="vehicle-specs"><span>{vehicle.maxSpeed} км/ч</span><span>{vehicle.fuelUse} л/100 км</span><span>{vehicle.capacity} мест</span></div>
                      <b>{vehicle.price.toLocaleString("ru-RU")} ₽ <small>· б/у {vehicle.usedPrice.toLocaleString("ru-RU")} ₽</small></b>
                      <div><button onClick={() => buyVehicle(vehicle)}>{owned ? currentVehicle === vehicle.id ? "Выбрано" : "Выбрать" : "Купить новую"}</button>{!owned && <button onClick={() => buyVehicle(vehicle, true)}>Купить б/у</button>}</div>
                    </article>;
                  })}
                </div>
                <div className={`vehicle-service-panel ${currentVehicle ? "" : "empty"}`}>
                  <div><small>Активная машина</small><h2>{currentVehicle ? VEHICLE_BY_ID[currentVehicle].name : "Гараж пуст"}</h2><p>{currentVehicle ? `Топливо ${carTelemetry.fuel.toFixed(2)} л / ${FUEL_TANK_LITERS} л · износ ${Math.round(carTelemetry.wear)}% · ${carClean ? "чистая" : "нужна мойка"} · ${seasonalTires ? "сезонные шины" : "обычные шины"} · ${vehicleSiren ? "мигалка установлена" : "без мигалки"}` : "Сервис станет доступен после покупки или аренды автомобиля."}</p></div>
                  <div className="service-actions">
                    <button disabled={!currentVehicle} onClick={() => serviceVehicle("fuel")}>Заправить · 50 ₽/л</button>
                    <button disabled={!currentVehicle} onClick={() => serviceVehicle("wash")}>Мойка · 200 ₽</button>
                    <button disabled={!currentVehicle} onClick={() => serviceVehicle("repair")}>Ремонт · до 15 000 ₽</button>
                    <button disabled={!currentVehicle} onClick={() => serviceVehicle("tires")}>Шины · 2 000 ₽</button>
                    <button disabled={!currentVehicle} onClick={() => serviceVehicle("siren")}>Мигалка · 8 000 ₽</button>
                    <button className="danger" disabled={ownedVehicles.length <= 1} onClick={tradeInCurrentVehicle}>Trade‑in текущей</button>
                  </div>
                </div>
              </>}
              {tabletTab === "shops" && <>
                <div className="section-heading"><div><small>Инфраструктура районов</small><h1>Магазины и услуги</h1></div><b>{equipment} комплектов на складе</b></div>
                <div className="player-shop-grid">
                  <article><i>⌁</i><small>Магазин электроники</small><h2>Датчики и расходники</h2><p>Батарейки для десяти простых датчиков.</p><button onClick={() => buyStoreItem("batteries")}>10 батареек · 1 000 ₽</button></article>
                  <article><i>⚒</i><small>Инструменты</small><h2>Монтажный набор</h2><p>Запас крепежа и инструментов на пять установок.</p><button onClick={() => buyStoreItem("tools")}>Купить · 3 000 ₽</button></article>
                  <article><i>☕</i><small>Кафе</small><h2>Обед и кофе</h2><p>Восстанавливает 20 единиц энергии.</p><button onClick={() => buyStoreItem("food")}>Заказать · 100 ₽</button></article>
                  <article><i>▤</i><small>Книжный магазин</small><h2>Продажи и безопасность</h2><p>Учебная литература повышает репутацию.</p><button onClick={() => buyStoreItem("book")}>Книга · 2 000 ₽</button></article>
                </div>
                <h2>Рекламное агентство</h2>
                <div className="advertising-row"><button onClick={() => buyStoreItem("leaflets")}>Листовки · 500 ₽</button><button onClick={() => buyStoreItem("radio")}>Радио‑ролик · 3 000 ₽</button><button onClick={() => buyStoreItem("billboard")}>Рекламный щит · 10 000 ₽</button></div>
              </>}
              {tabletTab === "finance" && <>
                <h1>Финансовый отчёт</h1>
                <p>Игровой месяц №{businessMonth}. Зарплаты, аренда и страховка списываются при закрытии месяца.</p>
                <div className="finance-row">
                  <div className="finance-box"><span>Баланс</span><b>{money.toLocaleString("ru-RU")} ₽</b></div>
                  <div className="finance-box"><span>Доход / месяц</span><b>{monthlyIncome.toLocaleString("ru-RU")} ₽</b></div>
                  <div className="finance-box"><span>Расходы / месяц</span><b>{monthlyExpenses.toLocaleString("ru-RU")} ₽</b></div>
                  <div className="finance-box"><span>Прогноз</span><b>{(monthlyIncome - monthlyExpenses).toLocaleString("ru-RU")} ₽</b></div>
                </div>
                <div className="finance-row">
                  <button className="primary-btn" onClick={closeBusinessMonth}>Закрыть месяц</button>
                  {!loan ? [10000, 50000, 200000].map((amount) => <button key={amount} className="soft-btn" onClick={() => takeLoan(amount)}>Кредит {amount.toLocaleString("ru-RU")} ₽</button>) : <div className="loan-card"><span>Кредит · 10%/мес.</span><b>{loan.principal.toLocaleString("ru-RU")} ₽</b></div>}
                  <button className="soft-btn" onClick={cycleWeather}>Сменить погоду: {weather}</button>
                  <button className="soft-btn" style={{ color: "#315c45", borderColor: "#bfc8b8" }} onClick={FullResetAndRestart}>Начать заново</button>
                </div>
              </>}
              {tabletTab === "profile" && <>
                <div className="profile-editor">
                  <div className={`profile-avatar-large ${profile.avatar}`}>{profile.nickname.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <small>Локальный профиль · {typeof navigator !== "undefined" && navigator.onLine ? "сеть доступна" : "автономный режим"}</small>
                    <h1>{profile.nickname}</h1>
                    <label>Отображаемое имя<input value={profile.nickname} maxLength={24} onChange={(event) => setProfile({ ...profile, nickname: event.target.value || "Алексей" })} /></label>
                  </div>
                </div>
                <div className="avatar-picker">
                  {(["avatar_01", "avatar_02", "avatar_03", "avatar_04"] as AvatarId[]).map((avatar) => (
                    <button key={avatar} className={`avatar-choice ${avatar} ${profile.avatar === avatar ? "active" : ""}`} onClick={() => setProfile({ ...profile, avatar })}>{profile.nickname.slice(0, 1).toUpperCase()}</button>
                  ))}
                  <label>Конфиденциальность
                    <select value={profile.privacy} onChange={(event) => setProfile({ ...profile, privacy: event.target.value as PrivacyMode })}>
                      <option value="all">Показывать всю статистику</option>
                      <option value="summary">Только общие показатели</option>
                      <option value="hidden">Скрыть показатели</option>
                    </select>
                  </label>
                </div>
                <div className="statistics-grid">
                  <div><span>Контракты</span><b>{statistics.totalContracts}</b></div>
                  <div><span>Тревоги</span><b>{statistics.alarmsResponded}</b></div>
                  <div><span>Предотвращения</span><b>{statistics.successfulPreventions}</b></div>
                  <div><span>Пешком</span><b>{statistics.kmWalked.toFixed(2)} км</b></div>
                  <div><span>За рулём</span><b>{statistics.kmDriven.toFixed(2)} км</b></div>
                  <div><span>Рейтинг жителей</span><b>{statistics.citizenRating.toFixed(1)} / 5</b></div>
                </div>
                <h2>Достижения</h2>
                <div className="achievement-grid">
                  {ACHIEVEMENTS.map((achievement) => (
                    <article key={achievement.id} className={achievements.includes(achievement.id) ? "unlocked" : ""}>
                      <i>{achievements.includes(achievement.id) ? "★" : "◇"}</i><b>{achievement.title}</b><small>{achievement.description}</small>
                    </article>
                  ))}
                </div>
              </>}
              {tabletTab === "rating" && <>
                <div className="rating-head">
                  <div><small>Локальный кэш · готово к синхронизации REST API</small><h1>Таблица лидеров</h1></div>
                  <select value={leaderboardCategory} onChange={(event) => setLeaderboardCategory(event.target.value as typeof leaderboardCategory)}>
                    <option value="reputation">Репутация</option><option value="clients">Клиенты</option><option value="income">Доход</option><option value="prevention_rate">Предотвращения</option><option value="level">Уровень</option>
                  </select>
                </div>
                <div className="rating-periods">
                  {(["all_time", "monthly", "weekly"] as const).map((period) => <button key={period} className={leaderboardPeriod === period ? "active" : ""} onClick={() => setLeaderboardPeriod(period)}>{period === "all_time" ? "Общий" : period === "monthly" ? "Месяц" : "Неделя"}</button>)}
                </div>
                <div className="leaderboard-table">
                  <div className="leaderboard-row header"><span>Место</span><span>Игрок</span><span>Показатель</span><span>Тренд</span></div>
                  {LEADERBOARD_SEED.map((row) => <div className="leaderboard-row" key={row.playerName}><span>#{row.rank}</span><span><i className={`mini-avatar ${row.avatar}`} />{row.playerName}</span><b>{row.value}</b><span>{row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "—"}</span></div>)}
                  <div className="leaderboard-row me"><span>#1</span><span><i className={`mini-avatar ${profile.avatar}`} />{profile.nickname} · вы</span><b>{leaderboardValue}</b><span>{leaderboardValue > 0 ? "↑" : "—"}</span></div>
                </div>
                <h2>Сообщество</h2>
                <div className="community-grid"><div><b>{totalContracts}</b><span>договоров</span></div><div><b>{statistics.successfulPreventions}</b><span>предотвращений</span></div><div><b>{(statistics.kmWalked + statistics.kmDriven).toFixed(2)} км</b><span>общий пробег</span></div><div><b>{totalContracts > 0 ? "Стандарт" : "—"}</b><span>популярный тариф</span></div></div>
              </>}
              {tabletTab === "saves" && <>
                <h1>Сохранения</h1>
                <p>Три ручных слота и отдельное автосохранение. Проверка контрольной суммы защищает записи от повреждения.</p>
                <div className="save-grid">
                  {(["auto", "slot1", "slot2", "slot3"] as SaveSlotId[]).map((slot) => {
                    const saved = saveSlots[slot];
                    return <article className={`save-card ${saved ? "filled" : ""}`} key={slot}>
                      <small>{slot === "auto" ? "Автосохранение" : `Ручной слот ${slot.slice(-1)}`}</small>
                      <h3>{saved?.saveName ?? "Пустой слот"}</h3>
                      <p>{saved ? `${new Date(saved.savedAt).toLocaleString("ru-RU")} · ${saved.data.contracts.length + (saved.data.extendedContracts?.length ?? 0)} договоров` : "Здесь ещё нет сохранения."}</p>
                      <div>{slot !== "auto" && <button onClick={() => manualSave(slot)}>Сохранить</button>}{saved && <button onClick={() => loadSlot(slot)}>Загрузить</button>}{saved && slot !== "auto" && <button className="danger" onClick={() => deleteSlot(slot)}>Удалить</button>}</div>
                    </article>;
                  })}
                </div>
                <div className="full-reset-panel"><div><b>Диагностика полного сброса</b><span>Удаляет только данные «Пульта охраны», отключает локальную сетевую комнату и заново создаёт базовых жителей.</span></div><button onClick={FullResetAndRestart}>Сбросить всё</button></div>
              </>}
            </div>
          </div>
        </section>
      )}

      {mode === "map" && (
        <section className="overlay full-map-overlay">
          <header className="full-map-head">
            <div><small>Тактическая карта района</small><h1>Первореченское — станица Динская</h1></div>
            <div className="map-layer-buttons">
              <button className={mapLayers.clients ? "active" : ""} onClick={() => setMapLayers({ ...mapLayers, clients: !mapLayers.clients })}>Дома</button>
              <button className={mapLayers.vehicles ? "active" : ""} onClick={() => setMapLayers({ ...mapLayers, vehicles: !mapLayers.vehicles })}>Транспорт</button>
              <button className={mapLayers.points ? "active" : ""} onClick={() => setMapLayers({ ...mapLayers, points: !mapLayers.points })}>Объекты</button>
              <button className={mapLayers.notes ? "active" : ""} onClick={() => setMapLayers({ ...mapLayers, notes: !mapLayers.notes })}>Заметки</button>
              <button onClick={addMapNote}>+ Метка здесь</button>
              <button onClick={() => setMode("world")}>Tab · Закрыть</button>
            </div>
          </header>
          <div className="full-map-layout">
            <div className="world-map expanded" aria-label="Большая интерактивная карта района" onContextMenu={placeWaypointFromMap}>
              <div className="world-map-field north" /><div className="world-map-field south" />
              <div className="world-map-road main" /><div className="world-map-road secondary first" /><div className="world-map-road secondary second" />
              <div className="world-map-road dirt first" /><div className="world-map-road dirt second" />
              <div className="world-map-road gravel" /><div className="world-map-road footpath" />
              <div className="world-map-cross first" /><div className="world-map-cross second" /><div className="world-map-river" />
              {DISTRICTS.map((district) => <div key={district.id} className="world-village" style={{ left: worldMapX(district.x), top: district.id === "industrial" ? "58%" : "34%" }}><b>{district.id === "central" ? "село Первореченское" : district.subtitle}</b><small>{openedBranches.includes(district.id) ? "филиал открыт" : `нужно ★ ${district.reputation}`}</small></div>)}
              {mapLayers.clients && residents.map((resident) => (
                <button
                  key={`map-house-${resident.id}`}
                  className={`world-house ${resident.signed ? "signed" : resident.interest > 30 ? "interested" : ""}`}
                  title={`${resident.name} · ${resident.address}`}
                  onClick={() => setSelectedMapObject(`${resident.name} · ${resident.address} · интерес ${resident.interest}% · ${resident.signed ? "под охраной" : "нет договора"}`)}
                  style={{ left: worldMapX(resident.x), top: worldMapZ(resident.z) }}
                />
              ))}
              {mapLayers.points && WORLD_KEY_POINTS.map((point) => (
                <button key={`map-point-${point.id}`} className={`world-point world-point-${point.kind}`} title={point.label} onClick={() => { setSelectedMapObject(point.label); setMapWaypoint({ x: point.x, z: point.z, label: point.label }); }} style={{ left: worldMapX(point.x), top: worldMapZ(point.z) }}>{point.short}</button>
              ))}
              {quests.filter((quest) => quest.tracked && quest.status === "active").map((progress) => {
                const definition = QUESTS.find((quest) => quest.id === progress.id);
                if (!definition) return null;
                return <button key={`map-quest-${progress.id}`} className={`world-quest world-quest-${definition.category}`} title={definition.title} onClick={() => setSelectedMapObject(`Задание: ${definition.title} · ${definition.short}`)} style={{ left: worldMapX(definition.target.x), top: worldMapZ(definition.target.z) }}>!</button>;
              })}
              {mapLayers.notes && mapNotes.map((note) => <button key={note.id} className="world-note" title={note.text} onClick={() => setSelectedMapObject(note.text)} style={{ left: worldMapX(note.x), top: worldMapZ(note.z) }}>⚑</button>)}
              {mapWaypoint && <span className="world-waypoint" title={mapWaypoint.label} style={{ left: worldMapX(mapWaypoint.x), top: worldMapZ(mapWaypoint.z) }}>◎</span>}
              {mapWaypoint && mapRouteStyle && <div className="world-route active" style={mapRouteStyle} />}
              {mapLayers.vehicles && currentVehicle && <span className="world-car" title={VEHICLE_BY_ID[currentVehicle].name} style={{ left: worldMapX(carPos.x), top: worldMapZ(carPos.z) }}>◆</span>}
              {mapLayers.vehicles && <span className="world-bus" title="Автобус №21 · Динская — Первореченское" style={{ left: worldMapX(busPos.x), top: worldMapZ(busPos.z) }}>А</span>}
              {networkPlayers.filter((player) => player.id !== profile.id).map((player) => <span className="world-coop-player" title={`${player.name} · ${player.role}`} key={`world-coop-${player.id}`} style={{ left: worldMapX(player.x), top: worldMapZ(player.z) }}>{player.name.slice(0, 1)}</span>)}
              <span className="world-player" title={profile.nickname} style={{ left: worldMapX(playerPos.x), top: worldMapZ(playerPos.z) }}>{profile.nickname.slice(0, 1).toUpperCase()}</span>
            </div>
            <aside className="map-legend expanded">
              <h3>Легенда</h3>
              <div><i className="legend-player">А</i><span>Главный герой</span></div>
              <div><i className="legend-car">◆</i><span>Личный автомобиль</span></div>
              <div><i className="legend-bus">А</i><span>Рейсовый автобус</span></div>
              <div><i className="legend-house" /><span>Потенциальный клиент</span></div>
              <div><i className="legend-house signed" /><span>Дом на охране</span></div>
              <div><i className="legend-road" /><span>Главный асфальт</span></div>
              <div><i className="legend-dirt" /><span>Грунтовка / гравий</span></div>
              <div><i className="legend-path" /><span>Пешеходная тропа</span></div>
              <div><i className="legend-note">⚑</i><span>Личная заметка</span></div>
              <small>Текущее место:<br /><b>{locationName}</b></small>
              <p className="map-selection">{selectedMapObject ?? "Нажмите объект для подробностей. ПКМ — поставить точку маршрута."}</p>
              {mapWaypoint && <div className="route-summary"><b>Маршрут: {mapWaypoint.label}</b><span>≈ {(Math.hypot(mapWaypoint.x - playerPos.x, mapWaypoint.z - playerPos.z) / 1000).toFixed(2)} км</span><small>Пешком ≈ {Math.max(1, Math.round(Math.hypot(mapWaypoint.x - playerPos.x, mapWaypoint.z - playerPos.z) / 100))} мин · на машине быстрее</small><button onClick={() => setMapWaypoint(null)}>Сбросить маршрут</button></div>}
            </aside>
          </div>
        </section>
      )}

      {mode === "pause" && (
        <section className="overlay pause-overlay">
          <div className="pause-card"><small>Игра приостановлена</small><h1>Пульт охраны</h1><button className="primary-btn" onClick={() => setMode("world")}>Продолжить</button>{officeRented && totalContracts > 0 && <button className="soft-btn" onClick={() => startOffice()}>Дежурство · играть за пульт</button>}<button className="soft-btn" onClick={() => { setTabletTab("quests"); setMode("tablet"); }}>Журнал заданий</button><button className="soft-btn" onClick={() => setMinimapRotates((value) => !value)}>Миникарта: {minimapRotates ? "вращается за героем" : "север сверху"}</button><button className="soft-btn" onClick={() => { setTabletTab("saves"); setMode("tablet"); }}>Сохранения</button><button className="soft-btn" onClick={() => manualSave("slot1")}>Быстро сохранить в слот 1</button><button className="soft-btn" onClick={FullResetAndRestart}>Начать заново</button></div>
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
            {officeZone !== "console" && <button className="office-console-enter" onClick={() => setOfficeZone("console")}>E · Сесть за пульт</button>}
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
              {alarm && <div className="alarm-detail-grid">
                <span><small>Клиент</small><b>{alarm.client}</b></span>
                <span><small>Тариф</small><b>{alarm.tariff}</b></span>
                <span><small>Хронология</small><b>{alarm.sensors.join(" → ")}</b></span>
                <span><small>История</small><b>{alarm.history}</b></span>
                <span className={`alarm-countdown ${alarmSeconds <= 10 ? "urgent" : ""}`}><small>Время решения</small><b>{alarmSeconds} сек.</b></span>
              </div>}
              {alarm && <div className="alarm-actions">
                <button className="alarm-action" onClick={() => handleAlarm("call")}>Позвонить клиенту</button>
                <button className="alarm-action primary" onClick={() => handleAlarm("gbr")}>Отправить ГБР</button>
                <button className="alarm-action" onClick={() => handleAlarm("self")}>Выехать лично</button>
                <button className="alarm-action" onClick={() => handleAlarm("fire")}>Вызвать пожарных</button>
                <button className="alarm-action" onClick={() => handleAlarm("police")}>Вызвать полицию</button>
                <button className="alarm-action danger" onClick={() => handleAlarm("reset")}>Сбросить тревогу</button>
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
                <div className="honor-board">
                  <div><small>Обновляется раз в игровые сутки</small><h2>Доска почёта менеджеров</h2></div>
                  {LEADERBOARD_SEED.map((row) => <span key={`board-${row.playerName}`}><b>#{row.rank}</b>{row.playerName}<strong>{row.value} ★</strong></span>)}
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
                  <div><small>Мастерская</small><h1>{currentVehicle ? `Гараж · ${VEHICLE_BY_ID[currentVehicle].name}` : "Пустой гараж"}</h1></div>
                  <span className="live-pill calm">{currentVehicle ? `Двигатель ${carUpgrade + 1}/4` : "Нет автомобиля"}</span>
                </div>
                <p className="office-room-message">{officeMessage}</p>
                <div className="garage-stage">
                  {currentVehicle ? <div className="garage-car"><i /><span /><b /></div> : <div className="garage-empty">Свободное место</div>}
                  <div>
                    <small>Состояние автомобиля</small>
                    <h3>{currentVehicle ? `Топливо ${carTelemetry.fuel.toFixed(2)} л / ${FUEL_TANK_LITERS} л · износ ${Math.round(carTelemetry.wear)}%` : "У вас нет автомобиля"}</h3>
                    <p>{currentVehicle ? "Улучшение повышает тягу и максимальную скорость. На грунте машина всё равно требует аккуратной работы рулём." : "Купите автомобиль в автосалоне или пользуйтесь автобусом. Парковочное место останется свободным до первой покупки."}</p>
                    <button className="garage-upgrade" onClick={() => currentVehicle ? handleOfficeAction("upgrade") : (setTabletTab("fleet"), setMode("tablet"))} disabled={Boolean(currentVehicle) && carUpgrade >= 3}>
                      {currentVehicle ? carUpgrade >= 3 ? "Максимальная комплектация" : `Установить улучшение · ${(7000 + carUpgrade * 4500).toLocaleString("ru-RU")} ₽` : "Открыть автосалон"}
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
