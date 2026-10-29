/**
 * ORBIT BLASTERS — USER INTERFACE & PROGRESSION SYSTEM
 * Manages menus, HUD, level selection, victory/defeat dialogs,
 * star ratings, and localStorage persistence.
 */

class UIManager {
  constructor(game) {
    this.game = game;

    // Progression data
    this.unlockedLevel = 1;
    this.scores = {};
    this.stars = {};

    this.loadProgression();
    this.initElements();
    this.bindEvents();
  }

  loadProgression() {
    try {
      const savedUnlocked = localStorage.getItem('orbit_blasters_unlocked');
      if (savedUnlocked) this.unlockedLevel = parseInt(savedUnlocked, 10);

      const savedScores = localStorage.getItem('orbit_blasters_scores');
      if (savedScores) this.scores = JSON.parse(savedScores);

      const savedStars = localStorage.getItem('orbit_blasters_stars');
      if (savedStars) this.stars = JSON.parse(savedStars);
    } catch (e) {
      console.warn('Could not read progression from localStorage', e);
    }
  }

  saveProgression(levelId, score, stars) {
    try {
      // Update high score
      if (!this.scores[levelId] || score > this.scores[levelId]) {
        this.scores[levelId] = score;
      }
      // Update best stars
      if (!this.stars[levelId] || stars > this.stars[levelId]) {
        this.stars[levelId] = stars;
      }
      // Unlock next level
      if (levelId >= this.unlockedLevel && levelId < 10) {
        this.unlockedLevel = levelId + 1;
      }

      localStorage.setItem('orbit_blasters_unlocked', this.unlockedLevel.toString());
      localStorage.setItem('orbit_blasters_scores', JSON.stringify(this.scores));
      localStorage.setItem('orbit_blasters_stars', JSON.stringify(this.stars));
    } catch (e) {
      console.warn('Could not save progression', e);
    }
  }

  initElements() {
    // Screens
    this.screenMainMenu = document.getElementById('screen-main-menu');
    this.screenLevelSelect = document.getElementById('screen-level-select');
    this.hudOverlay = document.getElementById('hud-overlay');

    // Modals
    this.modalPause = document.getElementById('modal-pause');
    this.modalVictory = document.getElementById('modal-victory');
    this.modalDefeat = document.getElementById('modal-defeat');
    this.modalHowTo = document.getElementById('modal-how-to-play');

    // HUD Elements
    this.hudWorldBadge = document.getElementById('hud-world-badge');
    this.hudLevelTitle = document.getElementById('hud-level-title');
    this.hudScoreVal = document.getElementById('hud-score-val');
    this.hudObjectiveText = document.getElementById('hud-objective-text');
    this.hudAbilityBanner = document.getElementById('hud-ability-banner');
    this.abilityNameText = document.getElementById('ability-name-text');
    this.abilityIconWrap = document.getElementById('ability-icon-wrap');
    this.creatureQueue = document.getElementById('creature-queue');

    // Boss Bar
    this.bossHpContainer = document.getElementById('boss-hp-bar-container');
    this.bossHpFill = document.getElementById('boss-hp-fill');

    // Audio Icons
    this.iconSoundOn = document.getElementById('icon-sound-on');
    this.iconSoundOff = document.getElementById('icon-sound-off');
    this.updateAudioIcons();
  }

  bindEvents() {
    // Main Menu Buttons
    document.getElementById('btn-play-game').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.game.startLevel(this.unlockedLevel);
    });

    document.getElementById('btn-open-levels').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.showLevelSelect();
    });

    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalHowTo.classList.remove('hidden');
    });

    // Level Select Back
    document.getElementById('btn-back-to-menu').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.showMainMenu();
    });

    // How to Play Close
    document.getElementById('btn-close-how').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalHowTo.classList.add('hidden');
    });
    document.getElementById('btn-close-how-footer').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalHowTo.classList.add('hidden');
    });

    // HUD Buttons
    document.getElementById('hud-btn-pause').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.showPause();
    });

    document.getElementById('hud-btn-restart').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.game.restartCurrentLevel();
    });

    document.getElementById('hud-btn-audio').addEventListener('click', () => {
      window.audio.toggleMute();
      this.updateAudioIcons();
    });

    // Pause Modal Buttons
    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.hidePause();
    });

    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.hidePause();
      this.game.restartCurrentLevel();
    });

    document.getElementById('btn-pause-levels').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.hidePause();
      this.showLevelSelect();
    });

    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.hidePause();
      this.showMainMenu();
    });

    // Victory Modal Buttons
    document.getElementById('btn-victory-next').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalVictory.classList.add('hidden');
      const nextId = this.game.currentLevelData.id + 1;
      if (nextId <= 10) {
        this.game.startLevel(nextId);
      } else {
        this.showLevelSelect();
      }
    });

    document.getElementById('btn-victory-replay').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalVictory.classList.add('hidden');
      this.game.restartCurrentLevel();
    });

    document.getElementById('btn-victory-levels').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalVictory.classList.add('hidden');
      this.showLevelSelect();
    });

    // Defeat Modal Buttons
    document.getElementById('btn-defeat-retry').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalDefeat.classList.add('hidden');
      this.game.restartCurrentLevel();
    });

    document.getElementById('btn-defeat-levels').addEventListener('click', () => {
      window.audio.playButtonClick();
      this.modalDefeat.classList.add('hidden');
      this.showLevelSelect();
    });

    // World Tabs in Level Select
    const worldTabs = document.querySelectorAll('.world-tab');
    worldTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        window.audio.playButtonClick();
        worldTabs.forEach(t => t.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        const worldNum = parseInt(target.getAttribute('data-world'), 10);
        this.filterLevelsGrid(worldNum);
      });
    });
  }

  updateAudioIcons() {
    if (window.audio.isMuted) {
      this.iconSoundOn.classList.add('hidden');
      this.iconSoundOff.classList.remove('hidden');
    } else {
      this.iconSoundOn.classList.remove('hidden');
      this.iconSoundOff.classList.add('hidden');
    }
  }

  showMainMenu() {
    this.screenMainMenu.classList.remove('hidden');
    this.screenLevelSelect.classList.add('hidden');
    this.hudOverlay.classList.add('hidden');
    this.game.state = 'MENU';
  }

  showLevelSelect() {
    this.screenMainMenu.classList.add('hidden');
    this.screenLevelSelect.classList.remove('hidden');
    this.hudOverlay.classList.add('hidden');
    this.game.state = 'MENU';

    this.renderLevelGrid();
  }

  showGameplay() {
    this.screenMainMenu.classList.add('hidden');
    this.screenLevelSelect.classList.add('hidden');
    this.hudOverlay.classList.remove('hidden');
    this.hideAbilityBanner();
  }

  showPause() {
    this.game.isPaused = true;
    this.modalPause.classList.remove('hidden');
  }

  hidePause() {
    this.game.isPaused = false;
    this.modalPause.classList.add('hidden');
  }

  // --- LEVEL SELECTION GRID BUILDER ---
  renderLevelGrid() {
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';

    // Calculate total stars
    let totalStars = 0;
    for (let i = 1; i <= 10; i++) {
      if (this.stars[i]) totalStars += this.stars[i];
    }
    document.getElementById('total-stars-count').textContent = `${totalStars} / 30`;

    // Active world tab
    const activeTab = document.querySelector('.world-tab.active');
    const activeWorld = activeTab ? parseInt(activeTab.getAttribute('data-world'), 10) : 1;
    const levels = window.LEVELS_DATA || LEVELS_DATA;

    levels.forEach(level => {
      const isUnlocked = level.id <= this.unlockedLevel;
      const levelStars = this.stars[level.id] || 0;
      const levelScore = this.scores[level.id] || 0;

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? '' : 'locked'} ${level.isBossLevel ? 'boss-level' : ''}`;
      card.setAttribute('data-level-world', level.world);

      if (level.world !== activeWorld) {
        card.style.display = 'none';
      }

      card.innerHTML = `
        <div class="level-card-number">${level.id}</div>
        <div class="level-card-title">${level.title}</div>
        <div class="level-card-stars">
          <span class="${levelStars >= 1 ? 'star-filled' : ''}">★</span>
          <span class="${levelStars >= 2 ? 'star-filled' : ''}">★</span>
          <span class="${levelStars >= 3 ? 'star-filled' : ''}">★</span>
        </div>
        ${levelScore > 0 ? `<div class="level-card-score">${levelScore.toLocaleString()} pts</div>` : ''}
        ${!isUnlocked ? '<div style="font-size: 16px; margin-top: 4px;">🔒</div>' : ''}
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          window.audio.playButtonClick();
          this.game.startLevel(level.id);
        });
      }

      grid.appendChild(card);
    });
  }

  filterLevelsGrid(worldNum) {
    const cards = document.querySelectorAll('.level-card');
    cards.forEach(card => {
      const cardWorld = parseInt(card.getAttribute('data-level-world'), 10);
      card.style.display = cardWorld === worldNum ? 'flex' : 'none';
    });
  }

  // --- HUD UPDATES ---
  setupLevelHUD(levelData) {
    this.hudWorldBadge.textContent = `WORLD ${levelData.world}`;
    this.hudLevelTitle.textContent = levelData.title;
    this.hudObjectiveText.textContent = levelData.objective;
    this.hudScoreVal.textContent = '0';

    if (levelData.isBossLevel) {
      this.bossHpContainer.classList.remove('hidden');
      this.bossHpFill.style.width = '100%';
    } else {
      this.bossHpContainer.classList.add('hidden');
    }

    this.updateCreatureQueue(levelData.creatures, 0);
  }

  updateScore(score) {
    this.hudScoreVal.textContent = score.toLocaleString();
  }

  updateBossHp(hp, maxHp) {
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    this.bossHpFill.style.width = `${pct}%`;
  }

  updateCreatureQueue(creatureList, currentIndex) {
    this.creatureQueue.innerHTML = '';
    for (let i = currentIndex; i < creatureList.length; i++) {
      const charId = creatureList[i];
      const char = (window.CHARACTERS || CHARACTERS)[charId];
      if (!char) continue;

      const icon = document.createElement('div');
      icon.className = `queue-blaster-icon c-${charId} ${i === currentIndex ? 'active' : ''}`;
      icon.title = `${char.name} — ${char.abilityName}`;
      icon.textContent = char.icon;
      this.creatureQueue.appendChild(icon);
    }
  }

  showAbilityBanner(charId) {
    const char = (window.CHARACTERS || CHARACTERS)[charId];
    if (!char) return;

    this.abilityIconWrap.textContent = char.icon;
    this.abilityNameText.textContent = char.abilityName.toUpperCase();
    this.hudAbilityBanner.classList.remove('hidden');
  }

  hideAbilityBanner() {
    this.hudAbilityBanner.classList.add('hidden');
  }

  // --- VICTORY & DEFEAT MODALS ---
  showVictory(levelId, destructionScore, bonusScore, totalScore, starCount) {
    this.saveProgression(levelId, totalScore, starCount);

    document.getElementById('victory-score-base').textContent = destructionScore.toLocaleString();
    document.getElementById('victory-score-bonus').textContent = `+${bonusScore.toLocaleString()}`;
    document.getElementById('victory-score-total').textContent = totalScore.toLocaleString();
    document.getElementById('victory-score-best').textContent = (this.scores[levelId] || totalScore).toLocaleString();

    // Reset stars animation
    const starEls = [
      document.getElementById('v-star-1'),
      document.getElementById('v-star-2'),
      document.getElementById('v-star-3')
    ];
    starEls.forEach(el => el.classList.remove('awarded'));

    this.modalVictory.classList.remove('hidden');
    window.audio.playWin();

    // Staggered star reveal with chimes
    starEls.forEach((el, index) => {
      if (index < starCount) {
        setTimeout(() => {
          el.classList.add('awarded');
          window.audio.playStar(index);
        }, 500 + index * 400);
      }
    });

    // If beat final boss level, show special text
    if (levelId === 10) {
      document.getElementById('btn-victory-next').innerHTML = '<span>🏆 GALAXY SAVED!</span>';
    } else {
      document.getElementById('btn-victory-next').innerHTML = '<span>NEXT MISSION ❯</span>';
    }
  }

  showDefeat(robotsLeft, currentScore) {
    document.getElementById('defeat-robots-left').textContent = robotsLeft;
    document.getElementById('defeat-current-score').textContent = currentScore.toLocaleString();

    this.modalDefeat.classList.remove('hidden');
    window.audio.playLose();
  }
}

window.UIManager = UIManager;
