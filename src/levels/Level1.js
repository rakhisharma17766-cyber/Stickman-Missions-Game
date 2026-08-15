/**
 * Level1.js
 * Strictly Configuration Data — Gates of the Underworld
 */

export const Level1 = {
  id: 1,
  title: "Gates of the Underworld",
  subtitle: "Slay the initial vanguard of Nether Brutes",
  nextLevelId: 2,
  environment: "crimson_ruins",
  winCondition: {
    type: "KILL_COUNT",
    targetCount: 12
  },
  rewards: {
    coins: 500,
    diamonds: 10
  },
  spawnTimeline: [
    { time: 1.0, type: "GroundBrute", count: 1, spawnSide: "right" },
    { time: 4.0, type: "GroundBrute", count: 2, spawnSide: "both" },
    { time: 9.0, type: "GroundBrute", count: 2, spawnSide: "right" },
    { time: 14.0, type: "FlyingGargoyle", count: 1, spawnSide: "left" },
    { time: 19.0, type: "GroundBrute", count: 3, spawnSide: "both" },
    { time: 26.0, type: "FlyingGargoyle", count: 2, spawnSide: "right" },
    { time: 33.0, type: "GroundBrute", count: 3, spawnSide: "both" }
  ]
};
