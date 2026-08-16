import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../js/config.js';
import { LEVELS, setLevel } from '../js/level.js';
import { EnemyManager, ENEMY_SCORE } from '../js/enemies.js';

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

describe('patrol robot spawn', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('spawnPatrols creates patrol bots with home bounds and patrol state', () => {
    const em = new EnemyManager();
    em.spawnPatrols(2, 0);
    assert.equal(em.list.length, 2);
    for (const e of em.list) {
      assert.equal(e.type, 'patrol');
      assert.equal(e.state, 'patrol');
      assert.ok(e.hp >= 2);
      assert.ok(typeof e.homeX === 'number');
      assert.ok(e.patrolRange > 0);
      assert.ok(e.detectRange > 0);
      assert.ok(e.dir === 1 || e.dir === -1);
    }
  });
});

describe('patrol robot score mapping', () => {
  it('maps patrol to a distinct score used by damage()', () => {
    assert.ok(ENEMY_SCORE.patrol > 0);
    assert.notEqual(ENEMY_SCORE.patrol, ENEMY_SCORE.runner);
    assert.notEqual(ENEMY_SCORE.patrol, ENEMY_SCORE.grenadier);

    setLevel(0);
    const em = new EnemyManager();
    em.spawnPatrols(1, 0);
    const e = em.list[0];
    e.hp = 1;
    let awarded = 0;
    const world = mockWorld({
      addScore(n) { awarded = n; },
    });
    em.damage(e, 1, world);
    assert.equal(awarded, ENEMY_SCORE.patrol);
    assert.equal(e.remove, true);
  });
});

describe('patrol robot state machine', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('reverses at patrol bounds while the player is far away', () => {
    const em = new EnemyManager();
    em.spawnPatrols(1, 0);
    const e = em.list[0];
    e.x = e.homeX + e.patrolRange;
    e.dir = 1;
    const world = mockWorld({
      player: { x: e.homeX + 3000, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.state, 'patrol');
    assert.equal(e.dir, -1);
  });

  it('enters alert and fires when the player is in detect range', () => {
    const em = new EnemyManager();
    em.spawnPatrols(1, 0);
    const e = em.list[0];
    e.timer = 0;
    const world = mockWorld({
      player: { x: e.x - 80, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    const before = em.bullets.length;
    em.update(1 / 60, world);
    assert.equal(e.state, 'alert');
    assert.ok(em.bullets.length > before);
  });

  it('returns to patrol after the player leaves detect range', () => {
    const em = new EnemyManager();
    em.spawnPatrols(1, 0);
    const e = em.list[0];
    e.state = 'alert';
    const world = mockWorld({
      player: { x: e.homeX + 4000, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.state, 'patrol');
  });
});

describe('patrol robot level placement', () => {
  it('drops a few patrol triggers on campaign levels 1 and 2 only', () => {
    const patrolTriggers = (i) => (LEVELS[i].triggers || []).filter((t) => t.type === 'patrols');
    assert.ok(patrolTriggers(0).length >= 1, 'level 1 should spawn patrols');
    assert.ok(patrolTriggers(1).length >= 1, 'level 2 should spawn patrols');
    for (let i = 2; i < LEVELS.length; i++) {
      assert.equal(patrolTriggers(i).length, 0, `level ${i + 1} should not get patrols yet`);
    }
    for (const [i, lv] of LEVELS.entries()) {
      for (const t of patrolTriggers(i)) {
        assert.ok(t.n >= 1);
        assert.ok(t.x < lv.width);
      }
    }
  });
});
