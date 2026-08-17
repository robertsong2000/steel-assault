import assert from 'node:assert/strict';
import { playerProtected, projectileRect, projectileHits, isContactEnemy, statRow } from '../js/combat.js';

const player = { inv: 0, shieldT: 0 };
assert.equal(playerProtected(player), false);
player.inv = 0.2;
assert.equal(playerProtected(player), true);
player.inv = 0; player.shieldT = 1;
assert.equal(playerProtected(player), true);

const bullet = { x: 20, y: 20, r: 4 };
assert.deepEqual(projectileRect(bullet), { x: 16, y: 16, w: 8, h: 8 });
assert.equal(projectileHits(bullet, { x: 18, y: 18, w: 10, h: 10 }), true);
assert.equal(projectileHits(bullet, { x: 100, y: 100, w: 10, h: 10 }), false);
assert.equal(isContactEnemy({ type: 'runner' }), true);
assert.equal(isContactEnemy({ type: 'worm', state: 'hide' }), false);
assert.equal(isContactEnemy({ type: 'turret' }), false);

const stats = { weapons: {} };
assert.equal(statRow(stats, 'L'), statRow(stats, 'L'));
assert.deepEqual(stats.weapons.L, { shots: 0, hits: 0, kills: 0, pickups: 0, time: 0 });

console.log('verify-combat: pure collision/protection/telemetry boundaries OK');
