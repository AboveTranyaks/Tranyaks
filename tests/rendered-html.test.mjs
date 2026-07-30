import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../app/security-console-game.tsx", import.meta.url);
const stylesUrl = new URL("../app/globals.css", import.meta.url);
const pagesConfigUrl = new URL("../vite.pages.config.ts", import.meta.url);

test("contains the expanded playable world and movement systems", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /addNeighbourhood\(0,\s*15,\s*10\)/);
  assert.match(source, /addNeighbourhood\(1350,\s*25,\s*25\)/);
  assert.match(source, /addNeighbourhood\(2700,\s*25,\s*50\)/);
  assert.match(source, /addNeighbourhood\(4000,\s*25,\s*75\)/);
  assert.match(source, /function surfaceAt/);
  assert.match(source, /fastWalkUntil/);
  assert.match(source, /const energyCost = \(jogging \? 1\.5 : fastWalking \? 0\.5 : 0\.2\)/);
  assert.match(source, /type WeatherKind = "Ясно" \| "Облачно" \| "Дождь" \| "Гроза"/);
  assert.match(source, /engine\.carSlip/);
  assert.match(source, /engine\.fuel/);
  assert.match(source, /engine\.wear/);
});

test("contains wardrobe, office zones, and static Pages publishing config", async () => {
  const [source, styles, pagesConfig] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
    readFile(pagesConfigUrl, "utf8"),
  ]);

  assert.match(source, /const OUTFITS: Outfit\[\]/);
  assert.match(source, /tabletTab === "wardrobe"/);
  for (const zone of ["console", "manager", "rest", "storage", "garage"]) {
    assert.match(source, new RegExp(`officeZone === "${zone}"`));
  }
  assert.match(styles, /\.weather-screen/);
  assert.match(styles, /\.wardrobe-grid/);
  assert.match(styles, /\.garage-stage/);
  assert.match(pagesConfig, /base:\s*"\/Tranyaks\/"/);
});

test("contains separate map and tablet controls, profiles, saves, and offline ratings", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /setMode\("map"\)/);
  assert.match(source, /e\.code === "KeyP"/);
  assert.match(source, /type SaveSlotId = "auto" \| "slot1" \| "slot2" \| "slot3"/);
  assert.match(source, /const LEADERBOARD_SEED/);
  assert.match(source, /tabletTab === "profile"/);
  assert.match(source, /tabletTab === "rating"/);
  assert.match(source, /tabletTab === "saves"/);
  assert.match(source, /checksum\(envelope\.data\)/);
  assert.match(styles, /\.full-map-overlay/);
  assert.match(styles, /\.save-grid/);
  assert.match(styles, /\.leaderboard-table/);
});

test("contains quests, expanded economy, districts, and fleet progression", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /const QUESTS/);
  assert.match(source, /quest_open_office/);
  assert.match(source, /acceptQuest/);
  assert.match(source, /map-quest-edge/);
  assert.match(source, /createAlarmEvent/);
  assert.match(source, /alarmSeconds/);
  assert.match(source, /window\.confirm\("Сбросить игру полностью/);
  assert.match(source, /tabletTab === "quests"/);
  assert.match(source, /const DISTRICTS/);
  assert.match(source, /const SECURITY_OBJECTS/);
  assert.match(source, /const VEHICLES/);
  assert.match(source, /usedPrice/);
  assert.match(source, /tradeInCurrentVehicle/);
  assert.match(source, /serviceVehicle/);
  assert.match(source, /buyStoreItem/);
  assert.match(source, /СЕЛО ПЕРВОРЕЧЕНСКОЕ/);
  assert.match(styles, /\.quest-journal/);
  assert.match(styles, /\.quest-offer/);
  assert.match(styles, /\.minimap-layer/);
  assert.match(styles, /\.vehicle-shop-grid/);
  assert.match(styles, /\.vehicle-service-panel/);
  assert.match(styles, /\.player-shop-grid/);
});

test("contains complete reset, safe NPC respawn, map routing, and corrected walking speed", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /const FullResetAndRestart/);
  assert.match(source, /clearGameStorage\(localStorage\)/);
  assert.match(source, /clearGameStorage\(sessionStorage\)/);
  assert.match(source, /networkChannelRef\.current\?\.close\(\)/);
  assert.match(source, /residentsFromSave\(save: SaveData\)/);
  assert.match(source, /DEFAULT_CAR_POSITION/);
  assert.match(source, /const baseSpeed = jogging \? 3\.5 : fastWalking \? 2\.5 : 1\.35/);
  assert.match(source, /mapRouteStyle/);
  assert.match(source, /minimap-distance/);
  assert.match(styles, /\.world-route\.active[\s\S]*transform-origin:\s*0 50%/);
  assert.match(styles, /\.minimap-distance/);
  assert.match(styles, /\.full-reset-panel/);
});

test("resets statistics safely and renders liters, traffic, lights, and utility infrastructure", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /const isResettingRef = useRef\(false\)/);
  assert.match(source, /if \(!isResettingRef\.current\) persist\(\)/);
  assert.match(source, /const FUEL_TANK_LITERS = 40/);
  assert.match(source, /carFuel: 0/);
  assert.match(source, /Топливо \{carTelemetry\.fuel\.toFixed\(2\)\} л/);
  assert.match(source, /type TrafficVehicle/);
  assert.match(source, /makeCar\(trafficColors\[i % trafficColors\.length\], true\)/);
  assert.match(source, /trafficDriver/);
  assert.match(source, /const clouds: THREE\.Group\[\]/);
  assert.match(source, /Utility corridor/);
  assert.match(source, /headlightMaterials/);
  assert.match(styles, /\.tablet-content \.soft-btn/);
});

test("contains right-hand bus service, intermediate stop, greener vegetation, and two gas stations", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /const BUS_STOPS: BusStopSpec\[\]/);
  assert.match(source, /name: "Трасса · промежуточная", x: 2000/);
  assert.match(source, /const GAS_STATIONS = \[/);
  assert.match(source, /АЗС «Первореченская»/);
  assert.match(source, /АЗС «Динская»/);
  assert.match(source, /function makeBus\(\)/);
  assert.match(source, /busSpeed = 16\.67/);
  assert.match(source, /bus\.position\.z = busDirection > 0 \? -3\.8 : 3\.8/);
  assert.match(source, /trafficCar\.position\.set\([^;]+direction > 0 \? -3\.2 : 3\.2\)/);
  assert.match(source, /group\.scale\.setScalar\(0\.6\)/);
  assert.match(source, /new THREE\.InstancedMesh\(grassGeometry, mat\(0x4f9f43\), 3000\)/);
  assert.doesNotMatch(source, /for \(let x = -88; x <= 88; x \+= 22\)/);
  assert.match(styles, /\.service-modal/);
  assert.match(styles, /\.world-bus/);
});

test("starts without a personal car and animates stop passengers", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /ownedVehicles: \[\]/);
  assert.match(source, /currentVehicle: null/);
  assert.match(source, /quest_first_car/);
  assert.match(source, /Алексей приехал в Первореченское рейсовым автобусом/);
  assert.match(source, /const passengerColors/);
  assert.match(source, /state: "waiting"/);
  assert.match(source, /passenger\.state = "boarding"/);
  assert.match(source, /passenger\.state = "exiting"/);
  assert.match(source, /new THREE\.MeshBasicMaterial\(\{ map: makeTextBoard\(`АВТОБУС/);
  assert.match(source, /side: THREE\.FrontSide/);
  assert.match(styles, /\.empty-garage-panel/);
});

test("applies right-hand traffic rules, collision damage, and fines", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /wrongRightHandLane/);
  assert.match(source, /В игре действует правостороннее движение/);
  assert.match(source, /applyTrafficPenalty/);
  assert.match(source, /Среднее ДТП/);
  assert.match(source, /Серьёзное ДТП/);
  assert.match(source, /Опасное ДТП с пешеходом/);
  assert.match(source, /damageSpeedFactor/);
  assert.match(styles, /\.traffic-incident/);
});

test("contains rotating daily challenges and cooperative room systems", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /type DailyChallengeState/);
  assert.match(source, /const DAILY_CHALLENGES/);
  assert.match(source, /createDailyChallenges/);
  assert.match(source, /claimDailyChallenge/);
  assert.match(source, /new BroadcastChannel/);
  assert.match(source, /networkMaxPlayers/);
  assert.match(source, /sendNetworkChat/);
  assert.match(source, /remoteMeshes/);
  assert.match(styles, /\.daily-challenge-grid/);
  assert.match(styles, /\.network-lobby/);
  assert.match(styles, /\.coop-hud/);
});

test("keeps pause controls readable and daily rewards accessible", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /Награды за серию/);
  assert.match(source, /Заходите в игру несколько дней подряд/);
  assert.match(styles, /\.pause-card \.soft-btn/);
  assert.match(styles, /\.tablet-content[\s\S]*min-height:\s*0/);
  assert.match(styles, /\.streak-roadmap > p/);
});
