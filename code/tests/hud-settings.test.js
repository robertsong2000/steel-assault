import { it } from 'node:test';
import assert from 'node:assert/strict';
import { drawSettings } from '../js/hud.js';
import { setAccessibility } from '../js/utils.js';
import { CFG } from '../js/config.js';

for (const textScale of [1, 1.25]) {
  it(`keeps settings rows separate and inside the canvas at ${textScale * 100}% text`, () => {
    const labels = [];
    const ctx = new Proxy({
      fillText(label, x, y) {
        const height = Number(this.font.match(/(\d+)px/)[1]);
        labels.push({ label, top: this.textBaseline === 'middle' ? y - height / 2 : y, height });
      },
      createLinearGradient: () => ({ addColorStop() {} }),
    }, {
      get: (target, key) => key in target ? target[key] : () => {},
    });
    setAccessibility({ textScale });
    try {
      drawSettings(ctx, {
        time: 0, settings: { sel: 2, capture: null },
        audio: { volMaster: 0, volSfx: 0.4, volBgm: 0.4 },
        accessibility: { shake: true, flashes: true, particles: 'high', textScale, contrast: false },
      });
      const rows = [...new Set(labels.map(({ top }) => top))].sort((a, b) => a - b);
      for (let i = 0; i < rows.length; i++) {
        const bottom = Math.max(...labels.filter(({ top }) => top === rows[i]).map(({ top, height }) => top + height));
        assert.ok(rows[i] >= 0 && bottom <= CFG.H, `row at ${rows[i]} is outside the canvas`);
        if (i + 1 < rows.length) assert.ok(bottom + 3 <= rows[i + 1], `rows at ${rows[i]} and ${rows[i + 1]} overlap`);
      }
      assert.ok(labels.some(({ label }) => label.includes('BGM')));
      assert.ok(labels.some(({ label }) => label.includes('屏幕震动')));
    } finally {
      setAccessibility({ textScale: 1 });
    }
  });
}
