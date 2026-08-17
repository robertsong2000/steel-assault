import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMEPAD_DEADZONE,
  axisToDir,
  readGamepadActions,
  pickGamepad,
  Input,
} from '../js/input.js';

function btn(pressed, value = pressed ? 1 : 0) {
  return { pressed: !!pressed, value };
}

/** Standard-mapping pad with 16 buttons + 4 axes, disconnected slots allowed. */
function fakePad({
  connected = true,
  axes = [0, 0, 0, 0],
  pressed = [],
  values = {},
} = {}) {
  const buttons = Array.from({ length: 16 }, (_, i) => btn(pressed.includes(i), values[i]));
  return { connected, mapping: 'standard', axes, buttons };
}

describe('axisToDir deadzone', () => {
  it('exports a positive deadzone below 0.5', () => {
    assert.ok(GAMEPAD_DEADZONE > 0 && GAMEPAD_DEADZONE < 0.5);
  });

  it('returns 0 inside the deadzone (including the boundary)', () => {
    assert.equal(axisToDir(0), 0);
    assert.equal(axisToDir(GAMEPAD_DEADZONE), 0);
    assert.equal(axisToDir(-GAMEPAD_DEADZONE), 0);
    assert.equal(axisToDir(GAMEPAD_DEADZONE * 0.5), 0);
  });

  it('returns +1 / -1 outside the deadzone', () => {
    assert.equal(axisToDir(GAMEPAD_DEADZONE + 0.01), 1);
    assert.equal(axisToDir(-(GAMEPAD_DEADZONE + 0.01)), -1);
    assert.equal(axisToDir(1), 1);
    assert.equal(axisToDir(-1), -1);
  });

  it('treats NaN / non-finite as 0', () => {
    assert.equal(axisToDir(NaN), 0);
    assert.equal(axisToDir(Infinity), 0);
    assert.equal(axisToDir(undefined), 0);
  });
});

describe('readGamepadActions mapping', () => {
  it('returns all-false for null, disconnected, or empty pads', () => {
    for (const gp of [null, undefined, fakePad({ connected: false }), { connected: true }]) {
      const a = readGamepadActions(gp);
      for (const k of ['left', 'right', 'up', 'down', 'jump', 'shoot', 'start']) {
        assert.equal(a[k], false, `${k} should be false`);
      }
    }
  });

  it('maps left stick X/Y past deadzone to move/aim', () => {
    assert.equal(readGamepadActions(fakePad({ axes: [0.9, 0, 0, 0] })).right, true);
    assert.equal(readGamepadActions(fakePad({ axes: [-0.9, 0, 0, 0] })).left, true);
    assert.equal(readGamepadActions(fakePad({ axes: [0, -0.9, 0, 0] })).up, true);
    assert.equal(readGamepadActions(fakePad({ axes: [0, 0.9, 0, 0] })).down, true);
  });

  it('ignores stick noise inside the deadzone', () => {
    const a = readGamepadActions(fakePad({ axes: [0.1, -0.1, 0, 0] }));
    assert.equal(a.left, false);
    assert.equal(a.right, false);
    assert.equal(a.up, false);
    assert.equal(a.down, false);
  });

  it('maps d-pad buttons 12–15', () => {
    assert.equal(readGamepadActions(fakePad({ pressed: [12] })).up, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [13] })).down, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [14] })).left, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [15] })).right, true);
  });

  it('maps A (0) to jump, X (2) / RB (5) / RT (7) to shoot, Start (9) to start', () => {
    assert.equal(readGamepadActions(fakePad({ pressed: [0] })).jump, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [2] })).shoot, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [5] })).shoot, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [7] })).shoot, true);
    assert.equal(readGamepadActions(fakePad({ pressed: [9] })).start, true);
  });

  it('treats analog RT value >= 0.5 as shoot even if pressed is false', () => {
    const a = readGamepadActions(fakePad({ values: { 7: 0.8 } }));
    assert.equal(a.shoot, true);
    const idle = readGamepadActions(fakePad({ values: { 7: 0.2 } }));
    assert.equal(idle.shoot, false);
  });
});

describe('pickGamepad', () => {
  it('skips null slots and disconnected pads', () => {
    const live = fakePad();
    assert.equal(pickGamepad([null, fakePad({ connected: false }), live]), live);
    assert.equal(pickGamepad(null), null);
    assert.equal(pickGamepad([]), null);
  });
});

describe('Input.pollGamepad edge detection', () => {
  let input;

  beforeEach(() => {
    input = new Input();
  });

  it('does nothing when no pads are connected (keyboard path stays clean)', () => {
    input.pollGamepad([]);
    assert.equal(input.isDown('left'), false);
    assert.equal(input.wasPressed('start'), false);
    input.down.add('ArrowLeft');
    assert.equal(input.isDown('left'), true, 'keyboard still works without a pad');
  });

  it('exposes move / jump / shoot / start while held, wasPressed only on the rising edge', () => {
    const pad = fakePad({ pressed: [0, 2, 9, 15] });
    input.pollGamepad([pad]);
    assert.equal(input.isDown('right'), true);
    assert.equal(input.isDown('jump'), true);
    assert.equal(input.isDown('shoot'), true);
    assert.equal(input.isDown('start'), true);
    assert.equal(input.wasPressed('right'), true);
    assert.equal(input.wasPressed('jump'), true);
    assert.equal(input.wasPressed('shoot'), true);
    assert.equal(input.wasPressed('start'), true);

    input.endFrame();
    input.pollGamepad([pad]);
    assert.equal(input.isDown('jump'), true);
    assert.equal(input.wasPressed('jump'), false);
    assert.equal(input.wasPressed('start'), false);
  });

  it('title-screen d-pad left/right/up/down fire wasPressed for level & difficulty', () => {
    input.pollGamepad([fakePad({ pressed: [14] })]);
    assert.equal(input.wasPressed('left'), true);
    input.endFrame();
    input.pollGamepad([fakePad({ pressed: [15] })]);
    assert.equal(input.wasPressed('right'), true);
    input.endFrame();
    input.pollGamepad([fakePad({ pressed: [12] })]);
    assert.equal(input.wasPressed('up'), true);
    input.endFrame();
    input.pollGamepad([fakePad({ pressed: [13] })]);
    assert.equal(input.wasPressed('down'), true);
  });

  it('releases actions when the pad disconnects', () => {
    input.pollGamepad([fakePad({ pressed: [0] })]);
    assert.equal(input.isDown('jump'), true);
    input.endFrame();
    input.pollGamepad([null]);
    assert.equal(input.isDown('jump'), false);
    assert.equal(input.wasPressed('jump'), false);
  });
});
