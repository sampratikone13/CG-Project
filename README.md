# 🪐 Orbit Blasters — 2D Cartoon Space Physics Game

**Orbit Blasters** is a 2D physics-based browser casual game built with HTML5, CSS3, JavaScript, and Matter.js. Players launch four expressive space creatures with unique cosmic abilities from an orbital energy slingshot to demolish alien robot fortresses, rescue astronauts, and defeat the colossal Alien Overlord across 10 levels and 3 worlds.

---

## 🚀 Quick Start / How to Run Locally

You can run the game using any standard static file server or directly in your browser.

### Option 1: Using Python (Recommended)
From the project folder, run:
```bash
python3 -m http.server 8000
```
Then open your browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

### Option 2: Using Node.js / npx
```bash
npx -y serve .
```

### Option 3: Direct Browser Launch
Open `index.html` directly in any modern desktop browser (Chrome, Safari, Firefox, Edge). All scripts and dependencies are completely self-contained in `lib/matter.min.js`.

---

## 🎮 Game Controls

| Action | Control | Description |
| :--- | :--- | :--- |
| **Aim & Stretch** | `Click + Drag Mouse` | Drag creature backward on the launch slingshot |
| **Launch** | `Release Mouse` | Fire creature with calculated trajectory & force |
| **Activate Ability** | `Click Screen` or `Spacebar` | Trigger the flying creature's special cosmic power mid-flight |
| **Restart Level** | `R` key or Top HUD Button | Instantly reload the current mission |
| **Pause / Resume** | `Esc` or `P` key | Open pause menu |
| **Toggle Audio** | `M` key or Audio Button | Mute or unmute synthesized space sounds and music |

---

## 🌟 The 4 Space Blasters & Cosmic Powers

1. **Solar (Golden Creature):**
   - **Ability:** *Supernova Burst*
   - **Effect:** Triggers a thermal shockwave on command that blasts away obstacles, pushes heavy debris, and deals massive area damage.
2. **Frost (Cyan Creature):**
   - **Ability:** *Absolute Zero*
   - **Effect:** Flash-freezes surrounding structures, instantly zeroing out friction to make them slide and halving their durability into brittle ice shards.
3. **Gravity (Purple Creature):**
   - **Ability:** *Singularity Pull*
   - **Effect:** Spawns a cosmic black hole vortex for 1.8 seconds, pulling blocks, debris, and robots inward into a dense ball before crushing them.
4. **Bouncer (Green Creature):**
   - **Ability:** *Kinetic Hyper-Bounce*
   - **Effect:** Surges forward with high-velocity restitution, ricocheting up to 5 times off surfaces and punching through fortified walls.

---

## 🌌 The 10 Playable Levels & 3 Worlds

### World 1: Moon Base
- **Level 1: First Launch** — Aiming, launching, and basic target destruction.
- **Level 2: Crumbling Towers** — Stacked stone & wood towers with explosive fuel cells.
- **Level 3: Rescue Mission** — Free the stranded astronaut in the center dome while eliminating alien guards.

### World 2: Crystal Planet
- **Level 4: Frozen Fortress** — Introduces ice blocks and Frost's flash-freeze ability.
- **Level 5: Gravity Trouble** — Multi-tiered bunkers solved by Gravity's black hole singularity.
- **Level 6: Crystal Chaos** — Intricate 3-tier castle combining Solar, Frost, and Gravity blasters.

### World 3: Asteroid Field
- **Level 7: Floating Danger** — Suspended platforms and ricochet angles with Bouncer.
- **Level 8: Metal Mayhem** — Heavy titanium girders and volatile fuel chain reactions.
- **Level 9: Cosmic Collapse** — Twin sky citadels connected by suspension bridges with high-altitude collapse physics.
- **Level 10: Alien Overlord** — Multi-stage Boss Encounter featuring the colossal Alien Overlord mech, shield pylons, health bar HUD, and a rescued Commander Astronaut!

---

## 🧱 Destructible Materials

- **Wood:** Light and easy to splinter.
- **Stone:** Heavy lunar rock; requires solid impacts or collapse.
- **Ice:** Low-density, brittle, and practically zero friction (slick slides).
- **Metal:** Extremely durable titanium beams with corner rivets.
- **Power Core (TNT):** Detonates with an explosive shockwave and radial impulse when impacted.

---

## 🎵 Sound & Music Engine

Built with the **Web Audio API**:
- Procedural sound effects for stretches, launches, impacts (distinct for wood, stone, ice, metal), explosions, robot pops, astronaut cheers, and ability triggers.
- Atmospheric ambient space synth pad with chords playing in the background.
- Zero external audio files required, zero broken links, and full user mute toggle with `localStorage` memory.

---

## 📁 Project Architecture

```
Cg project/
├── index.html           # Main game markup, HUD overlays, menus & modals
├── styles.css           # Space cartoon visual styles, animations, responsive HUD
├── lib/
│   └── matter.min.js    # Vendored Matter.js 2D physics engine
├── src/
│   ├── audio.js         # Web Audio API sound effects & synth music
│   ├── characters.js    # 4 creatures, stats, and special abilities
│   ├── levels.js        # 10 complete level definitions across 3 worlds
│   ├── physics.js       # Matter.js world, collisions, damage, debris, settling
│   ├── renderer.js      # Parallax backgrounds, cartoon characters, particles, camera
│   ├── ui.js            # Menu screens, level select grid, star ratings, save/load
│   └── game.js          # Main game loop, input, trajectory, turn cycle
├── package.json         # Project metadata
└── README.md            # Documentation & instructions
```
