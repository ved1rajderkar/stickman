import { InputHandler } from './input.js';
import { Player, PlayerState } from './player.js';
import { ParticleSystem, addWound, drawBloodDecals, drawMuzzleFlashOverlay, drawWeaponTrails, ScreenShake, HitstopManager } from './effects.js';
import { HUD } from './ui.js';
import { AIController } from './ai.js';
import { Fists, Katana, BaseballBat, Pistol, Bullet, ShellCasing } from './weapons.js';
import { FLOOR_Y, LEFT_WALL, RIGHT_WALL, CANVAS_WIDTH, CANVAS_HEIGHT, platforms, checkHitboxOverlap, calculateKnockback, resolvePlayerCollision } from './physics.js';
import { StickMan } from './stickman.js';
import { soundManager } from './sound.js';
import { LevelManager } from './levelManager.js';
import { SaveSystem } from './saveSystem.js';
import { SKINS, Economy } from './economy.js';

console.log('[Stickman] Module loaded');

const GameState = {
    MENU: 'MENU',
    NAME_INPUT: 'NAME_INPUT',
    VIDEO_PLAYING: 'VIDEO_PLAYING',
    LEVEL_SELECT: 'LEVEL_SELECT',
    FIGHTING: 'FIGHTING',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    PAUSED: 'PAUSED',
    SETTINGS: 'SETTINGS',
    STATS: 'STATS',
    SKIN_SELECT: 'SKIN_SELECT'
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
        this.hud = new HUD();

        this.state = GameState.MENU;
        this.playerName = SaveSystem.getPlayerName();
        this.currentLevel = SaveSystem.getCurrentLevel();
        this.selectedSkin = Economy.getSelectedSkin();

        this.player = null;
        this.enemies = [];
        this.spikes = [];
        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];

        this.levelConfig = null;
        this.levelStartTime = 0;
        this.levelDeaths = 0;
        this.timer = 0;
        this.maxTimer = 0;
        this.timerCounter = 0;

        this.roundAnnouncementTimer = 0;
        this.levelCompleteTimer = 0;
        this.levelCompleteStars = 0;

        this.settings = {
            screenShake: true,
            blood: true,
            volume: 7,
            showControls: true
        };

        window.bloodDecals = [];
        window.gameSettings = this.settings;

        this.loadSettings();
        this.setupEventListeners();
        console.log('[Stickman] Game initialized, event listeners set up');

        this.gameLoop();
    }

    loadSettings() {
        const saved = localStorage.getItem('stickman_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
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
            'btn-next-level', 'btn-retry-level',
            'setting-screen-shake', 'setting-blood', 'setting-volume', 'setting-controls',
            'btn-name-confirm', 'input-player-name', 'btn-start-level'
        ];
        for (const id of ids) {
            const el = document.getElementById(id);
            if (!el) {
                console.error(`[Game] Missing element: #${id}`);
            }
        }

        document.getElementById('btn-play').addEventListener('click', () => this.handlePlay());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-stats').addEventListener('click', () => this.showStats());
        document.getElementById('btn-skins').addEventListener('click', () => this.showSkinSelect());

        document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-restart').addEventListener('click', () => this.restartLevel());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());

        document.getElementById('btn-settings-back').addEventListener('click', () => this.hideSettings());
        document.getElementById('btn-stats-back').addEventListener('click', () => this.hideStats());
        document.getElementById('btn-skins-back').addEventListener('click', () => this.hideSkinSelect());

        document.getElementById('btn-next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-retry-level').addEventListener('click', () => this.retryLevel());

        document.getElementById('setting-screen-shake').addEventListener('change', (e) => {
            this.settings.screenShake = e.target.checked;
            this.screenShake.enabled = this.settings.screenShake;
            this.saveSettings();
        });
        document.getElementById('setting-blood').addEventListener('change', (e) => {
            this.settings.blood = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-volume').addEventListener('input', (e) => {
            soundManager.setVolume(parseInt(e.target.value));
            this.settings.volume = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('setting-controls').addEventListener('change', (e) => {
            this.settings.showControls = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('btn-name-confirm').addEventListener('click', () => this.confirmName());
        document.getElementById('input-player-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmName();
        });

        document.getElementById('btn-start-level').addEventListener('click', () => this.startLevel());

        window.addEventListener('keydown', (e) => {
            soundManager.init();
            if (e.key === 'Escape' || e.key === 'p') {
                if (this.state === GameState.FIGHTING) this.pauseGame();
                else if (this.state === GameState.PAUSED) this.resumeGame();
            }
        });
        document.addEventListener('click', () => soundManager.init(), { once: true });
    }

    handlePlay() {
        const hasName = this.playerName && this.playerName !== 'Player1';
        if (!hasName) {
            this.showNameInput();
        } else {
            this.showLevelSelect();
        }
    }

    showNameInput() {
        this.state = GameState.NAME_INPUT;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('name-input-overlay').classList.remove('hidden');
        document.getElementById('input-player-name').value = this.playerName === 'Player1' ? '' : this.playerName;
        document.getElementById('input-player-name').focus();
        soundManager.synthUIClick();
    }

    confirmName() {
        const input = document.getElementById('input-player-name');
        const name = input.value.trim() || 'Player1';
        this.playerName = name;
        SaveSystem.setPlayerName(name);
        document.getElementById('name-input-overlay').classList.add('hidden');
        this.showLevelSelect();
        soundManager.synthUIClick();
    }

    showLevelSelect() {
        this.state = GameState.LEVEL_SELECT;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('level-select-overlay').classList.remove('hidden');

        const levelDisplay = document.getElementById('level-display');
        const difficultyDisplay = document.getElementById('difficulty-display');
        const isBoss = LevelManager.isBossLevel(this.currentLevel);

        levelDisplay.textContent = LevelManager.getLevelDisplayName(this.currentLevel);
        difficultyDisplay.textContent = LevelManager.getDifficultyLabel(this.currentLevel);
        difficultyDisplay.className = isBoss ? 'text-red-400' : 'text-cyan-400';

        if (isBoss) {
            document.getElementById('boss-warning').classList.remove('hidden');
        } else {
            document.getElementById('boss-warning').classList.add('hidden');
        }

        soundManager.synthUIClick();
    }

    startLevel() {
        document.getElementById('level-select-overlay').classList.add('hidden');

        this.levelConfig = LevelManager.getLevelConfig(this.currentLevel);
        this.maxTimer = this.levelConfig.timeLimit;
        this.timer = this.maxTimer;
        this.timerCounter = 0;
        this.levelStartTime = Date.now();
        this.levelDeaths = 0;

        this.setupLevel();

        if (LevelManager.shouldShowVideo(this.currentLevel)) {
            this.playVideo(LevelManager.getVideoForLevel(this.currentLevel));
        } else {
            this.beginFighting();
        }
    }

    playVideo(videoPath) {
        this.state = GameState.VIDEO_PLAYING;
        const videoOverlay = document.getElementById('video-overlay');
        const videoEl = document.getElementById('story-video');

        videoOverlay.classList.remove('hidden');
        videoEl.src = videoPath;
        videoEl.play().catch(() => {
            this.beginFighting();
        });

        const skipBtn = document.getElementById('btn-skip-video');
        skipBtn.classList.add('hidden');

        setTimeout(() => {
            skipBtn.classList.remove('hidden');
        }, 5000);

        const onEnded = () => {
            videoEl.removeEventListener('ended', onEnded);
            videoOverlay.classList.add('hidden');
            this.beginFighting();
        };
        videoEl.addEventListener('ended', onEnded);

        skipBtn.onclick = () => {
            videoEl.pause();
            videoEl.removeEventListener('ended', onEnded);
            videoOverlay.classList.add('hidden');
            this.beginFighting();
        };
    }

    setupLevel() {
        this.player = new Player(200, FLOOR_Y, this.selectedSkin, this.selectedSkin, 1);
        this.player.name = this.playerName;
        this.player.setWeapon(new Fists());

        this.enemies = [];
        const config = this.levelConfig;

        if (config.isBoss) {
            const boss = new Player(CANVAS_WIDTH - 200, FLOOR_Y, '#FF0000', '#FF0000', 2);
            boss.name = `BOSS ${config.level}`;
            boss.maxHp = config.enemyHealth;
            boss.hp = config.enemyHealth;
            boss.baseSpeed = config.enemySpeed;
            boss.speed = config.enemySpeed;
            boss.damageMultiplier = config.enemyDamage / 10;
            boss.setWeapon(new Katana());
            this.enemies.push(boss);
        } else {
            for (let i = 0; i < config.enemyCount; i++) {
                const enemy = new Player(CANVAS_WIDTH - 200 - (i * 80), FLOOR_Y, '#FF4444', '#FF4444', 2);
                enemy.name = `Enemy ${i + 1}`;
                enemy.maxHp = config.enemyHealth;
                enemy.hp = config.enemyHealth;
                enemy.baseSpeed = config.enemySpeed;
                enemy.speed = config.enemySpeed;
                enemy.damageMultiplier = config.enemyDamage / 10;
                const weapons = [new Fists(), new Katana(), new BaseballBat()];
                enemy.setWeapon(weapons[Math.floor(Math.random() * weapons.length)]);
                this.enemies.push(enemy);
            }
        }

        this.spikes = [];
        if (config.hasSpikes) {
            const spikeWidth = 30;
            const availableWidth = RIGHT_WALL - LEFT_WALL - 100;
            for (let i = 0; i < config.spikeCount; i++) {
                const x = LEFT_WALL + 50 + Math.random() * (availableWidth - spikeWidth);
                this.spikes.push({ x, y: FLOOR_Y, width: spikeWidth, height: 15 });
            }
        }

        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        window.bloodDecals = [];
    }

    beginFighting() {
        this.state = GameState.FIGHTING;
        this.startRoundAnnouncement();
    }

    startRoundAnnouncement() {
        this.roundAnnouncementTimer = 90;
        const announcement = document.getElementById('round-announcement');
        const roundText = document.getElementById('round-text');
        const fightText = document.getElementById('fight-text');

        announcement.classList.remove('hidden');
        roundText.textContent = LevelManager.getLevelDisplayName(this.currentLevel);
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

    restartLevel() {
        document.getElementById('pause-overlay').classList.add('hidden');
        this.levelDeaths = 0;
        this.setupLevel();
        this.timer = this.maxTimer;
        this.timerCounter = 0;
        this.startRoundAnnouncement();
        this.state = GameState.FIGHTING;
    }

    retryLevel() {
        document.getElementById('level-complete-overlay').classList.add('hidden');
        this.levelDeaths = 0;
        this.setupLevel();
        this.timer = this.maxTimer;
        this.timerCounter = 0;
        this.startRoundAnnouncement();
        this.state = GameState.FIGHTING;
        soundManager.synthUIClick();
    }

    nextLevel() {
        document.getElementById('level-complete-overlay').classList.add('hidden');
        this.currentLevel = LevelManager.getNextLevel(this.currentLevel);
        SaveSystem.setCurrentLevel(this.currentLevel);
        Economy.checkSkinUnlocks(this.currentLevel);
        this.showLevelSelect();
        soundManager.synthUIClick();
    }

    quitToMenu() {
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('level-complete-overlay').classList.add('hidden');
        document.getElementById('level-select-overlay').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        this.hud.clear();
        this.particleSystem.clear();
        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        window.bloodDecals = [];
    }

    showSettings() {
        this.state = GameState.SETTINGS;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('settings-overlay').classList.remove('hidden');
        soundManager.synthUIClick();
    }

    hideSettings() {
        document.getElementById('settings-overlay').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        soundManager.synthUIClick();
    }

    showStats() {
        this.state = GameState.STATS;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('stats-overlay').classList.remove('hidden');
        this.renderStats();
        soundManager.synthUIClick();
    }

    hideStats() {
        document.getElementById('stats-overlay').classList.add('hidden');
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
            { id: 'first_level', name: 'First Steps', desc: 'Complete your first level', icon: '⭐' },
            { id: 'level_10', name: 'Getting Started', desc: 'Reach level 10', icon: '🌟' },
            { id: 'level_25', name: 'Warrior', desc: 'Reach level 25', icon: '⚔️' },
            { id: 'first_boss', name: 'Boss Slayer', desc: 'Defeat your first boss', icon: '👑' },
            { id: 'level_50', name: 'Halfway Hero', desc: 'Reach level 50', icon: '🏆' },
            { id: 'level_75', name: 'Veteran', desc: 'Reach level 75', icon: '💪' },
            { id: 'level_100', name: 'Legend', desc: 'Reach level 100', icon: '🎖️' },
            { id: 'streak_10', name: 'Unstoppable', desc: '10 level streak', icon: '🔥' },
            { id: 'streak_25', name: 'On Fire', desc: '25 level streak', icon: '💥' },
            { id: 'no_death', name: 'Flawless', desc: 'Complete a level without dying', icon: '✨' }
        ];

        for (const ach of allAchievements) {
            const unlocked = SaveSystem.hasAchievement(ach.id);
            const div = document.createElement('div');
            div.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `
                <span class="achievement-icon">${unlocked ? ach.icon : '🔒'}</span>
                <div>
                    <p class="achievement-name">${ach.name}</p>
                    <p class="achievement-desc">${ach.desc}</p>
                </div>
            `;
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
        this.state = GameState.SKIN_SELECT;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('skin-select-overlay').classList.remove('hidden');
        this.renderSkins();
        soundManager.synthUIClick();
    }

    hideSkinSelect() {
        document.getElementById('skin-select-overlay').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        this.state = GameState.MENU;
        soundManager.synthUIClick();
    }

    renderSkins() {
        const container = document.getElementById('skins-grid');
        container.innerHTML = '';
        const unlocked = Economy.getUnlockedSkins();

        for (const skin of SKINS) {
            const isUnlocked = unlocked.includes(skin.color);
            const isSelected = this.selectedSkin === skin.color;
            const div = document.createElement('div');
            div.className = `skin-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
            div.innerHTML = `
                <div class="skin-preview" style="background: ${skin.color}; box-shadow: 0 0 15px ${skin.color}"></div>
                <p class="skin-name">${skin.name}</p>
                ${isUnlocked
                    ? (isSelected ? '<p class="skin-status selected-text">SELECTED</p>' : '<p class="skin-status">CLICK TO SELECT</p>')
                    : `<p class="skin-status locked-text">Level ${skin.unlockLevel}</p>`
                }
            `;
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

    addFloatingText(x, y, value, color, size) {
        this.floatingTexts.push({
            x, y, value, vy: -2, life: 50, maxLife: 50, color,
            size: Math.min(size, 28)
        });
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

            if (!bullet.alive) {
                if (bullet.x >= 0 && bullet.x <= CANVAS_WIDTH) {
                    this.particleSystem.hitSpark(bullet.x, bullet.y, '#ffff88', 3);
                }
                this.bullets.splice(i, 1);
                continue;
            }

            if (bullet.alive && this.player) {
                if (bullet.x > this.player.x - 15 && bullet.x < this.player.x + 15 &&
                    bullet.y > this.player.y - 80 && bullet.y < this.player.y) {
                    const knockback = calculateKnockback({ knockback: 4 }, bullet.damage, bullet.facingDir, this.player.weight);
                    const result = this.player.takeDamage(bullet.damage, knockback.vx, knockback.vy, null);
                    bullet.alive = false;

                    this.hud.addHitNumber(this.player.x, this.player.y - 90, result.damage, result.isCritical ? 'critical' : 'normal');
                    this.addFloatingText(this.player.x, this.player.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : '#ffffff', 14 + Math.floor(result.damage / 5));

                    if (this.settings.blood) {
                        this.particleSystem.bloodSplatter(this.player.x, this.player.y - 50, bullet.facingDir, result.damage);
                        addWound(this.player, bullet.facingDir, result.damage);
                    }
                    this.particleSystem.hitSpark(this.player.x, this.player.y - 50, '#FF4444');
                    this.particleSystem.sparkImpact(this.player.x, this.player.y - 50, 10);
                    this.triggerScreenShake(result.damage > 20 ? 6 : 3, 10);
                    this.hitstop.trigger(result.damage);
                }
            }

            for (const enemy of this.enemies) {
                if (bullet.alive && enemy.hp > 0) {
                    if (bullet.x > enemy.x - 15 && bullet.x < enemy.x + 15 &&
                        bullet.y > enemy.y - 80 && bullet.y < enemy.y) {
                        const knockback = calculateKnockback({ knockback: 4 }, bullet.damage, bullet.facingDir, enemy.weight);
                        const result = enemy.takeDamage(bullet.damage, knockback.vx, knockback.vy, this.player);
                        bullet.alive = false;

                        this.hud.addHitNumber(enemy.x, enemy.y - 90, result.damage, result.isCritical ? 'critical' : 'normal');
                        this.addFloatingText(enemy.x, enemy.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : '#ffffff', 14 + Math.floor(result.damage / 5));

                        if (this.settings.blood) {
                            this.particleSystem.bloodSplatter(enemy.x, enemy.y - 50, bullet.facingDir, result.damage);
                            addWound(enemy, bullet.facingDir, result.damage);
                        }
                        this.particleSystem.hitSpark(enemy.x, enemy.y - 50, this.player.glowColor);
                        this.particleSystem.sparkImpact(enemy.x, enemy.y - 50, 10);
                        this.triggerScreenShake(result.damage > 20 ? 6 : 3, 10);
                        this.hitstop.trigger(result.damage);
                    }
                }
            }
        }
    }

    updateShellCasings() {
        for (let i = this.shellCasings.length - 1; i >= 0; i--) {
            this.shellCasings[i].update();
            if (this.shellCasings[i].life <= 0) this.shellCasings.splice(i, 1);
        }
    }

    updateWeaponTrails() {
        for (let i = this.weaponTrails.length - 1; i >= 0; i--) {
            const trail = this.weaponTrails[i];
            if (trail.recording && trail.player) {
                const isAttacking = trail.player.state === 'ATTACK_LIGHT' || trail.player.state === 'ATTACK_HEAVY';
                const isWindup = trail.player.attackFrame < 6;
                if (isAttacking && isWindup) {
                    const tipX = trail.player.x + trail.player.facingDir * trail.reach;
                    const tipY = trail.player.y - 60;
                    trail.points.push({ x: tipX, y: tipY });
                    if (trail.points.length > trail.maxPoints) trail.points.shift();
                } else {
                    trail.recording = false;
                }
            } else {
                if (trail.points.length > 0) {
                    trail.points.shift();
                } else {
                    this.weaponTrails.splice(i, 1);
                }
            }
        }
    }

    startWeaponTrail(player) {
        if (player.weapon.name === 'Katana') {
            this.weaponTrails.push({
                points: [], recording: true, player, reach: 95,
                color: 'rgba(180,230,255,0.9)', glowColor: '#aaddff',
                maxWidth: 5, maxPoints: 12
            });
        } else if (player.weapon.name === 'Baseball Bat') {
            this.weaponTrails.push({
                points: [], recording: true, player, reach: 95,
                color: 'rgba(180,120,60,0.6)', glowColor: '#b4783c',
                maxWidth: 8, maxPoints: 8
            });
        }
    }

    checkSpikeCollision() {
        if (!this.player || this.player.hp <= 0) return;
        for (const spike of this.spikes) {
            if (this.player.x > spike.x && this.player.x < spike.x + spike.width &&
                this.player.y >= spike.y - 5 && this.player.y <= spike.y + 10) {
                this.player.hp = 0;
                this.player.state = PlayerState.DEATH;
                this.player.vy = -8;
                this.particleSystem.deathExplosion(this.player.x, this.player.y - 40, this.player.glowColor);
                this.triggerScreenShake(12, 20);
                soundManager.play('death');
                this.levelDeaths++;
                const stats = SaveSystem.getStats();
                stats.deaths++;
                SaveSystem.saveStats(stats);
            }
        }
    }

    checkCollisions() {
        if (!this.player) return;

        for (const enemy of this.enemies) {
            if (enemy.hp <= 0) continue;

            resolvePlayerCollision(this.player, enemy);

            if (this.player.currentHitbox && !this.player.hasHitThisAttack) {
                if (checkHitboxOverlap(this.player.currentHitbox, enemy.hitbox)) {
                    const isHeavy = this.player.state === PlayerState.ATTACK_HEAVY;
                    const damage = isHeavy ? this.player.weapon.getHeavyAttackDamage() : this.player.weapon.getLightAttackDamage();
                    const knockback = calculateKnockback(this.player.weapon, damage, this.player.facingDir, enemy.weight);
                    const result = enemy.takeDamage(damage, knockback.vx, knockback.vy, this.player);

                    this.player.hasHitThisAttack = true;
                    this.hud.addHitNumber(enemy.x, enemy.y - 90, result.damage, result.isCritical ? 'critical' : result.isCounter ? 'counter' : 'normal');
                    this.addFloatingText(enemy.x, enemy.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : result.damage > 15 ? '#ffaa00' : '#ffffff', 14 + Math.floor(result.damage / 5));

                    if (this.settings.blood) {
                        this.particleSystem.bloodSplatter(enemy.x, enemy.y - 50, this.player.facingDir, result.damage);
                        addWound(enemy, this.player.facingDir, result.damage);
                    }
                    this.particleSystem.hitSpark(enemy.x, enemy.y - 50, this.player.glowColor);
                    this.particleSystem.sparkImpact(enemy.x, enemy.y - 50, Math.min(15, 8 + Math.floor(result.damage / 5)));

                    this.hitstop.trigger(result.damage);
                    this.triggerScreenShake(result.damage > 30 ? 8 : result.damage > 15 ? 5 : 3, result.damage > 30 ? 15 : 10);

                    if (this.player.weapon.name === 'Katana') soundManager.play('sword_slash');
                    else if (this.player.weapon.name === 'Baseball Bat') soundManager.play('bat_swing');
                    else soundManager.synthPunchWhoosh();
                }
            }

            if (enemy.currentHitbox && !enemy.hasHitThisAttack) {
                if (checkHitboxOverlap(enemy.currentHitbox, this.player.hitbox)) {
                    const isHeavy = enemy.state === PlayerState.ATTACK_HEAVY;
                    const damage = isHeavy ? enemy.weapon.getHeavyAttackDamage() : enemy.weapon.getLightAttackDamage();
                    const knockback = calculateKnockback(enemy.weapon, damage, enemy.facingDir, this.player.weight);
                    const result = this.player.takeDamage(damage, knockback.vx, knockback.vy, enemy);

                    enemy.hasHitThisAttack = true;
                    this.hud.addHitNumber(this.player.x, this.player.y - 90, result.damage, result.isCritical ? 'critical' : result.isCounter ? 'counter' : 'normal');
                    this.addFloatingText(this.player.x, this.player.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : result.damage > 15 ? '#ffaa00' : '#ffffff', 14 + Math.floor(result.damage / 5));

                    if (this.settings.blood) {
                        this.particleSystem.bloodSplatter(this.player.x, this.player.y - 50, enemy.facingDir, result.damage);
                        addWound(this.player, enemy.facingDir, result.damage);
                    }
                    this.particleSystem.hitSpark(this.player.x, this.player.y - 50, enemy.glowColor);
                    this.particleSystem.sparkImpact(this.player.x, this.player.y - 50, Math.min(15, 8 + Math.floor(result.damage / 5)));

                    this.hitstop.trigger(result.damage);
                    this.triggerScreenShake(result.damage > 30 ? 8 : result.damage > 15 ? 5 : 3, result.damage > 30 ? 15 : 10);

                    if (enemy.weapon.name === 'Katana') soundManager.play('sword_slash');
                    else if (enemy.weapon.name === 'Baseball Bat') soundManager.play('bat_swing');
                    else soundManager.synthPunchWhoosh();
                }
            }
        }
    }

    checkWinCondition() {
        if (!this.player) return;

        if (this.player.hp <= 0 && this.player.state !== PlayerState.DEATH) {
            this.player.state = PlayerState.DEATH;
            this.player.vy = -8;
            this.particleSystem.deathExplosion(this.player.x, this.player.y - 40, this.player.glowColor);
            this.triggerScreenShake(12, 20);
            soundManager.play('death');
            this.levelDeaths++;
            if (this.settings.blood) {
                for (let i = 0; i < 5; i++) {
                    window.bloodDecals.push({ x: this.player.x + (Math.random() - 0.5) * 40, y: FLOOR_Y, radius: 4 + Math.random() * 8, alpha: 0.7, age: 0 });
                }
            }
            const stats = SaveSystem.getStats();
            stats.deaths++;
            stats.currentStreak = 0;
            SaveSystem.saveStats(stats);
        }

        for (const enemy of this.enemies) {
            if (enemy.hp <= 0 && enemy.state !== PlayerState.DEATH) {
                enemy.state = PlayerState.DEATH;
                enemy.vy = -8;
                this.particleSystem.deathExplosion(enemy.x, enemy.y - 40, enemy.glowColor);
                this.triggerScreenShake(12, 20);
                soundManager.play('death');
                if (this.settings.blood) {
                    for (let i = 0; i < 5; i++) {
                        window.bloodDecals.push({ x: enemy.x + (Math.random() - 0.5) * 40, y: FLOOR_Y, radius: 4 + Math.random() * 8, alpha: 0.7, age: 0 });
                    }
                }
            }
        }

        const playerDead = this.player.hp <= 0 && this.player.y >= FLOOR_Y;
        const allEnemiesDead = this.enemies.every(e => e.hp <= 0 && e.y >= FLOOR_Y);

        if (playerDead) {
            this.showLevelComplete(false);
        } else if (allEnemiesDead) {
            this.showLevelComplete(true);
        }
    }

    showLevelComplete(won) {
        if (won) {
            const elapsed = (Date.now() - this.levelStartTime) / 1000;
            const timeRemaining = Math.max(0, this.maxTimer - elapsed);
            const hpPercent = this.player.hp / this.player.maxHp;
            this.levelCompleteStars = LevelManager.calculateStars(this.currentLevel, timeRemaining, hpPercent, this.levelDeaths);

            SaveSystem.setLevelStars(this.currentLevel, this.levelCompleteStars);

            const stats = SaveSystem.getStats();
            stats.totalLevelsCompleted++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
            if (this.currentLevel > stats.highestLevel) stats.highestLevel = this.currentLevel;
            stats.totalPlaytime += Math.round(elapsed);
            stats.totalKills += this.enemies.length;

            if (this.levelConfig.isBoss) stats.bossesDefeated++;

            if (this.currentLevel === 1) SaveSystem.unlockAchievement('first_level');
            if (this.currentLevel >= 10) SaveSystem.unlockAchievement('level_10');
            if (this.currentLevel >= 25) SaveSystem.unlockAchievement('level_25');
            if (this.currentLevel >= 50) SaveSystem.unlockAchievement('level_50');
            if (this.currentLevel >= 75) SaveSystem.unlockAchievement('level_75');
            if (this.currentLevel >= 100) SaveSystem.unlockAchievement('level_100');
            if (this.levelConfig.isBoss) SaveSystem.unlockAchievement('first_boss');
            if (stats.currentStreak >= 10) SaveSystem.unlockAchievement('streak_10');
            if (stats.currentStreak >= 25) SaveSystem.unlockAchievement('streak_25');
            if (this.levelDeaths === 0) SaveSystem.unlockAchievement('no_death');

            SaveSystem.saveStats(stats);

            soundManager.play('level_complete');
        } else {
            soundManager.play('death');
        }

        this.state = GameState.LEVEL_COMPLETE;
        const overlay = document.getElementById('level-complete-overlay');
        overlay.classList.remove('hidden');

        document.getElementById('lc-level').textContent = LevelManager.getLevelDisplayName(this.currentLevel);
        document.getElementById('lc-result').textContent = won ? 'LEVEL COMPLETE!' : 'DEFEATED';
        document.getElementById('lc-result').className = won ? 'text-cyan-400' : 'text-red-500';

        if (won) {
            document.getElementById('lc-stars').textContent = '⭐'.repeat(this.levelCompleteStars) + '☆'.repeat(3 - this.levelCompleteStars);
            document.getElementById('lc-time').textContent = `Time: ${this.formatTime(Math.round((Date.now() - this.levelStartTime) / 1000))}`;
            document.getElementById('lc-hp').textContent = `HP: ${Math.round(this.player.hp / this.player.maxHp * 100)}%`;
            document.getElementById('lc-deaths').textContent = `Deaths: ${this.levelDeaths}`;

            if (this.levelConfig.isBoss) {
                document.getElementById('lc-boss-banner').classList.remove('hidden');
            } else {
                document.getElementById('lc-boss-banner').classList.add('hidden');
            }

            if (LevelManager.isCheckpointLevel(this.currentLevel)) {
                document.getElementById('lc-checkpoint').classList.remove('hidden');
            } else {
                document.getElementById('lc-checkpoint').classList.add('hidden');
            }
        } else {
            document.getElementById('lc-stars').textContent = '';
            document.getElementById('lc-time').textContent = '';
            document.getElementById('lc-hp').textContent = '';
            document.getElementById('lc-deaths').textContent = '';
            document.getElementById('lc-boss-banner').classList.add('hidden');
            document.getElementById('lc-checkpoint').classList.add('hidden');
        }
    }

    triggerScreenShake(intensity, duration) {
        this.screenShake.trigger(intensity, duration);
    }

    update() {
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

            const p1Input = this.inputHandler.getPlayerInput(1);

            this.player.update(p1Input, this.enemies.find(e => e.hp > 0) || this.enemies[0]);

            if (this.inputHandler.isActionDown(1, 'lightAttack')) {
                const result = this.player.attack('light');
                if (result !== null && this.player.weapon.name === 'Pistol' && this.player.weapon.hasAmmo()) {
                    const newBullets = this.player.weapon.fire(this.player.x, this.player.y, this.player.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        for (const bullet of newBullets) {
                            this.particleSystem.bulletTrail(bullet.x, bullet.y, bullet.vx * 0.5, 0, '#FFFF88');
                        }
                        this.shellCasings.push(new ShellCasing(this.player.x + this.player.facingDir * 20, this.player.y - 50, this.player.facingDir));
                        this.particleSystem.muzzleFlash(this.player.x + this.player.facingDir * 30, this.player.y - 50, this.player.facingDir);
                    }
                    soundManager.play('pistol');
                    this.startWeaponTrail(this.player);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player);
                }
            } else if (this.inputHandler.isActionDown(1, 'heavyAttack')) {
                const result = this.player.attack('heavy');
                if (result !== null && this.player.weapon.name === 'Pistol' && this.player.weapon.hasAmmo()) {
                    const newBullets = this.player.weapon.fire(this.player.x, this.player.y, this.player.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        for (const bullet of newBullets) {
                            this.particleSystem.bulletTrail(bullet.x, bullet.y, bullet.vx * 0.5, 0, '#FFFF88');
                        }
                        this.shellCasings.push(new ShellCasing(this.player.x + this.player.facingDir * 20, this.player.y - 50, this.player.facingDir));
                        this.particleSystem.muzzleFlash(this.player.x + this.player.facingDir * 30, this.player.y - 50, this.player.facingDir);
                    }
                    soundManager.play('pistol');
                    this.startWeaponTrail(this.player);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player);
                }
            } else if (this.inputHandler.isActionDown(1, 'special')) {
                this.player.attack('special');
            }

            for (const enemy of this.enemies) {
                if (enemy.hp > 0) {
                    const aiInput = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false };
                    const ai = new AIController('hard');
                    ai.update(enemy, this.player, aiInput);
                    enemy.update(aiInput, this.player);

                    if (aiInput.lightAttack) {
                        const result = enemy.attack('light');
                        if (result !== null && enemy.weapon.name === 'Pistol' && enemy.weapon.hasAmmo()) {
                            const newBullets = enemy.weapon.fire(enemy.x, enemy.y, enemy.facingDir);
                            if (newBullets) {
                                this.bullets.push(...newBullets);
                            }
                        }
                    } else if (aiInput.heavyAttack) {
                        enemy.attack('heavy');
                    }
                }
            }

            if (this.player.weapon.muzzleFlashFrames > 0) this.player.weapon.muzzleFlashFrames--;
            for (const enemy of this.enemies) {
                if (enemy.weapon.muzzleFlashFrames > 0) enemy.weapon.muzzleFlashFrames--;
            }

            this.updateBullets();
            this.updateShellCasings();
            this.updateWeaponTrails();
            this.checkSpikeCollision();
            this.checkCollisions();
            this.checkWinCondition();

            if (this.maxTimer > 0) {
                this.timerCounter++;
                if (this.timerCounter >= 60) {
                    this.timerCounter = 0;
                    this.timer--;
                    if (this.timer <= 0) {
                        this.timer = 0;
                        this.showLevelComplete(false);
                    }
                }
            }
        }

        this.particleSystem.update();
        this.screenShake.update();
    }

    draw() {
        this.ctx.save();
        this.screenShake.apply(this.ctx);

        this.ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);
        this.drawBackground();

        if (this.state === GameState.FIGHTING || this.state === GameState.LEVEL_COMPLETE || this.state === GameState.PAUSED) {
            drawBloodDecals(this.ctx);

            for (const platform of platforms) {
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

            this.ctx.save();
            this.ctx.fillStyle = '#1a1a3a';
            this.ctx.strokeStyle = '#8b5cf6';
            this.ctx.shadowColor = '#8b5cf6';
            this.ctx.shadowBlur = 15;
            this.ctx.lineWidth = 3;
            this.ctx.fillRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
            this.ctx.strokeRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
            this.ctx.restore();

            for (const spike of this.spikes) {
                this.ctx.save();
                this.ctx.fillStyle = '#FF0000';
                this.ctx.shadowColor = '#FF0000';
                this.ctx.shadowBlur = 8;
                const spikeCount = Math.floor(spike.width / 10);
                for (let i = 0; i < spikeCount; i++) {
                    const sx = spike.x + i * 10;
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, spike.y);
                    this.ctx.lineTo(sx + 5, spike.y - 12);
                    this.ctx.lineTo(sx + 10, spike.y);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }

            for (const casing of this.shellCasings) casing.draw(this.ctx);

            drawWeaponTrails(this.ctx, this.weaponTrails);

            for (const bullet of this.bullets) bullet.draw(this.ctx);

            if (this.player) this.player.draw(this.ctx);
            for (const enemy of this.enemies) {
                if (enemy.hp > 0 || enemy.state === PlayerState.DEATH) enemy.draw(this.ctx);
            }

            this.particleSystem.draw(this.ctx);

            if (this.player && this.player.weapon.muzzleFlashFrames > 0) {
                drawMuzzleFlashOverlay(this.ctx, this.player.x + this.player.facingDir * 50, this.player.y - 50, this.player.facingDir);
            }

            if (this.player) {
                this.hud.drawGameHUD(this.ctx, this.playerName, this.currentLevel, this.player, this.enemies, this.timer, this.maxTimer, this.levelConfig);
            }

            if (this.settings.showControls) {
                this.drawControlDisplay(this.ctx);
            }

            this.hud.drawHitNumbers(this.ctx);
            this.drawFloatingTexts(this.ctx);
        }

        this.ctx.restore();
    }

    drawControlDisplay(ctx) {
        const x = 20;
        const y = CANVAS_HEIGHT - 140;
        const w = 180;
        const h = 120;

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
        ctx.font = '11px Orbitron';
        ctx.fillStyle = '#00FFFF';
        ctx.textAlign = 'center';

        const cx = x + w / 2;
        ctx.fillText('↑ W/↑', cx, y + 20);
        ctx.fillText('← A/←   ATK → D/→', cx, y + 38);
        ctx.fillText('↓ S/↓', cx, y + 56);
        ctx.fillText('SPACE: Jump', cx, y + 76);
        ctx.fillText('SHIFT: Block', cx, y + 94);
        ctx.fillText('ESC: Pause', cx, y + 112);

        ctx.restore();
    }

    drawBackground() {
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
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CANVAS_HEIGHT);
            this.ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CANVAS_WIDTH, y);
            this.ctx.stroke();
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
        for (const building of skyline) {
            this.ctx.fillRect(building.x, FLOOR_Y - building.h, building.w, building.h);
        }
        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();
window.game = game;
