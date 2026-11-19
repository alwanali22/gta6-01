// input.js — keyboard state with edge detection + an inject() hook the
// probes and the later sim use to drive the game without a keyboard.
export const ACTIONS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  nitro: ['ShiftLeft', 'ShiftRight'],
  brake: ['Space'],
  interact: ['KeyE'],
  pause: ['KeyP', 'Escape'],
  shop: ['KeyB'],
  radio: ['KeyR'],
  fire: ['KeyF'],
  wheel: ['KeyQ'],
  mute: ['KeyM'],
  one: ['Digit1'],
  two: ['Digit2'],
  three: ['Digit3'],
  four: ['Digit4'],
};

const CODE_TO_ACTION = {};
for (const [action, codes] of Object.entries(ACTIONS)) {
  for (const code of codes) CODE_TO_ACTION[code] = action;
}

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  let attached = null;

  const api = {
    attach(el) {
      if (attached) return;
      attached = el;
      el.addEventListener('keydown', onKey(true));
      el.addEventListener('keyup', onKey(false));
      el.addEventListener('blur', () => { held.clear(); pressed.clear(); });
    },
    detach() {
      if (!attached) return;
      attached.removeEventListener('keydown', onKey(true));
      attached.removeEventListener('keyup', onKey(false));
      attached = null;
    },
    // Probe/sim hook: pretend a key went down/up this frame.
    inject(code, down = true) {
      const action = CODE_TO_ACTION[code];
      if (!action) return;
      if (down) { if (!held.has(action)) pressed.add(action); held.add(action); }
      else held.delete(action);
    },
    held(action) { return held.has(action); },
    tapped(action) { return pressed.has(action); },
    axis() {
      let x = 0, y = 0;
      if (held.has('left')) x -= 1;
      if (held.has('right')) x += 1;
      if (held.has('up')) y -= 1;
      if (held.has('down')) y += 1;
      return { x, y };
    },
    endFrame() { pressed.clear(); },
    snapshot() { return [...held].sort(); },
  };

  function onKey(down) {
    return (ev) => {
      const action = CODE_TO_ACTION[ev.code];
      if (!action) return;
      ev.preventDefault();
      if (down) { if (!held.has(action)) pressed.add(action); held.add(action); }
      else held.delete(action);
    };
  }

  return api;
}
