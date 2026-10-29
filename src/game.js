/**
 * ORBIT BLASTERS — MAIN GAME CONTROLLER
 * Fixed: init-phase guard called after spawn, input blocked during loading,
 * level data used as single source of truth throughout, state machine cleaned.
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    // State: 'MENU' | 'LOADING' | 'AIMING' | 'FLIGHT' | 'SETTLING' | 'COMPLETE' | 'OVER'
    this.state    = 'MENU';
    this.isPaused = false;

    // Subsystems
    this.physics  = new PhysicsEngine(this);
    this.renderer = new Renderer(this.canvas);
    this.ui       = new UIManager(this);

    // Level state — single authoritative source
    this.currentLevelIndex = 1;
    this.currentLevelData  = null;
    this.creatureList  = [];
    this.creatureIndex = 0;
    this.readyCreature = null;
    this.score = 0;

    // Slingshot
    this.launcherPos      = { x: 220, y: 520 };
    this.isDragging       = false;
    this.dragStart        = null;
    this.dragCurrent      = null;
    this.trajectoryPoints = [];
    this.maxDragDistance  = 110;
    this.launchPowerFactor = 0.22;

    // Time
    this.lastTime = performance.now();

    // Guard against multiple startLevel calls during transition
    this._levelTransitioning = false;

    this.init();
  }

  init() {
    this.physics.init();
    this.bindInputs();
    this.startLoop();
  }

  // ── INPUT ────────────────────────────────────────────────────────────────
  bindInputs() {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    window.addEventListener('mousemove',      (e) => this.onPointerMove(e));
    window.addEventListener('mouseup',        ()  => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) this.onPointerDown(e.touches[0]);
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) this.onPointerMove(e.touches[0]);
    }, { passive: false });
    window.addEventListener('touchend', () => this.onPointerUp());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (this.state === 'FLIGHT') this.triggerCurrentAbility();
        e.preventDefault();
      } else if (e.code === 'KeyR') {
        if (this.state !== 'MENU' && this.state !== 'LOADING') this.restartCurrentLevel();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state !== 'MENU' && this.state !== 'LOADING') {
          if (this.isPaused) this.ui.hidePause();
          else this.ui.showPause();
        }
      } else if (e.code === 'KeyM') {
        window.audio.toggleMute();
        this.ui.updateAudioIcons();
      }
    });
  }

  screenToWorld(clientX, clientY) {
    const rect    = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const cam     = this.renderer.camera;
    const centerX = this.renderer.width  / 2;
    const centerY = this.renderer.height / 2;

    return {
      x: (screenX - centerX) / cam.zoom + cam.x,
      y: (screenY - centerY) / cam.zoom + cam.y
    };
  }

  onPointerDown(e) {
    window.audio.ensureContext();

    // Block input during loading, menu, or after level end
    if (this.state === 'MENU' || this.state === 'LOADING' ||
        this.state === 'COMPLETE' || this.state === 'OVER' ||
        this.isPaused) return;

    const worldPos = this.screenToWorld(e.clientX, e.clientY);

    if (this.state === 'FLIGHT') {
      this.triggerCurrentAbility();
      return;
    }

    if (this.state !== 'AIMING' || !this.readyCreature) return;

    const dist = Math.hypot(worldPos.x - this.launcherPos.x, worldPos.y - this.launcherPos.y);
    if (dist < 80) {
      this.isDragging  = true;
      this.dragStart   = { ...this.launcherPos };
      this.dragCurrent = { ...this.launcherPos };
      this.updateTrajectory();
    }
  }

  onPointerMove(e) {
    if (!this.isDragging) return;

    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    let dx = worldPos.x - this.launcherPos.x;
    let dy = worldPos.y - this.launcherPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxDragDistance) {
      dx = (dx / dist) * this.maxDragDistance;
      dy = (dy / dist) * this.maxDragDistance;
    }

    this.dragCurrent = { x: this.launcherPos.x + dx, y: this.launcherPos.y + dy };
    window.audio.playSlingshotStretch(Math.min(1.0, dist / this.maxDragDistance));
    this.updateTrajectory();
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const dx = this.launcherPos.x - this.dragCurrent.x;
    const dy = this.launcherPos.y - this.dragCurrent.y;
    const pullDist = Math.hypot(dx, dy);

    if (pullDist > 18) {
      const vx = dx * this.launchPowerFactor;
      const vy = dy * this.launchPowerFactor;

      const launchedBody = this.physics.launchCreature(
        this.readyCreature, this.launcherPos, { x: vx, y: vy }
      );

      if (launchedBody) {
        this.state = 'FLIGHT';
        this.trajectoryPoints = [];
        this.ui.showAbilityBanner(this.readyCreature);
      }
    } else {
      this.dragCurrent = null;
      this.trajectoryPoints = [];
    }
  }

  updateTrajectory() {
    if (!this.dragCurrent) { this.trajectoryPoints = []; return; }
    const dx = this.launcherPos.x - this.dragCurrent.x;
    const dy = this.launcherPos.y - this.dragCurrent.y;
    this.trajectoryPoints = this.physics.predictTrajectory(
      this.launcherPos, { x: dx * this.launchPowerFactor, y: dy * this.launchPowerFactor }, 36
    );
  }

  triggerCurrentAbility() {
    const proj = this.physics.currentProjectile;
    if (!proj || proj.abilityUsed) return;

    const char = (window.CHARACTERS || CHARACTERS)[proj.charId];
    if (char && char.activateAbility) {
      const activated = char.activateAbility(this, proj);
      if (activated) this.ui.hideAbilityBanner();
    }
  }

  // ── LEVEL LOADING ─────────────────────────────────────────────────────────
  startLevel(levelId) {
    if (this._levelTransitioning) return;
    this._levelTransitioning = true;
    this.state = 'LOADING';

    // ── 1. Find level data (single source of truth) ─────────────────────
    const levels    = window.LEVELS_DATA || LEVELS_DATA;
    const levelData = levels.find(l => l.id === levelId) || levels[0];

    // ── 2. Reset all state ───────────────────────────────────────────────
    this.currentLevelIndex = levelData.id;   // always use levelData.id, not the arg
    this.currentLevelData  = levelData;
    this.score         = 0;
    this.creatureList  = [...levelData.creatures];
    this.creatureIndex = 0;
    this.readyCreature = this.creatureList[0];
    this.isPaused      = false;
    this.isDragging    = false;
    this.dragCurrent   = null;
    this.trajectoryPoints = [];

    // ── 3. Clear physics world ───────────────────────────────────────────
    this.physics.clear();
    this.physics.createWorldBounds();

    // ── 4. Spawn all structures, enemies, astronauts ─────────────────────
    levelData.structures.forEach(s => {
      this.physics.createBlock(s.x, s.y, s.w, s.h, s.mat, s.isStatic || false);
    });

    levelData.targets.forEach(t => {
      if (t.type === 'boss') {
        this.physics.createBoss(t.x, t.y, t.hp);
      } else {
        this.physics.createRobot(t.x, t.y, t.subType, t.hp);
      }
    });

    if (levelData.astronauts) {
      levelData.astronauts.forEach(a => {
        this.physics.createAstronaut(a.x, a.y);
      });
    }

    // ── 5. Begin init phase AFTER spawning: suppresses collision damage ──
    this.physics.beginInitPhase();

    // ── 6. Update UI ─────────────────────────────────────────────────────
    this.ui.setupLevelHUD(levelData);
    this.ui.showGameplay();

    // ── 7. Enable player input after init phase completes ────────────────
    const initMs = this.physics._initPhaseMs;
    setTimeout(() => {
      this.state = 'AIMING';
      this._levelTransitioning = false;
    }, initMs + 50);  // 50ms buffer after physics settles
  }

  restartCurrentLevel() {
    this._levelTransitioning = false;  // allow restart even mid-transition
    this.startLevel(this.currentLevelIndex);
  }

  addScore(pts) {
    this.score += pts;
    this.ui.updateScore(this.score);
  }

  // ── TURN CYCLE & WIN/LOSS ─────────────────────────────────────────────────
  onTurnComplete() {
    this.ui.hideAbilityBanner();

    // Don't evaluate turns during init or while transitioning
    if (this.state === 'LOADING' || this.state === 'MENU') return;

    const robotsLeft = this.physics.robots.filter(r => !r.removed).length;

    if (robotsLeft === 0) {
      // Victory
      this.physics.astronauts.forEach(a => {
        if (!a.rescued) this.physics.rescueAstronaut(a);
      });

      this.state = 'COMPLETE';
      const remaining = Math.max(0, this.creatureList.length - (this.creatureIndex + 1));
      const bonusScore = remaining * 8000;
      const totalScore = this.score + bonusScore;

      const thresholds = this.currentLevelData.starThresholds;
      let stars = 1;
      if (totalScore >= thresholds[2]) stars = 3;
      else if (totalScore >= thresholds[1]) stars = 2;

      setTimeout(() => {
        this.ui.showVictory(this.currentLevelData.id, this.score, bonusScore, totalScore, stars);
      }, 700);
      return;
    }

    this.creatureIndex++;
    if (this.creatureIndex < this.creatureList.length) {
      this.readyCreature = this.creatureList[this.creatureIndex];
      this.ui.updateCreatureQueue(this.creatureList, this.creatureIndex);
      this.state = 'AIMING';
    } else {
      this.state = 'OVER';
      setTimeout(() => {
        this.ui.showDefeat(robotsLeft, this.score);
      }, 900);
    }
  }

  // ── MAIN LOOP ─────────────────────────────────────────────────────────────
  startLoop() {
    const loop = (timestamp) => {
      const rawDt = timestamp - this.lastTime;
      this.lastTime = timestamp;
      // Clamp dt to 50ms (avoids runaway after tab focus change)
      const dt = Math.min(50, Math.max(1, rawDt));

      if (!this.isPaused && this.state !== 'MENU') {
        this.physics.update(dt);
      }

      this.renderer.render(this, dt);
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Start Game on page load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
