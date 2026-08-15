/**
 * LevelRegistry.js
 * Central Registry for Level Definitions
 */

import { Level1 } from './Level1';
import { Level2 } from './Level2';
import { Level3 } from './Level3';

export const ALL_LEVELS = [Level1, Level2, Level3];

export function getLevelById(id) {
  const numericId = Number(id);
  return ALL_LEVELS.find(lvl => lvl.id === numericId) || Level1;
}
