import assert from 'node:assert/strict';
import { setLevel } from '../js/level.js';
import { Boss } from '../js/boss.js';
import { YetiBoss } from '../js/yeti.js';
import { MechBoss } from '../js/mech.js';
import { HeliBoss } from '../js/heli.js';
import { LavaBeast } from '../js/lavabeast.js';
import { DrillBoss } from '../js/drill.js';
import { WardenBoss } from '../js/warden.js';
import { OverlordBoss } from '../js/overlord.js';
import { DIFFS } from '../js/config.js';

const bosses = [Boss, YetiBoss, MechBoss, HeliBoss, LavaBeast, DrillBoss, WardenBoss, OverlordBoss];
const noOp = () => {};
const world = {
  player: { x: 4200, y: 400, w: 26, h: 46, dead: false, inv: 0, shieldT: 0 },
  enemies: { bullets: [], list: [], powerups: [], fireAimed: noOp, fireFan: noOp, runnerCount: () => 0, spawnRunners: noOp, spawnDrone: noOp, spawnPatrolbots: noOp },
  particles: { explosion: noOp, bigExplosion: noOp, smoke: noOp, sparks: noOp, text: noOp },
  audio: { sfx: noOp },
  bullets: [],
  camX: 4000,
  time: 0,
  addScore: noOp,
  shake: noOp,
  killPlayer: noOp,
  onPitDeath: noOp,
};

for (let i = 0; i < bosses.length; i++) {
  setLevel(i);
  const boss = new bosses[i]();
  assert.ok(boss.core?.max > 0, `boss ${i} has no core`);
  const baseHp = boss.core.max;
  boss.applyDifficulty(DIFFS[2]);
  assert.equal(boss.core.max, baseHp * DIFFS[2].bossHp, `boss ${i} ignores hard HP profile`);
  boss.core.hp = boss.core.max;
  boss.applyDifficulty(DIFFS[1]);
  assert.equal(boss.difficulty.bossSpeed, 1, `boss ${i} has no classic speed profile`);
  boss.damage('core', Math.ceil(boss.core.max / 2), world);
  assert.ok(boss.core.hp <= boss.core.max / 2, `boss ${i} does not enter phase two threshold`);
  boss.damage('core', boss.core.max * 2, world);
  assert.equal(boss.dead, true, `boss ${i} was not killed`);
  for (let step = 0; step < 80 && !boss.done; step++) {
    world.time += 0.1;
    boss.update(0.1, world);
  }
  assert.equal(boss.done, true, `boss ${i} death sequence did not finish`);
}

console.log('verify-bosses: 8 bosses phase-two and death sequences OK');
