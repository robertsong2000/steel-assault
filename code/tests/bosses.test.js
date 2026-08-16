import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_CLASSES } from '../js/bosses.js';
import { LEVELS } from '../js/level.js';

describe('BOSS_CLASSES registry', () => {
  it('registers a constructable class for every campaign boss id', () => {
    assert.equal(typeof BOSS_CLASSES, 'object');
    for (const lv of LEVELS) {
      const Cls = BOSS_CLASSES[lv.boss];
      assert.equal(typeof Cls, 'function', `${lv.name} boss "${lv.boss}" missing from BOSS_CLASSES`);
    }
  });

  it('maps L6 titan to a distinct class from fortress / beast', () => {
    assert.equal(typeof BOSS_CLASSES.titan, 'function');
    assert.notEqual(BOSS_CLASSES.titan, BOSS_CLASSES.fortress);
    assert.notEqual(BOSS_CLASSES.titan, BOSS_CLASSES.beast);
    assert.equal(LEVELS[5].boss, 'titan');
  });

  it('maps L7 warden to a distinct class from titan / heli / mech', () => {
    assert.equal(typeof BOSS_CLASSES.warden, 'function');
    assert.notEqual(BOSS_CLASSES.warden, BOSS_CLASSES.titan);
    assert.notEqual(BOSS_CLASSES.warden, BOSS_CLASSES.heli);
    assert.notEqual(BOSS_CLASSES.warden, BOSS_CLASSES.mech);
    assert.equal(LEVELS[6].boss, 'warden');
  });
});
