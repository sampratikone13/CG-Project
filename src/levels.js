/**
 * ORBIT BLASTERS — 10 PLAYABLE LEVELS
 * Fixed: no block-on-robot overlaps, verified structure Y positions sit above ground (y=600),
 * corrected block half-height math so nothing spawns inside the ground or each other.
 *
 * Ground is at y=600. A block of height h centered at y has bottom at y + h/2.
 * So the lowest block must have y + h/2 <= 600, i.e. y <= 600 - h/2.
 * For a 120px tall block: y <= 540. We use y=540 as the standard ground-level row.
 */

const LEVELS_DATA = [

  // ===================================================
  // WORLD 1: MOON BASE (Levels 1–3)
  // ===================================================
  {
    id: 1,
    world: 1,
    worldName: 'Moon Base',
    title: 'First Launch',
    objective: 'Destroy both alien scout bots!',
    creatures: ['solar', 'solar', 'solar'],
    starThresholds: [6000, 12000, 18000],
    tip: 'Click and drag backward on the creature to aim and launch!',
    structures: [
      // Left tower (two legs + cap)
      { x: 800, y: 540, w: 24, h: 120, mat: 'wood' },   // bottom y = 540+60 = 600 ✓
      { x: 880, y: 540, w: 24, h: 120, mat: 'wood' },
      { x: 840, y: 470, w: 108, h: 22,  mat: 'wood' },  // cap: bottom = 470+11 = 481

      // Right tower
      { x: 1000, y: 540, w: 24, h: 120, mat: 'wood' },
      { x: 1080, y: 540, w: 24, h: 120, mat: 'wood' },
      { x: 1040, y: 470, w: 108, h: 22,  mat: 'wood' },

      // Bridge plank connecting tops
      { x: 940, y: 420, w: 240, h: 20, mat: 'wood' }
    ],
    targets: [
      // Robots sit ON TOP of cap (470 - 22/2 = 459; robot center 459 - 18 = 441)
      { type: 'robot', subType: 'scout', x: 840,  y: 440, hp: 30 },
      { type: 'robot', subType: 'scout', x: 1040, y: 440, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 2,
    world: 1,
    worldName: 'Moon Base',
    title: 'Crumbling Towers',
    objective: 'Topple the stacked towers & detonate the fuel pod!',
    creatures: ['solar', 'solar', 'bouncer'],
    starThresholds: [10000, 18000, 26000],
    tip: 'Hit the red fuel pod to trigger a chain reaction!',
    structures: [
      // Left stone tower
      { x: 780, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 870, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 825, y: 469, w: 130, h: 22,  mat: 'stone' },  // cap bottom=480

      // Wood second tier
      { x: 790, y: 415, w: 24,  h: 80,  mat: 'wood'  },
      { x: 860, y: 415, w: 24,  h: 80,  mat: 'wood'  },
      { x: 825, y: 364, w: 110, h: 22,  mat: 'wood'  },

      // TNT canister — sits beside the structure on the ground
      { x: 960, y: 562, w: 40, h: 76,  mat: 'tnt'   },   // bottom = 600 ✓

      // Right stone tower
      { x: 1030, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 1120, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 1075, y: 469, w: 130, h: 22,  mat: 'stone' },
      { x: 1040, y: 415, w: 24,  h: 80,  mat: 'wood'  },
      { x: 1110, y: 415, w: 24,  h: 80,  mat: 'wood'  },
      { x: 1075, y: 364, w: 110, h: 22,  mat: 'wood'  }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 825,  y: 332, hp: 30 },
      { type: 'robot', subType: 'brute', x: 960,  y: 505, hp: 55 },
      { type: 'robot', subType: 'scout', x: 1075, y: 332, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 3,
    world: 1,
    worldName: 'Moon Base',
    title: 'Rescue Mission',
    objective: 'Defeat all robots & rescue the stranded astronaut!',
    creatures: ['solar', 'bouncer', 'frost'],
    starThresholds: [14000, 22000, 32000],
    tip: 'Free the astronaut in the center dome while eliminating robots!',
    structures: [
      // Left outpost
      { x: 740, y: 540, w: 28, h: 120, mat: 'wood'  },
      { x: 820, y: 540, w: 28, h: 120, mat: 'wood'  },
      { x: 780, y: 469, w: 110, h: 22,  mat: 'stone' },
      { x: 780, y: 415, w: 22,  h: 80,  mat: 'wood'  },

      // Center cage (astronaut inside)
      { x: 910, y: 540, w: 20, h: 120, mat: 'wood' },
      { x: 990, y: 540, w: 20, h: 120, mat: 'wood' },
      { x: 950, y: 469, w: 110, h: 22,  mat: 'ice'  },

      // Right sniper tower
      { x: 1080, y: 530, w: 32, h: 140, mat: 'stone' },  // bottom=600
      { x: 1160, y: 530, w: 32, h: 140, mat: 'stone' },
      { x: 1120, y: 449, w: 120, h: 22,  mat: 'metal' },
      { x: 1120, y: 395, w: 22,  h: 80,  mat: 'wood'  }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 780,  y: 363, hp: 30 },
      { type: 'robot', subType: 'brute', x: 1120, y: 343, hp: 55 },
      // Guard beside the cage (not INSIDE it)
      { type: 'robot', subType: 'scout', x: 1030, y: 560, hp: 30 }
    ],
    astronauts: [
      { x: 950, y: 555, rescued: false }   // inside cage bottom
    ]
  },

  // ===================================================
  // WORLD 2: CRYSTAL PLANET (Levels 4–6)
  // ===================================================
  {
    id: 4,
    world: 2,
    worldName: 'Crystal Planet',
    title: 'Frozen Fortress',
    objective: 'Shatter the icy battlements with Frost!',
    creatures: ['frost', 'frost', 'solar'],
    starThresholds: [12000, 20000, 30000],
    tip: 'Click while Frost is flying to freeze and shatter structures!',
    structures: [
      // Ice base block
      { x: 775, y: 552, w: 90,  h: 96,  mat: 'ice'   },  // bottom=600
      // Left tower
      { x: 870, y: 540, w: 26, h: 120, mat: 'ice'   },
      { x: 950, y: 540, w: 26, h: 120, mat: 'ice'   },
      { x: 910, y: 469, w: 120, h: 22,  mat: 'ice'   },
      // Upper arch
      { x: 890, y: 415, w: 22,  h: 80,  mat: 'ice'   },
      { x: 930, y: 415, w: 22,  h: 80,  mat: 'ice'   },
      { x: 910, y: 364, w: 100, h: 20,  mat: 'ice'   },
      // Right stone+ice tower
      { x: 1060, y: 530, w: 32, h: 140, mat: 'stone' },
      { x: 1140, y: 530, w: 32, h: 140, mat: 'stone' },
      { x: 1100, y: 449, w: 120, h: 22,  mat: 'ice'   },
      { x: 1100, y: 395, w: 22,  h: 80,  mat: 'wood'  }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 910,  y: 332, hp: 30 },
      { type: 'robot', subType: 'brute', x: 910,  y: 435, hp: 55 },
      { type: 'robot', subType: 'scout', x: 1100, y: 343, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 5,
    world: 2,
    worldName: 'Crystal Planet',
    title: 'Gravity Trouble',
    objective: 'Use Gravity Singularity to implode heavy bunkers!',
    creatures: ['gravity', 'gravity', 'solar', 'bouncer'],
    starThresholds: [15000, 25000, 36000],
    tip: 'Click mid-flight with Gravity to spawn a black hole vortex!',
    structures: [
      // Left deep bunker
      { x: 750, y: 540, w: 35, h: 120, mat: 'stone' },
      { x: 850, y: 540, w: 35, h: 120, mat: 'stone' },
      { x: 800, y: 469, w: 140, h: 25,  mat: 'stone' },
      { x: 800, y: 406, w: 28,  h: 85,  mat: 'metal' },

      // Center high platform
      { x: 965, y: 520, w: 30, h: 160, mat: 'stone' },  // bottom=600
      { x: 1055, y: 520, w: 30, h: 160, mat: 'stone' },
      { x: 1010, y: 429, w: 130, h: 24,  mat: 'metal' },
      { x: 988,  y: 376, w: 22,  h: 80,  mat: 'wood'  },
      { x: 1032, y: 376, w: 22,  h: 80,  mat: 'wood'  },
      { x: 1010, y: 324, w: 90,  h: 20,  mat: 'ice'   },

      // TNT canister ground-level between bunkers
      { x: 900, y: 562, w: 40, h: 76, mat: 'tnt' },

      // Far light bunker
      { x: 1140, y: 540, w: 28, h: 120, mat: 'wood' },
      { x: 1210, y: 540, w: 28, h: 120, mat: 'wood' },
      { x: 1175, y: 469, w: 110, h: 20,  mat: 'wood' }
    ],
    targets: [
      { type: 'robot', subType: 'brute',  x: 800,  y: 354, hp: 55 },
      { type: 'robot', subType: 'scout',  x: 1010, y: 292, hp: 30 },
      { type: 'robot', subType: 'scout',  x: 1010, y: 393, hp: 30 },
      { type: 'robot', subType: 'scout',  x: 1175, y: 437, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 6,
    world: 2,
    worldName: 'Crystal Planet',
    title: 'Crystal Chaos',
    objective: 'Demolish the 3-tiered crystalline citadel!',
    creatures: ['frost', 'gravity', 'solar', 'bouncer'],
    starThresholds: [18000, 30000, 44000],
    tip: 'Combine Frost and Gravity for devastating chain collapses!',
    structures: [
      // Tier 1: four stone pillars + two planks
      { x: 780,  y: 540, w: 28, h: 120, mat: 'stone' },
      { x: 880,  y: 540, w: 28, h: 120, mat: 'stone' },
      { x: 980,  y: 540, w: 28, h: 120, mat: 'stone' },
      { x: 1080, y: 540, w: 28, h: 120, mat: 'stone' },
      { x: 830,  y: 469, w: 120, h: 22,  mat: 'wood'  },
      { x: 1030, y: 469, w: 120, h: 22,  mat: 'wood'  },

      // Tier 2: TNT + ice pillars + metal span
      { x: 930, y: 445, w: 50, h: 60,  mat: 'tnt'   },  // sits ON the wood plank: 469-11-30=428 → use 447 so bottom=477
      { x: 830, y: 399, w: 24, h: 90,  mat: 'ice'   },
      { x: 1030, y: 399, w: 24, h: 90,  mat: 'ice'   },
      { x: 930, y: 332, w: 240, h: 22,  mat: 'metal' },

      // Tier 3 crown
      { x: 890, y: 275, w: 22, h: 80, mat: 'wood'  },
      { x: 970, y: 275, w: 22, h: 80, mat: 'wood'  },
      { x: 930, y: 224, w: 110, h: 20, mat: 'stone' }
    ],
    targets: [
      { type: 'robot', subType: 'brute', x: 830,  y: 435, hp: 55 },
      { type: 'robot', subType: 'scout', x: 1030, y: 435, hp: 30 },
      { type: 'robot', subType: 'scout', x: 830,  y: 296, hp: 30 },
      { type: 'robot', subType: 'brute', x: 930,  y: 192, hp: 60 }
    ],
    astronauts: []
  },

  // ===================================================
  // WORLD 3: ASTEROID FIELD (Levels 7–10)
  // ===================================================
  {
    id: 7,
    world: 3,
    worldName: 'Asteroid Field',
    title: 'Floating Danger',
    objective: 'Ricochet off asteroids to reach concealed robots!',
    creatures: ['bouncer', 'bouncer', 'gravity', 'solar'],
    starThresholds: [18000, 30000, 44000],
    tip: 'Bouncer rebounds off steel plates and asteroids with double speed!',
    structures: [
      // Static suspended barrier
      { x: 890, y: 240, w: 260, h: 26, mat: 'metal', isStatic: true },

      // Left base tower
      { x: 800, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 880, y: 540, w: 30, h: 120, mat: 'stone' },
      { x: 840, y: 469, w: 120, h: 22,  mat: 'wood'  },
      { x: 840, y: 415, w: 24,  h: 80,  mat: 'ice'   },

      // Far metal bunker
      { x: 1005, y: 530, w: 34, h: 140, mat: 'metal' },
      { x: 1100, y: 530, w: 34, h: 140, mat: 'metal' },
      { x: 1052, y: 449, w: 130, h: 24,  mat: 'stone' },
      { x: 1052, y: 395, w: 24,  h: 80,  mat: 'wood'  },
      { x: 1052, y: 343, w: 90,  h: 20,  mat: 'wood'  }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 840,  y: 363, hp: 30 },
      { type: 'robot', subType: 'brute', x: 1052, y: 311, hp: 55 },
      { type: 'robot', subType: 'scout', x: 1052, y: 437, hp: 30 },
      // Scout on top of the static barrier
      { type: 'robot', subType: 'scout', x: 890,  y: 208, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 8,
    world: 3,
    worldName: 'Asteroid Field',
    title: 'Metal Mayhem',
    objective: 'Penetrate heavy steel fortifications with volatile explosives!',
    creatures: ['solar', 'solar', 'bouncer', 'gravity'],
    starThresholds: [22000, 36000, 50000],
    tip: 'Explosive cores ignore metal armor when detonated!',
    structures: [
      // Left metal bunker
      { x: 760,  y: 530, w: 32, h: 140, mat: 'metal' },
      { x: 852,  y: 530, w: 32, h: 140, mat: 'metal' },
      { x: 806,  y: 449, w: 120, h: 24,  mat: 'metal' },
      { x: 806,  y: 395, w: 26,  h: 80,  mat: 'wood'  },

      // TNT cluster on ground
      { x: 940, y: 562, w: 40, h: 76, mat: 'tnt' },
      { x: 1002, y: 562, w: 40, h: 76, mat: 'tnt' },

      // Massive right metal fortress
      { x: 1070, y: 530, w: 36, h: 140, mat: 'metal' },
      { x: 1170, y: 530, w: 36, h: 140, mat: 'metal' },
      { x: 1120, y: 449, w: 140, h: 26,  mat: 'metal' },
      { x: 1088, y: 390, w: 26,  h: 90,  mat: 'stone' },
      { x: 1152, y: 390, w: 26,  h: 90,  mat: 'stone' },
      { x: 1120, y: 333, w: 110, h: 22,  mat: 'metal' }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 806,  y: 343, hp: 30 },
      { type: 'robot', subType: 'brute', x: 971,  y: 505, hp: 60 },
      { type: 'robot', subType: 'brute', x: 1120, y: 299, hp: 60 },
      { type: 'robot', subType: 'scout', x: 1120, y: 407, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 9,
    world: 3,
    worldName: 'Asteroid Field',
    title: 'Cosmic Collapse',
    objective: 'Trigger a massive chain reaction across twin sky fortresses!',
    creatures: ['solar', 'frost', 'gravity', 'bouncer'],
    starThresholds: [26000, 42000, 60000],
    tip: 'Target support columns to cause high-altitude catastrophic collapse!',
    structures: [
      // Left citadel
      { x: 740, y: 530, w: 32, h: 140, mat: 'stone' },
      { x: 840, y: 530, w: 32, h: 140, mat: 'stone' },
      { x: 790, y: 449, w: 130, h: 24,  mat: 'metal' },
      { x: 790, y: 389, w: 40,  h: 60,  mat: 'tnt'   },
      { x: 770, y: 326, w: 24,  h: 80,  mat: 'ice'   },
      { x: 810, y: 326, w: 24,  h: 80,  mat: 'ice'   },
      { x: 790, y: 274, w: 90,  h: 20,  mat: 'wood'  },

      // Skybridge (static)
      { x: 940, y: 448, w: 160, h: 18, mat: 'wood', isStatic: true },
      { x: 940, y: 407, w: 40,  h: 40, mat: 'tnt'  },

      // Right citadel
      { x: 1020, y: 530, w: 34, h: 140, mat: 'stone' },
      { x: 1120, y: 530, w: 34, h: 140, mat: 'stone' },
      { x: 1070, y: 449, w: 140, h: 24,  mat: 'metal' },
      { x: 1044, y: 387, w: 28,  h: 90,  mat: 'wood'  },
      { x: 1096, y: 387, w: 28,  h: 90,  mat: 'wood'  },
      { x: 1070, y: 330, w: 110, h: 22,  mat: 'stone' },
      { x: 1070, y: 274, w: 24,  h: 80,  mat: 'metal' },
      { x: 1070, y: 222, w: 80,  h: 20,  mat: 'wood'  }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 790,  y: 242, hp: 30 },
      { type: 'robot', subType: 'brute', x: 790,  y: 492, hp: 60 },
      { type: 'robot', subType: 'scout', x: 940,  y: 370, hp: 30 },
      { type: 'robot', subType: 'brute', x: 1070, y: 190, hp: 65 },
      { type: 'robot', subType: 'scout', x: 1070, y: 395, hp: 30 }
    ],
    astronauts: []
  },

  {
    id: 10,
    world: 3,
    worldName: 'Asteroid Field',
    title: 'Alien Overlord',
    objective: 'DEFEAT THE ALIEN OVERLORD & SAVE THE GALAXY!',
    creatures: ['solar', 'solar', 'frost', 'gravity', 'gravity', 'bouncer', 'bouncer'],
    starThresholds: [40000, 65000, 95000],
    tip: 'Bring down the shield generator pylons, then blast the Overlord core!',
    isBossLevel: true,
    structures: [
      // Boss dais platform (4 metal legs + platform top)
      { x: 790,  y: 540, w: 38, h: 120, mat: 'metal' },
      { x: 890,  y: 540, w: 38, h: 120, mat: 'metal' },
      { x: 990,  y: 540, w: 38, h: 120, mat: 'metal' },
      { x: 1090, y: 540, w: 38, h: 120, mat: 'metal' },
      { x: 940,  y: 469, w: 380, h: 28,  mat: 'metal' },

      // Left shield pylon (on top of dais)
      { x: 810, y: 408, w: 26, h: 90,  mat: 'stone' },
      { x: 810, y: 335, w: 40, h: 60,  mat: 'tnt'   },
      { x: 810, y: 283, w: 80, h: 22,  mat: 'ice'   },

      // Right shield pylon
      { x: 1070, y: 408, w: 26, h: 90,  mat: 'stone' },
      { x: 1070, y: 335, w: 40, h: 60,  mat: 'tnt'   },
      { x: 1070, y: 283, w: 80, h: 22,  mat: 'ice'   },

      // Overlord throne (metal pillars + ceiling)
      { x: 895,  y: 408, w: 30, h: 110, mat: 'metal' },
      { x: 985,  y: 408, w: 30, h: 110, mat: 'metal' },
      { x: 940,  y: 341, w: 140, h: 26,  mat: 'metal' }
    ],
    targets: [
      { type: 'robot', subType: 'scout', x: 810,  y: 249, hp: 35 },
      { type: 'robot', subType: 'scout', x: 1070, y: 249, hp: 35 },
      // ALIEN OVERLORD BOSS — sits on throne top
      { type: 'boss', x: 940, y: 296, hp: 450, maxHp: 450 }
    ],
    astronauts: [
      { x: 940, y: 560, rescued: false }  // captive on dais
    ]
  }
];

window.LEVELS_DATA = LEVELS_DATA;
