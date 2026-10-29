/**
 * ORBIT BLASTERS — PHYSICS ENGINE (Matter.js Integration)
 * Fixed: init-phase damage suppression, collision cooldowns, duplicate damage,
 * body removal race conditions, proper physics stepping, stable tower spawning.
 */

class PhysicsEngine {
  constructor(game) {
    this.game = game;
    this.engine = null;
    this.world = null;

    this.blocks = [];
    this.robots = [];
    this.astronauts = [];
    this.boss = null;
    this.currentProjectile = null;
    this.vortices = [];

    this.settleTimer = 0;
    this.isSettled = true;
    this.inFlightTimer = 0;

    // ── CRITICAL: Initialization guard ──────────────────────────────────────
    // Damage & collision effects are suppressed while this is > 0.
    // startLevel() sets it; it counts down each physics step.
    this._initPhaseTimer = 0; // ms remaining in init phase
    this._initPhaseMs   = 1800; // 1.8 s of "silent" settling

    // Per-body damage cooldown: body.id → last damage timestamp
    this._damageCooldowns = new Map();
    this._damageCooldownMs = 80; // min ms between hits on same body

    // Prevent chain explosions from looping (body id set)
    this._explodingBodies = new Set();
  }

  // ── INITIALISE MATTER ENGINE ─────────────────────────────────────────────
  init() {
    const { Engine } = Matter;
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 }  // stable cosmic gravity
    });
    this.world = this.engine.world;
    this.setupCollisionEvents();
  }

  // ── CLEAR WORLD BETWEEN LEVELS ──────────────────────────────────────────
  clear() {
    if (!this.world) return;
    Matter.World.clear(this.world, false);   // keep static bodies cleared too
    this.blocks    = [];
    this.robots    = [];
    this.astronauts = [];
    this.boss      = null;
    this.currentProjectile = null;
    this.vortices  = [];
    this.settleTimer   = 0;
    this.inFlightTimer = 0;
    this.isSettled     = true;
    this._initPhaseTimer = 0;
    this._damageCooldowns.clear();
    this._explodingBodies.clear();
  }

  // ── WORLD BOUNDARIES ────────────────────────────────────────────────────
  createWorldBounds() {
    const { Bodies, World } = Matter;
    const groundY = 600;

    const ground = Bodies.rectangle(1000, groundY + 50, 3200, 100, {
      isStatic: true, friction: 0.8, restitution: 0.05,
      render: { visible: false }, label: 'ground'
    });
    const leftWall = Bodies.rectangle(-150, 200, 100, 1400, {
      isStatic: true, render: { visible: false }, label: 'wall'
    });
    const rightWall = Bodies.rectangle(2000, 200, 100, 1400, {
      isStatic: true, render: { visible: false }, label: 'wall'
    });
    const ceiling = Bodies.rectangle(1000, -600, 3200, 100, {
      isStatic: true, render: { visible: false }, label: 'ceiling'
    });

    World.add(this.world, [ground, leftWall, rightWall, ceiling]);
  }

  // ── MATERIAL BLOCK CREATION ──────────────────────────────────────────────
  createBlock(x, y, w, h, material = 'wood', isStatic = false) {
    const { Bodies, World } = Matter;

    const MAT = {
      wood:  { density: 0.0016, friction: 0.45, restitution: 0.10, hp: 40,  maxHp: 40,  pts: 400  },
      stone: { density: 0.0040, friction: 0.65, restitution: 0.05, hp: 90,  maxHp: 90,  pts: 700  },
      ice:   { density: 0.0012, friction: 0.02, restitution: 0.20, hp: 22,  maxHp: 22,  pts: 500  },
      metal: { density: 0.0085, friction: 0.45, restitution: 0.10, hp: 220, maxHp: 220, pts: 1000 },
      tnt:   { density: 0.0018, friction: 0.50, restitution: 0.10, hp: 12,  maxHp: 12,  pts: 1200 },
    };

    const prop = MAT[material] || MAT.wood;

    const body = Bodies.rectangle(x, y, w, h, {
      isStatic,
      density:     prop.density,
      friction:    prop.friction,
      restitution: prop.restitution,
      chamfer:     { radius: 2 },
      frictionStatic: prop.friction * 0.8,
    });

    body.label        = 'block';
    body.gameType     = 'block';
    body.materialType = material;
    body.width  = w;
    body.height = h;
    body.hp     = prop.hp;
    body.maxHp  = prop.maxHp;
    body.points = prop.pts;
    body.isFrozen = false;
    body.removed  = false;

    // Zero out any residual velocity (paranoia guard)
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    this.blocks.push(body);
    World.add(this.world, body);
    return body;
  }

  // ── ROBOT CREATION ───────────────────────────────────────────────────────
  createRobot(x, y, subType = 'scout', hp = 30) {
    const { Bodies, World } = Matter;
    let body;

    if (subType === 'brute') {
      body = Bodies.rectangle(x, y, 38, 38, {
        density: 0.004, friction: 0.6, restitution: 0.10,
        chamfer: { radius: 5 }
      });
      body.width  = 38;
      body.height = 38;
    } else {
      body = Bodies.circle(x, y, 18, {
        density: 0.0022, friction: 0.5, restitution: 0.20
      });
      body.radius = 18;
    }

    body.label      = 'robot';
    body.gameType   = 'robot';
    body.subType    = subType;
    body.hp         = hp;
    body.maxHp      = hp;
    body.points     = subType === 'brute' ? 3500 : 2000;
    body.eyeAngle   = 0;
    body.blinkTimer = Math.random() * 200;
    body.removed    = false;

    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    this.robots.push(body);
    World.add(this.world, body);
    return body;
  }

  // ── BOSS CREATION ────────────────────────────────────────────────────────
  createBoss(x, y, hp = 450) {
    const { Bodies, World } = Matter;
    const body = Bodies.circle(x, y, 44, {
      density: 0.009, friction: 0.6, restitution: 0.10
    });

    body.label    = 'boss';
    body.gameType = 'boss';
    body.radius   = 44;
    body.hp       = hp;
    body.maxHp    = hp;
    body.points   = 25000;
    body.pulseTimer = 0;
    body.removed  = false;

    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    this.boss = body;
    this.robots.push(body);
    World.add(this.world, body);
    return body;
  }

  // ── ASTRONAUT CREATION ───────────────────────────────────────────────────
  createAstronaut(x, y) {
    const { Bodies, World } = Matter;
    const body = Bodies.circle(x, y, 18, {
      density: 0.002, friction: 0.7, restitution: 0.05
    });

    body.label    = 'astronaut';
    body.gameType = 'astronaut';
    body.radius   = 18;
    body.rescued  = false;
    body.points   = 5000;
    body.removed  = false;

    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);

    this.astronauts.push(body);
    World.add(this.world, body);
    return body;
  }

  // ── PROJECTILE LAUNCH ────────────────────────────────────────────────────
  launchCreature(characterId, startPos, velocity) {
    const { Bodies, World } = Matter;
    const char = window.CHARACTERS ? window.CHARACTERS[characterId]
                                   : (typeof CHARACTERS !== 'undefined' ? CHARACTERS[characterId] : null);
    if (!char) return null;

    const body = Bodies.circle(startPos.x, startPos.y, char.radius, {
      density:     char.density,
      friction:    char.friction,
      restitution: char.restitution,
      render:      { visible: false }
    });

    body.label        = 'creature';
    body.gameType     = 'creature';
    body.charId       = characterId;
    body.radius       = char.radius;
    body.abilityUsed  = false;
    body.isSettled    = false;
    body.trail        = [];
    body.flightTime   = 0;
    body.removed      = false;

    Matter.Body.setVelocity(body, velocity);

    this.currentProjectile = body;
    this.isSettled         = false;
    this.inFlightTimer     = 0;
    this.settleTimer       = 0;

    World.add(this.world, body);
    window.audio.playLaunch();
    return body;
  }

  // ── VORTEX MANAGEMENT ───────────────────────────────────────────────────
  addVortex(vortexConfig) {
    this.vortices.push({ ...vortexConfig, elapsed: 0 });
  }

  // ── COLLISION EVENTS ─────────────────────────────────────────────────────
  setupCollisionEvents() {
    const { Events } = Matter;

    Events.on(this.engine, 'collisionStart', (event) => {
      // During init phase — suppress ALL gameplay damage
      if (this._initPhaseTimer > 0) return;

      const pairs = event.pairs;
      const now   = performance.now();

      for (let i = 0; i < pairs.length; i++) {
        const pair  = pairs[i];
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.removed || bodyB.removed) continue;

        // Relative speed at contact
        const vx = bodyA.velocity.x - bodyB.velocity.x;
        const vy = bodyA.velocity.y - bodyB.velocity.y;
        const relSpeed = Math.hypot(vx, vy);

        // Impact sound
        if (relSpeed > 2.5) {
          const mat = bodyA.materialType || bodyB.materialType || 'wood';
          window.audio.playImpact(mat, Math.min(1.5, relSpeed / 12));
        }

        // Identify creature vs other
        const isCreatureA = bodyA.gameType === 'creature';
        const isCreatureB = bodyB.gameType === 'creature';
        const creature = isCreatureA ? bodyA : (isCreatureB ? bodyB : null);
        const other    = creature === bodyA ? bodyB : bodyA;

        if (creature && !creature.removed) {
          // Bouncer hyper-bounce punch-through
          if (creature.isHyperBouncing && creature.bouncesRemaining > 0) {
            creature.bouncesRemaining--;
            window.audio.playAbility('bouncer');
            this.game.renderer.spawnShockwave(creature.position.x, creature.position.y, 80, '#10B981', 10);
            this.game.renderer.addScreenShake(8);
            if (!other.removed && (other.gameType === 'block' || other.gameType === 'robot' || other.gameType === 'boss')) {
              this._applyDamageWithCooldown(other, 60, now);
            }
          }

          // Astronaut rescue on contact
          if (other.gameType === 'astronaut' && !other.rescued) {
            this.rescueAstronaut(other);
          }
        }

        // Structural damage threshold — minimum speed 4.5 prevents resting contact
        const damageThreshold = 4.5;
        if (relSpeed > damageThreshold) {
          const raw = Math.round((relSpeed - damageThreshold) * 8);

          const doBodies = [bodyA, bodyB];
          for (const b of doBodies) {
            if (!b.removed && (b.gameType === 'block' || b.gameType === 'robot' || b.gameType === 'boss')) {
              this._applyDamageWithCooldown(b, raw, now);
            }
          }
        }

        // Astronaut rescued by any moderate-speed collision (not just creature)
        if (relSpeed > 1.5) {
          if (bodyA.gameType === 'astronaut' && !bodyA.rescued) this.rescueAstronaut(bodyA);
          if (bodyB.gameType === 'astronaut' && !bodyB.rescued) this.rescueAstronaut(bodyB);
        }
      }
    });
  }

  // ── DAMAGE WITH COOLDOWN (prevents duplicate hits per collision frame) ───
  _applyDamageWithCooldown(body, amount, now) {
    if (!body || body.removed || body.hp <= 0) return;

    const lastHit = this._damageCooldowns.get(body.id) || 0;
    if ((now - lastHit) < this._damageCooldownMs) return;   // too soon

    this._damageCooldowns.set(body.id, now);
    this.applyDamage(body, amount);
  }

  // ── DAMAGE & DESTRUCTION ─────────────────────────────────────────────────
  applyDamage(body, amount) {
    if (!body || body.removed || body.hp === undefined || body.hp <= 0) return;

    body.hp = Math.max(0, body.hp - amount);

    // Sparks on hit
    this.game.renderer.spawnSparks(
      body.position.x, body.position.y,
      Math.min(10, Math.floor(amount / 5)), '#FFFFFF', 4
    );

    if (body.gameType === 'boss') {
      window.audio.playRobotHit(false);
      this.game.ui.updateBossHp(body.hp, body.maxHp);
      this.game.renderer.addScreenShake(5);
    }

    if (body.hp <= 0) {
      this.destroyBody(body);
    }
  }

  destroyBody(body) {
    if (!body || body.removed) return;
    body.removed = true;

    const pos = { x: body.position.x, y: body.position.y };

    if (body.materialType === 'tnt' && !this._explodingBodies.has(body.id)) {
      this._explodingBodies.add(body.id);
      this.triggerExplosion(pos.x, pos.y, 220, 0.08, 110);
    } else if (body.gameType === 'boss') {
      window.audio.playExplosion();
      this.game.renderer.spawnExplosionDebris(pos.x, pos.y, 50, '#FF3366');
      this.game.renderer.spawnShockwave(pos.x, pos.y, 350, '#FF3366', 28);
      this.game.renderer.showFloatingText(pos.x, pos.y - 40, `BOSS DEFEATED! +${body.points}`, '#FFB800');
      this.game.addScore(body.points);
      this.game.renderer.addScreenShake(24);
    } else if (body.gameType === 'robot') {
      window.audio.playRobotHit(true);
      this.game.renderer.spawnExplosionDebris(pos.x, pos.y, 18, '#64748B');
      this.game.renderer.spawnSparks(pos.x, pos.y, 20, '#FFD700', 7);
      this.game.renderer.showFloatingText(pos.x, pos.y - 20, `+${body.points}`, '#00E5FF');
      this.game.addScore(body.points);
      this.game.renderer.addScreenShake(9);
    } else if (body.gameType === 'block') {
      const colors = { wood: '#8B5A2B', stone: '#94A3B8', ice: '#70F3FF', metal: '#475569', tnt: '#FF4444' };
      this.game.renderer.spawnDebris(pos.x, pos.y, 8, colors[body.materialType] || '#FFF');
      this.game.renderer.showFloatingText(pos.x, pos.y, `+${body.points}`, '#E2E8F0');
      this.game.addScore(body.points);
    }

    // Remove from world & arrays — use requestAnimationFrame to avoid mutating
    // Matter's internal composite during a collision callback
    requestAnimationFrame(() => {
      if (!this.world) return;
      try { Matter.World.remove(this.world, body); } catch(e) { /* already removed */ }

      if (body.gameType === 'block') {
        const idx = this.blocks.indexOf(body);
        if (idx !== -1) this.blocks.splice(idx, 1);
      } else if (body.gameType === 'robot' || body.gameType === 'boss') {
        const idx = this.robots.indexOf(body);
        if (idx !== -1) this.robots.splice(idx, 1);
      } else if (body.gameType === 'astronaut') {
        const idx = this.astronauts.indexOf(body);
        if (idx !== -1) this.astronauts.splice(idx, 1);
      }
    });
  }

  // ── EXPLOSION ─────────────────────────────────────────────────────────────
  triggerExplosion(x, y, radius = 220, force = 0.08, directDamage = 100) {
    // Don't trigger if in init phase
    if (this._initPhaseTimer > 0) return;

    window.audio.playExplosion();
    this.game.renderer.spawnShockwave(x, y, radius, '#FF4500', 22);
    this.game.renderer.spawnSparks(x, y, 35, '#FF8C00', 9);
    this.game.renderer.addScreenShake(16);
    this.game.renderer.showFloatingText(x, y - 30, 'BOOM!', '#FF4500');

    const now = performance.now();
    const bodies = this.getAllDynamicBodies();
    bodies.forEach(b => {
      if (b.removed) return;
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < radius) {
        const factor = (1 - dist / radius);
        const forceMag = force * factor * b.mass;
        Matter.Body.applyForce(b, b.position, {
          x: (dx / dist) * forceMag,
          y: (dy / dist) * forceMag - 0.025 * factor
        });

        if (!b.removed && (b.gameType === 'block' || b.gameType === 'robot' || b.gameType === 'boss')) {
          // Use cooldown to prevent chained multi-damage within same explosion
          const dmg = Math.round(directDamage * factor);
          this._applyDamageWithCooldown(b, dmg, now + dist); // offset by dist to stagger
        }
      }
    });
  }

  // ── ASTRONAUT RESCUE ─────────────────────────────────────────────────────
  rescueAstronaut(astro) {
    if (!astro || astro.rescued) return;
    astro.rescued = true;
    window.audio.playAstronautRescue();
    this.game.renderer.spawnSparks(astro.position.x, astro.position.y, 22, '#FFD700', 6);
    this.game.renderer.showFloatingText(astro.position.x, astro.position.y - 30, 'RESCUED! +5000', '#FFD700');
    this.game.addScore(astro.points);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────
  getAllDynamicBodies() {
    return Matter.Composite.allBodies(this.world).filter(b => !b.isStatic && !b.removed);
  }

  // ── MAIN UPDATE STEP ─────────────────────────────────────────────────────
  update(deltaTime) {
    if (!this.engine) return;

    // Use a fixed-step to keep physics deterministic.
    // Matter.js expects dt in ms at 60fps = ~16.67ms per step.
    // Cap to avoid spiral of death after tab becomes visible again.
    const fixedStep = 16.667;
    const dt = Math.min(deltaTime, 33); // max 2 missed frames worth

    // ── Count down init suppression phase ───────────────────────────────
    if (this._initPhaseTimer > 0) {
      this._initPhaseTimer = Math.max(0, this._initPhaseTimer - dt);
    }

    // Step the engine with fixed substeps for stability
    const steps = Math.ceil(dt / fixedStep);
    const stepDt = dt / steps;
    for (let s = 0; s < steps; s++) {
      Matter.Engine.update(this.engine, stepDt);
    }

    // ── Active gravity vortices ──────────────────────────────────────────
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i];
      v.elapsed += dt;

      if (v.elapsed >= v.duration) {
        this.triggerExplosion(v.x, v.y, v.radius * 0.8, 0.055, 45);
        this.vortices.splice(i, 1);
        continue;
      }

      const now = performance.now();
      this.getAllDynamicBodies().forEach(b => {
        if (b.removed) return;
        const dx = v.x - b.position.x;
        const dy = v.y - b.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15 && dist < v.radius) {
          const factor = (1 - dist / v.radius);
          const pull = v.strength * factor * b.mass;
          Matter.Body.applyForce(b, b.position, {
            x: (dx / dist) * pull,
            y: (dy / dist) * pull
          });

          if (!b.removed && (b.gameType === 'block' || b.gameType === 'robot') && this._initPhaseTimer <= 0) {
            // crush damage at very low rate; use cooldown per body
            const lastHit = this._damageCooldowns.get(b.id) || 0;
            if ((now - lastHit) > 200) {
              this._damageCooldowns.set(b.id, now);
              this.applyDamage(b, v.crushDamage);
            }
          }
        }
      });
    }

    // ── Flight projectile trail & out-of-bounds ──────────────────────────
    if (this.currentProjectile && !this.currentProjectile.removed) {
      this.inFlightTimer += dt;
      const p = this.currentProjectile;

      if (!p.trail) p.trail = [];
      p.trail.push({ x: p.position.x, y: p.position.y });
      if (p.trail.length > 28) p.trail.shift();

      if (p.position.y > 690 || p.position.x > 2300 || p.position.x < -120) {
        this.destroyProjectile();
      }
    }

    this.checkSettling(dt);
  }

  // ── SETTLING DETECTION ───────────────────────────────────────────────────
  checkSettling(dt) {
    if (!this.currentProjectile) {
      this.isSettled = true;
      return;
    }

    const proj  = this.currentProjectile;
    const speed = Math.hypot(proj.velocity.x, proj.velocity.y);

    // 8-second absolute flight timeout
    if (this.inFlightTimer > 8000) {
      this.destroyProjectile();
      return;
    }

    // Settled for 1.2 continuous seconds after at least 1s in flight
    if (speed < 0.5 && this.inFlightTimer > 1000) {
      this.settleTimer += dt;
    } else {
      this.settleTimer = 0;
    }

    if (this.settleTimer > 1200) {
      this.destroyProjectile();
    }
  }

  destroyProjectile() {
    if (!this.currentProjectile) return;
    const p = this.currentProjectile;
    this.currentProjectile = null;
    this.settleTimer   = 0;
    this.inFlightTimer = 0;
    this.isSettled     = true;

    requestAnimationFrame(() => {
      if (p && !p.removed) {
        p.removed = true;
        try { Matter.World.remove(this.world, p); } catch(e) {}
      }
      this.game.onTurnComplete();
    });
  }

  // ── TRAJECTORY PREDICTION ────────────────────────────────────────────────
  predictTrajectory(startPos, velocity, steps = 32) {
    const points = [];
    let x = startPos.x;
    let y = startPos.y;
    let vx = velocity.x;
    let vy = velocity.y;
    const gravity = 1.0 * 0.001 * 1000 / 60;  // matches engine gravity

    for (let i = 0; i < steps; i++) {
      x += vx;
      y += vy;
      vy += gravity;

      if (y >= 600) {
        points.push({ x, y: 600 });
        break;
      }
      points.push({ x, y });
    }
    return points;
  }

  // ── ENABLE INIT SUPPRESSION PHASE ────────────────────────────────────────
  // Called by Game.startLevel() AFTER spawning all bodies.
  // Physics runs but damage/explosions are silent for _initPhaseMs.
  beginInitPhase() {
    this._initPhaseTimer = this._initPhaseMs;
    this._explodingBodies.clear();
    this._damageCooldowns.clear();
  }
}

window.PhysicsEngine = PhysicsEngine;
