// SOLMAR: SUNSET GETAWAY — one source of truth for the whole game.
// World, districts, cars, perks, missions, gigs, economy, police,
// weapons, radio, respect, player and camera. Later chunks read only
// this file for numbers; no system keeps a private copy of a value.
export const CONFIG = {
  title: "SOLMAR: SUNSET GETAWAY",
  tagline: "STEAL THE CAR. OUTRUN THE LAW. OWN THE NIGHT.",
  chainLine: "EVERY NEAR-MISS FEEDS THE CHAIN",
  hero: "MILO VANE",
  partner: "NADIA REYES",
  boss: "MARCUS VOSS",
  hunter: "CAPTAIN ROOK",
  seed: 20261122,
  world: { size: 640, half: 320, roadGap: 80, block: 64, buildings: 119 },

  districts: [
    { id: "marina", name: "Marina Row", x0: -320, z0: -320, x1: 0, z1: 0, sky: 0x2e7f9e, accent: "#37b6c9", landmark: "Marina Pier" },
    { id: "oldtown", name: "Old Town", x0: 0, z0: -320, x1: 320, z1: 0, sky: 0xb5763a, accent: "#e8a35c", landmark: "Old Clock Tower" },
    { id: "dockside", name: "Dockside", x0: -320, z0: 0, x1: 0, z1: 320, sky: 0x5d6b7a, accent: "#9fb2c8", landmark: "Harbour Cranes" },
    { id: "palm", name: "Palm Heights", x0: 0, z0: 0, x1: 320, z1: 320, sky: 0x8a4d8f, accent: "#ff7ad9", landmark: "Neon Boulevard" },
  ],

  cars: [
    { id: "comet", name: "COMET GT", price: 4500, top: 62, accel: 26, grip: 0.92, color: 0xd8402e, spawn: "palm" },
    { id: "duskline", name: "DUSKLINE", price: 3200, top: 56, accel: 24, grip: 0.88, color: 0x2e4a7a, spawn: "oldtown" },
    { id: "spyder", name: "MARINA SPYDER", price: 6800, top: 68, accel: 30, grip: 0.95, color: 0x12b5a5, spawn: "marina" },
    { id: "cruiser", name: "PALM CRUISER", price: 2400, top: 50, accel: 20, grip: 0.84, color: 0xe8a33d, spawn: "palm" },
    { id: "hauler", name: "DOCK HAULER", price: 1800, top: 44, accel: 17, grip: 0.78, color: 0x5d6b54, spawn: "dockside" },
    { id: "roadster", name: "SUNSET ROADSTER", price: 9500, top: 74, accel: 33, grip: 0.97, color: 0xc22e7a, spawn: "marina" },
  ],

  perks: [
    { id: "nitro", name: "NITRO RIG", text: "Nitro lasts twice as long." },
    { id: "armor", name: "ARMOR PLATE", text: "Car takes half damage." },
    { id: "ghost", name: "GHOST PLATES", text: "Wanted fades twice as fast." },
    { id: "glove", name: "LUCKY GLOVE", text: "Hotwire takes half the time." },
    { id: "foot", name: "HEAVY FOOT", text: "Top speed up 10 percent." },
    { id: "quiet", name: "QUIET ENGINE", text: "Police spot you half as far." },
    { id: "wiring", name: "HOT WIRING", text: "Steal any car, no alarm." },
    { id: "smarts", name: "STREET SMARTS", text: "Near-miss pays double." },
    { id: "proof", name: "BULLETPROOF", text: "Milo takes half damage." },
    { id: "fuel", name: "FUEL CELL", text: "Nitro refills while driving." },
    { id: "sharp", name: "SHARPSHOOTER", text: "Weapon damage up 25 percent." },
    { id: "king", name: "GETAWAY KING", text: "Chain never drops below x2." },
  ],

  missions: [
    { id: "m1", name: "THE MARINA JOB", brief: "Steal the Spyder off the pier.", pay: 1500, district: "marina", type: "steal", line: "Pier's quiet. Too quiet." },
    { id: "m2", name: "DOCKSIDE DELIVERY", brief: "Drop the crate before dawn.", pay: 2200, district: "dockside", type: "deliver", line: "Crate's hot. Drive smooth." },
    { id: "m3", name: "ROOK'S ROADBLOCK", brief: "Slip Rook's net on the bridge.", pay: 2800, district: "oldtown", type: "escape", line: "Rook set the net early." },
    { id: "m4", name: "NEON RUN", brief: "Outrun the neon patrol.", pay: 3000, district: "palm", type: "chase", line: "Neon hides us. Use it." },
    { id: "m5", name: "THE BROKER'S PRICE", brief: "Lift the ledger from Voss.", pay: 4500, district: "marina", type: "steal", line: "Voss never leaves the ledger." },
    { id: "m6", name: "PALM HEIST", brief: "Empty the Heights vault.", pay: 3800, district: "palm", type: "heist", line: "Vault's on the top floor." },
    { id: "m7", name: "MIDNIGHT MILE", brief: "Beat two rivals, 5 checkpoints.", pay: 3200, district: "palm", type: "race", limit: 100, rivals: 2, points: 5, line: "Rivals drive dirty. So do we." },
    { id: "m8", name: "TWO WAYS OUT", brief: "Silent or loud. Your call.", pay: 3400, district: "oldtown", type: "branch", line: "Silent keeps us alive." },
    { id: "m9", name: "GHOST CONVOY", brief: "Shadow the convoy unseen.", pay: 2600, district: "dockside", type: "convoy", line: "Stay three cars back." },
    { id: "m10", name: "THE LONG WAY HOME", brief: "Three phases. One boss: Voss.", pay: 5000, district: "marina", type: "heist", boss: "MARCUS VOSS", phases: 2, line: "Voss is inside. End it." },
    { id: "m11", name: "PIER PRESSURE", brief: "Hold the pier till the boat comes.", pay: 1800, district: "dockside", type: "hold", line: "Boat's late. Hold the pier." },
    { id: "m12", name: "LAST CALL", brief: "One last courier run. Go.", pay: 3200, district: "oldtown", type: "deliver", line: "Last run, Milo. Make it count." },
  ],

  gigs: [
    { id: "parcel", name: "PARCEL RUN", text: "Timed delivery across town.", pay: 400 },
    { id: "cab", name: "SHADOW CAB", text: "Ferry fares who pay in cash.", pay: 250 },
    { id: "stunt", name: "STUNT JUMP", text: "Clear the gap, bank the crowd.", pay: 600 },
  ],

  economy: { startCash: 500, nearMiss: 250, chainMax: 5, chainStep: 0.5, fence: 0.4, grades: { S: 90000, A: 60000, B: 40000 } },
  upgrades: { engine: [900, 1800, 3200], brakes: [600, 1200, 2200], nos: [750, 1500, 2800] },
  police: { maxWanted: 5, heliAt: 3, blockAt: 4, units: ["CRUISER", "INTERCEPTOR", "AIR UNIT"] },
  weapons: [
    { id: "pistol", name: "PISTOL", price: 0, dmg: 20, range: 40, cd: 0.4 },
    { id: "shotgun", name: "SHOTGUN", price: 800, dmg: 45, range: 22, cd: 0.9 },
    { id: "smg", name: "SMG", price: 1200, dmg: 14, range: 34, cd: 0.12 },
    { id: "rifle", name: "RIFLE", price: 1500, dmg: 55, range: 85, cd: 0.7 },
  ],
  radio: [
    { id: "sunset", name: "SUNSET FM", text: "Golden-hour drive tunes.", tempo: 96 },
    { id: "neon", name: "NEON WAVE", text: "Synth for the night shift.", tempo: 122 },
    { id: "dock", name: "DOCK TALK", text: "Harbour voices and static.", tempo: 80 },
  ],
  respect: [
    { name: "ROOKIE", at: 0 },
    { name: "STREET", at: 400 },
    { name: "NOTORIOUS", at: 1200 },
    { name: "LEGEND OF SOLMAR", at: 2500 },
  ],
  player: { walk: 7, run: 11, hotwire: 2.5, hp: 100 },
  camera: { chaseDist: 11, chaseHeight: 4.5, footDist: 9, footHeight: 5 },
};

export function missionPayTotal() {
  return CONFIG.missions.reduce((sum, m) => sum + m.pay, 0);
}

export function districtAt(x, z) {
  for (const d of CONFIG.districts) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return CONFIG.districts[0];
}

export function respectRank(rep) {
  let rank = CONFIG.respect[0];
  for (const r of CONFIG.respect) if (rep >= r.at) rank = r;
  return rank;
}
