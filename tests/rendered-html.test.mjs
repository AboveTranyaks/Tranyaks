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
  assert.match(source, /window\.confirm\("Начать заново/);
  assert.match(source, /tabletTab === "quests"/);
  assert.match(source, /const DISTRICTS/);
  assert.match(source, /const SECURITY_OBJECTS/);
  assert.match(source, /const VEHICLES/);
  assert.match(source, /usedPrice/);
  assert.match(source, /tradeInCurrentVehicle/);
  assert.match(source, /serviceVehicle/);
  assert.match(source, /buyStoreItem/);
  assert.match(source, /СЕЛО ПЕРОВОРЕЧЕНСКОЕ/);
  assert.match(styles, /\.quest-journal/);
  assert.match(styles, /\.quest-offer/);
  assert.match(styles, /\.minimap-layer/);
  assert.match(styles, /\.vehicle-shop-grid/);
  assert.match(styles, /\.vehicle-service-panel/);
  assert.match(styles, /\.player-shop-grid/);
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
