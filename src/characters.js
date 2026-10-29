/**
 * ORBIT BLASTERS — CHARACTERS & ABILITIES
 * Defines the 4 distinct space creatures, their attributes, and their cosmic powers.
 */

const CHARACTERS = {
  solar: {
    id: 'solar',
    name: 'Solar',
    title: 'The Solar Spark',
    abilityName: 'Supernova Burst',
    abilityDesc: 'Unleashes a thermal blast wave pushing and damaging surrounding structures!',
    color:       '#FFB800',
    accentColor: '#FF6B00',
    darkColor:   '#C44B00',
    glowColor:   'rgba(255, 184, 0, 0.8)',
    radius: 20,
    density: 0.003,
    friction: 0.4,
    restitution: 0.35,
    icon: '☀️',
    activateAbility(game, creatureBody) {
      if (!creatureBody || creatureBody.abilityUsed) return false;
      creatureBody.abilityUsed = true;

      const pos = creatureBody.position;
      const blastRadius = 220;
      const blastForce = 0.085;

      // Audio & VFX
      window.audio.playAbility('solar');
      game.renderer.spawnShockwave(pos.x, pos.y, blastRadius, '#FFB800', 25);
      game.renderer.spawnSparks(pos.x, pos.y, 35, '#FFE259', 8);
      game.renderer.addScreenShake(14);
      game.renderer.showFloatingText(pos.x, pos.y - 30, 'SUPERNOVA!', '#FFB800');

      // Physics radial force impulse on nearby dynamic bodies
      const bodies = game.physics.getAllDynamicBodies();
      bodies.forEach(b => {
        if (b === creatureBody) return;
        const dx = b.position.x - pos.x;
        const dy = b.position.y - pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist < blastRadius) {
          const factor = (1 - dist / blastRadius);
          const forceMag = blastForce * factor * b.mass;
          const fx = (dx / dist) * forceMag;
          const fy = (dy / dist) * forceMag - 0.02 * factor; // small upward lift

          Matter.Body.applyForce(b, b.position, { x: fx, y: fy });

          // Direct thermal damage to destructible blocks / robots
          if (b.gameType === 'block' || b.gameType === 'robot' || b.gameType === 'boss') {
            const damage = Math.round(65 * factor);
            game.physics.applyDamage(b, damage);
          }
        }
      });

      return true;
    }
  },

  frost: {
    id: 'frost',
    name: 'Frost',
    title: 'The Glacial Wisp',
    abilityName: 'Absolute Zero',
    abilityDesc: 'Instantly flash-freezes blocks, wiping out friction and making them shatter!',
    color:       '#00E5FF',
    accentColor: '#0099CC',
    darkColor:   '#005577',
    glowColor:   'rgba(0, 229, 255, 0.8)',
    radius: 19,
    density: 0.0025,
    friction: 0.15,
    restitution: 0.3,
    icon: '❄️',
    activateAbility(game, creatureBody) {
      if (!creatureBody || creatureBody.abilityUsed) return false;
      creatureBody.abilityUsed = true;

      const pos = creatureBody.position;
      const freezeRadius = 240;

      // Audio & VFX
      window.audio.playAbility('frost');
      game.renderer.spawnShockwave(pos.x, pos.y, freezeRadius, '#00E5FF', 22);
      game.renderer.spawnFrostParticles(pos.x, pos.y, 40);
      game.renderer.addScreenShake(8);
      game.renderer.showFloatingText(pos.x, pos.y - 30, 'DEEP FREEZE!', '#00E5FF');

      // Freeze surrounding blocks into brittle ice
      const bodies = game.physics.getAllDynamicBodies();
      let affected = 0;
      bodies.forEach(b => {
        if (b === creatureBody) return;
        const dx = b.position.x - pos.x;
        const dy = b.position.y - pos.y;
        const dist = Math.hypot(dx, dy);

        if (dist < freezeRadius) {
          affected++;
          // Turn slippery and fragile
          b.friction = 0.005;
          b.frictionStatic = 0.005;
          b.isFrozen = true;

          if (b.gameType === 'block') {
            b.materialType = 'ice';
            b.hp = Math.min(b.hp, 25); // become extremely brittle
          } else if (b.gameType === 'robot' || b.gameType === 'boss') {
            game.physics.applyDamage(b, 40);
          }

          // Small icy pop
          Matter.Body.applyForce(b, b.position, {
            x: (Math.random() - 0.5) * 0.015,
            y: -0.01
          });
        }
      });

      return true;
    }
  },

  gravity: {
    id: 'gravity',
    name: 'Gravity',
    title: 'The Cosmic Singularity',
    abilityName: 'Singularity Pull',
    abilityDesc: 'Spawns a mini black hole pulling structures inward, crushing them!',
    color:       '#B250FF',
    accentColor: '#7B1FA2',
    darkColor:   '#3D0066',
    glowColor:   'rgba(178, 80, 255, 0.8)',
    radius: 21,
    density: 0.0035,
    friction: 0.35,
    restitution: 0.2,
    icon: '🌌',
    activateAbility(game, creatureBody) {
      if (!creatureBody || creatureBody.abilityUsed) return false;
      creatureBody.abilityUsed = true;

      const pos = { x: creatureBody.position.x, y: creatureBody.position.y };
      const vortexRadius = 260;

      // Audio & VFX
      window.audio.playAbility('gravity');
      game.renderer.spawnVortexEffect(pos.x, pos.y, 1800); // 1.8s vortex
      game.renderer.showFloatingText(pos.x, pos.y - 30, 'SINGULARITY!', '#B250FF');

      // Create an active vortex state in physics
      game.physics.addVortex({
        x: pos.x,
        y: pos.y,
        radius: vortexRadius,
        duration: 1800,
        strength: 0.00065,
        crushDamage: 1.2
      });

      // Stop creature in place as vortex center
      Matter.Body.setVelocity(creatureBody, { x: 0, y: 0 });
      creatureBody.isStatic = true;
      setTimeout(() => {
        if (creatureBody && !creatureBody.removed) {
          creatureBody.isStatic = false;
        }
      }, 1800);

      return true;
    }
  },

  bouncer: {
    id: 'bouncer',
    name: 'Bouncer',
    title: 'The Kinetic Surge',
    abilityName: 'Kinetic Hyper-Bounce',
    abilityDesc: 'Surges forward with hyper-elastic velocity, ricocheting through defenses!',
    color:       '#10B981',
    accentColor: '#059669',
    darkColor:   '#022C22',
    glowColor:   'rgba(16, 185, 129, 0.8)',
    radius: 18,
    density: 0.0028,
    friction: 0.1,
    restitution: 0.95,
    icon: '⚡',
    activateAbility(game, creatureBody) {
      if (!creatureBody || creatureBody.abilityUsed) return false;
      creatureBody.abilityUsed = true;

      const currentVel = creatureBody.velocity;
      let speed = Math.hypot(currentVel.x, currentVel.y);

      // Audio & VFX
      window.audio.playAbility('bouncer');
      game.renderer.spawnShockwave(creatureBody.position.x, creatureBody.position.y, 140, '#10B981', 18);
      game.renderer.addScreenShake(12);
      game.renderer.showFloatingText(creatureBody.position.x, creatureBody.position.y - 30, 'HYPER BOUNCE!', '#10B981');

      // Boost velocity in existing direction or forward
      let boostAngle = Math.atan2(currentVel.y, currentVel.x);
      if (speed < 2) {
        boostAngle = 0.2; // slight forward-down
        speed = 15;
      }
      const targetSpeed = Math.max(speed * 1.85, 28);
      Matter.Body.setVelocity(creatureBody, {
        x: Math.cos(boostAngle) * targetSpeed,
        y: Math.sin(boostAngle) * targetSpeed
      });

      // Enable hyper bounce mode on this creature
      creatureBody.isHyperBouncing = true;
      creatureBody.bouncesRemaining = 5;
      creatureBody.restitution = 0.98;

      return true;
    }
  }
};

window.CHARACTERS = CHARACTERS;
