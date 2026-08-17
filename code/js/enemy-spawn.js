// ===================== EnemySpawnSystem =====================
// 只负责把关卡/触发器参数转换成敌人实体；EnemyManager 保留更新、绘制和伤害生命周期。
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { groundTopAt } from './level.js';

const safeTop = (x) => groundTopAt(x, { safe: true }) ?? CFG.GROUND_Y;
const push = (manager, entity) => manager.list.push(entity);

export function spawnRunners(manager, n, dir, camX) {
  for (let i = 0; i < n; i++) {
    let x = dir < 0 ? camX + CFG.W + 40 + i * 56 : camX - 40 - i * 56;
    x = Math.min(x, CFG.ARENA_WALL_X - 30);
    push(manager, { type: 'runner', x, y: safeTop(x) - 42, w: 24, h: 42, vx: 0, vy: 0, dir, hp: 1, runT: rand(0, 1), onGround: false });
  }
}
export const spawnTurret = (manager, x, y) => push(manager, { type: 'turret', x: x - 18, y: y - 34, w: 36, h: 34, hp: 3, timer: rand(0.6, 1.6), flash: 0, aim: Math.PI });
export const spawnSniper = (manager, x, y) => push(manager, { type: 'sniper', x: x - 13, y: y - 40, w: 26, h: 40, hp: 2, state: 'hide', timer: rand(0.5, 1.2), aim: Math.PI });
export const spawnDrone = (manager, carry, camX) => push(manager, { type: 'drone', x: camX + CFG.W + 60, y: 140, w: 36, h: 24, vx: -150, t: 0, baseY: rand(110, 170), hp: 1, carry });
export const spawnGrenadier = (manager, x, y) => push(manager, { type: 'grenadier', x: x - 13, y: y - 42, w: 26, h: 42, hp: 2, timer: rand(1, 2), facing: -1, runT: rand(0, 1) });
export const spawnShielder = (manager, x, y) => push(manager, { type: 'shielder', x: x - 14, y: y - 44, w: 28, h: 44, vx: 0, vy: 0, hp: 4, facing: -1, runT: 0, onGround: false });
export function spawnFlyers(manager, n, camX) {
  for (let i = 0; i < n; i++) push(manager, { type: 'flyer', x: camX + CFG.W + 50 + i * 70, y: rand(120, 180), w: 30, h: 22, vx: -130, t: rand(0, 2), baseY: rand(110, 170), hp: 1, diving: false });
}
export function spawnJumpers(manager, n, dir, camX) {
  for (let i = 0; i < n; i++) {
    let x = dir < 0 ? camX + CFG.W + 40 + i * 64 : camX - 40 - i * 64;
    x = Math.min(x, CFG.ARENA_WALL_X - 30);
    push(manager, { type: 'jumper', x, y: safeTop(x) - 42, w: 24, h: 42, vx: 0, vy: 0, dir, hp: 1, runT: rand(0, 1), jumpT: rand(0.3, 0.9), onGround: false });
  }
}
export function spawnRollers(manager, n, dir, camX) {
  for (let i = 0; i < n; i++) {
    let x = dir < 0 ? camX + CFG.W + 40 + i * 48 : camX - 40 - i * 48;
    x = Math.min(x, CFG.ARENA_WALL_X - 30);
    push(manager, { type: 'roller', x, y: safeTop(x) - 22, w: 22, h: 22, vx: 0, vy: 0, hp: 1, fuse: -1, rollT: 0, onGround: false });
  }
}
export function spawnParas(manager, n, camX) {
  for (let i = 0; i < n; i++) {
    const x = clamp(camX + 200 + i * 180 + rand(-40, 40), camX + 60, camX + CFG.W - 60);
    push(manager, { type: 'para', x, y: -50 - i * 60, w: 24, h: 42, vx: 0, vy: 0, hp: 2, state: 'fall', swayT: rand(0, 2), timer: rand(0.8, 1.6), aim: Math.PI, facing: -1, runT: 0 });
  }
}
export const spawnMortar = (manager, x, y) => push(manager, { type: 'mortar', x: x - 14, y: y - 46, w: 28, h: 46, hp: 3, timer: rand(2, 3), facing: -1, runT: rand(0, 1) });
export function spawnSnowballs(manager, n, dir, camX) {
  for (let i = 0; i < n; i++) {
    let x = dir < 0 ? camX + CFG.W + 40 + i * 90 : camX - 40 - i * 90;
    x = Math.min(x, CFG.ARENA_WALL_X - 40);
    push(manager, { type: 'snowball', x, y: safeTop(x) - 36, w: 36, h: 36, vx: 0, vy: 0, dir, hp: 4, rollT: rand(0, 1), onGround: false });
  }
}
export const spawnPatrolbot = (manager, x, y) => push(manager, { type: 'patrolbot', x: x - 14, y: y - 40, w: 28, h: 40, vx: 0, vy: 0, dir: -1, facing: -1, hp: 2, state: 'patrol', timer: rand(0.4, 1), burst: 0, runT: rand(0, 1), onGround: false });
export function spawnPatrolbots(manager, n, dir, camX) {
  for (let i = 0; i < n; i++) {
    let x = dir < 0 ? camX + CFG.W + 40 + i * 90 : camX - 40 - i * 90;
    x = Math.min(x, CFG.ARENA_WALL_X - 30);
    push(manager, { type: 'patrolbot', x, y: safeTop(x) - 40, w: 28, h: 40, vx: 0, vy: 0, dir, facing: dir, hp: 2, state: 'patrol', timer: rand(0.4, 1) + i * 0.3, burst: 0, runT: rand(0, 1), onGround: false });
  }
}
export const spawnSandworm = (manager, x, y) => push(manager, { type: 'worm', x: x - 16, y: y - 48, w: 32, h: 48, vx: 0, vy: 0, hp: 3, state: 'hide', timer: rand(0.4, 1.2), facing: -1, onGround: false });
