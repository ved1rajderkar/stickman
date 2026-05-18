import { InputHandler } from './input.js';
import { Player, PlayerState } from './player.js';
import { ParticleSystem, addWound, drawBloodDecals, drawMuzzleFlashOverlay, drawWeaponTrails, ScreenShake, HitstopManager, SlowdownManager } from './effects.js';
import { HUD } from './ui.js';
import { AIController } from './ai.js';
import { createWeapon, WEAPON_TYPES, WEAPON_COLORS, WeaponPickup, Bullet } from './weapons.js';
import { FLOOR_Y, LEFT_WALL, RIGHT_WALL, CANVAS_WIDTH, CANVAS_HEIGHT, getStagePlatforms, checkHitboxOverlap, resolvePlayerCollision } from './physics.js';
import { StickMan } from './stickman.js';
import { soundManager } from './sound.js';
import { StageManager, STAGES } from './stages.js';
import { GameModeManager, GameModes, CPUDifficulty } from './gameModes.js';
import { SaveSystem } from './saveSystem.js';
import { SKINS, Economy } from './economy.js';

console.log('[Stickman] Module loaded');

const GameState = {
    MENU: 'MENU',
    MODE_SELECT: 'MODE_SELECT',
    CHARACTER_SELECT: 'CHARACTER_SELECT',
    STAGE_SELECT: 'STAGE_SELECT',
    FIGHTING: 'FIGHTING',
    ROUND_END: 'ROUND_END',
    MATCH_END: 'MATCH_END',
    PAUSED: 'PAUSED',
    SETTINGS: 'SETTINGS',
    STATS: 'STATS',
    SKIN_SELECT: 'SKIN_SELECT',
    SURVIVAL_END: 'SURVIVAL_END'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.inputHandler = new InputHandler();
        this.particleSystem = new ParticleSystem();
        this.screenShake = new ScreenShake();
        this.hitstop = new HitstopManager();
        this.slowdown = new SlowdownManager();
        this.hud = new HUD();
        this.modeManager = new GameModeManager();

        this.state = GameState.MENU;
        this.playerName = SaveSystem.getPlayerName();
        this.selectedSkin = Economy.getSelectedSkin();

        this.player1 = null;
        this.player2 = null;
        this.aiControllers = [];
        this.teamAI = [];

        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.weaponPickups = [];
        this.floatingTexts = [];

        this.stageManager = null;
        this.staticPlatforms = [];

        this.settings = { screenShake: true, blood: true, volume: 7, showControls: true };
        this.debugMode = false;

        this.roundAnnouncementTimer = 0;
        this.roundEndTimer = 0;
        this.matchEndTimer = 0;
        this.survivalWaveTimer = 0;

        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedStep = 1000 / 60;

        window.bloodDecals = [];
        window.gameSettings = this.settings;

        this.loadSettings();
        this.setupEventListeners();
        this.gameLoop(0);
    }

    loadSettings() {
        const saved = localStorage.getItem('stickman_settings');
        if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) };
        this.screenShake.enabled = this.settings.screenShake;
        soundManager.setVolume(this.settings.volume);
    }

    saveSettings() {
        localStorage.setItem('stickman_settings', JSON.stringify(this.settings));
    }

    setupEventListeners() {
        const ids = [
            'btn-play', 'btn-settings', 'btn-stats', 'btn-skins',
            'btn-resume', 'btn-restart', 'btn-quit',
            'btn-settings-back', 'btn-stats-back', 'btn-skins-back',
            'btn-mode-local', 'btn-mode-cpu', 'btn-mode-survival', 'btn-mode-training', 'btn-mode-team',
            'btn-cpu-easy', 'btn-cpu-medium', 'btn-cpu-hard',
            'btn-start-fight', 'btn-back-mode', 'btn-back-char', 'btn-back-stage', 'btn-stage-fight',
            'btn-next-level', 'btn-retry-level',
            'setting-screen-shake', 'setting-blood', 'setting-volume', 'setting-controls',
            'btn-name-confirm', 'input-player-name', 'btn-start-level',
            'btn-p1-color-select', 'btn-p2-color-select',
            'btn-survival-retry', 'btn-match-menu'
        ];
        for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) console.warn(`[Game] Missing element: #${id}`);
        }

        document.getElementById('btn-play')?.addEventListener('click', () => this.showModeSelect());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-stats')?.addEventListener('click', () => this.showStats());
        document.getElementById('btn-skins')?.addEventListener('click', () => this.showSkinSelect());

        document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-restart')?.addEventListener('click', () => this.restartMatch());
        document.getElementById('btn-quit')?.addEventListener('click', () => this.quitToMenu());

        document.getElementById('btn-settings-back')?.addEventListener('click', () => this.hideSettings());
        document.getElementById('btn-stats-back')?.addEventListener('click', () => this.hideStats());
        document.getElementById('btn-skins-back')?.addEventListener('click', () => this.hideSkinSelect());

        document.getElementById('btn-mode-local')?.addEventListener('click', () => this.selectMode(GameModes.LOCAL_1V1));
        document.getElementById('btn-mode-cpu')?.addEventListener('click', () => this.selectMode(GameModes.VS_CPU));
        document.getElementById('btn-mode-survival')?.addEventListener('click', () => this.selectMode(GameModes.SURVIVAL));
        document.getElementById('btn-mode-training')?.addEventListener('click', () => this.selectMode(GameModes.TRAINING));
        document.getElementById('btn-mode-team')?.addEventListener('click', () => this.selectMode(GameModes.TEAM_BATTLE));

        document.getElementById('btn-cpu-easy')?.addEventListener('click', () => this.selectDifficulty(CPUDifficulty.EASY));
        document.getElementById('btn-cpu-medium')?.addEventListener('click', () => this.selectDifficulty(CPUDifficulty.MEDIUM));
        document.getElementById('btn-cpu-hard')?.addEventListener('click', () => this.selectDifficulty(CPUDifficulty.HARD));

        document.getElementById('btn-start-fight')?.addEventListener('click', () => this.showStageSelect());
        document.getElementById('btn-back-mode')?.addEventListener('click', () => this.showModeSelect());
        document.getElementById('btn-back-char')?.addEventListener('click', () => this.showModeSelect());
        document.getElementById('btn-back-stage')?.addEventListener('click', () => this.showCharacterSelect());
        document.getElementById('btn-stage-fight')?.addEventListener('click', () => this.startFight());

        document.getElementById('btn-survival-retry')?.addEventListener('click', () => this.startFight());
        document.getElementById('btn-match-menu')?.addEventListener('click', () => this.quitToMenu());

        document.getElementById('setting-screen-shake')?.addEventListener('change', (e) => {
            this.settings.screenShake = e.target.checked;
            this.screenShake.enabled = this.settings.screenShake;
            this.saveSettings();
        });
        document.getElementById('setting-blood')?.addEventListener('change', (e) => {
            this.settings.blood = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-volume')?.addEventListener('input', (e) => {
            soundManager.setVolume(parseInt(e.target.value));
            this.settings.volume = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('setting-controls')?.addEventListener('change', (e) => {
            this.settings.showControls = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('btn-name-confirm')?.addEventListener('click', () => this.confirmName());
        document.getElementById('input-player-name')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmName();
        });

        window.addEventListener('keydown', (e) => {
            soundManager.init();
            if (e.key === 'Escape' || e.key === 'p') {
                if (this.state === GameState.FIGHTING) this.pauseGame();
                else if (this.state === GameState.PAUSED) this.resumeGame();
            }
            if (e.key === 'F1') {
                this.debugMode = !this.debugMode;
            }
        });
        document.addEventListener('click', () => soundManager.init(), { once: true });
    }

    hideAllOverlays() {
        const ids = ['main-menu', 'mode-select-overlay', 'cpu-difficulty-overlay', 'character-select-overlay', 'stage-select-overlay', 'pause-overlay', 'settings-overlay', 'stats-overlay', 'skin-select-overlay', 'round-announcement', 'match-end-overlay', 'survival-end-overlay'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    showModeSelect() {
        this.hideAllOverlays();
        this.state = GameState.MODE_SELECT;
        document.getElementById('mode-select-overlay').classList.remove('hidden');
        soundManager.synthUIClick();
    }

    selectMode(mode) {
        this.modeManager.initMode(mode);
        this.hideAllOverlays();
        if (mode === GameModes.VS_CPU) {
            document.getElementById('cpu-difficulty-overlay').classList.remove('hidden');
        } else {
            this.showCharacterSelect();
        }
        soundManager.synthUIClick();
    }

    selectDifficulty(diff) {
        this.modeManager.cpuDifficulty = diff;
        this.hideAllOverlays();
        this.showCharacterSelect();
        soundManager.synthUIClick();
    }

    showCharacterSelect() {
        this.hideAllOverlays();
        this.state = GameState.CHARACTER_SELECT;
        document.getElementById('character-select-overlay').classList.remove('hidden');
        this.renderCharacterSelect();
        soundManager.synthUIClick();
    }

    renderCharacterSelect() {
        const p1Preview = document.getElementById('p1-preview');
        const p2Preview = document.getElementById('p2-preview');
        if (p1Preview) {
            const ctx = p1Preview.getContext('2d');
            ctx.clearRect(0, 0, 120, 120);
            const stickman = new StickMan(this.modeManager.p1Color, this.modeManager.p1Color);
            stickman.drawPreview(ctx, 60, 100, 'IDLE', Date.now() * 0.05);
        }
        if (p2Preview) {
            const ctx = p2Preview.getContext('2d');
            ctx.clearRect(0, 0, 120, 120);
            const stickman = new StickMan(this.modeManager.p2Color, this.modeManager.p2Color);
            stickman.drawPreview(ctx, 60, 100, 'IDLE', Date.now() * 0.05);
        }

        const colors = ['#00FFFF', '#00FF41', '#9D00FF', '#FF2D55', '#FFD700', '#FF6B35', '#FF69B4', '#F0F0F0', '#0066ff', '#00cc88', '#ff4488', '#8844ff', '#ff8800', '#44aaff', '#ff44aa', '#88ff44'];
        const p1Grid = document.getElementById('p1-color-grid');
        const p2Grid = document.getElementById('p2-color-grid');
        if (p1Grid) {
            p1Grid.innerHTML = '';
            colors.forEach(c => {
                const btn = document.createElement('button');
                btn.className = `w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110 ${this.modeManager.p1Color === c ? 'border-white scale-110' : 'border-gray-600'}`;
                btn.style.backgroundColor = c;
                btn.onclick = () => { this.modeManager.p1Color = c; this.renderCharacterSelect(); soundManager.synthUIClick(); };
                p1Grid.appendChild(btn);
            });
        }
        if (p2Grid) {
            p2Grid.innerHTML = '';
            colors.forEach(c => {
                const btn = document.createElement('button');
                btn.className = `w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110 ${this.modeManager.p2Color === c ? 'border-white scale-110' : 'border-gray-600'}`;
                btn.style.backgroundColor = c;
                btn.onclick = () => { this.modeManager.p2Color = c; this.renderCharacterSelect(); soundManager.synthUIClick(); };
                p2Grid.appendChild(btn);
            });
        }

        const p1WeaponSelect = document.getElementById('p1-weapon-select');
        const p2WeaponSelect = document.getElementById('p2-weapon-select');
        if (p1WeaponSelect) {
            p1WeaponSelect.innerHTML = '';
            WEAPON_TYPES.forEach(w => {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-xs font-bold transition-all ${this.modeManager.p1Weapon === w ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`;
                btn.textContent = w === 'fists' ? 'Fists' : w.replace(/([A-Z])/g, ' $1').trim();
                btn.onclick = () => { this.modeManager.p1Weapon = w; this.renderCharacterSelect(); soundManager.synthUIClick(); };
                p1WeaponSelect.appendChild(btn);
            });
        }
        if (p2WeaponSelect) {
            p2WeaponSelect.innerHTML = '';
            WEAPON_TYPES.forEach(w => {
                const btn = document.createElement('button');
                btn.className = `px-3 py-1 rounded text-xs font-bold transition-all ${this.modeManager.p2Weapon === w ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`;
                btn.textContent = w === 'fists' ? 'Fists' : w.replace(/([A-Z])/g, ' $1').trim();
                btn.onclick = () => { this.modeManager.p2Weapon = w; this.renderCharacterSelect(); soundManager.synthUIClick(); };
                p2WeaponSelect.appendChild(btn);
            });
        }
    }

    showStageSelect() {
        this.hideAllOverlays();
        this.state = GameState.STAGE_SELECT;
        document.getElementById('stage-select-overlay').classList.remove('hidden');
        this.renderStageSelect();
        soundManager.synthUIClick();
    }

    renderStageSelect() {
        const container = document.getElementById('stage-grid');
        if (!container) return;
        container.innerHTML = '';
        Object.values(STAGES).forEach(stage => {
            const div = document.createElement('div');
            div.className = `p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${this.modeManager.stageId === stage.id ? 'border-cyan-400 bg-cyan-900/30' : stage.unlocked ? 'border-gray-600 bg-gray-800 hover:border-gray-400' : 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'}`;
            div.innerHTML = `
                <p class="text-white font-bold" style="font-family:'Orbitron',sans-serif;">${stage.name}</p>
                ${!stage.unlocked ? `<p class="text-gray-500 text-xs mt-1">Locked</p>` : ''}
            `;
            if (stage.unlocked) {
                div.onclick = () => { this.modeManager.stageId = stage.id; this.renderStageSelect(); soundManager.synthUIClick(); };
            }
            container.appendChild(div);
        });
    }

    startFight() {
        this.hideAllOverlays();

        this.stageManager = new StageManager(this.modeManager.stageId);
        this.staticPlatforms = getStagePlatforms(this.modeManager.stageId, 0);

        this.setupPlayers();
        this.state = GameState.FIGHTING;
        this.startRoundAnnouncement();
    }

    setupPlayers() {
        this.player1 = new Player(200, FLOOR_Y, this.modeManager.p1Color, this.modeManager.p1Color, 1);
        this.player1.name = this.playerName || 'P1';
        this.player1.setWeapon(createWeapon(this.modeManager.p1Weapon));
        this.player1.stickman.setAccessory(this.modeManager.p1Accessory);
        this.player1.stickman.setSkinStyle(this.modeManager.p1Skin);

        this.player2 = new Player(CANVAS_WIDTH - 200, FLOOR_Y, this.modeManager.p2Color, this.modeManager.p2Color, 2);
        this.player2.name = this.modeManager.currentMode === GameModes.VS_CPU ? `CPU (${this.modeManager.cpuDifficulty})` : 'P2';
        this.player2.setWeapon(createWeapon(this.modeManager.p2Weapon));
        this.player2.stickman.setAccessory(this.modeManager.p2Accessory);
        this.player2.stickman.setSkinStyle(this.modeManager.p2Skin);

        this.aiControllers = [];
        if (this.modeManager.currentMode === GameModes.VS_CPU) {
            this.aiControllers.push(new AIController(this.modeManager.cpuDifficulty));
        } else if (this.modeManager.currentMode === GameModes.LOCAL_1V1) {
        } else if (this.modeManager.currentMode === GameModes.TEAM_BATTLE) {
            this.aiControllers.push(new AIController('medium'));
        } else if (this.modeManager.currentMode === GameModes.SURVIVAL) {
            this.modeManager.nextSurvivalWave();
        }

        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.weaponPickups = [];
        this.floatingTexts = [];
        window.bloodDecals = [];

        this.timerCounter = 0;
        this.timer = this.modeManager.isTraining() ? 0 : 60;
        this.modeManager.maxTimer = this.timer;

        this.hud.clear();
    }

    spawnSurvivalEnemies() {
        const wave = this.modeManager.survival.wave;
        const isBoss = this.modeManager.survival.bossWave;
        const count = this.modeManager.survival.enemiesRemaining;

        for (let i = 0; i < count; i++) {
            const enemy = new Player(CANVAS_WIDTH - 150 - i * 80, FLOOR_Y, '#FF4444', '#FF4444', 2);
            enemy.name = isBoss ? `BOSS W${wave}` : `Wave ${wave} Enemy`;
            if (isBoss) {
                enemy.damagePercent = 0;
                enemy.weight = 1.5;
                enemy.baseSpeed = 4;
                enemy.speed = 4;
            }
            const weaponTypes = ['fists', 'katana', 'guitar', 'boomerang'];
            enemy.setWeapon(createWeapon(weaponTypes[Math.floor(Math.random() * weaponTypes.length)]));
            this.aiControllers.push(new AIController(wave > 10 ? 'hard' : wave > 5 ? 'medium' : 'easy'));
        }
    }

    startRoundAnnouncement() {
        this.roundAnnouncementTimer = 90;
        const announcement = document.getElementById('round-announcement');
        const roundText = document.getElementById('round-text');
        const fightText = document.getElementById('fight-text');

        announcement.classList.remove('hidden');
        if (this.modeManager.isSurvival()) {
            roundText.textContent = `WAVE ${this.modeManager.survival.wave}`;
            if (this.modeManager.survival.bossWave) {
                roundText.textContent += ' - BOSS';
                roundText.style.color = '#ff4444';
            } else {
                roundText.style.color = '#ffffff';
            }
        } else {
            roundText.textContent = `Round ${this.modeManager.rounds.currentRound}`;
            roundText.style.color = '#ffffff';
        }
        fightText.textContent = '';

        setTimeout(() => {
            fightText.textContent = 'FIGHT!';
            fightText.classList.add('slam-in');
            soundManager.play('round_start');
        }, 800);

        setTimeout(() => {
            announcement.classList.add('hidden');
            fightText.classList.remove('slam-in');
        }, 1800);
    }

    pauseGame() {
        this.state = GameState.PAUSED;
        document.getElementById('pause-overlay').classList.remove('hidden');
    }

    resumeGame() {
        this.state = GameState.FIGHTING;
        document.getElementById('pause-overlay').classList.add('hidden');
    }

    restartMatch() {
        this.hideAllOverlays();
        this.modeManager.rounds = { p1Wins: 0, p2Wins: 0, maxRounds: this.modeManager.bestOf, currentRound: 1 };
        if (this.modeManager.isSurvival()) {
            this.modeManager.survival = { wave: 0, enemiesRemaining: 0, bossWave: false, waveTimer: 0 };
            this.modeManager.nextSurvivalWave();
        }
        this.setupPlayers();
        this.state = GameState.FIGHTING;
        this.startRoundAnnouncement();
    }

    quitToMenu() {
        this.hideAllOverlays();
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        this.hud.clear();
        this.particleSystem.clear();
        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        this.weaponPickups = [];
        window.bloodDecals = [];
    }

    showSettings() {
        this.hideAllOverlays();
        this.state = GameState.SETTINGS;
        document.getElementById('settings-overlay').classList.remove('hidden');
        soundManager.synthUIClick();
    }

    hideSettings() {
        this.hideAllOverlays();
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        soundManager.synthUIClick();
    }

    showStats() {
        this.hideAllOverlays();
        this.state = GameState.STATS;
        document.getElementById('stats-overlay').classList.remove('hidden');
        this.renderStats();
        soundManager.synthUIClick();
    }

    hideStats() {
        this.hideAllOverlays();
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        soundManager.synthUIClick();
    }

    renderStats() {
        const stats = SaveSystem.getStats();
        document.getElementById('stat-levels').textContent = stats.totalLevelsCompleted;
        document.getElementById('stat-playtime').textContent = this.formatTime(stats.totalPlaytime);
        document.getElementById('stat-highest').textContent = stats.highestLevel;
        document.getElementById('stat-bosses').textContent = stats.bossesDefeated;
        document.getElementById('stat-streak').textContent = stats.currentStreak;
        document.getElementById('stat-best-streak').textContent = stats.bestStreak;
        document.getElementById('stat-deaths').textContent = stats.deaths;

        const achievementsDiv = document.getElementById('achievements-list');
        achievementsDiv.innerHTML = '';
        const allAchievements = [
            { id: 'first_level', name: 'First Steps', desc: 'Complete your first match', icon: '⭐' },
            { id: 'level_10', name: 'Getting Started', desc: 'Win 10 matches', icon: '🌟' },
            { id: 'level_25', name: 'Warrior', desc: 'Win 25 matches', icon: '⚔️' },
            { id: 'first_boss', name: 'Boss Slayer', desc: 'Defeat a boss in Survival', icon: '👑' },
            { id: 'level_50', name: 'Halfway Hero', desc: 'Reach wave 50 in Survival', icon: '🏆' },
            { id: 'streak_10', name: 'Unstoppable', desc: '10 win streak', icon: '🔥' },
            { id: 'no_death', name: 'Flawless', desc: 'Win a match at 0%', icon: '✨' }
        ];
        for (const ach of allAchievements) {
            const unlocked = SaveSystem.hasAchievement(ach.id);
            const div = document.createElement('div');
            div.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `<span class="achievement-icon">${unlocked ? ach.icon : '🔒'}</span><div><p class="achievement-name">${ach.name}</p><p class="achievement-desc">${ach.desc}</p></div>`;
            achievementsDiv.appendChild(div);
        }
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    showSkinSelect() {
        this.hideAllOverlays();
        this.state = GameState.SKIN_SELECT;
        document.getElementById('skin-select-overlay').classList.remove('hidden');
        this.renderSkins();
        soundManager.synthUIClick();
    }

    hideSkinSelect() {
        this.hideAllOverlays();
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        soundManager.synthUIClick();
    }

    renderSkins() {
        const container = document.getElementById('skins-grid');
        if (!container) return;
        container.innerHTML = '';
        const unlocked = Economy.getUnlockedSkins();
        for (const skin of SKINS) {
            const isUnlocked = unlocked.includes(skin.color);
            const isSelected = this.selectedSkin === skin.color;
            const div = document.createElement('div');
            div.className = `skin-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `<div class="skin-preview" style="background: ${skin.color}; box-shadow: 0 0 15px ${skin.color}"></div><p class="skin-name">${skin.name}</p>${isUnlocked ? (isSelected ? '<p class="skin-status selected-text">SELECTED</p>' : '<p class="skin-status">CLICK TO SELECT</p>') : `<p class="skin-status locked-text">Level ${skin.unlockLevel}</p>`}`;
            if (isUnlocked) {
                div.addEventListener('click', () => {
                    this.selectedSkin = skin.color;
                    Economy.setSelectedSkin(skin.color);
                    this.renderSkins();
                    soundManager.synthUIClick();
                });
            }
            container.appendChild(div);
        }
    }

    confirmName() {
        const input = document.getElementById('input-player-name');
        const name = input.value.trim() || 'Player1';
        this.playerName = name;
        SaveSystem.setPlayerName(name);
        soundManager.synthUIClick();
    }

    addFloatingText(x, y, value, color, size) {
        this.floatingTexts.push({ x, y, value, vy: -2, life: 50, maxLife: 50, color, size: Math.min(size, 28) });
    }

    drawFloatingTexts(ctx) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life--;
            const alpha = ft.life / ft.maxLife;
            const shake = ft.size >= 28 ? (Math.random() - 0.5) * 2 : 0;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${ft.size}px Orbitron`;
            ctx.fillStyle = ft.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.value, ft.x + shake, ft.y);
            ctx.fillText(ft.value, ft.x + shake, ft.y);
            ctx.restore();
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (bullet.exploded) {
                this.particleSystem.explosionAoE(bullet.x, bullet.y, bullet.explodeRadius);
                this.triggerScreenShake(10, 15);
                soundManager.play('explosion');
                const players = [this.player1, this.player2];
                for (const p of players) {
                    if (p && !p.dead) {
                        const dist = Math.sqrt((p.x - bullet.x) ** 2 + (p.y - bullet.y) ** 2);
                        if (dist < bullet.explodeRadius) {
                            const dmg = Math.round(bullet.damage * (1 - dist / bullet.explodeRadius));
                            const result = p.takeDamage(dmg, bullet.owner);
                            this.onHit(p, result, bullet.owner, bullet.x, bullet.y, true);
                        }
                    }
                }
                this.bullets.splice(i, 1);
                continue;
            }

            if (!bullet.alive) {
                if (bullet.type !== 'boomerang' && bullet.x >= 0 && bullet.x <= CANVAS_WIDTH) {
                    this.particleSystem.hitSpark(bullet.x, bullet.y, '#ffff88', 3);
                }
                this.bullets.splice(i, 1);
                continue;
            }

            if (this.stageManager) {
                for (const hazard of this.stageManager.hazards) {
                    if (hazard.type === 'moving_platform' && bullet.y >= hazard.y - 5 && bullet.y <= hazard.y + 10 && bullet.x >= hazard.x && bullet.x <= hazard.x + hazard.width) {
                        if (this.modeManager.p1Weapon === 'portalGun' || this.modeManager.p2Weapon === 'portalGun') {
                            const p1w = this.player1?.weapon;
                            const p2w = this.player2?.weapon;
                            if (p1w?.portals) {
                                const tp = p1w.checkPortalTeleport(bullet);
                                if (tp) { bullet.x = tp.x; bullet.y = tp.y; bullet.vx = tp.vx; }
                            }
                        }
                    }
                }
            }

            const players = [this.player1, this.player2];
            for (const p of players) {
                if (bullet.alive && p && !p.dead && bullet.owner !== p) {
                    if (bullet.x > p.x - 15 && bullet.x < p.x + 15 && bullet.y > p.y - 80 && bullet.y < p.y) {
                        const result = p.takeDamage(bullet.damage, bullet.owner);
                        bullet.alive = false;
                        this.onHit(p, result, bullet.owner, bullet.x, bullet.y, false);
                    }
                }
            }
        }
    }

    onHit(target, result, attacker, hitX, hitY, isExplosion) {
        const dmg = result.damage;
        if (result.parried) {
            this.hud.addFloatingDamage(target.x, target.y - 90, 0, 'parry');
            this.particleSystem.parrySpark(hitX, hitY);
            this.hitstop.triggerParry();
            this.triggerScreenShake(8, 12);
            soundManager.synthBlock();
            return;
        }

        if (result.blocked) {
            this.hud.addFloatingDamage(target.x, target.y - 90, dmg, 'normal');
            this.particleSystem.hitSpark(hitX, hitY, '#888888', 4);
            this.triggerScreenShake(2, 5);
            soundManager.synthBlock();
            return;
        }

        const isHeavy = attacker && (attacker.state === PlayerState.ATTACK_HEAVY || attacker.state === PlayerState.ATTACK_AERIAL_HEAVY);
        const type = result.counterHit ? 'counter' : isHeavy ? 'heavy' : result.isAerial ? 'normal' : 'normal';
        this.hud.addFloatingDamage(target.x, target.y - 90, dmg, type);

        if (this.settings.blood) {
            this.particleSystem.bloodSplatter(hitX, hitY, attacker ? attacker.facingDir : 1, dmg);
            addWound(target, attacker ? attacker.facingDir : 1, dmg);
        }

        if (isHeavy || dmg > 25) {
            this.particleSystem.heavyHitSpark(hitX, hitY);
            this.hitstop.triggerHeavy();
            this.triggerScreenShake(10, 18);
            soundManager.synthHeavyHit();
            if (target.damagePercent >= 100) {
                this.slowdown.trigger(12, 0.3);
                this.hitstop.triggerKO();
                soundManager.synthKO();
            }
        } else {
            this.particleSystem.hitSpark(hitX, hitY, attacker?.glowColor || '#ffffff', 8);
            this.particleSystem.sparkImpact(hitX, hitY, Math.min(15, 8 + Math.floor(dmg / 5)));
            this.hitstop.trigger(dmg);
            this.triggerScreenShake(dmg > 20 ? 6 : 3, 10);
        }

        if (target.hasStatusEffect('frozen')) {
            this.particleSystem.freezeEffect(hitX, hitY);
        }

        if (attacker && attacker.weapon) {
            if (attacker.weapon.name === 'Katana') soundManager.play('sword_slash');
            else if (attacker.weapon.name === 'Guitar') soundManager.play('bat_swing');
            else soundManager.synthPunchWhoosh();
        }

        if (target.damagePercent >= 150 && !isExplosion) {
            this.particleSystem.screenFlash(this.ctx, '#ffffff', 0.15);
        }
    }

    checkCollisions() {
        if (!this.player1 || !this.player2) return;

        const players = [this.player1, this.player2];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i], p2 = players[j];
                if (!p1 || !p2 || p1.dead || p2.dead) continue;

                resolvePlayerCollision(p1, p2);

                if (p1.currentHitbox && !p1.hasHitThisAttack && p2.state !== PlayerState.GRABBED) {
                    if (checkHitboxOverlap(p1.currentHitbox, p2.hitbox)) {
                        let dmg = p1.state === PlayerState.ATTACK_HEAVY || p1.state === PlayerState.ATTACK_AERIAL_HEAVY ? p1.weapon.getHeavyAttackDamage() : p1.weapon.getLightAttackDamage();
                        if (p1.state === PlayerState.SPECIAL) dmg = p1.weapon.getSpecialDamage();
                        const result = p2.takeDamage(dmg, p1);
                        p1.hasHitThisAttack = true;
                        this.onHit(p2, result, p1, p2.x, p2.y - 50, false);

                        if (p1.weapon.name === 'Ice Cream' && !result.blocked && !result.parried) {
                            p2.addStatusEffect('frozen', 60);
                        }
                    }
                }

                if (p2.currentHitbox && !p2.hasHitThisAttack && p1.state !== PlayerState.GRABBED) {
                    if (checkHitboxOverlap(p2.currentHitbox, p1.hitbox)) {
                        let dmg = p2.state === PlayerState.ATTACK_HEAVY || p2.state === PlayerState.ATTACK_AERIAL_HEAVY ? p2.weapon.getHeavyAttackDamage() : p2.weapon.getLightAttackDamage();
                        if (p2.state === PlayerState.SPECIAL) dmg = p2.weapon.getSpecialDamage();
                        const result = p1.takeDamage(dmg, p2);
                        p2.hasHitThisAttack = true;
                        this.onHit(p1, result, p2, p1.x, p1.y - 50, false);

                        if (p2.weapon.name === 'Ice Cream' && !result.blocked && !result.parried) {
                            p1.addStatusEffect('frozen', 60);
                        }
                    }
                }
            }
        }

        if (this.player1 && this.player1.projectiles) {
            this.bullets.push(...this.player1.projectiles.filter(p => p instanceof Bullet));
            this.player1.projectiles = this.player1.projectiles.filter(p => !(p instanceof Bullet));
        }
        if (this.player2 && this.player2.projectiles) {
            this.bullets.push(...this.player2.projectiles.filter(p => p instanceof Bullet));
            this.player2.projectiles = this.player2.projectiles.filter(p => !(p instanceof Bullet));
        }
    }

    checkWinCondition() {
        if (!this.player1 || !this.player2) return;

        const p1LostStock = this.player1.stocks <= 0 && this.player1.dead;
        const p2LostStock = this.player2.stocks <= 0 && this.player2.dead;

        if (this.modeManager.isTraining()) return;

        if (this.modeManager.isSurvival()) {
            const allEnemiesDead = this.player2.dead && this.player2.stocks <= 0;
            if (allEnemiesDead || this.player2.damagePercent >= 300) {
                this.modeManager.survival.enemiesRemaining--;
                if (this.modeManager.survival.enemiesRemaining <= 0) {
                    this.modeManager.nextSurvivalWave();
                    this.player2.respawn();
                    this.player2.x = CANVAS_WIDTH - 200;
                    this.spawnSurvivalEnemies();
                    this.startRoundAnnouncement();
                }
            }
            if (p1LostStock) {
                this.showSurvivalEnd();
            }
            return;
        }

        if (p1LostStock || p2LostStock) {
            const winner = p2LostStock ? 1 : 2;
            this.modeManager.recordRoundWin(winner);

            if (this.modeManager.needsRoundReset()) {
                this.showMatchEnd();
            } else {
                this.showRoundEnd(winner);
            }
        }
    }

    showRoundEnd(winner) {
        this.state = GameState.ROUND_END;
        this.roundEndTimer = 120;
        this.hideAllOverlays();
        const announcement = document.getElementById('round-announcement');
        const roundText = document.getElementById('round-text');
        const fightText = document.getElementById('fight-text');
        announcement.classList.remove('hidden');
        roundText.textContent = winner === 1 ? `${this.player1.name} WINS!` : `${this.player2.name} WINS!`;
        roundText.style.color = winner === 1 ? this.modeManager.p1Color : this.modeManager.p2Color;
        fightText.textContent = '';
        setTimeout(() => { announcement.classList.add('hidden'); }, 2000);
    }

    showMatchEnd() {
        this.state = GameState.MATCH_END;
        this.hideAllOverlays();
        const winner = this.modeManager.getWinner();
        const overlay = document.getElementById('match-end-overlay');
        overlay.classList.remove('hidden');
        const winnerText = document.getElementById('match-winner');
        winnerText.textContent = winner === 1 ? `${this.player1.name} WINS THE MATCH!` : `${this.player2.name} WINS THE MATCH!`;
        winnerText.style.color = winner === 1 ? this.modeManager.p1Color : this.modeManager.p2Color;
        const scoreText = document.getElementById('match-score');
        scoreText.textContent = `${this.modeManager.rounds.p1Wins} - ${this.modeManager.rounds.p2Wins}`;

        const stats = SaveSystem.getStats();
        stats.totalLevelsCompleted++;
        if (winner === 1) {
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
        } else {
            stats.currentStreak = 0;
        }
        SaveSystem.saveStats(stats);
    }

    showSurvivalEnd() {
        this.state = GameState.SURVIVAL_END;
        this.hideAllOverlays();
        const overlay = document.getElementById('survival-end-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('survival-wave').textContent = `Reached Wave ${this.modeManager.survival.wave}`;
    }

    triggerScreenShake(intensity, duration) {
        this.screenShake.trigger(intensity, duration);
    }

    updateWeaponPickups() {
        for (let i = this.weaponPickups.length - 1; i >= 0; i--) {
            const pickup = this.weaponPickups[i];
            pickup.update();
            if (!pickup.alive) { this.weaponPickups.splice(i, 1); continue; }

            const players = [this.player1, this.player2];
            for (const p of players) {
                if (p && !p.dead && Math.abs(p.x - pickup.x) < 30 && Math.abs(p.y - pickup.y) < 50) {
                    p.setWeapon(createWeapon(pickup.weaponType));
                    pickup.uses--;
                    if (pickup.uses <= 0) pickup.alive = false;
                    soundManager.synthWeaponPickup();
                    this.particleSystem.hitSpark(pickup.x, pickup.y, WEAPON_COLORS[pickup.weaponType] || '#ffffff', 10);
                }
            }
        }

        if (this.weaponPickups.length < 2 && Math.random() < 0.002) {
            const types = ['katana', 'portalGun', 'guitar', 'iceCream', 'rocketLauncher', 'boomerang'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.weaponPickups.push(new WeaponPickup(200 + Math.random() * 800, FLOOR_Y - 30, type));
        }
    }

    update() {
        const timeScale = this.slowdown.update();

        if (this.hitstop.update()) {
            this.draw();
            return;
        }

        this.inputHandler.update();
        this.hud.update();

        if (this.state === GameState.FIGHTING) {
            if (this.roundAnnouncementTimer > 0) {
                this.roundAnnouncementTimer--;
                return;
            }

            if (this.modeManager.isRoundBased() && this.roundEndTimer > 0) {
                this.roundEndTimer--;
                if (this.roundEndTimer <= 0) {
                    this.player1.respawn();
                    this.player1.x = 200;
                    this.player2.respawn();
                    this.player2.x = CANVAS_WIDTH - 200;
                    this.timer = 60;
                    this.startRoundAnnouncement();
                    this.state = GameState.FIGHTING;
                }
                this.particleSystem.update();
                this.screenShake.update();
                return;
            }

            const p1Input = this.inputHandler.getPlayerInput(1);

            if (this.inputHandler.isActionPressed(1, 'lightAttack')) {
                this.player1.attack('light');
                this.startWeaponTrail(this.player1);
            } else if (this.inputHandler.isActionPressed(1, 'heavyAttack')) {
                this.player1.attack('heavy');
                this.startWeaponTrail(this.player1);
            } else if (this.inputHandler.isActionPressed(1, 'special')) {
                this.player1.attack('special');
            }

            const allPlatforms = [...this.staticPlatforms, ...this.stageManager.getPlatforms()];

            this.player1.update(p1Input, this.player2, allPlatforms, this.stageManager);

            if (this.modeManager.currentMode === GameModes.VS_CPU || this.modeManager.currentMode === GameModes.TEAM_BATTLE) {
                const p2Input = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false, grab: false };
                for (const ai of this.aiControllers) {
                    ai.update(this.player2, this.player1, p2Input);
                }
                this.player2.update(p2Input, this.player1, allPlatforms, this.stageManager);

                if (p2Input.lightAttack) { this.player2.attack('light'); this.startWeaponTrail(this.player2); }
                else if (p2Input.heavyAttack) { this.player2.attack('heavy'); this.startWeaponTrail(this.player2); }
                else if (p2Input.special) { this.player2.attack('special'); }
            } else if (this.modeManager.currentMode === GameModes.LOCAL_1V1) {
                const p2Input = this.inputHandler.getPlayerInput(2);
                this.player2.update(p2Input, this.player1, allPlatforms, this.stageManager);

                if (this.inputHandler.isActionPressed(2, 'lightAttack')) { this.player2.attack('light'); this.startWeaponTrail(this.player2); }
                else if (this.inputHandler.isActionPressed(2, 'heavyAttack')) { this.player2.attack('heavy'); this.startWeaponTrail(this.player2); }
                else if (this.inputHandler.isActionPressed(2, 'special')) { this.player2.attack('special'); }
            } else if (this.modeManager.currentMode === GameModes.SURVIVAL) {
                const p2Input = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false, grab: false };
                for (const ai of this.aiControllers) {
                    ai.update(this.player2, this.player1, p2Input);
                }
                this.player2.update(p2Input, this.player1, allPlatforms, this.stageManager);

                if (p2Input.lightAttack) { this.player2.attack('light'); }
                else if (p2Input.heavyAttack) { this.player2.attack('heavy'); }
                else if (p2Input.special) { this.player2.attack('special'); }
            } else if (this.modeManager.currentMode === GameModes.TRAINING) {
                this.player2.state = PlayerState.IDLE;
                this.player2.vx = 0;
                this.player2.vy = 0;
                this.player2.onGround = true;
                if (this.player2.damagePercent >= 300) {
                    this.player2.damagePercent = 0;
                }
            }

            if (this.stageManager) {
                this.stageManager.update([this.player1, this.player2]);
            }

            this.updateBullets();
            this.updateWeaponPickups();
            this.checkCollisions();
            this.checkWinCondition();

            if (this.modeManager.maxTimer > 0 && !this.modeManager.isTraining()) {
                this.timerCounter = (this.timerCounter || 0) + timeScale;
                if (this.timerCounter >= 60) {
                    this.timerCounter = 0;
                    this.timer--;
                    if (this.timer <= 0) {
                        this.timer = 0;
                        const p1Dmg = this.player1.damagePercent;
                        const p2Dmg = this.player2.damagePercent;
                        if (this.modeManager.isSurvival()) {
                            this.showSurvivalEnd();
                        } else {
                            this.modeManager.recordRoundWin(p1Dmg < p2Dmg ? 1 : p2Dmg < p1Dmg ? 2 : 0);
                            if (this.modeManager.needsRoundReset()) this.showMatchEnd();
                            else this.showRoundEnd(p1Dmg < p2Dmg ? 1 : 2);
                        }
                    }
                }
            }
        }

        this.particleSystem.update();
        this.screenShake.update();
    }

    startWeaponTrail(player) {
        if (player.weapon.name === 'Katana') {
            this.weaponTrails.push({ points: [], recording: true, player, reach: 95, color: 'rgba(180,230,255,0.9)', glowColor: '#aaddff', maxWidth: 5, maxPoints: 12 });
        } else if (player.weapon.name === 'Guitar') {
            this.weaponTrails.push({ points: [], recording: true, player, reach: 80, color: 'rgba(255,170,68,0.6)', glowColor: '#ffaa44', maxWidth: 6, maxPoints: 10 });
        }
    }

    draw() {
        this.ctx.save();
        this.screenShake.apply(this.ctx);

        this.ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

        if (this.stageManager) {
            this.stageManager.drawBackground(this.ctx);
        } else {
            this.drawDefaultBackground();
        }

        if (this.state === GameState.FIGHTING || this.state === GameState.ROUND_END || this.state === GameState.PAUSED) {
            drawBloodDecals(this.ctx);

            if (this.stageManager) {
                this.stageManager.drawFloor(this.ctx);
                this.stageManager.drawPlatforms(this.ctx, this.staticPlatforms);
                this.stageManager.drawHazards(this.ctx);
            } else {
                this.drawDefaultFloor();
                this.drawDefaultPlatforms();
            }

            for (const pickup of this.weaponPickups) pickup.draw(this.ctx);

            for (const casing of this.shellCasings) casing.draw(this.ctx);
            drawWeaponTrails(this.ctx, this.weaponTrails);

            for (const bullet of this.bullets) bullet.draw(this.ctx);

            const p1w = this.player1?.weapon;
            if (p1w?.drawPortals) p1w.drawPortals(this.ctx);
            const p2w = this.player2?.weapon;
            if (p2w?.drawPortals) p2w.drawPortals(this.ctx);

            if (this.player1) this.player1.draw(this.ctx);
            if (this.player2) this.player2.draw(this.ctx);

            if (this.debugMode) {
                if (this.player1) this.player1.drawDebug(this.ctx);
                if (this.player2) this.player2.drawDebug(this.ctx);
            }

            this.particleSystem.draw(this.ctx);

            if (this.stageManager) this.stageManager.drawWarningIndicators(this.ctx);

            const players = [this.player1, this.player2];
            const roundInfo = this.modeManager.isRoundBased() ? this.modeManager.getRoundInfo() : null;
            this.hud.drawGameHUD(this.ctx, players, this.timer, this.modeManager.maxTimer, this.modeManager.currentMode, roundInfo);

            if (this.modeManager.isSurvival()) {
                const sInfo = this.modeManager.getSurvivalInfo();
                this.ctx.save();
                this.ctx.font = 'bold 14px Orbitron';
                this.ctx.fillStyle = sInfo.bossWave ? '#ff4444' : '#aaaaaa';
                this.ctx.textAlign = 'center';
                this.ctx.shadowColor = this.ctx.fillStyle;
                this.ctx.shadowBlur = 8;
                this.ctx.fillText(sInfo.bossWave ? `BOSS WAVE ${sInfo.wave}` : `Wave ${sInfo.wave}`, CANVAS_WIDTH / 2, 75);
                this.ctx.restore();
            }

            if (this.settings.showControls && !this.modeManager.isSurvival()) {
                this.drawControlDisplay(this.ctx);
            }

            this.drawFloatingTexts(this.ctx);
        }

        this.ctx.restore();
    }

    drawDefaultBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, CANVAS_HEIGHT); this.ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(CANVAS_WIDTH, y); this.ctx.stroke();
        }
        this.ctx.restore();

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
        const skyline = [
            { x: 50, w: 80, h: 200 }, { x: 150, w: 60, h: 150 },
            { x: 250, w: 100, h: 250 }, { x: 400, w: 70, h: 180 },
            { x: 900, w: 90, h: 220 }, { x: 1020, w: 60, h: 160 },
            { x: 1120, w: 80, h: 190 }
        ];
        for (const b of skyline) this.ctx.fillRect(b.x, FLOOR_Y - b.h, b.w, b.h);
        this.ctx.restore();
    }

    drawDefaultFloor() {
        this.ctx.save();
        this.ctx.fillStyle = '#1a1a3a';
        this.ctx.strokeStyle = '#8b5cf6';
        this.ctx.shadowColor = '#8b5cf6';
        this.ctx.shadowBlur = 15;
        this.ctx.lineWidth = 3;
        this.ctx.fillRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
        this.ctx.strokeRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
        this.ctx.restore();
    }

    drawDefaultPlatforms() {
        for (const platform of this.staticPlatforms) {
            this.ctx.save();
            this.ctx.fillStyle = '#2a2a4a';
            this.ctx.strokeStyle = '#6366f1';
            this.ctx.shadowColor = '#6366f1';
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            this.ctx.restore();
        }
    }

    drawControlDisplay(ctx) {
        const x = 20, y = CANVAS_HEIGHT - 120, w = 170, h = 100;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.font = '10px Orbitron';
        ctx.fillStyle = '#00FFFF';
        ctx.textAlign = 'center';
        const cx = x + w / 2;
        ctx.fillText('W/A/S/D: Move', cx, y + 18);
        ctx.fillText('G: Light  H: Heavy', cx, y + 34);
        ctx.fillText('J: Special  SHIFT: Block', cx, y + 50);
        ctx.fillText('F: Grab  SPACE: Jump', cx, y + 66);
        ctx.fillText('F1: Debug  ESC: Pause', cx, y + 82);
        ctx.restore();
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.accumulator += delta;

        while (this.accumulator >= this.fixedStep) {
            this.update();
            this.accumulator -= this.fixedStep;
        }

        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

const game = new Game();
window.game = game;
