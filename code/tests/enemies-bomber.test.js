import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../js/config.js';
import { LEVELS, setLevel } from '../js/level.js';
import { EnemyManager, ENEMY_SCORE, shieldBlocksBullet } from '../js/enemies.js';

function mockWorld(overrides = {}) {
  const player = {
    x: 200, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false,
    ...overrides.player,
  };
  return {
    player,
    camX: overrides.camX ?? 0,
    time: 0,
    particles: { explosion() {}, sparks() {}, text() {} },
    audio: { sfx() {} },
    shake() {},
    addScore() {},
    killPlayer() {},
    ...overrides,
    player,
  };
}

describe('bomber spawn', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('spawnBomber creates a walking grenadier variant distinct from snow grenadier', () => {
    const em = new EnemyManager();
    em.spawnGrenadier(400, CFG.GROUND_Y);
    em.spawnBomber(400, CFG.GROUND_Y);
    assert.equal(em.list.length, 2);
    const snow = em.list[0];
    const bomber = em.list[1];
    assert.equal(snow.type, 'grenadier');
    assert.equal(bomber.type, 'bomber');
    assert.notEqual(bomber.type, snow.type);
    assert.ok(bomber.hp > snow.hp, 'bomber should be tougher than snow grenadier');
    assert.ok('vx' in bomber && 'vy' in bomber);
    assert.ok(bomber.bounces === undefined); // bounce belongs on the nade, not the unit
  });
});

describe('bomber score mapping', () => {
  it('maps bomber to a distinct score used by damage()', () => {
    assert.ok(ENEMY_SCORE.bomber > 0);
    assert.notEqual(ENEMY_SCORE.bomber, ENEMY_SCORE.grenadier);
    assert.notEqual(ENEMY_SCORE.bomber, ENEMY_SCORE.runner);

    setLevel(0);
    const em = new EnemyManager();
    em.spawnBomber(400, CFG.GROUND_Y);
    const e = em.list[0];
    e.hp = 1;
    let awarded = 0;
    const world = mockWorld({
      addScore(n) { awarded = n; },
    });
    em.damage(e, 1, world);
    assert.equal(awarded, ENEMY_SCORE.bomber);
    assert.equal(e.remove, true);
  });
});

describe('grenadier vs bomber behavior', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('snow grenadier stays put and lobs kind=snow', () => {
    const em = new EnemyManager();
    em.spawnGrenadier(400, CFG.GROUND_Y);
    const e = em.list[0];
    const x0 = e.x;
    e.timer = 0;
    const world = mockWorld({
      player: { x: 280, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.x, x0);
    assert.ok(em.bullets.length >= 1);
    assert.equal(em.bullets[0].kind, 'snow');
    assert.ok(em.bullets[0].grav > 0);
    assert.equal(em.bullets[0].bounce, undefined);
  });

  it('bomber walks toward the player instead of standing still', () => {
    const em = new EnemyManager();
    em.spawnBomber(500, CFG.GROUND_Y);
    const e = em.list[0];
    const x0 = e.x;
    e.timer = 9; // not ready to throw; should still close in
    const world = mockWorld({
      player: { x: 200, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.ok(e.x < x0, 'bomber should walk left toward the player');
    assert.equal(e.facing, -1);
  });

  it('bomber lobs a bouncing explosive nade, not a snowball', () => {
    const em = new EnemyManager();
    em.spawnBomber(400, CFG.GROUND_Y);
    const e = em.list[0];
    e.timer = 0;
    const world = mockWorld({
      player: { x: 220, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.ok(em.bullets.length >= 1);
    const nade = em.bullets[0];
    assert.equal(nade.kind, 'nade');
    assert.ok(nade.grav > 0);
    assert.ok(nade.bounce >= 1);
    assert.ok(nade.aoe > 0);
    assert.ok(nade.life > 0);
    assert.notEqual(nade.kind, 'snow');
  });

  it('nade bounces once on solids then keeps going', () => {
    const em = new EnemyManager();
    em.bullets.push({
      x: 200, y: CFG.GROUND_Y + 2, vx: 40, vy: 80, r: 5,
      grav: 900, kind: 'nade', bounce: 1, aoe: 70, life: 2,
    });
    const world = mockWorld();
    em.update(1 / 60, world);
    const nade = em.bullets[0];
    assert.ok(nade, 'nade should still exist after first bounce');
    assert.equal(nade.remove, undefined);
    assert.equal(nade.bounce, 0);
    assert.ok(nade.vy < 0, 'nade should rebound upward');
  });

  it('nade exploding on fuse kills a nearby player via AOE', () => {
    const em = new EnemyManager();
    em.bullets.push({
      x: 210, y: 430, vx: 0, vy: 0, r: 5,
      grav: 0, kind: 'nade', bounce: 0, aoe: 70, life: 0,
    });
    let killed = false;
    const world = mockWorld({
      player: { x: 200, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
      killPlayer() { killed = true; },
    });
    em.update(1 / 60, world);
    assert.equal(killed, true);
    assert.equal(em.bullets.length, 0);
  });

  it('nade exploding far away does not kill the player', () => {
    const em = new EnemyManager();
    em.bullets.push({
      x: 800, y: 430, vx: 0, vy: 0, r: 5,
      grav: 0, kind: 'nade', bounce: 0, aoe: 70, life: 0,
    });
    let killed = false;
    const world = mockWorld({
      player: { x: 200, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
      killPlayer() { killed = true; },
    });
    em.update(1 / 60, world);
    assert.equal(killed, false);
  });
});

describe('shield / flame interaction regression', () => {
  it('blocks frontal non-flame shots on a shielder', () => {
    const e = { type: 'shielder', facing: -1 };
    assert.equal(shieldBlocksBullet(e, { vx: 400, flame: false }), true);
  });

  it('lets flame bypass the shield from the front', () => {
    const e = { type: 'shielder', facing: -1 };
    assert.equal(shieldBlocksBullet(e, { vx: 400, flame: true }), false);
  });

  it('does not block shots from behind the shield', () => {
    const e = { type: 'shielder', facing: -1 };
    assert.equal(shieldBlocksBullet(e, { vx: -400, flame: false }), false);
  });

  it('never blocks for non-shielder types (grenadier / bomber)', () => {
    assert.equal(shieldBlocksBullet({ type: 'grenadier', facing: -1 }, { vx: 400 }), false);
    assert.equal(shieldBlocksBullet({ type: 'bomber', facing: -1 }, { vx: 400 }), false);
  });
});

describe('bomber level placement', () => {
  it('places a few bombers on campaign levels 1 and 3 only', () => {
    const bombersOf = (i) => LEVELS[i].bombers || [];
    assert.ok(bombersOf(0).length >= 1, 'level 1 should host a bomber');
    assert.ok(bombersOf(2).length >= 1, 'level 3 should host a bomber');
    assert.equal(bombersOf(1).length, 0, 'level 2 keeps snow grenadiers only');
    for (let i = 3; i < LEVELS.length; i++) {
      assert.equal(bombersOf(i).length, 0, `level ${i + 1} should not get bombers yet`);
    }
    for (const [i, lv] of LEVELS.entries()) {
      for (const b of bombersOf(i)) {
        assert.ok(typeof b.x === 'number' && typeof b.y === 'number');
        assert.ok(b.x < lv.width);
      }
    }
  });
});
