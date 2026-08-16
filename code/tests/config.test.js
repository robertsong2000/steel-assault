import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, DIFFS, LEVEL_MUSIC, CFG } from '../js/config.js';

describe('weapon catalog', () => {
  it('defines all seven weapons with required fields', () => {
    for (const id of ['R', 'M', 'S', 'L', 'G', 'H', 'F']) {
      const w = WEAPONS[id];
      assert.ok(w, `missing weapon ${id}`);
      assert.ok(typeof w.cd === 'number' && w.cd > 0, `${id}.cd`);
      assert.ok(typeof w.speed === 'number' && w.speed > 0, `${id}.speed`);
      assert.ok(typeof w.dmg === 'number' && w.dmg > 0, `${id}.dmg`);
    }
  });

  it('flags special behaviors on L/G/H/F', () => {
    assert.equal(WEAPONS.L.pierce, true);
    assert.ok(WEAPONS.G.aoe > 0 && WEAPONS.G.grav > 0);
    assert.ok(WEAPONS.H.homing > 0 && WEAPONS.H.aoe > 0);
    assert.equal(WEAPONS.F.flame, true);
    assert.equal(WEAPONS.F.pierce, true);
  });
});

describe('difficulty & music', () => {
  it('exposes three difficulty tiers with lives and mul', () => {
    assert.equal(DIFFS.length, 3);
    assert.deepEqual(DIFFS.map((d) => d.lives), [5, 3, 1]);
    assert.deepEqual(DIFFS.map((d) => d.mul), [0.85, 1.0, 1.2]);
  });

  it('has one BGM variation per campaign level', () => {
    assert.equal(LEVEL_MUSIC.length, 8);
    for (const m of LEVEL_MUSIC) {
      assert.ok(typeof m.bpm === 'number' && m.bpm > 0);
      assert.ok(typeof m.transpose === 'number');
    }
  });

  it('keeps core physics constants sane', () => {
    assert.ok(CFG.GRAV > 0);
    assert.ok(CFG.JUMP_V > 0);
    assert.ok(CFG.RUN_SPEED > 0);
    assert.equal(CFG.W, 960);
    assert.equal(CFG.H, 540);
  });
});
