// config.js — every gameplay number in SOLMAR lives here. Later chunks must
// read from here, never hard-code a number of their own.
export const META = {
  title: 'SOLMAR: SUNSET GETAWAY',
  tagline: 'STEAL THE CAR. OUTRUN THE LAW. OWN THE NIGHT.',
  hero: 'MILO VANE',
  pursuer: 'CAPTAIN ROOK',
  boss: 'MARCUS VOSS',
  version: '1.0.0',
};

export const WORLD = {
  half: 400,            // city spans -400..400 on x and z
  roadStep: 80,         // road grid spacing
  roadHalf: 6,          // half-width of a road
  seaX: -400,           // the sea lies west of this line
  safehouse: { x: -160, z: -40 },
};

export const DISTRICTS = [
  { id: 'marina',  name: 'MARINA ROW',   x0: -400, z0: -400, x1: 0,   z1: 0,   tint: 0x2a3f5e },
  { id: 'palm',    name: 'PALM HEIGHTS', x0: 0,    z0: -400, x1: 400, z1: 0,   tint: 0x3d2f4e },
  { id: 'docks',   name: 'DOCKSIDE',     x0: -400, z0: 0,    x1: 0,   z1: 400, tint: 0x2e4a44 },
  { id: 'oldtown', name: 'OLD TOWN',     x0: 0,    z0: 0,    x1: 400, z1: 400, tint: 0x4e2f35 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return DISTRICTS[0];
}

export const CARS = [
  { id: 'comet',    name: 'COMET GT',       price: 0,    color: 0xd43a2a, top: 46, accel: 22, grip: 1.0, spawn: { x: -160, z: -60 } },
  { id: 'hauler',   name: 'DOCK HAULER',    price: 900,  color: 0x7a6a3f, top: 38, accel: 16, grip: 0.9, spawn: { x: -120, z: 120 } },
  { id: 'duskline', name: 'DUSKLINE',       price: 1200, color: 0x2a4a7a, top: 50, accel: 24, grip: 1.05, spawn: { x: 120, z: -120 } },
  { id: 'cruiser',  name: 'MARINA CRUISER', price: 1800, color: 0xe8d8a0, top: 44, accel: 20, grip: 1.0, spawn: { x: 200, z: 80 } },
  { id: 'spyder',   name: 'PALM SPYDER',    price: 2400, color: 0x2ad4a0, top: 56, accel: 28, grip: 1.15, spawn: { x: 80, z: -240 } },
  { id: 'roadster', name: 'SUNSET ROADSTER', price: 6000, color: 0x8a2ad4, top: 62, accel: 32, grip: 1.2, spawn: { x: -240, z: 240 } },
];

export const PERKS = [
  { id: 'nitro',   name: 'NITRO RIG',    text: 'Nitro lasts 50% longer.' },
  { id: 'armor',   name: 'ARMOR PLATE',  text: 'Your car takes 25% less damage.' },
  { id: 'ghost',   name: 'GHOST PLATES', text: 'Wanted decays twice as fast.' },
  { id: 'hotwire', name: 'HOTWIRE ACE',  text: 'Steal a car in half the time.' },
  { id: 'spotter', name: 'SPOTTER',      text: 'Police show on the minimap sooner.' },
  { id: 'clean',   name: 'CLEAN HANDS',  text: 'First bust per run is forgiven.' },
  { id: 'decoy',   name: 'DECOY',        text: 'One free escape from a roadblock.' },
  { id: 'light',   name: 'LIGHT FOOT',   text: 'On foot you move 20% faster.' },
  { id: 'smooth',  name: 'SMOOTH TALKER', text: 'Gigs pay 25% more.' },
  { id: 'lucky',   name: 'LUCKY CHARM',  text: 'Near-miss payouts doubled.' },
  { id: 'quick',   name: 'QUICK HANDS',  text: 'Draft picks refresh once per run.' },
  { id: 'nerves',  name: 'IRON NERVES',  text: 'Heat rises 20% slower.' },
];

// 10 story missions. Chunk B wires the objectives; payouts are final here.
export const MISSIONS = [
  { id: 'm1',  name: 'THE MARINA JOB',     payout: 1200, text: 'Steal the Comet and lose the tail.' },
  { id: 'm2',  name: 'DOCKSIDE DELIVERY',  payout: 1800, text: 'A package, a clock, no questions.' },
  { id: 'm3',  name: "ROOK'S ROADBLOCK",   payout: 2400, text: 'Break the captain\u2019s trap.' },
  { id: 'm4',  name: 'NEON RUN',           payout: 2600, text: 'Outrun the night shift.' },
  { id: 'm5',  name: "THE BROKER'S PRICE", payout: 3000, text: 'Meet Voss. Pay, or run.' },
  { id: 'm6',  name: 'PALM HEIST',         payout: 3200, text: 'One vault, one sunset.' },
  { id: 'm7',  name: 'MIDNIGHT MILE',      payout: 3600, text: 'Street race for the pink slip.' },
  { id: 'm8',  name: 'TWO WAYS OUT',       payout: 3800, text: 'Choose: the crew, or the cash.' },
  { id: 'm9',  name: 'GHOST CONVOY',       payout: 4000, text: 'Shadow a convoy that must not see you.' },
  { id: 'm10', name: 'THE LONG WAY HOME',  payout: 5000, text: 'The final heist. Three phases. No backup.' },
];
export const MISSION_TOTAL = MISSIONS.reduce((s, m) => s + m.payout, 0); // 30,600

export const GIGS = [
  { id: 'parcel', name: 'PARCEL RUN',  payout: 450, text: 'Timed delivery across town.' },
  { id: 'cab',    name: 'SHADOW CAB',  payout: 350, text: 'Drive a fare who cannot be seen.' },
  { id: 'stunt',  name: 'STUNT JUMP',  payout: 600, text: 'Clear the gap. Land it clean.' },
];

export const ECONOMY = {
  nearMiss: 250,
  chainMin: 1,
  chainMax: 5,
  fenceRate: 0.4,       // chop shop pays 40% of car value
  gradeS: 90000,        // victory grade S at $90k+ run total
};

export const UPGRADES = {
  engine: [800, 1600, 3200],
  brakes: [600, 1200, 2400],
  nos: [1000, 2000, 4000],
};

export const POLICE = {
  heliAtStars: 3,
  heliAlt: 26,
  heliSpeed: 55,
  unitHp: 100,
  disabledSecs: 12,
  maxUnits: 6,
};

export const WEAPONS = {
  pistol:  { name: 'PISTOL',  dmg: 34, range: 55, cd: 0.45, price: 0,    pack: 0,  packPrice: 0,   ammo: Infinity },
  shotgun: { name: 'SHOTGUN', dmg: 70, range: 30, cd: 0.9,  price: 1200, pack: 6,  packPrice: 150, ammo: 0 },
  smg:     { name: 'SMG',     dmg: 14, range: 70, cd: 0.12, price: 900,  pack: 40, packPrice: 200, ammo: 0 },
};

export const RADIO = [
  { name: 'SOLMAR FM',    tag: 'SUNSET DRIVE', bpm: 92,  root: 110,  wave: 'triangle' },
  { name: 'NEON NIGHTS',  tag: 'SYNTHWAVE',    bpm: 116, root: 98,   wave: 'sawtooth' },
  { name: 'DOCKSIDE DUB', tag: 'OFFBEAT',      bpm: 74,  root: 82.4, wave: 'sine' },
];

export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 11,
  radius: 1.2,
};

export const CAMERA = {
  chaseDist: 14,
  chaseHeight: 5.5,
  orbitHeight: 60,
};
