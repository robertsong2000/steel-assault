import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorageMock, installThrowingLocalStorage } from './helpers.js';
import {
  DEFAULT_SETTINGS,
  SETTINGS_ROWS,
  VOLUME_KEY,
  SHOOT_KEY,
  JUMP_KEY,
  clampVolume,
  nudgeVolume,
  isBindableCode,
  keyLabel,
  loadSettings,
  saveSettings,
  bindAction,
  applyBindings,
} from '../js/settings.js';
import { Input } from '../js/input.js';
import { AudioSys } from '../js/audio.js';

describe('settings defaults', () => {
  it('exposes volume / shoot / jump rows and defaults', () => {
    assert.deepEqual(SETTINGS_ROWS, ['volume', 'shoot', 'jump']);
    assert.equal(DEFAULT_SETTINGS.volume, 0.45);
    assert.equal(DEFAULT_SETTINGS.shoot, 'KeyF');
    assert.equal(DEFAULT_SETTINGS.jump, 'KeyX');
  });

  it('labels KeyboardEvent.code values for the HUD', () => {
    assert.equal(keyLabel('KeyF'), 'F');
    assert.equal(keyLabel('KeyX'), 'X');
    assert.equal(keyLabel('Space'), 'SPACE');
    assert.equal(keyLabel('Digit1'), '1');
  });
});

describe('volume clamp / nudge', () => {
  it('clamps finite values to [0, 1]', () => {
    assert.equal(clampVolume(0.5), 0.5);
    assert.equal(clampVolume(-0.2), 0);
    assert.equal(clampVolume(1.7), 1);
  });

  it('falls back to default for non-finite values', () => {
    assert.equal(clampVolume(NaN), DEFAULT_SETTINGS.volume);
    assert.equal(clampVolume(Infinity), DEFAULT_SETTINGS.volume);
    assert.equal(clampVolume('loud'), DEFAULT_SETTINGS.volume);
    assert.equal(clampVolume(undefined), DEFAULT_SETTINGS.volume);
  });

  it('nudges volume in 5% steps and stays in range', () => {
    assert.equal(nudgeVolume(0.45, 1), 0.5);
    assert.equal(nudgeVolume(0.45, -1), 0.4);
    assert.equal(nudgeVolume(0, -1), 0);
    assert.equal(nudgeVolume(1, 1), 1);
  });
});

describe('keybind validation', () => {
  it('accepts letters, digits, and Space', () => {
    assert.equal(isBindableCode('KeyJ'), true);
    assert.equal(isBindableCode('KeyZ'), true);
    assert.equal(isBindableCode('Digit2'), true);
    assert.equal(isBindableCode('Space'), true);
  });

  it('rejects reserved / invalid codes so navigation stays intact', () => {
    assert.equal(isBindableCode('Enter'), false);
    assert.equal(isBindableCode('Escape'), false);
    assert.equal(isBindableCode('KeyO'), false);
    assert.equal(isBindableCode('KeyP'), false);
    assert.equal(isBindableCode('KeyM'), false);
    assert.equal(isBindableCode('ArrowLeft'), false);
    assert.equal(isBindableCode('KeyA'), false);
    assert.equal(isBindableCode(''), false);
    assert.equal(isBindableCode('foo'), false);
    assert.equal(isBindableCode(null), false);
    assert.equal(isBindableCode(12), false);
  });
});

describe('settings persistence round-trip', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns defaults when storage is empty', () => {
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
  });

  it('round-trips volume and shoot/jump keys', () => {
    const saved = saveSettings({ volume: 0.7, shoot: 'KeyJ', jump: 'KeyC' });
    assert.equal(saved.volume, 0.7);
    assert.equal(saved.shoot, 'KeyJ');
    assert.equal(saved.jump, 'KeyC');
    assert.equal(localStorage.getItem(VOLUME_KEY), '0.7');
    assert.equal(localStorage.getItem(SHOOT_KEY), 'KeyJ');
    assert.equal(localStorage.getItem(JUMP_KEY), 'KeyC');
    assert.deepEqual(loadSettings(), { volume: 0.7, shoot: 'KeyJ', jump: 'KeyC' });
  });

  it('falls back on illegal stored volume and key codes', () => {
    localStorage.setItem(VOLUME_KEY, 'nope');
    localStorage.setItem(SHOOT_KEY, 'Enter');
    localStorage.setItem(JUMP_KEY, 'not-a-key');
    const s = loadSettings();
    assert.equal(s.volume, DEFAULT_SETTINGS.volume);
    assert.equal(s.shoot, DEFAULT_SETTINGS.shoot);
    assert.equal(s.jump, DEFAULT_SETTINGS.jump);
  });

  it('saveSettings rejects illegal values instead of persisting them', () => {
    saveSettings({ volume: 0.8, shoot: 'KeyJ', jump: 'KeyC' });
    const after = saveSettings({ volume: 'boom', shoot: 'Escape', jump: '' });
    assert.equal(after.volume, 0.8);
    assert.equal(after.shoot, 'KeyJ');
    assert.equal(after.jump, 'KeyC');
    assert.deepEqual(loadSettings(), { volume: 0.8, shoot: 'KeyJ', jump: 'KeyC' });
  });

  it('bindAction writes a valid key and ignores reserved / colliding codes', () => {
    saveSettings({ shoot: 'KeyF', jump: 'KeyX' });
    const ok = bindAction(loadSettings(), 'shoot', 'KeyJ');
    assert.equal(ok.shoot, 'KeyJ');
    assert.equal(loadSettings().shoot, 'KeyJ');

    const reserved = bindAction(loadSettings(), 'jump', 'Enter');
    assert.equal(reserved.jump, 'KeyX');

    const collide = bindAction(loadSettings(), 'jump', 'KeyJ');
    assert.equal(collide.jump, 'KeyX');
  });

  it('does not throw when localStorage is in privacy mode', () => {
    installThrowingLocalStorage();
    assert.doesNotThrow(() => loadSettings());
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS);
    assert.doesNotThrow(() => saveSettings({ volume: 0.2, shoot: 'KeyJ', jump: 'KeyC' }));
  });
});

describe('Input remapping', () => {
  it('constructs without window and honors setBindings for shoot/jump', () => {
    const input = new Input();
    input.down.add('KeyF');
    assert.equal(input.isDown('shoot'), true);
    input.down.delete('KeyF');

    applyBindings(input, { shoot: 'KeyJ', jump: 'KeyC' });
    input.down.add('KeyF');
    assert.equal(input.isDown('shoot'), false, 'old shoot key unbound after remap');
    input.down.delete('KeyF');
    input.down.add('KeyJ');
    assert.equal(input.isDown('shoot'), true);
    input.down.delete('KeyJ');

    input.down.add('KeyX');
    assert.equal(input.isDown('jump'), false, 'old jump key unbound after remap');
    input.down.delete('KeyX');
    input.down.add('KeyC');
    assert.equal(input.isDown('jump'), true);
  });

  it('keeps Space as a jump fallback unless Space itself was remapped away', () => {
    const input = new Input();
    applyBindings(input, { shoot: 'KeyF', jump: 'KeyC' });
    input.down.add('Space');
    assert.equal(input.isDown('jump'), true);
  });

  it('maps Escape / O to the settings action', () => {
    const input = new Input();
    input.pressed.add('Escape');
    assert.equal(input.wasPressed('settings'), true);
    input.pressed.clear();
    input.pressed.add('KeyO');
    assert.equal(input.wasPressed('settings'), true);
  });
});

describe('AudioSys master volume', () => {
  it('stores clamped volume and unmute restores it (no AudioContext required)', () => {
    const audio = new AudioSys();
    assert.equal(audio.setMasterVolume(0.7), 0.7);
    assert.equal(audio.masterVol, 0.7);
    assert.equal(audio.setMasterVolume(2), 1);
    assert.equal(audio.setMasterVolume(NaN), DEFAULT_SETTINGS.volume);

    audio.setMasterVolume(0.3);
    audio.master = { gain: { value: 0.3 } };
    audio.toggleMute();
    assert.equal(audio.muted, true);
    assert.equal(audio.master.gain.value, 0);
    audio.toggleMute();
    assert.equal(audio.muted, false);
    assert.equal(audio.master.gain.value, 0.3);
  });
});
