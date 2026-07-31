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
  assert.match(source, /const baseSpeed = jogging \? 3\.5 : fastWalking \? 2\.5 : 1\.95/);
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
  assert.match(source, /const DRIVING_SIDE: DrivingSide = "right"/);
  assert.match(source, /DRIVING_SIDE === "right"\s+\? direction > 0\s+\? offset\s+: -offset/);
  assert.match(source, /laneZForDirection\(busDirection, 3\.8\)/);
  assert.match(source, /civilianTrafficDirectionForLane\(laneZ\)/);
  assert.match(source, /const laneZ = i % 2 === 0 \? -3\.2 : 3\.2/);
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
  assert.match(source, /makeReadableTextSign\(makeTextBoard\(`/);
  assert.match(source, /side: THREE\.FrontSide/);
  assert.match(styles, /\.empty-garage-panel/);
});

test("applies right-hand traffic rules, collision damage, and fines", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /wrongRightHandLane/);
  assert.match(source, /travelDirectionX > 0\.25 && car\.position\.z < -0\.7/);
  assert.match(source, /В игре действует правостороннее движение/);
  assert.match(source, /applyTrafficPenalty/);
  assert.match(source, /Среднее ДТП/);
  assert.match(source, /Серьёзное ДТП/);
  assert.match(source, /Опасное ДТП с пешеходом/);
  assert.match(source, /damageSpeedFactor/);
  assert.match(styles, /\.traffic-incident/);
});

test("keeps drivers below the roof and dwells for five game minutes", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /const BUS_STOP_DWELL_GAME_MINUTES = 5/);
  assert.match(source, /busDwellGameHours = BUS_STOP_DWELL_GAME_MINUTES \/ 60/);
  assert.match(source, /const busClockActive = modeRef\.current === "world" \|\| modeRef\.current === "busRide"/);
  assert.match(source, /const busGameTimeDelta = busClockActive \?/);
  assert.match(source, /Стоянка длится 5 игровых минут/);
  assert.match(source, /driver\.position\.set\(-0\.68, -0\.62, 0\.38\)/);
  assert.match(source, /Left-hand steering wheel for right-hand traffic/);
  assert.match(source, /door\.position\.set\(-1\.15, 1\.48, 4\.66\)/);
  assert.match(source, /drivingSide: DRIVING_SIDE/);
});

test("keeps country-road crossings below the main asphalt", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /box\(scene, \[4300, 0\.18, 14\], \[1950, 0\.1, 0\]/);
  assert.match(source, /box\(scene, \[13, 0\.12, 350\], \[centreX \+ 18, 0\.08, 15\]/);
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

test("adds a persistent smartphone, street conversations, and scalable interface", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /type PhoneApp = "home" \| "taxi" \| "freight" \| "contacts"/);
  assert.match(source, /e\.code === "KeyO"/);
  assert.match(source, /gamepad\?\.buttons\[12\]\?\.pressed/);
  assert.match(source, /modeRef\.current === "world" \|\| modeRef\.current === "phone"/);
  assert.match(source, /requestTaxi/);
  assert.match(source, /contactResidentByPhone/);
  assert.match(source, /capturePhonePhoto/);
  assert.match(source, /phoneNotes: phoneNotesRef\.current/);
  assert.match(source, /uiScale: uiScaleRef\.current/);
  assert.match(source, /handleStreetReply/);
  assert.match(source, /personalReputation/);
  assert.match(source, /рекомендует вас/);
  assert.match(styles, /\.phone-layer/);
  assert.match(styles, /\.phone-app-grid/);
  assert.match(styles, /\.street-dialogue-card/);
  assert.match(styles, /zoom: var\(--game-ui-scale, 1\)/);
});

test("adds pole collisions and high-contrast alarm controls", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /engine\.colliders\.push\(\{ x, z: 15, halfX: 0\.42, halfZ: 0\.42, kind: "landmark" \}\)/);
  assert.match(source, /z: z - 3\.5, halfX: 0\.34, halfZ: 0\.34/);
  assert.match(styles, /\.alarm-card \.alarm-countdown \{ color: #8f431f/);
  assert.match(styles, /\.alarm-card \.alarm-action\.danger \{ color: #9f3024/);
  assert.match(styles, /background: #fff8f5/);
});

test("stops street NPCs for dialogue and provides physical bus rides", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /activeStreetWalkerIdRef\.current === walker\.id/);
  assert.match(source, /personWalkCycle\(walker\.mesh, false/);
  assert.match(source, /walker\.mesh\.position\.copy\(player\.position\)\.addScaledVector\(approach, 2\.25\)/);
  assert.match(source, /const boardBus = \(\) =>/);
  assert.match(source, /engineRef\.current\.busRider\.visible = true/);
  assert.match(source, /setMode\("busRide"\)/);
  assert.match(source, /const focus = ridingBus \? bus/);
  assert.match(source, /setBusStopChoice\(true\)/);
  assert.match(source, /Выйти здесь/);
  assert.match(source, /Ехать дальше/);
  assert.doesNotMatch(source, /const rideBusTo/);
  assert.match(styles, /\.bus-ride-panel/);
});

test("adds district sidewalks, crossings, rest benches, and procedural audio", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /type WalkSurfaceKind = "Плитка"/);
  assert.match(source, /const SIDEWALK_PROFILES/);
  assert.match(source, /central: \{ surface: "Плитка", width: 3/);
  assert.match(source, /elite: \{ surface: "Декоративная плитка", width: 4, speed: 1\.05/);
  assert.match(source, /function pedestrianSurfaceAt/);
  assert.match(source, /surface: "Проезжая часть", speed: 0\.8, energy: 1\.2/);
  assert.match(source, /const addStreetBench/);
  assert.match(source, /isPedestrianCrossing\(player\.position\.x, player\.position\.z\)/);
  assert.match(source, /trafficVehicle\.speed \* \(yieldingAtCrossing \? 0\.12 : 1\)/);
  assert.match(source, /const playFootstep = useCallback/);
  assert.match(source, /new AudioContext\(\)/);
  assert.match(source, /Тревоги нельзя сделать тише 30%/);
  assert.match(source, /"Вести посёлка", "Пультовая волна"/);
  assert.match(styles, /\.audio-settings-title/);
});

test("supports licensed custom radio streams with resilient offline fallback and vehicle audio", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /customRadioUrl\?: string/);
  assert.match(source, /function startRadioStream/);
  assert.match(source, /new Audio\(\)/);
  assert.match(source, /Нужна прямая HTTPS-ссылка/);
  assert.match(source, /attempt < 2/);
  assert.match(source, /Поток недоступен · включено офлайн-радио/);
  assert.match(source, /ссылка вида \/stream, \.mp3, \.aac или \.ogg/);
  assert.match(source, /Ссылка на обычную веб-страницу станции не подойдёт/);
  assert.match(source, /vehicleEngine: OscillatorNode/);
  assert.match(source, /activeAudio\.vehicleEngine\.frequency\.setTargetAtTime/);
  assert.match(source, /playVehicleHorn/);
  assert.match(source, /playAmbientDetail/);
  assert.match(styles, /\.stream-radio/);
});

test("populates Dinskaya with thirty street NPCs and public landmarks", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /const walkerCount = villageX === 4000 \? 30 : 12/);
  assert.match(source, /Станица Динская: создано 30 уличных NPC/);
  assert.match(source, /addDinskayaBuilding\(4058, 44/);
  assert.match(source, /addDinskayaBuilding\(3972, 92/);
  assert.match(source, /addDinskayaBuilding\(3970, -98/);
  assert.match(source, /addDinskayaBuilding\(4055, -98/);
  assert.match(source, /addStreetBench\(4080, 108/);
});

test("adds the carrier career, industrial logistics, inventory, and wildlife", async () => {
  const [source, styles] = await Promise.all([
    readFile(sourceUrl, "utf8"),
    readFile(stylesUrl, "utf8"),
  ]);

  assert.match(source, /type CareerRole = "manager" \| "carrier"/);
  assert.match(source, /const DEFAULT_FREIGHT_JOBS: FreightJob\[]/);
  assert.match(source, /id: "uaz_profi"[\s\S]*cargo: 400[\s\S]*commercial: true/);
  assert.match(source, /id: "gazelle_box"[\s\S]*id: "gazelle_flatbed"[\s\S]*id: "kamaz"[\s\S]*id: "reefer"[\s\S]*id: "dumptruck"/);
  assert.match(source, /const startCareer = \(role: CareerRole\)/);
  assert.match(source, /Начать карьеру перевозчика/);
  assert.match(source, /e\.code === "KeyI"/);
  assert.match(source, /transferInventoryItem/);
  assert.match(source, /processFreightJob/);
  assert.match(source, /ПРОДУКТОВАЯ БАЗА/);
  assert.match(source, /СКЛАД СПЕКТР/);
  assert.match(source, /const board = makeReadableTextSign\([\s\S]*makeTextBoard\(building\.label/);
  assert.match(source, /function makeWildlife/);
  assert.match(source, /\[WildlifeManager\]/);
  assert.match(source, /setReputation\(\(value\) => Math\.max\(0, value - 15\)\)/);
  assert.match(styles, /\.carrier-career/);
  assert.match(styles, /\.freight-app/);
  assert.match(styles, /\.inventory-overlay/);
});

test("keeps residents facing the street and connects every house to a footpath", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /const addHousePath = \(x: number, z: number\)/);
  assert.match(source, /addHousePath\(x, z\)/);
  assert.match(source, /const doorZ = z - side \* 4\.7/);
  assert.match(source, /npc\.rotation\.y = resident\.z > 0 \? Math\.PI : 0/);
  assert.match(source, /resident\.mesh\.rotation\.y = resident\.z > 0 \? Math\.PI : 0/);
  assert.doesNotMatch(source, /resident\.mesh\.rotation\.y = Math\.sin/);
});

test("uses flat water and non-circular flocking wildlife with village fauna", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /function makeFlatRiverGeometry/);
  assert.match(source, /new THREE\.Mesh\(makeFlatRiverGeometry\(curve\), riverMat\)/);
  assert.doesNotMatch(source, /new THREE\.TubeGeometry\(curve/);
  assert.match(source, /type BirdFlockState/);
  assert.match(source, /Array\.from\(\{ length: 24 \}/);
  assert.match(source, /state: "ground" \| "flying" \| "landing"/);
  assert.match(source, /\{ kind: "bird", x: 0, z: 42, count: 12/);
  assert.match(source, /animal\.frightenedUntil = now \+ 4200/);
  assert.doesNotMatch(source, /animal\.mesh\.position\.x = animal\.homeX \+ Math\.cos/);
  assert.doesNotMatch(source, /animal\.mesh\.position\.z = animal\.homeZ \+ Math\.sin/);
});
