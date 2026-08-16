import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setLevel } from '../js/level.js';
import { TitanBoss } from '../js/titan.js';

function mockWorld(overrides = {}) {
  const bullets = [];
  return {
    player: { x: 5000, y: 424, w: 26, h: 46, dead: false, inv: 0, shieldT: 0, onGround: true },
    enemies: { bullets, list: [], fireAimed() {}, fireFan() {} },
    particles: { explosion() {}, sparks() {}, text() {}, bigExplosion() {} },
    audio: { sfx() {} },
    addScore() {},
    shake() {},
    killPlayer() {},
    ...overrides,
  };
}

describe('TitanBoss (L6 volcano)', () => {
  beforeEach(() => {
    setLevel(5);
  });

  it('starts grounded, hittable, and titled as 火山泰坦', () => {
    const b = new TitanBoss();
    assert.equal(b.title, '火山泰坦');
    assert.ok(b.clearText);
    assert.equal(b.dead, false);
    assert.equal(b.done, false);
    assert.ok(b.core.hp > 0);
    assert.ok(b.core.max >= 140, 'late-game boss should be at least as tanky as the lava beast');
    assert.notEqual(b.state, 'hidden', 'unlike lava beast, titan stays on the field');
    const part = b.hitTest({ x: b.core.x, y: b.core.y, r: 4 });
    assert.equal(part, 'core');
  });

  it('awards killScore and marks dead when core HP hits zero', () => {
    let scored = 0;
    const world = mockWorld({
      addScore(n) { scored = n; },
    });
    const b = new TitanBoss();
    b.core.hp = 5;
    b.damage('core', 10, world);
    assert.equal(b.dead, true);
    assert.ok(scored >= 5000);
  });

  it('enters phase2 at half HP and keeps taking hits', () => {
    const b = new TitanBoss();
    b.core.hp = b.core.max / 2;
    assert.equal(b.phase2, true);
    assert.equal(b.hitTest({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 4 }), 'body');
  });

  it('lobs magma or slams a shockwave during update (distinct from hide/rise beast)', () => {
    const world = mockWorld();
    const b = new TitanBoss();
    b.state = 'lob';
    b.timer = 0;
    b.update(0.016, world);
    const afterLob = world.enemies.bullets.length;

    const world2 = mockWorld();
    const b2 = new TitanBoss();
    b2.state = 'slam';
    b2.timer = 0;
    b2.update(0.016, world2);
    const afterSlam = world2.enemies.bullets.length;

    assert.ok(afterLob + afterSlam > 0, 'lob or slam should spawn enemy bullets');
    assert.ok(
      world.enemies.bullets.some((bl) => bl.grav > 0 || bl.kind === 'fire' || bl.kind === 'magma')
        || world2.enemies.bullets.some((bl) => bl.kind === 'wave'),
      'attacks should be magma lobs (grav) or shockwaves, not a copy of the lava-beast hide cycle',
    );
  });
});
