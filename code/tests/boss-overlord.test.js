import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setLevel } from '../js/level.js';
import { CoreOverlord } from '../js/overlord.js';

function mockWorld(overrides = {}) {
  const bullets = [];
  return {
    player: { x: 5400, y: 424, w: 26, h: 46, dead: false, inv: 0, shieldT: 0, onGround: true },
    enemies: { bullets, list: [], fireAimed() {}, fireFan() {} },
    particles: { explosion() {}, sparks() {}, text() {}, bigExplosion() {} },
    audio: { sfx() {} },
    addScore() {},
    shake() {},
    killPlayer() {},
    ...overrides,
  };
}

describe('CoreOverlord (L8 citadel)', () => {
  beforeEach(() => {
    setLevel(7);
  });

  it('starts hovering, hittable, and titled as 核心主宰', () => {
    const b = new CoreOverlord();
    assert.equal(b.title, '核心主宰');
    assert.ok(b.clearText);
    assert.equal(b.dead, false);
    assert.equal(b.done, false);
    assert.ok(b.core.hp > 0);
    assert.ok(b.core.max >= 175, 'finale boss should be tankier than the storm warden');
    assert.ok(b.y + b.h < 470, 'overlord hovers; it is not a grounded titan clone');
    assert.notEqual(b.state, 'hidden', 'unlike lava beast, overlord stays on the field');
    assert.notEqual(b.state, 'dash', 'overlord blinks; it is not a warden dash clone');
    const part = b.hitTest({ x: b.core.x, y: b.core.y, r: 4 });
    assert.equal(part, 'core');
  });

  it('awards killScore and marks dead when core HP hits zero', () => {
    let scored = 0;
    const world = mockWorld({
      addScore(n) { scored = n; },
    });
    const b = new CoreOverlord();
    b.core.hp = 5;
    b.damage('core', 10, world);
    assert.equal(b.dead, true);
    assert.ok(scored >= 5000);
  });

  it('enters phase2 at half HP and keeps taking hits', () => {
    const b = new CoreOverlord();
    b.core.hp = b.core.max / 2;
    assert.equal(b.phase2, true);
    assert.equal(b.hitTest({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 4 }), 'body');
  });

  it('fires horizontal beams or radial shards (distinct from warden bolt/orb and titan magma)', () => {
    const world = mockWorld();
    const b = new CoreOverlord();
    b.state = 'beam';
    b.timer = 0;
    b.update(0.016, world);
    const afterBeam = world.enemies.bullets.slice();

    const world2 = mockWorld();
    const b2 = new CoreOverlord();
    b2.state = 'ring';
    b2.timer = 0;
    b2.update(0.016, world2);
    const afterRing = world2.enemies.bullets.slice();

    assert.ok(afterBeam.length + afterRing.length > 0, 'beam or ring should spawn enemy bullets');
    const kinds = [...afterBeam, ...afterRing].map((bl) => bl.kind);
    assert.ok(
      kinds.some((k) => k === 'beam' || k === 'shard'),
      `attacks should be citadel beams or radial shards, got ${kinds.join(',')}`,
    );
    assert.ok(
      !kinds.some((k) => k === 'bolt' || k === 'orb' || k === 'magma' || k === 'wave' || k === 'missile'),
      'overlord must not copy warden bolts/orbs, titan magma/waves, or heli missiles',
    );
  });

  it('blinks to a new x instead of dashing through the arena', () => {
    const world = mockWorld();
    const b = new CoreOverlord();
    const startX = b.x;
    b.state = 'blink';
    b.timer = 0;
    b.update(0.016, world);
    assert.notEqual(b.x, startX, 'blink should teleport rather than slide');
    assert.ok(Math.abs(b.x - startX) > 80, 'blink displacement should be a teleport hop');
  });
});
