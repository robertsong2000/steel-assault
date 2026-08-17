// ===================== 战斗判定边界 =====================
// 纯函数集中处理主循环与敌人管理之间最容易回归的几类判定。
import { overlap } from './utils.js';

export const playerProtected = (player) => player.inv > 0 || player.shieldT > 0;
export const projectileRect = (bullet) => {
  const r = bullet.r || 4;
  return { x: bullet.x - r, y: bullet.y - r, w: r * 2, h: r * 2 };
};
export const projectileHits = (bullet, target) => overlap(projectileRect(bullet), target);
export const isContactEnemy = (enemy) => ['runner', 'shielder', 'flyer', 'jumper', 'para', 'snowball'].includes(enemy.type)
  || (enemy.type === 'worm' && enemy.state !== 'hide');
export const statRow = (stats, weapon) => {
  const rows = stats.weapons ??= {};
  return rows[weapon] ??= { shots: 0, hits: 0, kills: 0, pickups: 0, time: 0 };
};
