// pedestrians.js — walkers flee the player. Pure function of
// (state, x, z, time): no state of its own, so render.js stays the owner
// of the pedestrian meshes and a screenshot stays reproducible.
export function pedOffset(state, x, z, time) {
  const dx = x - state.player.x, dz = z - state.player.z;
  const d = Math.hypot(dx, dz);
  const scared = state.heat >= 2 || (time - (state.shotsAt || 0) < 3);
  if (!scared || d > 25 || d < 0.01) return { x: 0, z: 0 };
  const f = (1 - d / 25) * 9;
  return { x: (dx / d) * f, z: (dz / d) * f };
}
