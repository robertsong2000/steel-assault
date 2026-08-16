// ===================== 测试辅助：浏览器 API 桩 =====================

/** 内存版 localStorage，供 utils.loadNum/saveVal 单测 */
export function installLocalStorageMock(seed = {}) {
  const store = new Map(Object.entries(seed).map(([k, v]) => [k, String(v)]));
  const api = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, val) {
      store.set(key, String(val));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    _store: store,
  };
  globalThis.localStorage = api;
  return api;
}

/** 抛异常的 localStorage（模拟隐私模式） */
export function installThrowingLocalStorage() {
  globalThis.localStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
    clear() { throw new Error('SecurityError'); },
  };
}
