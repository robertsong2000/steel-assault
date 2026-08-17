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

  it('spawnPatrolbots creates patrol bots in patrol state with a facing direction', () => {
    const em = new EnemyManager();
    em.spawnPatrolbots(2, -1, 0);
    assert.equal(em.list.length, 2);
    for (const e of em.list) {
      assert.equal(e.type, 'patrolbot');
      assert.equal(e.state, 'patrol');
      assert.ok(e.hp >= 2);
      assert.ok(e.dir === 1 || e.dir === -1);
      assert.ok(typeof e.timer === 'number');
    }
  });
});

describe('patrol robot score mapping', () => {
  it('maps patrolbot to a distinct score used by damage()', () => {
    assert.ok(ENEMY_SCORE.patrolbot > 0);
    assert.notEqual(ENEMY_SCORE.patrolbot, ENEMY_SCORE.runner);

    setLevel(0);
    const em = new EnemyManager();
    em.spawnPatrolbots(1, -1, 0);
    const e = em.list[0];
    e.hp = 1;
    let awarded = 0;
    const world = mockWorld({
      addScore(n) { awarded = n; },
    });
    em.damage(e, 1, world);
    assert.equal(awarded, ENEMY_SCORE.patrolbot);
    assert.equal(e.remove, true);
  });
});

describe('patrol robot state machine', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('keeps patrolling (walking pace) while the player is far away', () => {
    const em = new EnemyManager();
    em.spawnPatrolbots(1, -1, 0);
    const e = em.list[0];
    const world = mockWorld({
      player: { x: e.x + 3000, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.state, 'patrol');
    assert.equal(e.vx, e.dir * 70);
  });

  it('stops and fires when the player is within detect range', () => {
    const em = new EnemyManager();
    em.spawnPatrolbots(1, -1, 0);
    const e = em.list[0];
    e.timer = 0;
    const world = mockWorld({
      player: { x: e.x - 80, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.state, 'shoot');
    e.timer = 0;
    const before = em.bullets.length;
    em.update(1 / 60, world);
    assert.ok(em.bullets.length > before);
  });

  it('returns to patrol after finishing its burst', () => {
    const em = new EnemyManager();
    em.spawnPatrolbots(1, -1, 0);
    const e = em.list[0];
    e.state = 'shoot';
    e.burst = 1;
    e.timer = 0;
    const world = mockWorld({
      player: { x: e.x + 4000, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.equal(e.state, 'patrol');
  });
});

describe('patrol robot level placement', () => {
  it('uses patrolbots triggers (never the dropped "patrols" spelling) and stays in bounds', () => {
    const patrolTriggers = (i) => (LEVELS[i].triggers || []).filter((t) => t.type === 'patrolbots');
    const total = LEVELS.reduce((n, _, i) => n + patrolTriggers(i).length, 0);
    assert.ok(total >= 1, 'campaign should spawn patrol bots somewhere');
    for (const [i, lv] of LEVELS.entries()) {
      for (const t of lv.triggers || []) {
        assert.notEqual(t.type, 'patrols', `level ${i + 1} should use "patrolbots" triggers`);
      }
      for (const t of patrolTriggers(i)) {
        assert.ok(t.n >= 1);
        assert.ok(t.dir === 1 || t.dir === -1);
        assert.ok(t.x < lv.width);
      }
    }
  });
});
