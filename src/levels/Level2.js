/**
 * Level2.js
 * Strictly Configuration Data — Crimson Spire Ascent
 */

export const Level2 = {
  id: 2,
  title: "Crimson Spire Ascent",
  subtitle: "Survive the airborne onslaught of Flying Gargoyles and elite Brutes",
  nextLevelId: 3,
  environment: "crimson_spires",
  winCondition: {
    type: "KILL_COUNT",
    targetCount: 18
  },
  rewards: {
    coins: 900,
    diamonds: 25
  },
  spawnTimeline: [
    { time: 1.0, type: "FlyingGargoyle", count: 2, spawnSide: "both" },
    { time: 5.0, type: "GroundBrute", count: 2, spawnSide: "right" },
    { time: 10.0, type: "FlyingGargoyle", count: 2, spawnSide: "left" },
    { time: 15.0, type: "GroundBrute", count: 3, spawnSide: "both" },
    { time: 21.0, type: "FlyingGargoyle", count: 3, spawnSide: "both" },
    { time: 28.0, type: "GroundBrute", count: 4, spawnSide: "both" },
    { time: 36.0, type: "FlyingGargoyle", count: 3, spawnSide: "right" }
  ]
};
