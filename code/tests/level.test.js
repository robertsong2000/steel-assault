import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL, setLevel, groundTopAt } from '../js/level.js';
import { CFG } from '../js/config.js';

describe('setLevel isolation', () => {
  it('exposes exactly 8 campaign levels', () => {
    assert.equal(LEVELS.length, 8);
    assert.match(LEVELS[5].name, /第6关/);
    assert.equal(LEVELS[5].boss, 'titan');
    assert.equal(LEVELS[5].theme, 'volcano');
    assert.match(LEVELS[6].name, /第7关/);
    assert.equal(LEVELS[6].boss, 'warden');
    assert.equal(LEVELS[6].theme, 'storm');
    assert.match(LEVELS[7].name, /第8关/);
    assert.equal(LEVELS[7].boss, 'overlord');
    assert.equal(LEVELS[7].theme, 'citadel');
  });

  it('clears optional keys when switching from desert back to jungle', () => {
    setLevel(4); // 遗迹：含 sandworms / ebulletMul / winds 等可选字段
    assert.ok(LEVEL.sandworms?.length > 0);
    assert.equal(LEVEL.ebulletMul, 1.15);

    setLevel(0); // 丛林：不应残留上一关可选键
    assert.equal(LEVEL.sandworms, undefined);
    assert.equal(LEVEL.ebulletMul, undefined);
    assert.equal(LEVEL.lasers, undefined);
    assert.equal(LEVEL.winds, undefined);
    assert.equal(LEVEL.theme, 'jungle');
    assert.equal(LEVEL.boss, 'fortress');
  });

  it('syncs CFG boundaries from the active level def', () => {
    setLevel(3);
    const lv = LEVELS[3];
    assert.equal(CFG.LEVEL_W, lv.width);
    assert.equal(CFG.ARENA_WALL_X, lv.wallX);
    assert.equal(CFG.BOSS_TRIGGER_X, lv.bossTriggerX);
  });

  it('isolates volcano (L6) keys when switching back to jungle', () => {
    setLevel(5);
    assert.equal(LEVEL.theme, 'volcano');
    assert.equal(LEVEL.boss, 'titan');
    assert.ok(LEVEL.ebulletMul > 1.15, 'L6 should press harder than desert 1.15');
    assert.ok(LEVEL.width >= 5600);
    assert.ok(LEVEL.triggers.length > 0, 'L6 must not be an empty stage');

    setLevel(0);
    assert.equal(LEVEL.theme, 'jungle');
    assert.equal(LEVEL.boss, 'fortress');
    assert.equal(LEVEL.ebulletMul, undefined);
    assert.equal(LEVEL.sandworms, undefined);
    assert.equal(LEVEL.lasers, undefined);
    assert.equal(LEVEL.winds, undefined);
  });

  it('syncs CFG boundaries from the volcano level def', () => {
    setLevel(5);
    const lv = LEVELS[5];
    assert.equal(CFG.LEVEL_W, lv.width);
    assert.equal(CFG.ARENA_WALL_X, lv.wallX);
    assert.equal(CFG.BOSS_TRIGGER_X, lv.bossTriggerX);
  });

  it('isolates storm (L7) keys when switching back to jungle', () => {
    setLevel(6);
    assert.equal(LEVEL.theme, 'storm');
    assert.equal(LEVEL.boss, 'warden');
    assert.ok(LEVEL.ebulletMul > 1.2, 'L7 should press harder than volcano 1.2');
    assert.ok(LEVEL.width >= 5600);
    assert.ok(LEVEL.triggers.length > 0, 'L7 must not be an empty stage');
    assert.ok((LEVEL.lasers || []).length > 0, 'storm city should reuse electric gates');
    assert.ok((LEVEL.winds || []).length > 0, 'storm city should have gusts');

    setLevel(0);
    assert.equal(LEVEL.theme, 'jungle');
    assert.equal(LEVEL.boss, 'fortress');
    assert.equal(LEVEL.ebulletMul, undefined);
    assert.equal(LEVEL.lasers, undefined);
    assert.equal(LEVEL.winds, undefined);
    assert.equal(LEVEL.sandworms, undefined);
  });

  it('syncs CFG boundaries from the storm level def', () => {
    setLevel(6);
    const lv = LEVELS[6];
    assert.equal(CFG.LEVEL_W, lv.width);
    assert.equal(CFG.ARENA_WALL_X, lv.wallX);
    assert.equal(CFG.BOSS_TRIGGER_X, lv.bossTriggerX);
  });

  it('isolates citadel (L8) keys when switching back to jungle', () => {
    setLevel(7);
    assert.equal(LEVEL.theme, 'citadel');
    assert.equal(LEVEL.boss, 'overlord');
    assert.ok(LEVEL.ebulletMul > 1.25, 'L8 should press harder than storm 1.25');
    assert.ok(LEVEL.width >= 5600);
    assert.ok(LEVEL.triggers.length > 0, 'L8 must not be an empty stage');
    assert.ok((LEVEL.lasers || []).length > 0, 'citadel should have energy gates');
    assert.ok((LEVEL.oneways || []).some((p) => p.move), 'citadel should have floating lifts');

    setLevel(0);
    assert.equal(LEVEL.theme, 'jungle');
    assert.equal(LEVEL.boss, 'fortress');
    assert.equal(LEVEL.ebulletMul, undefined);
    assert.equal(LEVEL.lasers, undefined);
    assert.equal(LEVEL.winds, undefined);
    assert.equal(LEVEL.sandworms, undefined);
  });

  it('syncs CFG boundaries from the citadel level def', () => {
    setLevel(7);
    const lv = LEVELS[7];
    assert.equal(CFG.LEVEL_W, lv.width);
    assert.equal(CFG.ARENA_WALL_X, lv.wallX);
    assert.equal(CFG.BOSS_TRIGGER_X, lv.bossTriggerX);
  });

  it('deep-copies solids so runtime mutations do not leak across restarts', () => {
    setLevel(3);
    const before = LEVEL.oneways.find((p) => p.kind === 'crumble');
    assert.ok(before, 'level 4 should have crumble platforms');
    before.gone = true;
    before.goneT = 3.5;

    setLevel(3);
    const after = LEVEL.oneways.find((p) => p.kind === 'crumble' && p.x === before.x);
    assert.ok(after);
    assert.equal(after.gone, undefined);
    assert.equal(after.goneT, undefined);
  });
});

describe('groundTopAt safe mode', () => {
  it('skips gone crumble platforms and quicksand when safe=true', () => {
    setLevel(3); // 战舰：塌陷平台
    const crumb = LEVEL.oneways.find((p) => p.kind === 'crumble');
    assert.ok(crumb);
    const x = crumb.x + crumb.w / 2;
    const normal = groundTopAt(x);
    assert.equal(normal, crumb.y);

    crumb.gone = true;
    const safe = groundTopAt(x, { safe: true });
    // 安全模式不得再把已塌落平台当作落脚点
    assert.notEqual(safe, crumb.y);

    // 流沙：在坑洞上空注入 quicksand，验证 safe 跳过且无其它落脚点
    setLevel(0);
    const sandX = 1220; // 丛林第一段水面坑
    LEVEL.oneways.push({ x: sandX, y: 400, w: 60, h: 16, kind: 'quicksand' });
    assert.equal(groundTopAt(sandX + 30), 400);
    assert.equal(groundTopAt(sandX + 30, { safe: true }), null);
  });
});
