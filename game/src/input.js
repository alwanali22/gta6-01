// Keyboard + pointer input. One shared key set; systems ask what is
// held instead of each adding their own listeners.
const held = new Set();
const pressed = new Set();

const KEYMAP = {
  KeyW: "up", ArrowUp: "up",
  KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right",
  ShiftLeft: "run", ShiftRight: "run",
  KeyE: "enter", KeyF: "fire", KeyQ: "wheel",
  KeyR: "radio", KeyM: "map", KeyP: "pause",
  Escape: "pause", Space: "nitro", Enter: "confirm",
};

export function bindInput() {
  window.addEventListener("keydown", (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    if (!e.repeat) pressed.add(name);
    held.add(name);
  });
  window.addEventListener("keyup", (e) => {
    const name = KEYMAP[e.code];
    if (name) held.delete(name);
  });
  window.addEventListener("blur", () => held.clear());
}

export function isHeld(name) {
  return held.has(name);
}

export function wasPressed(name) {
  return pressed.has(name);
}

export function endFrame() {
  pressed.clear();
}

// Steering + throttle in -1..1 from the held keys, for driving and
// for walking on foot. One helper so both modes steer the same way.
export function driveAxis() {
  const steer = (isHeld("left") ? -1 : 0) + (isHeld("right") ? 1 : 0);
  const gas = (isHeld("up") ? 1 : 0) + (isHeld("down") ? -0.6 : 0);
  return { steer, gas };
}
