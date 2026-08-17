import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseBoss } from '../js/bossbase.js';

function makeBoss(overrides = {}) {
  const b = new BaseBoss();
  b.core = { x: 100, y: 200, r: 30, hp: 100, max: 100 };
  b.clearText = 'test';
  b.title = 'TestBoss';
  Object.assign(b, overrides);
  return b;
}

describe('BaseBoss', () => {
  it('enters phase2 at half HP', () => {
    const b = makeBoss();
    assert.equal(b.phase2, false);
    b.core.hp = 50;
    assert.equal(b.phase2, true);
  });

  it('applies full damage to core and half to other parts', () => {
    const world = { audio: { sfx() {} }, addScore() {} };
    const b = makeBoss();
    b.damage('body', 10, world);
    assert.equal(b.core.hp, 95);
    b.damage('core', 10, world);
    assert.equal(b.core.hp, 85);
  });

  it('marks dead and awards killScore when HP hits zero', () => {
    let scored = 0;
    const world = {
      audio: { sfx() {} },
      addScore(n) { scored = n; },
    };
    const b = makeBoss({ killScore: 7777 });
    b.core.hp = 5;
    b.damage('core', 10, world);
    assert.equal(b.dead, true);
    assert.equal(scored, 7777);
  });
});
