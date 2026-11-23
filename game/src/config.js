// SOLMAR: SUNSET GETAWAY — world tuning in one place.
// Every number the game shows comes from here, so the HUD, the dossier
// and the sim all agree. No Rockstar names, no licensed anything.
export const GAME = {
  title: 'SOLMAR: SUNSET GETAWAY',
  tagline: 'STEAL THE CAR. OUTRUN THE LAW. OWN THE NIGHT.',
  chainLine: 'EVERY NEAR-MISS FEEDS THE CHAIN',
  hero: 'MILO VANE',
  partner: 'NADIA',
  pursuitChief: 'CAPTAIN ROOK',
  boss: 'MARCUS VOSS',
  bossTitle: 'The Broker',
};

export const WORLD = {
  size: 420,
  roadGap: 42,
  buildingCount: 119,
  seed: 1,
  districts: [
    { id: 'marina', name: 'Marina Row', bounds: [-210, -110, -210, -20], tint: 0x2e7f8a, accent: 0x7fe3e0, note: 'piers, boats, pale sand' },
    { id: 'oldtown', name: 'Old Town', bounds: [-110, 10, -210, -20], tint: 0xb0703a, accent: 0xffc46b, note: 'warm brick, low roofs' },
    { id: 'dockside', name: 'Dockside', bounds: [-210, -110, 20, 210], tint: 0x5a6b7a, accent: 0xffd23e, note: 'cranes, containers, harbour' },
    { id: 'palm', name: 'Palm Heights', bounds: [-110, 210, 20, 210], tint: 0x8a4a7a, accent: 0xff5da2, note: 'neon, palms, tall glass' },
  ],
};

export const CARS = [
  { id: 'comet', name: 'COMET GT', price: 12000, top: 62, accel: 15, grip: 0.92, colour: 0xff4d3d, spawn: [-150, -80] },
  { id: 'duskline', name: 'DUSKLINE', price: 8500, top: 55, accel: 13, grip: 0.9, colour: 0x3d6bff, spawn: [-40, -90] },
  { id: 'spyder', name: 'MARINA SPYDER', price: 15000, top: 68, accel: 17, grip: 0.88, colour: 0x19e3c2, spawn: [-170, -140] },
  { id: 'cruiser', name: 'PALM CRUISER', price: 6000, top: 50, accel: 11, grip: 0.94, colour: 0xffc93d, spawn: [60, 120] },
  { id: 'hauler', name: 'DOCK HAULER', price: 4500, top: 44, accel: 9, grip: 0.96, colour: 0x8a97a3, spawn: [-160, 120] },
  { id: 'roadster', name: 'SUNSET ROADSTER', price: 9800, top: 58, accel: 14, grip: 0.9, colour: 0xff7a3d, spawn: [120, 90] },
];

export const UPGRADES = {
  ENGINE: [0, 1800, 3600],
  BRAKES: [0, 1200, 2400],
  NOS: [0, 1500, 3000],
};

export const PERKS = [
  { id: 'nitro', name: 'NITRO RIG', text: 'Nitro refills twice as fast.' },
  { id: 'armor', name: 'ARMOR PLATE', text: 'Your car takes half damage.' },
  { id: 'ghost', name: 'GHOST PLATES', text: 'Wanted fades one star sooner.' },
  { id: 'hands', name: 'QUICK HANDS', text: 'Hotwire takes half the time.' },
  { id: 'glove', name: 'LUCKY GLOVE', text: 'Gig payouts rise by a fifth.' },
  { id: 'foot', name: 'HEAVY FOOT', text: 'Top speed rises by 6.' },
  { id: 'silent', name: 'SILENT ENGINE', text: 'Police spot you from closer.' },
  { id: 'smarts', name: 'STREET SMARTS', text: 'Minimap shows the next turn.' },
  { id: 'chain', name: 'CHAIN FEEDER', text: 'Near misses build the chain faster.' },
  { id: 'nerves', name: 'IRON NERVES', text: 'Chain never drops below x2 in a chase.' },
  { id: 'fence', name: 'FAST FENCE', text: 'Chop shop pays 50% instead of 40%.' },
  { id: 'owl', name: 'NIGHT OWL', text: 'Night missions pay a tenth more.' },
];

export const MISSIONS = [
  { id: 'marina-job', name: 'THE MARINA JOB', pay: 2000, district: 'marina', brief: 'Steal the Spyder, lose the tail.', crew: 'Nadia: quiet in, loud out if we must.' },
  { id: 'dockside', name: 'DOCKSIDE DELIVERY', pay: 2200, district: 'dockside', brief: 'Move the crate before the cranes stop.', crew: 'Nadia: dockers look away for a price.' },
  { id: 'roadblock', name: "ROOK'S ROADBLOCK", pay: 2600, district: 'oldtown', brief: 'Break the line, do not stop.', crew: 'Nadia: Rook set this one himself.' },
  { id: 'neon-run', name: 'NEON RUN', pay: 2800, district: 'palm', brief: 'Three drops, neon on, lights off.', crew: 'Nadia: Palm Heights never sleeps.' },
  { id: 'smuggle', name: 'SUNSET SMUGGLE', pay: 3000, district: 'marina', brief: 'Boat to car, car to safehouse.', crew: 'Nadia: tide waits for no courier.' },
  { id: 'broker', name: "THE BROKER'S PRICE", pay: 3200, district: 'palm', brief: 'Voss wants his cut in person.', crew: 'Nadia: smile, take the case, drive.' },
  { id: 'palm-heist', name: 'PALM HEIST', pay: 3400, district: 'palm', brief: 'One vault, two guards, no alarms.', crew: 'Nadia: I drive, you carry.' },
  { id: 'midnight', name: 'MIDNIGHT MILE', pay: 3600, district: 'oldtown', brief: 'Race 5 checkpoints, beat 2 rivals.', crew: 'Nadia: they brake first. Always.' },
  { id: 'two-ways', name: 'TWO WAYS OUT', pay: 3800, district: 'dockside', brief: 'Silent or loud — pick one, live with it.', crew: 'Nadia: your call, Milo. I follow.' },
  { id: 'convoy', name: 'GHOST CONVOY', pay: 3200, district: 'dockside', brief: 'Tail the convoy, never be seen.', crew: 'Nadia: ghost means ghost. No lights.' },
  { id: 'harbour', name: 'HARBOUR LIGHTS', pay: 3000, district: 'dockside', brief: 'Light the pier, lose the heli.', crew: 'Nadia: heli hates the fog lamps.' },
  { id: 'long-way', name: 'THE LONG WAY HOME', pay: 4200, district: 'marina', brief: 'Three phases. Then Voss himself.', crew: 'Nadia: last job, Milo. Make it count.' },
];
export const MISSION_TOTAL = MISSIONS.reduce((s, m) => s + m.pay, 0); // 37000

export const GIGS = [
  { id: 'parcel', name: 'PARCEL RUN', pay: 450, text: 'Timed drop across town.' },
  { id: 'cab', name: 'SHADOW CAB', pay: 380, text: 'Ferry a passenger, no questions.' },
  { id: 'stunt', name: 'STUNT JUMP', pay: 600, text: 'Clear the gap, land it clean.' },
];

export const ECONOMY = {
  nearMiss: 250,
  chainMax: 5.0,
  chainStep: 0.5,
  fenceRate: 0.4,
  gradeS: 90000,
  gradeA: 60000,
  gradeB: 40000,
};

export const POLICE = {
  maxWanted: 5,
  heliAt: 4,
  units: [
    { id: 'KITE-1', role: 'MARKSMAN', kind: 'CRUISER' },
    { id: 'KITE-2', role: 'BLOCKER', kind: 'CRUISER' },
    { id: 'FALCON-1', role: 'INTERCEPTOR', kind: 'INTERCEPTOR' },
  ],
};

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', price: 0, damage: 25, range: 40 },
  { id: 'shotgun', name: 'SHOTGUN', price: 800, damage: 45, range: 22 },
  { id: 'smg', name: 'SMG', price: 1200, damage: 18, range: 35 },
  { id: 'rifle', name: 'RIFLE', price: 1500, damage: 55, range: 85 },
];

export const RADIO = [
  { id: 'sunset', name: 'SUNSET FM', mood: 'warm synth drive' },
  { id: 'neon', name: 'NEON TALK', mood: 'city talk and static' },
  { id: 'dock', name: 'DOCK WAVE', mood: 'low tide bass' },
];

export const RESPECT = [
  { rank: 'ROOKIE', at: 0 },
  { rank: 'STREET', at: 500 },
  { rank: 'NOTORIOUS', at: 1500 },
  { rank: 'LEGEND OF SOLMAR', at: 4000 },
];

export const HEAT = {
  tracks: ['FACE', 'OUTFIT', 'CAR', 'PARTNER'],
  clear: { FACE: 'change look', OUTFIT: 'change outfit', CAR: 'swap car', PARTNER: 'split up' },
};

export const PLAYER = { walk: 6, run: 9, hotwireSeconds: 2.5, startCash: 500, startPos: [0, 0] };
export const CAMERA = { chaseHeight: 7, chaseBack: 13, onFootHeight: 4, onFootBack: 8 };
