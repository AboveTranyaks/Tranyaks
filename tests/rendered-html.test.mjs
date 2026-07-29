import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../app/security-console-game.tsx", import.meta.url);
const stylesUrl = new URL("../app/globals.css", import.meta.url);
const pagesConfigUrl = new URL("../vite.pages.config.ts", import.meta.url);

test("contains the expanded playable world and movement systems", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /addNeighbourhood\(0,\s*40,\s*10\)/);
  assert.match(source, /addNeighbourhood\(4000,\s*50,\s*50\)/);
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
