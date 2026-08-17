import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVEL, LEVELS, setLevel } from '../js/level.js';
import { FILES } from '../js/assets.js';
import { loadNum, saveVal, loadSave, saveGame, resetGameSave } from '../js/utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const codeRoot = path.resolve(here, '..');

for (const [name, src] of Object.entries(FILES)) {
  assert.ok(fs.existsSync(path.join(codeRoot, src)), `missing asset: ${name} -> ${src}`);
}

// 8×8 关卡切换矩阵：可选字段不能残留，动态地形必须是新的对象。
for (let from = 0; from < LEVELS.length; from++) {
  setLevel(from);
  LEVEL.solids[0].testMutation = from;
  LEVEL.oneways[0].gone = true;
  for (let to = 0; to < LEVELS.length; to++) {
    setLevel(to);
    assert.deepEqual(Object.keys(LEVEL).sort(), Object.keys(LEVELS[to]).sort(), `level fields leaked: ${from} -> ${to}`);
    assert.notEqual(LEVEL.solids, LEVELS[to].solids, `solids shared: ${from} -> ${to}`);
    assert.notEqual(LEVEL.oneways, LEVELS[to].oneways, `oneways shared: ${from} -> ${to}`);
    assert.equal(LEVEL.solids[0].testMutation, undefined, `solid state leaked: ${from} -> ${to}`);
    assert.equal(LEVEL.oneways[0].gone, undefined, `platform state leaked: ${from} -> ${to}`);
  }
}

// 无 localStorage 的 Node 环境也必须安全回退，写入失败不能抛错。
assert.equal(loadNum('__missing_test_value__', 17), 17);
assert.doesNotThrow(() => saveVal('__steel_assault_test__', 1));

// 旧版分散存档应迁移进版本化对象，损坏字段回退默认值。
const memoryStore = new Map([
  ['steel_assault_hi', '1234'], ['steel_assault_diff', '2'], ['steel_assault_unlocked', '3'],
  ['steel_assault_vol_master', '80'], ['steel_assault_vol_sfx', '70'], ['steel_assault_vol_bgm', '60'],
  ['steel_assault_keys', JSON.stringify({ shoot: ['KeyZ'] })],
]);
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => memoryStore.set(key, String(value)),
};
const migrated = loadSave();
assert.equal(migrated.hi, 1234);
assert.equal(migrated.difficulty, 2);
assert.equal(migrated.unlocked, 3);
assert.equal(migrated.audio.master, 80);
assert.deepEqual(migrated.keybinds.shoot, ['KeyZ']);
saveGame((save) => { save.unlocked = 5; });
assert.equal(loadSave().unlocked, 5);
assert.equal(resetGameSave().unlocked, 0);
delete globalThis.localStorage;

assert.equal(LEVELS.length, 8);
setLevel(0);
console.log(`verify: ${Object.keys(FILES).length} assets, ${LEVELS.length} levels, 8x8 state isolation OK`);
