import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setLevel } from '../js/level.js';
import { StormWarden } from '../js/warden.js';

function mockWorld(overrides = {}) {
  const bullets = [];
  return {
    player: { x: 5300, y: 424, w: 26, h: 46, dead: false, inv: 0, shieldT: 0, onGround: true },
    enemies: { bullets, list: [], fireAimed() {}, fireFan() {} },
    particles: { explosion() {}, sparks() {}, text() {}, bigExplosion() {} },
    audio: { sfx() {} },
    addScore() {},
    shake() {},
    killPlayer() {},
    ...overrides,
  };
}

describe('StormWarden (L7 storm city)', () => {
  beforeEach(() => {
    setLevel(6);
  });

  it('starts airborne, hittable, and titled as 风暴守卫', () => {
    const b = new StormWarden();
    assert.equal(b.title, '风暴守卫');
    assert.ok(b.clearText);
    assert.equal(b.dead, false);
    assert.equal(b.done, false);
    assert.ok(b.core.hp > 0);
    assert.ok(b.core.max >= 160, 'late-game boss should be tankier than the volcano titan');
    assert.ok(b.y + b.h < 470, 'warden hovers; it is not a grounded titan clone');
    assert.notEqual(b.state, 'hidden', 'unlike lava beast, warden stays on the field');
    const part = b.hitTest({ x: b.core.x, y: b.core.y, r: 4 });
    assert.equal(part, 'core');
  });

  it('awards killScore and marks dead when core HP hits zero', () => {
    let scored = 0;
    const world = mockWorld({
      addScore(n) { scored = n; },
    });
    const b = new StormWarden();
    b.core.hp = 5;
    b.damage('core', 10, world);
    assert.equal(b.dead, true);
    assert.ok(scored >= 5000);
  });

  it('enters phase2 at half HP and keeps taking hits', () => {
    const b = new StormWarden();
    b.core.hp = b.core.max / 2;
    assert.equal(b.phase2, true);
    assert.equal(b.hitTest({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 4 }), 'body');
  });

  it('drops lightning bolts or energy orbs (distinct from titan magma / heli bombs)', () => {
    const world = mockWorld();
    const b = new StormWarden();
    b.state = 'bolt';
    b.timer = 0;
    b.update(0.016, world);
    const afterBolt = world.enemies.bullets.slice();

    const world2 = mockWorld();
    const b2 = new StormWarden();
    b2.state = 'volley';
    b2.timer = 0;
    b2.update(0.016, world2);
    const afterVolley = world2.enemies.bullets.slice();

    assert.ok(afterBolt.length + afterVolley.length > 0, 'bolt or volley should spawn enemy bullets');
    const kinds = [...afterBolt, ...afterVolley].map((bl) => bl.kind);
    assert.ok(
      kinds.some((k) => k === 'bolt' || k === 'orb'),
      `attacks should be lightning bolts or energy orbs, got ${kinds.join(',')}`,
    );
    assert.ok(
      !kinds.some((k) => k === 'magma' || k === 'wave' || k === 'missile'),
      'warden must not copy titan magma/waves or heli missiles',
    );
  });
});
