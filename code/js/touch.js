import { ACTION_KEYS } from './input.js';
// ===================== 移动端虚拟按键（触屏设备自动启用） =====================
// 左下十字键移动/瞄准/蹲，右下 跳/射，右上 暂停/金手指
export function setupTouch(input) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  document.body.classList.add('touch');

  const pad = document.createElement('div');
  pad.id = 'touchpad';
  document.body.appendChild(pad);

  // [label, { code | action }, 位置类名]
  const BTNS = [
    ['◀', { code: 'ArrowLeft' }, 'dpad-l'],
    ['▶', { code: 'ArrowRight' }, 'dpad-r'],
    ['▲', { code: 'ArrowUp' }, 'dpad-u'],
    ['▼', { code: 'ArrowDown' }, 'dpad-d'],
    ['跳', { action: 'jump' }, 'act-jump'],
    ['射', { action: 'shoot' }, 'act-fire'],
    ['⏸', { code: 'Enter' }, 'sys-pause'],
    ['30', { code: 'Digit9' }, 'sys-cheat'],
  ];

  for (const [label, spec, cls] of BTNS) {
    const el = document.createElement('div');
    el.className = `tbtn ${cls}`;
    el.textContent = label;
    const resolve = () => spec.code || ACTION_KEYS[spec.action]?.[0];
    const down = (e) => {
      e.preventDefault();
      if (e.pointerId !== undefined) el.setPointerCapture?.(e.pointerId);
      el.classList.add('on');
      const code = resolve();
      if (code) input.virtualDown(code);
    };
    const up = (e) => {
      e.preventDefault();
      if (e.pointerId !== undefined && el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.classList.remove('on');
      const code = resolve();
      if (code) input.virtualUp(code);
    };
    // Pointer Events 覆盖触控、鼠标和触控笔，并保留多点触控的独立 pointerId。
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointerup', up, { passive: false });
    el.addEventListener('pointercancel', up, { passive: false });
    el.addEventListener('lostpointercapture', up, { passive: false });
    pad.appendChild(el);
  }

  // 页面失焦时清空，防止按键卡住
  window.addEventListener('blur', () => {
    input.virtualClear();
    pad.querySelectorAll('.tbtn.on').forEach((el) => el.classList.remove('on'));
  });
}
