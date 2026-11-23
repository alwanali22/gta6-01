// Keyboard and touch, in plain words: held keys steer and drive, single
// presses are queued once so a tap between frames is never lost or doubled.
export const ACT_START = 1;
export const ACT_PAUSE = 2;
export const ACT_HOTWIRE = 4;
export const ACT_HORN = 8;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const HOTWIRE = new Set(['KeyE']);
const NITRO = new Set(['ShiftLeft', 'ShiftRight']);
const START = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function down(event) {
    if (START.has(event.code) && !event.repeat) queued |= ACT_START;
    else if (PAUSE.has(event.code) && !event.repeat) queued |= ACT_PAUSE;
    else if (HOTWIRE.has(event.code) && !event.repeat) queued |= ACT_HOTWIRE;
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || HOTWIRE.has(event.code) || NITRO.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    }
  }
  function up(event) {
    held.delete(event.code);
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', () => { queued |= ACT_START; });

  const has = (set) => [...set].some((k) => held.has(k));
  return {
    forward() { return has(FORWARD) ? 1 : 0; },
    back() { return has(BACK) ? 1 : 0; },
    steer() { return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0); },
    hotwireHeld() { return has(HOTWIRE); },
    nitroHeld() { return has(NITRO); },
    take() { const t = queued; queued = 0; return t; },
  };
}
