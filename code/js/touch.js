// ===================== 移动端虚拟按键（触屏设备自动启用） =====================
// 左下十字键移动/瞄准/蹲，右下 跳/射，右上 暂停/金手指
export function setupTouch(input) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  document.body.classList.add('touch');

  const pad = document.createElement('div');
  pad.id = 'touchpad';
  document.body.appendChild(pad);

  // [label, keyCode, 位置类名]
  const BTNS = [
    ['◀', 'ArrowLeft', 'dpad-l'],
    ['▶', 'ArrowRight', 'dpad-r'],
    ['▲', 'ArrowUp', 'dpad-u'],
    ['▼', 'ArrowDown', 'dpad-d'],
    ['跳', 'KeyX', 'act-jump'],
    ['射', 'KeyF', 'act-fire'],
    ['⏸', 'Enter', 'sys-pause'],
    ['30', 'Digit9', 'sys-cheat'],
  ];

  for (const [label, code, cls] of BTNS) {
    const el = document.createElement('div');
    el.className = `tbtn ${cls}`;
    el.textContent = label;
    const down = (e) => {
      e.preventDefault();
      el.classList.add('on');
      input.virtualDown(code);
    };
    const up = (e) => {
      e.preventDefault();
      el.classList.remove('on');
      input.virtualUp(code);
    };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    pad.appendChild(el);
  }

  // 页面失焦时清空，防止按键卡住
  window.addEventListener('blur', () => input.virtualClear());
}
