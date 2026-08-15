/**
 * Level3.js
 * Strictly Configuration Data — Throne of the Demon Lord (Boss Arena)
 */

export const Level3 = {
  id: 3,
  title: "Throne of the Demon Lord",
  subtitle: "Confront the demonic master in single mortal combat",
  nextLevelId: 4,
  environment: "abyssal_throne",
  winCondition: {
    type: "BOSS_DEFEATED",
    targetCount: 1,
    bossType: "DemonLordBoss"
  },
  rewards: {
    coins: 2500,
    diamonds: 60
  },
  spawnTimeline: [
    { time: 1.5, type: "GroundBrute", count: 2, spawnSide: "both" },
    { time: 6.0, type: "DemonLordBoss", count: 1, spawnSide: "right" },
    { time: 20.0, type: "FlyingGargoyle", count: 2, spawnSide: "both" }
  ]
};
