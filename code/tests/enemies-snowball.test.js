import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../js/config.js';
import { LEVELS, setLevel } from '../js/level.js';
import { EnemyManager, ENEMY_SCORE, snowballHitsPlayer } from '../js/enemies.js';

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

describe('snowball trap spawn', () => {
  beforeEach(() => {
    setLevel(1); // 雪原：陷阱所属关
    CFG.DIFF_MUL = 1;
  });

  it('spawnSnowballs creates rolling traps distinct from chase-and-boom rollers', () => {
    const em = new EnemyManager();
    em.spawnRollers(1, -1, 0);
    em.spawnSnowballs(1, -1, 0);
    assert.equal(em.list.length, 2);
    const roller = em.list[0];
    const ball = em.list[1];
    assert.equal(roller.type, 'roller');
    assert.equal(ball.type, 'snowball');
    assert.notEqual(ball.type, roller.type);
    assert.equal(ball.dir, -1);
    assert.ok(ball.hp >= 1);
    assert.ok(ball.w >= 24);
    assert.ok(ball.maxGrow > ball.w, 'snowball should be able to grow while rolling');
    assert.equal(ball.fuse, undefined); // fuse/explode belongs to roller, not the trap
  });
});

describe('snowball trap score mapping', () => {
  it('maps snowball to a distinct score used by damage()', () => {
    assert.ok(ENEMY_SCORE.snowball > 0);
    assert.notEqual(ENEMY_SCORE.snowball, ENEMY_SCORE.runner);
    assert.notEqual(ENEMY_SCORE.snowball, 150); // roller uses hardcoded 150 via detonate

    setLevel(1);
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    e.hp = 1;
    let awarded = 0;
    let killed = false;
    const world = mockWorld({
      addScore(n) { awarded = n; },
      killPlayer() { killed = true; },
    });
    em.damage(e, 1, world);
    assert.equal(awarded, ENEMY_SCORE.snowball);
    assert.equal(e.remove, true);
    assert.equal(killed, false, 'shooting a snowball must not AOE-kill (unlike rollers)');
  });
});

describe('snowball trap motion', () => {
  beforeEach(() => {
    setLevel(1);
    CFG.DIFF_MUL = 1;
  });

  it('rolls in its spawn direction and does not reverse toward the player', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const x0 = e.x;
    // Player is to the RIGHT of the ball; a chaser (roller) would turn around.
    const world = mockWorld({
      player: { x: e.x + 400, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    em.update(1 / 60, world);
    assert.ok(e.x < x0, 'snowball trap rolls left even if the player is on the right');
    assert.equal(e.dir, -1);
  });

  it('grows while rolling then caps at maxGrow', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const w0 = e.w;
    const world = mockWorld({
      player: { x: 8000, y: 424, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false },
    });
    for (let i = 0; i < 180; i++) em.update(1 / 60, world);
    assert.ok(e.w > w0, 'hurt box should grow as the ball rolls');
    assert.ok(e.w <= e.maxGrow);
    assert.equal(e.w, e.maxGrow);
    assert.equal(e.h, e.w);
  });
});

describe('snowball trap hurt bounds', () => {
  beforeEach(() => {
    setLevel(1);
    CFG.DIFF_MUL = 1;
  });

  it('hits an overlapping standing player', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const player = { x: e.x, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false };
    assert.equal(snowballHitsPlayer(e, player), true);
  });

  it('misses a player who jumped over the ball', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const player = {
      x: e.x, y: e.y - 90, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false,
    };
    assert.equal(snowballHitsPlayer(e, player), false);
  });

  it('misses a player standing far away', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const player = { x: e.x + 400, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: false };
    assert.equal(snowballHitsPlayer(e, player), false);
  });

  it('does not hit a dead player even when overlapping', () => {
    const em = new EnemyManager();
    em.spawnSnowballs(1, -1, 0);
    const e = em.list[0];
    const player = { x: e.x, y: e.y, w: CFG.PLAYER_W, h: CFG.PLAYER_H, dead: true };
    assert.equal(snowballHitsPlayer(e, player), false);
  });
});

describe('snowball trap level placement', () => {
  it('drops a few snowball triggers on campaign level 2 only', () => {
    const snowTriggers = (i) => (LEVELS[i].triggers || []).filter((t) => t.type === 'snowballs');
    assert.equal(snowTriggers(0).length, 0, 'level 1 should not get snowball traps');
    assert.ok(snowTriggers(1).length >= 1, 'level 2 (snow) should spawn snowball traps');
    for (let i = 2; i < LEVELS.length; i++) {
      assert.equal(snowTriggers(i).length, 0, `level ${i + 1} should not get snowball traps`);
    }
    for (const [i, lv] of LEVELS.entries()) {
      for (const t of snowTriggers(i)) {
        assert.ok(t.n >= 1);
        assert.ok(t.dir === 1 || t.dir === -1);
        assert.ok(t.x < lv.width);
      }
    }
  });
});
