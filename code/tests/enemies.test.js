import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../js/config.js';
import { setLevel } from '../js/level.js';
import { ebSpeed } from '../js/enemies.js';

describe('ebSpeed difficulty / level multipliers', () => {
  beforeEach(() => {
    setLevel(0);
    CFG.DIFF_MUL = 1;
  });

  it('returns base when no multipliers apply', () => {
    assert.equal(ebSpeed(250), 250);
  });

  it('applies difficulty multiplier', () => {
    CFG.DIFF_MUL = 1.2;
    assert.equal(ebSpeed(250), 300);
  });

  it('applies level ebulletMul (desert 1.15) on top of difficulty', () => {
    setLevel(4);
    CFG.DIFF_MUL = 1.2;
    assert.equal(ebSpeed(200), 200 * 1.15 * 1.2);
  });

  it('does not leak desert mul after switching back to jungle', () => {
    setLevel(4);
    CFG.DIFF_MUL = 1;
    assert.ok(ebSpeed(100) > 100);
    setLevel(0);
    assert.equal(ebSpeed(100), 100);
  });
});
