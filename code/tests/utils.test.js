import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorageMock, installThrowingLocalStorage } from './helpers.js';
import { loadNum, saveVal, loadSave, clamp, overlap, circleRect } from '../js/utils.js';

describe('utils.loadSave audio migration', () => {
  beforeEach(() => installLocalStorageMock());

  it('starts with audible defaults and persists them on first launch', () => {
    assert.deepEqual(loadSave().audio, { master: 100, sfx: 100, bgm: 100 });
    assert.deepEqual(loadSave().audio, { master: 100, sfx: 100, bgm: 100 });
  });

  it('preserves legacy volumes including an intentional zero', () => {
    localStorage.setItem('steel_assault_vol_master', '0');
    localStorage.setItem('steel_assault_vol_sfx', '40');
    assert.deepEqual(loadSave().audio, { master: 0, sfx: 40, bgm: 100 });
  });

  it('uses audible defaults when storage is unavailable', () => {
    installThrowingLocalStorage();
    assert.deepEqual(loadSave().audio, { master: 100, sfx: 100, bgm: 100 });
  });

  it('preserves existing save volume preferences', () => {
    localStorage.setItem('steel_assault_save', JSON.stringify({
      version: 1, audio: { master: 0, sfx: 0, bgm: 0 },
    }));
    assert.deepEqual(loadSave().audio, { master: 0, sfx: 0, bgm: 0 });
  });
});

describe('utils.loadNum / saveVal', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns fallback when key missing', () => {
    assert.equal(loadNum('missing', 42), 42);
  });

  it('parses finite numbers', () => {
    saveVal('steel_assault_hi', 1234);
    assert.equal(loadNum('steel_assault_hi', 0), 1234);
  });

  it('rejects NaN / non-numeric and returns fallback', () => {
    localStorage.setItem('steel_assault_diff', 'not-a-number');
    assert.equal(loadNum('steel_assault_diff', 1), 1);
    localStorage.setItem('steel_assault_hi', 'Infinity');
    assert.equal(loadNum('steel_assault_hi', 0), 0);
  });

  it('survives privacy-mode throws on read/write', () => {
    installThrowingLocalStorage();
    assert.equal(loadNum('steel_assault_hi', 7), 7);
    assert.doesNotThrow(() => saveVal('steel_assault_hi', 99));
  });
});

describe('utils geometry', () => {
  it('clamp bounds values', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(11, 0, 10), 10);
  });

  it('overlap detects AABB intersection', () => {
    assert.equal(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), true);
    assert.equal(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 }), false);
  });

  it('circleRect detects circle-AABB hit', () => {
    assert.equal(circleRect(5, 5, 3, { x: 0, y: 0, w: 10, h: 10 }), true);
    assert.equal(circleRect(50, 50, 2, { x: 0, y: 0, w: 10, h: 10 }), false);
  });
});
