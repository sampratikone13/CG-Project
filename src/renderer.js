/**
 * ORBIT BLASTERS — RENDERER & VISUAL EFFECTS ENGINE
 * Canvas rendering with high-DPI support, parallax backgrounds,
 * procedural cartoon character/robot art, particles, and dynamic camera.
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Polyfill roundRect for older browsers
    if (!this.ctx.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.arcTo(x + w, y, x + w, y + r, r);
        this.lineTo(x + w, y + h - r);
        this.arcTo(x + w, y + h, x + w - r, y + h, r);
        this.lineTo(x + r, y + h);
        this.arcTo(x, y + h, x, y + h - r, r);
        this.lineTo(x, y + r);
        this.arcTo(x, y, x + r, y, r);
        this.closePath();
      };
    }

    this.width = 1280;
    this.height = 720;
    this.dpr = window.devicePixelRatio || 1;

    // Camera
    this.camera = {
      x: 350,
      y: 420,
      targetX: 350,
      targetY: 420,
      zoom: 1.0,
      targetZoom: 1.0,
      shake: 0
    };

    // Parallax stars
    this.stars = [];
    this.shootingStar = null;
    this.generateStarfield(180);

    // Particle systems
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.vortexEffects = [];

    this.setupResize();
  }

  setupResize() {
    const handleResize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * this.dpr;
      this.canvas.height = rect.height * this.dpr;
      this.width = rect.width;
      this.height = rect.height;
    };
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  generateStarfield(count = 180) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const layer = Math.random() < 0.6 ? 0 : (Math.random() < 0.85 ? 1 : 2);
      const isCross = layer === 2 && Math.random() < 0.5;
      const size = layer === 0 ? (Math.random() * 0.9 + 0.6) : (layer === 1 ? (Math.random() * 1.3 + 1.1) : (Math.random() * 1.6 + 2.0));
      const speed = layer === 0 ? (Math.random() * 0.03 + 0.02) : (layer === 1 ? (Math.random() * 0.07 + 0.05) : (Math.random() * 0.14 + 0.09));

      let color = '#FFFFFF';
      const cRand = Math.random();
      if (cRand > 0.75) color = '#70F3FF';      // icy cyan
      else if (cRand > 0.55) color = '#FDE047'; // warm amber gold
      else if (cRand > 0.40) color = '#F472B6'; // soft nebula pink
      else if (cRand > 0.28) color = '#C084FC'; // cosmic lavender

      this.stars.push({
        x: Math.random() * 2800,
        y: Math.random() * 850,
        size,
        speed,
        layer,
        isCross,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.04 + 0.02,
        color
      });
    }
    this.shootingStar = null;
  }

  renderCrossStar(ctx, x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 2.8, y);
    ctx.lineTo(x + size * 2.8, y);
    ctx.moveTo(x, y - size * 2.8);
    ctx.lineTo(x, y + size * 2.8);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  addScreenShake(amount) {
    this.camera.shake = Math.min(25, this.camera.shake + amount);
  }

  // --- CAMERA LOGIC ---
  updateCamera(game, dt) {
    const proj = game.physics.currentProjectile;

    if (proj && !proj.isSettled) {
      // Follow flying creature with lead
      this.camera.targetX = proj.position.x + proj.velocity.x * 12;
      this.camera.targetY = proj.position.y + proj.velocity.y * 8;
      this.camera.targetZoom = 0.92;
    } else if (game.isDragging) {
      // Focus on slingshot
      this.camera.targetX = 400;
      this.camera.targetY = 440;
      this.camera.targetZoom = 1.0;
    } else {
      // Center battlefield view
      this.camera.targetX = 680;
      this.camera.targetY = 420;
      this.camera.targetZoom = 0.88;
    }

    // Clamp camera within world bounds
    this.camera.targetX = Math.max(300, Math.min(1300, this.camera.targetX));
    this.camera.targetY = Math.max(260, Math.min(520, this.camera.targetY));

    // Smooth Lerp
    const lerpRate = 0.08;
    this.camera.x += (this.camera.targetX - this.camera.x) * lerpRate;
    this.camera.y += (this.camera.targetY - this.camera.y) * lerpRate;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * lerpRate;

    // Decay shake
    if (this.camera.shake > 0) {
      this.camera.shake *= 0.88;
      if (this.camera.shake < 0.1) this.camera.shake = 0;
    }
  }

  // --- MAIN RENDER PASS ---
  render(game, dt) {
    this.updateCamera(game, dt);

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Screen shake offsets
    let shakeX = 0;
    let shakeY = 0;
    if (this.camera.shake > 0) {
      shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
      shakeY = (Math.random() - 0.5) * this.camera.shake * 2;
    }

    // Render world background
    this.renderBackground(game, shakeX, shakeY);

    // Apply Camera transform for world elements
    ctx.save();
    ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // World Terrain Ground
    this.renderGround(game);

    // Destructible blocks
    this.renderBlocks(game);

    // Slingshot Base & Back Band
    this.renderSlingshotBack(game);

    // Trajectory prediction arc
    if (game.isDragging && game.trajectoryPoints.length > 0) {
      this.renderTrajectory(game.trajectoryPoints);
    }

    // Creature in slingshot cradle (if ready on slingshot or dragging)
    if (game.readyCreature && (game.state === 'AIMING' || game.isDragging)) {
      this.renderAimingCreature(game);
    }

    // Slingshot Front & Rubber Band
    this.renderSlingshotFront(game);

    // In-flight projectile & trail
    if (game.physics.currentProjectile) {
      this.renderInFlightCreature(game.physics.currentProjectile);
    }

    // Robots & Enemies
    this.renderRobots(game);

    // Astronauts
    this.renderAstronauts(game);

    // Active Vortices
    this.renderVortices(dt);

    // Particles & Debris
    this.updateAndRenderParticles(dt);

    // Shockwaves
    this.updateAndRenderShockwaves(dt);

    // Floating text popups
    this.updateAndRenderFloatingTexts(dt);

    ctx.restore();
    ctx.restore();
  }

  // --- PARALLAX BACKGROUNDS (3 DISTINCT WORLDS) ---
  renderBackground(game, shakeX, shakeY) {
    const ctx = this.ctx;
    const worldId = game.currentLevelData ? game.currentLevelData.world : 1;
    const camX = this.camera.x;
    const camY = this.camera.y;
    const t = performance.now() * 0.0015;

    if (worldId === 1) {
      // WORLD 1: MOON BASE
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#02040B');
      skyGrad.addColorStop(0.45, '#070D22');
      skyGrad.addColorStop(1, '#111D42');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Deep space cosmic dust cloud (soft indigo nebula)
      const dustGrad = ctx.createRadialGradient(this.width * 0.35, this.height * 0.3, 10, this.width * 0.35, this.height * 0.3, 340);
      dustGrad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
      dustGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      dustGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dustGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Distant 3D Detailed Earth
      const earthX = this.width * 0.82 - (camX * 0.035);
      const earthY = this.height * 0.26;
      const earthRadius = 48;

      // Earth atmospheric Rayleigh scattering halo
      const haloGrad = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.9, earthX, earthY, earthRadius * 1.45);
      haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      haloGrad.addColorStop(0.45, 'rgba(14, 165, 233, 0.18)');
      haloGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthRadius * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // Earth body with spherical 3D shading
      ctx.save();
      ctx.beginPath();
      ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
      ctx.clip();

      // Ocean base sphere
      const earthSphereGrad = ctx.createRadialGradient(earthX - 16, earthY - 16, 4, earthX, earthY, earthRadius);
      earthSphereGrad.addColorStop(0, '#38BDF8');
      earthSphereGrad.addColorStop(0.35, '#0284C7');
      earthSphereGrad.addColorStop(0.8, '#034E7B');
      earthSphereGrad.addColorStop(1, '#021B2C');
      ctx.fillStyle = earthSphereGrad;
      ctx.fillRect(earthX - earthRadius, earthY - earthRadius, earthRadius * 2, earthRadius * 2);

      // Continents (stylized green/teal landmasses)
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      // Continent 1 (North America-style)
      ctx.ellipse(earthX - 12, earthY - 10, 16, 20, 0.35, 0, Math.PI * 2);
      // Continent 2 (South America-style)
      ctx.ellipse(earthX - 6, earthY + 16, 11, 15, -0.2, 0, Math.PI * 2);
      // Continent 3 (Eurasia-style curve)
      ctx.ellipse(earthX + 22, earthY - 8, 14, 18, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Translucent atmospheric swirling clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(earthX - 10, earthY - 14, 22, 6, 0.25, 0, Math.PI * 2);
      ctx.ellipse(earthX + 14, earthY + 10, 24, 7, -0.3, 0, Math.PI * 2);
      ctx.ellipse(earthX + 4, earthY - 2, 28, 5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Night-side shadow crescent for real 3D day/night terminator
      const nightGrad = ctx.createRadialGradient(earthX - earthRadius * 0.4, earthY - earthRadius * 0.4, earthRadius * 0.5, earthX + earthRadius * 0.3, earthY + earthRadius * 0.3, earthRadius * 1.3);
      nightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      nightGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0.35)');
      nightGrad.addColorStop(1, 'rgba(1, 4, 15, 0.82)');
      ctx.fillStyle = nightGrad;
      ctx.fillRect(earthX - earthRadius, earthY - earthRadius, earthRadius * 2, earthRadius * 2);

      ctx.restore();

      // Orbiting communication satellite with blinking beacon
      const satX = earthX - 68;
      const satY = earthY - 22;
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(satX - 3, satY - 2, 6, 4);
      // Solar panels
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(satX - 9, satY - 1.5, 5, 3);
      ctx.fillRect(satX + 4, satY - 1.5, 5, 3);
      // Blinking red beacon
      const blink = (Math.sin(t * 5) > 0.3);
      if (blink) {
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(satX, satY - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Distant lunar mountains in deep parallax silhouette
      ctx.save();
      const mountCam = camX * 0.025;
      ctx.fillStyle = '#0B1327';
      ctx.beginPath();
      ctx.moveTo(-100, this.height);
      ctx.lineTo(-100, 560);
      for (let mx = -100; mx < this.width + 150; mx += 140) {
        const peakH = 530 + Math.sin((mx + mountCam) * 0.015) * 22;
        ctx.lineTo(mx - mountCam * 0.5, peakH);
      }
      ctx.lineTo(this.width + 100, 560);
      ctx.lineTo(this.width + 100, this.height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (worldId === 2) {
      // WORLD 2: CRYSTAL PLANET
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#060210');
      skyGrad.addColorStop(0.4, '#170630');
      skyGrad.addColorStop(1, '#320E57');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Radiant Crystal Nebulae (Dual intertwined cosmic clouds)
      // Cyan cloud
      const neb1 = ctx.createRadialGradient(this.width * 0.28, this.height * 0.35, 10, this.width * 0.28, this.height * 0.35, 300);
      neb1.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      neb1.addColorStop(0.5, 'rgba(14, 165, 233, 0.1)');
      neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, this.width, this.height);

      // Magenta cloud
      const neb2 = ctx.createRadialGradient(this.width * 0.72, this.height * 0.28, 15, this.width * 0.72, this.height * 0.28, 320);
      neb2.addColorStop(0, 'rgba(217, 70, 239, 0.25)');
      neb2.addColorStop(0.55, 'rgba(168, 85, 247, 0.12)');
      neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, this.width, this.height);

      // Shattered Crystal Moon
      const moonX = this.width * 0.26 - (camX * 0.03);
      const moonY = this.height * 0.24;
      const moonR = 40;

      // Glow halo
      ctx.save();
      const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 1.5);
      moonHalo.addColorStop(0, 'rgba(192, 132, 252, 0.4)');
      moonHalo.addColorStop(1, 'transparent');
      ctx.fillStyle = moonHalo;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Crystal moon crescent body
      const moonGrad = ctx.createRadialGradient(moonX - 12, moonY - 12, 4, moonX, moonY, moonR);
      moonGrad.addColorStop(0, '#F5D0FE');
      moonGrad.addColorStop(0.4, '#C084FC');
      moonGrad.addColorStop(0.85, '#581C87');
      moonGrad.addColorStop(1, '#1E0A38');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Glowing crystal fracture lines
      ctx.strokeStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(moonX - 25, moonY - 15);
      ctx.lineTo(moonX, moonY);
      ctx.lineTo(moonX + 15, moonY - 20);
      ctx.moveTo(moonX, moonY);
      ctx.lineTo(moonX + 10, moonY + 22);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Floating crystal shards around the moon
      for (let s = 0; s < 4; s++) {
        const sa = (s * Math.PI / 2) + t * 0.4;
        const sr = moonR + 18 + Math.sin(t * 1.5 + s) * 6;
        const sx = moonX + Math.cos(sa) * sr;
        const sy = moonY + Math.sin(sa) * (sr * 0.6);

        ctx.fillStyle = '#E0F7FA';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5);
        ctx.lineTo(sx + 3, sy);
        ctx.lineTo(sx, sy + 5);
        ctx.lineTo(sx - 3, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Distant crystalline mountain spires in parallax
      ctx.save();
      const crysCam = camX * 0.025;
      ctx.fillStyle = '#1A0835';
      ctx.beginPath();
      ctx.moveTo(-100, this.height);
      ctx.lineTo(-100, 570);
      for (let cx = -100; cx < this.width + 150; cx += 110) {
        const tipH = 505 + Math.sin((cx + crysCam) * 0.02) * 35;
        ctx.lineTo(cx - crysCam * 0.5 - 20, 565);
        ctx.lineTo(cx - crysCam * 0.5, tipH);
        ctx.lineTo(cx - crysCam * 0.5 + 20, 565);
      }
      ctx.lineTo(this.width + 100, 570);
      ctx.lineTo(this.width + 100, this.height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else {
      // WORLD 3: ASTEROID FIELD
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#040206');
      skyGrad.addColorStop(0.45, '#140713');
      skyGrad.addColorStop(1, '#2B0E1E');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Deep orange/crimson cosmic nebula
      const nebGrad = ctx.createRadialGradient(this.width * 0.65, this.height * 0.28, 10, this.width * 0.65, this.height * 0.28, 340);
      nebGrad.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
      nebGrad.addColorStop(0.45, 'rgba(239, 68, 68, 0.12)');
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Giant Ringed Gas Giant Planet with Authentic 3D Atmospheric Bands
      const planetX = this.width * 0.24 - (camX * 0.025);
      const planetY = this.height * 0.26;
      const planetR = 42;
      const ringTilt = -0.36;

      ctx.save();
      // Back half of planet rings
      ctx.save();
      ctx.translate(planetX, planetY);
      ctx.rotate(ringTilt);
      // Outer ring back
      ctx.beginPath();
      ctx.ellipse(0, 0, 94, 20, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 9;
      ctx.stroke();
      // Inner ring back
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 15, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Atmospheric banded planet sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
      ctx.clip();

      const pBaseGrad = ctx.createRadialGradient(planetX - 14, planetY - 14, 4, planetX, planetY, planetR);
      pBaseGrad.addColorStop(0, '#FDE68A');
      pBaseGrad.addColorStop(0.35, '#D97706');
      pBaseGrad.addColorStop(0.75, '#92400E');
      pBaseGrad.addColorStop(1, '#451A03');
      ctx.fillStyle = pBaseGrad;
      ctx.fillRect(planetX - planetR, planetY - planetR, planetR * 2, planetR * 2);

      // Latitudinal atmospheric stripes
      const stripes = [-26, -14, -2, 10, 22];
      for (let sy of stripes) {
        ctx.fillStyle = sy % 2 === 0 ? 'rgba(254, 243, 199, 0.35)' : 'rgba(120, 53, 15, 0.45)';
        ctx.fillRect(planetX - planetR, planetY + sy, planetR * 2, 7);
      }

      // Terminator shadow
      const pShadow = ctx.createRadialGradient(planetX - planetR * 0.4, planetY - planetR * 0.4, planetR * 0.5, planetX + planetR * 0.3, planetY + planetR * 0.3, planetR * 1.3);
      pShadow.addColorStop(0, 'rgba(0,0,0,0)');
      pShadow.addColorStop(0.7, 'rgba(30, 10, 5, 0.45)');
      pShadow.addColorStop(1, 'rgba(10, 3, 2, 0.88)');
      ctx.fillStyle = pShadow;
      ctx.fillRect(planetX - planetR, planetY - planetR, planetR * 2, planetR * 2);
      ctx.restore();

      // Front half of planet rings (drawn over planet)
      ctx.save();
      ctx.translate(planetX, planetY);
      ctx.rotate(ringTilt);
      // Outer ring front with Cassini division gap
      ctx.beginPath();
      ctx.ellipse(0, 0, 94, 20, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
      ctx.lineWidth = 9;
      ctx.stroke();
      // Cassini division dark gap
      ctx.beginPath();
      ctx.ellipse(0, 0, 83, 17.5, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(10, 3, 5, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Inner ring front
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 15, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();

      // Distant drifting asteroid silhouettes
      const asterCam = camX * 0.02;
      const asteroids = [
        { x: this.width * 0.48, y: this.height * 0.22, r: 8, rot: t * 0.3 },
        { x: this.width * 0.74, y: this.height * 0.36, r: 12, rot: -t * 0.2 },
        { x: this.width * 0.88, y: this.height * 0.18, r: 6, rot: t * 0.4 }
      ];
      for (let ast of asteroids) {
        ctx.save();
        ctx.translate(ast.x - asterCam, ast.y);
        ctx.rotate(ast.rot);
        ctx.fillStyle = '#271720';
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const pts = 6;
        for (let p = 0; p < pts; p++) {
          const pa = (p / pts) * Math.PI * 2;
          const pr = ast.r * (0.8 + (p % 2) * 0.4);
          if (p === 0) ctx.moveTo(Math.cos(pa) * pr, Math.sin(pa) * pr);
          else ctx.lineTo(Math.cos(pa) * pr, Math.sin(pa) * pr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // Parallax Starfield Rendering
    for (let star of this.stars) {
      star.twinkle += star.twinkleSpeed || 0.04;
      const alpha = 0.35 + Math.sin(star.twinkle) * 0.35;
      const screenX = (star.x - camX * star.speed + 3200) % 2800;
      const screenY = (star.y - camY * star.speed * 0.35 + 1200) % 850;

      if (star.isCross) {
        this.renderCrossStar(ctx, screenX, screenY, star.size, Math.max(0.12, alpha), star.color);
      } else {
        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // Dynamic shooting star streak across the upper cosmos
    if (!this.shootingStar) {
      if (Math.random() < 0.0035) {
        this.shootingStar = {
          x: Math.random() * (this.width * 0.6) + 80,
          y: Math.random() * (this.height * 0.32) + 20,
          vx: Math.random() * 10 + 13,
          vy: Math.random() * 4 + 5,
          life: 1.0
        };
      }
    } else {
      const ss = this.shootingStar;
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.026;

      if (ss.life > 0) {
        ctx.save();
        const streakGrad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 3.5, ss.y - ss.vy * 3.5);
        streakGrad.addColorStop(0, `rgba(255, 255, 255, ${ss.life * 0.95})`);
        streakGrad.addColorStop(0.35, `rgba(165, 243, 252, ${ss.life * 0.65})`);
        streakGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 3.5, ss.y - ss.vy * 3.5);
        ctx.stroke();
        ctx.restore();
      } else {
        this.shootingStar = null;
      }
    }
  }

  // --- TERRAIN & GROUND ---
  renderGround(game) {
    const ctx = this.ctx;
    const worldId = game.currentLevelData ? game.currentLevelData.world : 1;
    const groundY = 600;

    // Soft atmospheric horizon glow before ground line
    ctx.save();
    const hazeGrad = ctx.createLinearGradient(0, groundY - 45, 0, groundY);
    if (worldId === 1) {
      hazeGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      hazeGrad.addColorStop(1, 'rgba(56, 189, 248, 0.14)');
    } else if (worldId === 2) {
      hazeGrad.addColorStop(0, 'rgba(192, 132, 252, 0)');
      hazeGrad.addColorStop(1, 'rgba(192, 132, 252, 0.16)');
    } else {
      hazeGrad.addColorStop(0, 'rgba(251, 146, 60, 0)');
      hazeGrad.addColorStop(1, 'rgba(251, 146, 60, 0.15)');
    }
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(-200, groundY - 45, 2600, 45);
    ctx.restore();

    ctx.save();
    if (worldId === 1) {
      // Lunar surface
      const grad = ctx.createLinearGradient(0, groundY, 0, groundY + 250);
      grad.addColorStop(0, '#334155');
      grad.addColorStop(0.2, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(-200, groundY, 2600, 400);

      // Lunar surface rim highlight
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-200, groundY);
      ctx.lineTo(2400, groundY);
      ctx.stroke();

      // Moon craters
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      for (let cx = 100; cx < 2200; cx += 220) {
        ctx.beginPath();
        ctx.ellipse(cx, groundY + 12, 45, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (worldId === 2) {
      // Crystal Planet surface
      const grad = ctx.createLinearGradient(0, groundY, 0, groundY + 250);
      grad.addColorStop(0, '#4c1d95');
      grad.addColorStop(0.2, '#2e1065');
      grad.addColorStop(1, '#170638');
      ctx.fillStyle = grad;
      ctx.fillRect(-200, groundY, 2600, 400);

      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-200, groundY);
      ctx.lineTo(2400, groundY);
      ctx.stroke();

      // Glowing ice crystal protrusions along the ground
      for (let cx = 150; cx < 2100; cx += 180) {
        ctx.fillStyle = '#00E5FF';
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx + 10, groundY - 24);
        ctx.lineTo(cx + 20, groundY);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Asteroid Field platform
      const grad = ctx.createLinearGradient(0, groundY, 0, groundY + 250);
      grad.addColorStop(0, '#27272a');
      grad.addColorStop(0.2, '#18181b');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(-200, groundY, 2600, 400);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-200, groundY);
      ctx.lineTo(2400, groundY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- SLINGSHOT LAUNCHER ---
  renderSlingshotBack(game) {
    const ctx = this.ctx;
    const sx = game.launcherPos.x;
    const sy = game.launcherPos.y;

    ctx.save();
    // Metal launch pedestal
    const pedGrad = ctx.createLinearGradient(sx - 20, sy, sx + 20, sy + 80);
    pedGrad.addColorStop(0, '#475569');
    pedGrad.addColorStop(0.5, '#64748B');
    pedGrad.addColorStop(1, '#1E293B');

    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.moveTo(sx - 15, sy + 80);
    ctx.lineTo(sx + 15, sy + 80);
    ctx.lineTo(sx + 24, sy);
    ctx.lineTo(sx - 24, sy);
    ctx.closePath();
    ctx.fill();

    // Left energy fork
    ctx.fillStyle = '#334155';
    ctx.fillRect(sx - 30, sy - 40, 14, 45);
    // Right energy fork
    ctx.fillRect(sx + 16, sy - 40, 14, 45);

    // Glowing energy tips
    ctx.fillStyle = '#00E5FF';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sx - 23, sy - 40, 7, 0, Math.PI * 2);
    ctx.arc(sx + 23, sy - 40, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Back elastic energy band (left to creature)
    if (game.isDragging && game.dragCurrent) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx - 23, sy - 40);
      ctx.lineTo(game.dragCurrent.x, game.dragCurrent.y);
      ctx.stroke();
    } else if (game.readyCreature && game.state === 'AIMING') {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx - 23, sy - 40);
      ctx.quadraticCurveTo(sx - 12, sy - 18, sx, sy - 12);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderSlingshotFront(game) {
    const ctx = this.ctx;
    const sx = game.launcherPos.x;
    const sy = game.launcherPos.y;

    ctx.save();
    // Front elastic energy band (creature to right fork)
    if (game.isDragging && game.dragCurrent) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(game.dragCurrent.x, game.dragCurrent.y);
      ctx.lineTo(sx + 23, sy - 40);
      ctx.stroke();

      // Energy cradle ring holding creature
      ctx.strokeStyle = '#FFE259';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(game.dragCurrent.x, game.dragCurrent.y, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (game.readyCreature && game.state === 'AIMING') {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 12);
      ctx.quadraticCurveTo(sx + 12, sy - 18, sx + 23, sy - 40);
      ctx.stroke();

      // Energy cradle glow holding creature
      ctx.strokeStyle = '#FFE259';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy - 12, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- TRAJECTORY PREDICTION PREVIEW ---
  renderTrajectory(points) {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const alpha = Math.max(0.15, 1.0 - (i / points.length));
      const radius = Math.max(2.5, 6 - (i * 0.12));

      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- AIMING & IN-FLIGHT CREATURES ---
  renderAimingCreature(game) {
    const isDragging = !!(game.isDragging && game.dragCurrent);
    const pos = isDragging ? game.dragCurrent : { x: game.launcherPos.x, y: game.launcherPos.y - 12 };
    const char = (window.CHARACTERS || CHARACTERS)[game.readyCreature];
    if (!char) return;

    let angle = 0;
    let pullDist = 0;
    if (isDragging) {
      angle = Math.atan2(game.launcherPos.y - pos.y, game.launcherPos.x - pos.x);
      pullDist = Math.hypot(game.launcherPos.x - pos.x, game.launcherPos.y - pos.y);
    } else {
      const t = performance.now() * 0.003;
      angle = Math.sin(t) * 0.06;
    }

    this.drawCuteCreature(pos.x, pos.y, char, angle, false, false, 0, isDragging, pullDist);
  }

  renderInFlightCreature(projectile) {
    const char = (window.CHARACTERS || CHARACTERS)[projectile.charId];
    if (!char) return;

    const ctx = this.ctx;
    const pos = projectile.position;
    const vel = projectile.velocity || { x: 0, y: 0 };
    const speed = Math.hypot(vel.x, vel.y);
    const angle = projectile.angle || Math.atan2(vel.y, vel.x);

    // Glowing particle & speed ribbon trail
    if (projectile.trail && projectile.trail.length > 1) {
      ctx.save();
      const trailLen = projectile.trail.length;
      for (let i = 0; i < trailLen; i++) {
        const t = projectile.trail[i];
        const progress = i / trailLen;
        const alpha = progress * 0.55;
        const rad = char.radius * (0.28 + 0.65 * progress);

        // Core glowing trail
        ctx.fillStyle = char.glowColor || 'rgba(255, 255, 255, 0.4)';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Elemental cosmic sparkles along the trail
        if (i % 3 === 0 && progress > 0.3) {
          const sparkColor = char.id === 'solar' ? '#FFF07A'
            : (char.id === 'frost' ? '#E0F7FA'
            : (char.id === 'gravity' ? '#F0ABFC' : '#86EFAC'));
          ctx.fillStyle = sparkColor;
          ctx.globalAlpha = progress * 0.8;
          ctx.beginPath();
          const sparkOffset = Math.sin(i * 1.5) * (char.radius * 0.35);
          ctx.arc(t.x + sparkOffset, t.y + sparkOffset, 2.5 * progress, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    this.drawCuteCreature(pos.x, pos.y, char, angle, true, projectile.abilityUsed, speed, false, 0);
  }

  // --- PROCEDURAL CUTE 3D-CARTOON SPACE CREATURE ART ---
  drawCuteCreature(x, y, char, angle = 0, isFlying = false, abilityUsed = false, speed = 0, isDragging = false, pullDist = 0) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const r = char.radius;
    const t = performance.now() * 0.003;

    // ── 1. Squash & Stretch Animation ────────────────────────────────
    if (isFlying) {
      const stretch = Math.min(1.22, 1 + speed * 0.007);
      const squash = 1 / Math.sqrt(stretch);
      ctx.scale(stretch, squash);
    } else if (isDragging) {
      const pullRatio = Math.min(1.0, pullDist / 110);
      ctx.scale(1 + pullRatio * 0.12, 1 - pullRatio * 0.08);
    } else {
      const breath = 1 + Math.sin(t * 3) * 0.025;
      ctx.scale(breath, 2 - breath);
    }

    // ── 2. Back Accessories (Drawn behind body) ──────────────────────
    if (char.id === 'gravity') {
      ctx.save();
      ctx.shadowColor = '#C084FC';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
      ctx.lineWidth = 2.5;

      // Primary ring back half
      ctx.save();
      ctx.rotate(t * 0.85);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.55, r * 0.42, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Secondary ring back half
      ctx.save();
      ctx.rotate(-t * 0.6 + 1.2);
      ctx.strokeStyle = 'rgba(240, 171, 252, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.25, r * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

    } else if (char.id === 'solar') {
      // Solar flare corona petals (volumetric warm flame crown)
      ctx.save();
      ctx.shadowColor = '#FF9900';
      ctx.shadowBlur = 14;
      const petalCount = 7;
      for (let i = 0; i < petalCount; i++) {
        const a = (i / petalCount) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 2 + i * 1.3) * 0.1;
        const wave = Math.sin(t * 3.5 + i * 1.8);
        const petalLen = r + 8 + wave * 3.5;

        const flameGrad = ctx.createLinearGradient(
          Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7,
          Math.cos(a) * petalLen, Math.sin(a) * petalLen
        );
        flameGrad.addColorStop(0, '#FFE066');
        flameGrad.addColorStop(0.4, '#FF9900');
        flameGrad.addColorStop(1, '#FF3300');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        const spread = 0.22;
        ctx.moveTo(Math.cos(a - spread) * r * 0.9, Math.sin(a - spread) * r * 0.9);
        const ctrlX = Math.cos(a + wave * 0.08) * (petalLen + 2);
        const ctrlY = Math.sin(a + wave * 0.08) * (petalLen + 2);
        ctx.quadraticCurveTo(ctrlX, ctrlY, Math.cos(a + spread) * r * 0.9, Math.sin(a + spread) * r * 0.9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

    } else if (char.id === 'frost') {
      // 3D Faceted Crystal Horns
      ctx.save();
      ctx.shadowColor = '#67E8F9';
      ctx.shadowBlur = 12;
      const hornOffsets = [-r * 0.32, r * 0.32];
      for (let ho of hornOffsets) {
        const dir = ho < 0 ? -1 : 1;
        const baseCenterY = -r * 0.85;
        const tipX = ho + dir * (r * 0.12);
        const tipY = -r - 14 + Math.sin(t * 2) * 1.2;

        // Front facet (lit)
        ctx.fillStyle = '#E0F7FA';
        ctx.beginPath();
        ctx.moveTo(ho - dir * (r * 0.16), baseCenterY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ho, baseCenterY + 2);
        ctx.closePath();
        ctx.fill();

        // Side facet (shadowed)
        ctx.fillStyle = '#7DD3FC';
        ctx.beginPath();
        ctx.moveTo(ho, baseCenterY + 2);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ho + dir * (r * 0.16), baseCenterY);
        ctx.closePath();
        ctx.fill();

        // Crisp crystal edge
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ho - dir * (r * 0.16), baseCenterY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ho + dir * (r * 0.16), baseCenterY);
        ctx.stroke();
      }
      ctx.restore();

    } else if (char.id === 'bouncer') {
      // Springy tail underneath
      ctx.save();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 3;
      const coilCount = 3;
      const coilH = 4;
      let curY = r - 2;
      ctx.beginPath();
      ctx.moveTo(0, curY);
      for (let c = 0; c < coilCount; c++) {
        const s = (c % 2 === 0) ? -6 : 6;
        curY += coilH;
        ctx.lineTo(s, curY);
      }
      ctx.stroke();

      // Top jiggling antenna
      const antWave = Math.sin(t * 4) * 0.15;
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.quadraticCurveTo(antWave * 15, -r - 10, antWave * 8, -r - 16);
      ctx.stroke();

      // Glowing antenna spark tip
      ctx.fillStyle = '#86EFAC';
      ctx.shadowColor = '#34D399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(antWave * 8, -r - 16, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── 3. Main 3D Spherical Body with Studio Lighting ────────────────
    ctx.save();
    ctx.shadowColor = char.glowColor || char.color;
    ctx.shadowBlur = isFlying ? 28 : 16;

    // Multi-stop 3D sphere gradient
    const lightX = -r * 0.35;
    const lightY = -r * 0.35;
    const bodyGrad = ctx.createRadialGradient(lightX, lightY, r * 0.08, 0, 0, r * 1.05);
    bodyGrad.addColorStop(0,    '#FFFFFF');
    bodyGrad.addColorStop(0.2,  char.accentColor || char.color);
    bodyGrad.addColorStop(0.65, char.color);
    bodyGrad.addColorStop(0.9,  char.darkColor || char.accentColor || '#000');
    bodyGrad.addColorStop(1.0,  char.accentColor || char.color);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 3D contour stroke
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Soft Studio Bounce Rim-Light (bottom-right edge)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1.2, 0.2, Math.PI * 0.55);
    ctx.stroke();
    ctx.restore();

    // Curved Glossy Specular Highlight (pill shine on top-left)
    ctx.save();
    const glossGrad = ctx.createLinearGradient(-r * 0.5, -r * 0.6, -r * 0.1, -r * 0.2);
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = glossGrad;
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.38, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Secondary micro-ping highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-r * 0.52, -r * 0.14, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // ── 4. Front Accessories (Drawn over body) ─────────────────────────
    if (char.id === 'bouncer') {
      ctx.save();
      // Leather goggle strap
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(-r * 0.88, -r * 0.32, r * 1.76, 7);

      // Goggle frames
      const gx1 = -r * 0.34, gx2 = r * 0.34, gy = -r * 0.26, gw = r * 0.3, gh = r * 0.24;
      ctx.fillStyle = '#022C22';
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.ellipse(gx1, gy, gw, gh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(gx2, gy, gw, gh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing cyan-emerald tinted glass
      ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
      ctx.beginPath();
      ctx.ellipse(gx1, gy, gw - 2, gh - 2, 0, 0, Math.PI * 2);
      ctx.ellipse(gx2, gy, gw - 2, gh - 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass specular reflection slash
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(gx1 - gw * 0.5, gy - gh * 0.5);
      ctx.lineTo(gx1 + gw * 0.2, gy + gh * 0.5);
      ctx.moveTo(gx2 - gw * 0.5, gy - gh * 0.5);
      ctx.lineTo(gx2 + gw * 0.2, gy + gh * 0.5);
      ctx.stroke();
      ctx.restore();

    } else if (char.id === 'gravity') {
      // Front half of rings passing in front of body
      ctx.save();
      ctx.shadowColor = '#C084FC';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.95)';
      ctx.lineWidth = 2.6;

      ctx.save();
      ctx.rotate(t * 0.85);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.55, r * 0.42, 0, 0, Math.PI);
      ctx.stroke();

      // Orbiting mini-moon on the front half
      const moonAngle = (t * 1.8) % (Math.PI * 2);
      if (moonAngle < Math.PI) {
        const mx = Math.cos(moonAngle) * r * 1.55;
        const my = Math.sin(moonAngle) * r * 0.42;
        ctx.fillStyle = '#FDF4FF';
        ctx.beginPath();
        ctx.arc(mx, my, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D946EF';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.rotate(-t * 0.6 + 1.2);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.25, r * 0.32, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

    } else if (char.id === 'solar') {
      // Golden star crest on forehead
      ctx.save();
      ctx.fillStyle = '#FFF59D';
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 8;
      const starX = 0, starY = -r * 0.48;
      ctx.beginPath();
      ctx.arc(starX, starY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (char.id === 'frost') {
      // Icy crystal forehead diamond
      ctx.save();
      ctx.fillStyle = '#CFFAFE';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.0;
      const fx = 0, fy = -r * 0.52;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 4);
      ctx.lineTo(fx + 3, fy);
      ctx.lineTo(fx, fy + 4);
      ctx.lineTo(fx - 3, fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // ── 5. Expressive Pixar / Anime Eyes ──────────────────────────────
    ctx.save();
    const ex = r * 0.32;
    const ey = -r * 0.16;
    const ew = r * 0.28;
    const eh = r * 0.36;

    let lookX = 0;
    let lookY = 0;
    if (isFlying) {
      lookX = ew * 0.38;
      lookY = eh * 0.18;
    } else if (isDragging) {
      lookX = -ew * 0.25;
      lookY = eh * 0.15;
    } else {
      lookX = Math.sin(t * 1.2) * (ew * 0.2);
    }

    const eyeOffsets = [-ex, ex];
    for (let ox of eyeOffsets) {
      // Eye White (Sclera) with soft upper shadow
      const eyeGrad = ctx.createLinearGradient(ox, ey - eh, ox, ey + eh);
      eyeGrad.addColorStop(0, '#E2E8F0');
      eyeGrad.addColorStop(0.3, '#FFFFFF');
      eyeGrad.addColorStop(1, '#FFFFFF');

      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.ellipse(ox, ey, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer eye contour
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Colored Iris
      const irisR = ew * 0.72;
      const irisX = ox + lookX;
      const irisY = ey + lookY;

      let irisTop = '#FDE047', irisBot = '#D97706';
      if (char.id === 'frost') { irisTop = '#67E8F9'; irisBot = '#0284C7'; }
      else if (char.id === 'gravity') { irisTop = '#F0ABFC'; irisBot = '#7E22CE'; }
      else if (char.id === 'bouncer') { irisTop = '#86EFAC'; irisBot = '#047857'; }

      const irisGrad = ctx.createLinearGradient(irisX, irisY - irisR, irisX, irisY + irisR);
      irisGrad.addColorStop(0, irisTop);
      irisGrad.addColorStop(1, irisBot);

      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
      ctx.fill();

      // Jet-Black Pupil
      const pupilR = irisR * 0.58;
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.arc(irisX, irisY, pupilR, 0, Math.PI * 2);
      ctx.fill();

      // Dual Catchlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(irisX - pupilR * 0.35, irisY - pupilR * 0.38, pupilR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(irisX + pupilR * 0.42, irisY + pupilR * 0.38, pupilR * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows / Eyelashes
      ctx.strokeStyle = char.darkColor || '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (isFlying) {
        const browTilt = ox < 0 ? 0.3 : -0.3;
        ctx.moveTo(ox - ew * 0.9, ey - eh * 1.05 - browTilt * 4);
        ctx.lineTo(ox + ew * 0.9, ey - eh * 1.05 + browTilt * 4);
      } else if (isDragging) {
        ctx.moveTo(ox - ew * 0.85, ey - eh * 0.95);
        ctx.lineTo(ox + ew * 0.85, ey - eh * 1.05);
      } else {
        ctx.arc(ox, ey - eh * 0.9, ew * 0.7, Math.PI * 1.15, Math.PI * 1.85);
      }
      ctx.stroke();
    }
    ctx.restore();

    // ── 6. Cheeks & Expressive Mouth ──────────────────────────────────
    ctx.save();
    // Rosy Blush Cheeks
    ctx.fillStyle = 'rgba(255, 120, 150, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.52, r * 0.16, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse( r * 0.52, r * 0.16, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // White twinkle dots on cheeks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-r * 0.52, r * 0.14, 1.4, 0, Math.PI * 2);
    ctx.arc( r * 0.52, r * 0.14, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    if (isFlying) {
      // Wide excited open "O" mouth with teeth and cute tongue
      const mw = r * 0.26;
      const mh = r * 0.3;
      const my = r * 0.38;

      ctx.fillStyle = '#831843';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, my, mw, mh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top cute tooth
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(-mw * 0.55, my - mh * 0.95, mw * 1.1, mh * 0.6, 2);
      ctx.fill();

      // Pink tongue inside
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.ellipse(0, my + mh * 0.45, mw * 0.65, mh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (isDragging) {
      // Determined cute pout / cat smile
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, r * 0.18, r * 0.26, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      // Cheerful joyful open smile
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, r * 0.2, r * 0.28, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Cute tongue peek
      ctx.fillStyle = '#FB7185';
      ctx.beginPath();
      ctx.arc(0, r * 0.35, r * 0.12, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  // --- DESTRUCTIBLE BLOCKS RENDERING ---
  renderBlocks(game) {
    const ctx = this.ctx;
    for (let block of game.physics.blocks) {
      const pos = block.position;
      const w = block.width;
      const h = block.height;
      const mat = block.materialType || 'wood';
      const angle = block.angle;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      if (mat === 'wood') {
        // Wooden plank
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, '#A0522D');
        grad.addColorStop(0.5, '#8B4513');
        grad.addColorStop(1, '#6B3410');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Border & grain line
        ctx.strokeStyle = '#522608';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, 0);
        ctx.lineTo(w / 2 - 3, 0);
        ctx.stroke();

      } else if (mat === 'stone') {
        // Lunar stone block
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, '#94A3B8');
        grad.addColorStop(0.5, '#64748B');
        grad.addColorStop(1, '#475569');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

      } else if (mat === 'ice') {
        // Translucent Glowing Ice
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, 'rgba(165, 243, 252, 0.88)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.75)');
        grad.addColorStop(1, 'rgba(2, 132, 199, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Specular sheen
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, -h / 2 + 4);
        ctx.lineTo(w / 2 - 4, -h / 2 + 4);
        ctx.stroke();

      } else if (mat === 'metal') {
        // Titanium Girder
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, '#475569');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#1E293B');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Corner rivets
        ctx.fillStyle = '#CBD5E1';
        const rw = w / 2 - 4;
        const rh = h / 2 - 4;
        ctx.fillRect(-rw, -rh, 2.5, 2.5);
        ctx.fillRect(rw - 2.5, -rh, 2.5, 2.5);
        ctx.fillRect(-rw, rh - 2.5, 2.5, 2.5);
        ctx.fillRect(rw - 2.5, rh - 2.5, 2.5, 2.5);

      } else if (mat === 'tnt') {
        // Red Explosive Canister
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, '#EF4444');
        grad.addColorStop(0.5, '#DC2626');
        grad.addColorStop(1, '#991B1B');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.strokeStyle = '#FECACA';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Warning text / icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡CORE', 0, 0);
      }

      // Damage crack overlay if HP < maxHp
      if (block.hp < block.maxHp) {
        const damageRatio = 1 - (block.hp / block.maxHp);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(w * 0.25 * damageRatio, h * 0.3 * damageRatio);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- ROBOTS & OVERLORD BOSS RENDERING ---
  renderRobots(game) {
    const ctx = this.ctx;
    for (let bot of game.physics.robots) {
      const pos = bot.position;
      const angle = bot.angle;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      if (bot.gameType === 'boss') {
        // ALIEN OVERLORD MECH BOSS!
        this.drawAlienOverlordBoss(bot);
      } else if (bot.subType === 'brute') {
        // Heavy Armored Brute Bot
        this.drawBruteBot(bot);
      } else {
        // Round Scout Bot
        this.drawScoutBot(bot);
      }

      ctx.restore();
    }
  }

  drawScoutBot(bot) {
    const ctx = this.ctx;
    const r   = bot.radius || 18;
    const dmgRatio = bot.maxHp > 0 ? 1 - bot.hp / bot.maxHp : 0;
    const t = performance.now() * 0.003;

    // Metallic spherical chassis
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    grad.addColorStop(0,   '#E2E8F0');
    grad.addColorStop(0.4, '#94A3B8');
    grad.addColorStop(1,   '#334155');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = dmgRatio > 0.5 ? '#EF4444' : '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Segmented chest plate strip
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-r * 0.7, r * 0.15, r * 1.4, r * 0.3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-r * 0.65, r * 0.18, r * 1.3, r * 0.08);

    // Antenna
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-4, -r - 12);
    ctx.stroke();
    const pulseAlpha = 0.6 + Math.sin(t * 3.5) * 0.4;
    ctx.fillStyle = `rgba(239,68,68,${pulseAlpha})`;
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(-4, -r - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor bar
    const visorColor = dmgRatio > 0.5 ? '#EF4444' : (bot.hp < bot.maxHp ? '#FB923C' : '#FBBF24');
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(-r * 0.7, -r * 0.2, r * 1.4, r * 0.38, 4);
    ctx.fill();
    ctx.fillStyle = visorColor;
    ctx.shadowColor = visorColor;
    ctx.shadowBlur  = 8;
    ctx.fillRect(-r * 0.62, -r * 0.12, r * 1.24, r * 0.22);
    ctx.shadowBlur = 0;

    // Angry brow if damaged
    if (dmgRatio > 0.3) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.28);
      ctx.lineTo( r * 0.6, -r * 0.28);
      ctx.stroke();
    }

    // HP indicator dot (tiny, top-right)
    // Rendered as small bar ABOVE the bot — shown only if damaged
    if (bot.hp < bot.maxHp && bot.hp > 0) {
      const bw = r * 2;
      const by = -r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-bw / 2, by, bw, 5);
      const hpPct = bot.hp / bot.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#22C55E' : hpPct > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(-bw / 2, by, bw * hpPct, 5);
    }

    // dummy line to keep original structure:
    ctx.fillStyle = bot.hp < bot.maxHp ? '#EF4444' : '#FBBF24';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawBruteBot(bot) {
    const ctx = this.ctx;
    const s   = 38;
    const hs  = s / 2;
    const dmgRatio = bot.maxHp > 0 ? 1 - bot.hp / bot.maxHp : 0;
    const t   = performance.now() * 0.003;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-hs + 2, -hs + 2, s, s);

    // Heavy armored body
    const grad = ctx.createLinearGradient(-hs, -hs, hs, hs);
    grad.addColorStop(0,   '#78818F');
    grad.addColorStop(0.4, '#4A5568');
    grad.addColorStop(1,   '#1A202C');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, s, s, 4);
    ctx.fill();

    ctx.strokeStyle = dmgRatio > 0.5 ? '#EF4444' : '#2D3748';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Armored brow plate
    ctx.fillStyle = '#2D3748';
    ctx.fillRect(-hs, -hs, s, 9);

    // Shoulder pauldrons
    ctx.fillStyle = '#374151';
    ctx.fillRect(-hs - 5, -hs + 9, 8, 14);
    ctx.fillRect(hs - 3, -hs + 9, 8, 14);

    // Dual angry eye slits
    const eyeColor = dmgRatio > 0.5 ? '#FF5555' : '#EF4444';
    ctx.fillStyle  = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur  = 10;
    ctx.fillRect(-13, -6, 9, 5);
    ctx.fillRect(4,   -6, 9, 5);
    ctx.shadowBlur = 0;

    // Angry brow chevron when damaged
    if (dmgRatio > 0.2) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-13, -10);
      ctx.lineTo(-5,  -7);
      ctx.moveTo(13,  -10);
      ctx.lineTo(5,   -7);
      ctx.stroke();
    }

    // Chest grille
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    for (let gl = -hs + 12; gl < hs - 4; gl += 5) {
      ctx.beginPath();
      ctx.moveTo(-hs + 4, gl);
      ctx.lineTo(hs  - 4, gl);
      ctx.stroke();
    }

    // Rivets at each corner
    ctx.fillStyle = '#94A3B8';
    [[-hs + 4, -hs + 4], [hs - 4, -hs + 4], [-hs + 4, hs - 4], [hs - 4, hs - 4]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // HP bar
    if (bot.hp < bot.maxHp && bot.hp > 0) {
      const bw = s + 4;
      const by = -hs - 13;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-bw / 2, by, bw, 6);
      const hpPct = bot.hp / bot.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#22C55E' : hpPct > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(-bw / 2, by, bw * hpPct, 6);
    }
  }

  drawAlienOverlordBoss(boss) {
    const ctx = this.ctx;
    const r   = boss.radius || 44;
    const t   = performance.now() * 0.003;
    const hpRatio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
    const dmgRatio = 1 - hpRatio;

    // ── Outer pulsing shield ring ─────────────────────────────────────
    const pulseR = r + 8 + Math.sin(t * 2.2) * 4;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.15;
    ctx.strokeStyle = `hsl(${340 + dmgRatio * 30}, 90%, 60%)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Armored body ─────────────────────────────────────────────────
    const h1 = dmgRatio > 0.5 ? '#FF6B35' : '#FF4D6D';
    const h2 = dmgRatio > 0.5 ? '#B91C1C' : '#C9184A';
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    grad.addColorStop(0,   '#FFFFFF');
    grad.addColorStop(0.2, h1);
    grad.addColorStop(0.65, h2);
    grad.addColorStop(1,   '#59020A');
    ctx.fillStyle = grad;
    ctx.shadowColor = h1;
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Armor plating rings
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // ── Dual antennae ─────────────────────────────────────────────────
    ctx.strokeStyle = '#9B1239';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r + 2);
    ctx.lineTo(-r * 0.6, -r - 20);
    ctx.moveTo( r * 0.4, -r + 2);
    ctx.lineTo( r * 0.6, -r - 20);
    ctx.stroke();
    const antAlpha = 0.7 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle  = `rgba(255,80,100,${antAlpha})`;
    ctx.shadowColor = '#FF3366';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(-r * 0.6, -r - 20, 7, 0, Math.PI * 2);
    ctx.arc( r * 0.6, -r - 20, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Central Core Eye ─────────────────────────────────────────────
    ctx.fillStyle = '#0A0A14';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    const eyeColor = dmgRatio > 0.6 ? '#FF6600' : '#FF0044';
    ctx.fillStyle  = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur  = 20 + Math.sin(t * 5) * 8;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pupil slit
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 11, t * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // ── HP Bar ───────────────────────────────────────────────────────
    if (boss.hp < boss.maxHp && boss.hp > 0) {
      const bw = r * 2.4;
      const by = r + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-bw / 2, by, bw, 8);
      ctx.fillStyle = hpRatio > 0.5 ? '#EF4444' : hpRatio > 0.25 ? '#F97316' : '#FCD34D';
      ctx.fillRect(-bw / 2, by, bw * hpRatio, 8);
      ctx.strokeStyle = '#FF3366';
      ctx.lineWidth = 1;
      ctx.strokeRect(-bw / 2, by, bw, 8);
    }
  }

  // --- ASTRONAUT RESCUE TARGET ---
  renderAstronauts(game) {
    const ctx = this.ctx;
    for (let astro of game.physics.astronauts) {
      const pos = astro.position;
      const r = astro.radius || 18;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Chibi white astronaut suit
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Golden bubble helmet visor
      const visorGrad = ctx.createLinearGradient(-8, -8, 8, 8);
      visorGrad.addColorStop(0, '#FDE047');
      visorGrad.addColorStop(0.5, '#EAB308');
      visorGrad.addColorStop(1, '#CA8A04');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.ellipse(3, -1, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Visor highlight
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Floating status bubble
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      if (astro.rescued) {
        ctx.fillStyle = '#10B981';
        ctx.fillText('💖 RESCUED', 0, -r - 8);
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.fillText('👋 HELP!', 0, -r - 8);
      }

      ctx.restore();
    }
  }

  // --- PARTICLES & VFX SYSTEMS ---
  spawnSparks(x, y, count, color = '#FFD700', maxSpeed = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * maxSpeed + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        alpha: 1.0,
        decay: Math.random() * 0.04 + 0.02
      });
    }
  }

  spawnDebris(x, y, count, color = '#8B5A2B') {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 8,
        color,
        size: Math.random() * 6 + 3,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.015,
        isDebris: true,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  spawnExplosionDebris(x, y, count, color = '#64748B') {
    this.spawnDebris(x, y, count, color);
    this.spawnSparks(x, y, count * 1.5, '#FF7A00', 9);
  }

  spawnFrostParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#00E5FF',
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.01
      });
    }
  }

  spawnShockwave(x, y, maxRadius, color = '#FFF', speed = 20) {
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius,
      color,
      speed,
      alpha: 1.0
    });
  }

  spawnVortexEffect(x, y, duration) {
    this.vortexEffects.push({
      x, y,
      duration,
      elapsed: 0,
      particles: Array.from({ length: 30 }, () => ({
        dist: Math.random() * 200 + 40,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.08 + 0.04,
        size: Math.random() * 3 + 1.5
      }))
    });
  }

  showFloatingText(x, y, text, color = '#FFF') {
    this.floatingTexts.push({
      x, y,
      text,
      color,
      alpha: 1.0,
      vy: -1.2
    });
  }

  updateAndRenderParticles(dt) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.alpha -= p.decay;

      if (p.isDebris) {
        p.rot += p.vRot;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.isDebris) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  updateAndRenderShockwaves(dt) {
    const ctx = this.ctx;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = 1.0 - (sw.radius / sw.maxRadius);

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = Math.max(1, 5 * sw.alpha);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderVortices(dt) {
    const ctx = this.ctx;
    for (let i = this.vortexEffects.length - 1; i >= 0; i--) {
      const v = this.vortexEffects[i];
      v.elapsed += dt;

      if (v.elapsed >= v.duration) {
        this.vortexEffects.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(v.x, v.y);

      // Swirling particles
      for (let p of v.particles) {
        p.angle += p.speed;
        p.dist = Math.max(5, p.dist - 0.9);
        if (p.dist <= 5) p.dist = Math.random() * 220 + 50;

        const px = Math.cos(p.angle) * p.dist;
        const py = Math.sin(p.angle) * p.dist;

        ctx.fillStyle = '#B250FF';
        ctx.shadowColor = '#B250FF';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  updateAndRenderFloatingTexts(dt) {
    const ctx = this.ctx;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.alpha -= 0.015;

      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.font = 'bold 16px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}

window.Renderer = Renderer;
