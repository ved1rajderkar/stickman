import { InputHandler } from './input.js';
import { Player, PlayerState } from './player.js';
import { ParticleSystem, addWound, drawBloodDecals, drawMuzzleFlash, drawWeaponTrails } from './effects.js';
import { HUD } from './ui.js';
import { AIController } from './ai.js';
import { Fists, Katana, BaseballBat, Pistol, Bullet, ShellCasing } from './weapons.js';
import { FLOOR_Y, LEFT_WALL, RIGHT_WALL, CANVAS_WIDTH, CANVAS_HEIGHT, platforms, checkHitboxOverlap, calculateKnockback, resolvePlayerCollision } from './physics.js';
import { StickMan } from './stickman.js';

const GameState = {
    MENU: 'MENU',
    CHARACTER_SELECT: 'CHARACTER_SELECT',
    STAGE_SELECT: 'STAGE_SELECT',
    FIGHTING: 'FIGHTING',
    ROUND_END: 'ROUND_END',
    GAME_OVER: 'GAME_OVER',
    PAUSED: 'PAUSED',
    SETTINGS: 'SETTINGS'
};

const COLORS = [
    { name: 'Crimson', color: '#FF2D55', glow: '#FF2D55' },
    { name: 'Cobalt', color: '#00B8FF', glow: '#00B8FF' },
    { name: 'Venom', color: '#00FF41', glow: '#00FF41' },
    { name: 'Blaze', color: '#FFD60A', glow: '#FFD60A' },
    { name: 'Phantom', color: '#B537F2', glow: '#B537F2' },
    { name: 'Inferno', color: '#FF6B35', glow: '#FF6B35' },
    { name: 'Ghost', color: '#F0F0F0', glow: '#F0F0F0' },
    { name: 'Slash', color: '#FF69B4', glow: '#FF69B4' }
];

const WEAPONS = [
    { name: 'Fists', class: Fists },
    { name: 'Katana', class: Katana },
    { name: 'Baseball Bat', class: BaseballBat },
    { name: 'Pistol', class: Pistol },
    { name: 'Random', class: null }
];

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.inputHandler = new InputHandler();
        this.particleSystem = new ParticleSystem();
        this.hud = new HUD();
        this.aiController = new AIController('hard');

        this.state = GameState.MENU;
        this.gameMode = '1v1';

        this.player1 = null;
        this.player2 = null;

        this.p1Color = COLORS[0];
        this.p2Color = COLORS[1];
        this.p1Weapon = 'Fists';
        this.p2Weapon = 'Fists';
        this.p1Selected = false;
        this.p2Selected = false;

        this.round = 1;
        this.maxRounds = 3;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.timer = 60;
        this.maxTimer = 60;
        this.timerCounter = 0;

        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        this.roundAnnouncementTimer = 0;
        this.koTimer = 0;

        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        this.hitStopFrames = 0;

        this.settings = {
            timer: 60,
            rounds: 3,
            hazards: false,
            weaponDrops: true,
            screenShake: true,
            blood: true,
            volume: 7,
            difficulty: 'hard'
        };

        window.bloodDecals = [];
        window.gameSettings = this.settings;

        this.loadSettings();
        this.setupEventListeners();
        this.setupCharacterSelect();
        this.gameLoop();
    }

    loadSettings() {
        const saved = localStorage.getItem('combatArenaSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        this.applySettingsToUI();
    }

    saveSettings() {
        localStorage.setItem('combatArenaSettings', JSON.stringify(this.settings));
    }

    applySettingsToUI() {
        const timerSelect = document.getElementById('setting-timer');
        const roundsSelect = document.getElementById('setting-rounds');
        const hazardsCheck = document.getElementById('setting-hazards');
        const weaponDropsCheck = document.getElementById('setting-weapon-drops');
        const screenShakeCheck = document.getElementById('setting-screen-shake');
        const bloodCheck = document.getElementById('setting-blood');
        const volumeSlider = document.getElementById('setting-volume');
        const difficultySelect = document.getElementById('setting-difficulty');

        if (timerSelect) timerSelect.value = this.settings.timer.toString();
        if (roundsSelect) roundsSelect.value = this.settings.rounds.toString();
        if (hazardsCheck) hazardsCheck.checked = this.settings.hazards;
        if (weaponDropsCheck) weaponDropsCheck.checked = this.settings.weaponDrops;
        if (screenShakeCheck) screenShakeCheck.checked = this.settings.screenShake;
        if (bloodCheck) bloodCheck.checked = this.settings.blood;
        if (volumeSlider) volumeSlider.value = this.settings.volume;
        if (difficultySelect) difficultySelect.value = this.settings.difficulty;
    }

    setupEventListeners() {
        document.getElementById('btn-1v1').addEventListener('click', () => this.startCharacterSelect('1v1'));
        document.getElementById('btn-vs-cpu').addEventListener('click', () => this.startCharacterSelect('vs-cpu'));
        document.getElementById('btn-survival').addEventListener('click', () => this.startCharacterSelect('survival'));
        document.getElementById('btn-training').addEventListener('click', () => this.startCharacterSelect('training'));
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-fight').addEventListener('click', () => this.startStageSelect());
        document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
        document.getElementById('btn-restart').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
        document.getElementById('btn-settings-back').addEventListener('click', () => this.hideSettings());

        document.getElementById('setting-timer').addEventListener('change', (e) => {
            this.settings.timer = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('setting-rounds').addEventListener('change', (e) => {
            this.settings.rounds = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('setting-hazards').addEventListener('change', (e) => {
            this.settings.hazards = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-weapon-drops').addEventListener('change', (e) => {
            this.settings.weaponDrops = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-screen-shake').addEventListener('change', (e) => {
            this.settings.screenShake = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-blood').addEventListener('change', (e) => {
            this.settings.blood = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('setting-volume').addEventListener('input', (e) => {
            this.settings.volume = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('setting-difficulty').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
            this.aiController.setDifficulty(this.settings.difficulty);
            this.saveSettings();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === GameState.FIGHTING) {
                    this.pauseGame();
                } else if (this.state === GameState.PAUSED) {
                    this.resumeGame();
                }
            }
        });
    }

    setupCharacterSelect() {
        const p1Grid = document.getElementById('p1-color-grid');
        const p2Grid = document.getElementById('p2-color-grid');

        COLORS.forEach((c, i) => {
            const btn1 = document.createElement('button');
            btn1.className = 'color-btn';
            btn1.style.backgroundColor = c.color;
            btn1.style.color = c.glow;
            btn1.addEventListener('click', () => this.selectP1Color(i));
            p1Grid.appendChild(btn1);

            const btn2 = document.createElement('button');
            btn2.className = 'color-btn';
            btn2.style.backgroundColor = c.color;
            btn2.style.color = c.glow;
            btn2.addEventListener('click', () => this.selectP2Color(i));
            p2Grid.appendChild(btn2);
        });

        const p1WeaponDiv = document.getElementById('p1-weapon-select');
        const p2WeaponDiv = document.getElementById('p2-weapon-select');

        WEAPONS.forEach((w, i) => {
            const btn1 = document.createElement('button');
            btn1.className = 'weapon-btn';
            btn1.textContent = w.name;
            btn1.addEventListener('click', () => this.selectP1Weapon(i));
            p1WeaponDiv.appendChild(btn1);

            const btn2 = document.createElement('button');
            btn2.className = 'weapon-btn';
            btn2.textContent = w.name;
            btn2.addEventListener('click', () => this.selectP2Weapon(i));
            p2WeaponDiv.appendChild(btn2);
        });

        this.updateColorGrids();
        this.selectP1Color(0);
        this.selectP2Color(1);
        this.selectP1Weapon(0);
        this.selectP2Weapon(0);
    }

    selectP1Color(index) {
        this.p1Color = COLORS[index];
        this.p1Selected = true;
        this.updateColorGrids();
        this.updateFightButton();
        this.drawPreview('p1-preview', this.p1Color, 'IDLE');
    }

    selectP2Color(index) {
        this.p2Color = COLORS[index];
        this.p2Selected = true;
        this.updateColorGrids();
        this.updateFightButton();
        this.drawPreview('p2-preview', this.p2Color, 'IDLE');
    }

    selectP1Weapon(index) {
        this.p1Weapon = WEAPONS[index].name;
        document.querySelectorAll('#p1-weapon-select .weapon-btn').forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
    }

    selectP2Weapon(index) {
        this.p2Weapon = WEAPONS[index].name;
        document.querySelectorAll('#p2-weapon-select .weapon-btn').forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
    }

    updateColorGrids() {
        const p1Btns = document.querySelectorAll('#p1-color-grid .color-btn');
        const p2Btns = document.querySelectorAll('#p2-color-grid .color-btn');

        p1Btns.forEach((btn, i) => {
            btn.classList.toggle('selected', COLORS[i] === this.p1Color);
            btn.classList.toggle('disabled', COLORS[i] === this.p2Color && this.gameMode === '1v1');
        });

        p2Btns.forEach((btn, i) => {
            btn.classList.toggle('selected', COLORS[i] === this.p2Color);
            btn.classList.toggle('disabled', COLORS[i] === this.p1Color && this.gameMode === '1v1');
        });

        document.getElementById('p1-color-name').textContent = this.p1Color.name;
        document.getElementById('p2-color-name').textContent = this.p2Color.name;
    }

    updateFightButton() {
        const btn = document.getElementById('btn-fight');
        btn.disabled = !(this.p1Selected && this.p2Selected);
    }

    drawPreview(canvasId, color, anim) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const stickman = new StickMan(color.color, color.glow);
        stickman.drawPreview(ctx, canvas.width / 2, canvas.height / 2 + 20, anim, Date.now() * 0.001);
    }

    startCharacterSelect(mode) {
        this.gameMode = mode;
        this.state = GameState.CHARACTER_SELECT;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('character-select').classList.remove('hidden');

        if (mode === 'vs-cpu') {
            document.getElementById('p2-color-grid').style.opacity = '0.5';
            document.getElementById('p2-weapon-select').style.opacity = '0.5';
        } else {
            document.getElementById('p2-color-grid').style.opacity = '1';
            document.getElementById('p2-weapon-select').style.opacity = '1';
        }
    }

    startStageSelect() {
        this.state = GameState.STAGE_SELECT;
        document.getElementById('character-select').classList.add('hidden');
        document.getElementById('stage-select').classList.remove('hidden');

        document.getElementById('stage-neon-city').addEventListener('click', () => {
            document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('selected'));
            document.getElementById('stage-neon-city').classList.add('selected');
            setTimeout(() => this.startFight(), 500);
        });
    }

    startFight() {
        document.getElementById('stage-select').classList.add('hidden');

        this.maxRounds = this.settings.rounds;
        this.maxTimer = this.settings.timer;
        this.round = 1;
        this.p1Wins = 0;
        this.p2Wins = 0;

        this.player1 = new Player(300, FLOOR_Y, this.p1Color.color, this.p1Color.glow, 1);
        this.player2 = new Player(980, FLOOR_Y, this.p2Color.color, this.p2Color.glow, 2);

        const p1WeaponClass = WEAPONS.find(w => w.name === this.p1Weapon)?.class || Fists;
        const p2WeaponClass = WEAPONS.find(w => w.name === this.p2Weapon)?.class || Fists;

        this.player1.setWeapon(new p1WeaponClass());
        this.player2.setWeapon(this.gameMode === 'vs-cpu' ? new p1WeaponClass() : new p2WeaponClass());

        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        window.bloodDecals = [];

        this.state = GameState.FIGHTING;
        this.startRoundAnnouncement();
    }

    startRoundAnnouncement() {
        this.roundAnnouncementTimer = 120;
        const announcement = document.getElementById('round-announcement');
        const roundText = document.getElementById('round-text');
        const fightText = document.getElementById('fight-text');

        announcement.classList.remove('hidden');
        roundText.textContent = `ROUND ${this.round}`;
        fightText.textContent = '';

        setTimeout(() => {
            fightText.textContent = 'FIGHT!';
            fightText.classList.add('slam-in');
        }, 1000);

        setTimeout(() => {
            announcement.classList.add('hidden');
            fightText.classList.remove('slam-in');
        }, 2000);
    }

    pauseGame() {
        this.state = GameState.PAUSED;
        document.getElementById('pause-overlay').classList.remove('hidden');
    }

    resumeGame() {
        this.state = GameState.FIGHTING;
        document.getElementById('pause-overlay').classList.add('hidden');
    }

    restartGame() {
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('ko-screen').classList.add('hidden');
        this.round = 1;
        this.p1Wins = 0;
        this.p2Wins = 0;
        this.player1.reset(300, FLOOR_Y);
        this.player2.reset(980, FLOOR_Y);
        this.hud.clear();
        this.particleSystem.clear();
        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        window.bloodDecals = [];
        this.startRoundAnnouncement();
        this.state = GameState.FIGHTING;
    }

    quitToMenu() {
        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('ko-screen').classList.add('hidden');
        document.getElementById('character-select').classList.add('hidden');
        document.getElementById('stage-select').classList.add('hidden');
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
        document.getElementById('settings-overlay').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settings-overlay').classList.add('hidden');
        this.state = GameState.MENU;
    }

    triggerScreenShake(intensity, duration) {
        if (!this.settings.screenShake) return;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
    }

    updateScreenShake() {
        if (this.screenShake.duration > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.duration--;
            this.screenShake.intensity *= 0.9;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
    }

    addFloatingText(x, y, value, color, size) {
        this.floatingTexts.push({
            x, y,
            value,
            vy: -2,
            life: 50,
            maxLife: 50,
            color,
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

            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            if (!bullet.alive) {
                if (bullet.x >= 0 && bullet.x <= 1280) {
                    this.particleSystem.hitSpark(bullet.x, bullet.y, '#ffff88', 3);
                }
                this.bullets.splice(i, 1);
                continue;
            }

            if (this.player1 && bullet.alive) {
                if (bullet.x > this.player1.x - 15 && bullet.x < this.player1.x + 15 &&
                    bullet.y > this.player1.y - 80 && bullet.y < this.player1.y) {
                    const knockback = calculateKnockback(
                        { knockback: 4 }, bullet.damage, bullet.facingDir, this.player1.weight
                    );
                    const result = this.player1.takeDamage(bullet.damage, knockback.vx, knockback.vy, this.player2);
                    bullet.alive = false;

                    this.hud.addHitNumber(this.player1.x, this.player1.y - 90, result.damage, result.isCritical ? 'critical' : 'normal');
                    this.addFloatingText(this.player1.x, this.player1.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : '#ffffff', 14 + Math.floor(result.damage / 5));

                    if (this.settings.blood) {
                        this.particleSystem.bloodSplatter(this.player1.x, this.player1.y - 50, bullet.facingDir, result.damage);
                        addWound(this.player1, bullet.facingDir, result.damage);
                    }
                    this.particleSystem.hitSpark(this.player1.x, this.player1.y - 50, this.player2.glowColor);
                    this.triggerScreenShake(result.damage > 20 ? 6 : 3, 10);
                }
            }

            if (this.player2 && bullet.alive) {
                if (bullet.x > this.player2.x - 15 && bullet.x < this.player2.x + 15 &&
                    bullet.y > this.player2.y - 80 && bullet.y < this.player2.y) {
                    const knockback = calculateKnockback(
                        { knockback: 4 }, bullet.damage, bullet.facingDir, this.player2.weight
                    );
                    const result = this.player2.takeDamage(bullet.damage, knockback.vx, knockback.vy, this.player1);
                    bullet.alive = false;

                    this.hud.addHitNumber(this.player2.x, this.player2.y - 90, result.damage, result.isCritical ? 'critical' : 'normal');
                    this.addFloatingText(this.player2.x, this.player2.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : '#ffffff', 14 + Math.floor(result.damage / 5));

                    if (this.settings.blood) {
                        this.particleSystem.bloodSplatter(this.player2.x, this.player2.y - 50, bullet.facingDir, result.damage);
                        addWound(this.player2, bullet.facingDir, result.damage);
                    }
                    this.particleSystem.hitSpark(this.player2.x, this.player2.y - 50, this.player1.glowColor);
                    this.triggerScreenShake(result.damage > 20 ? 6 : 3, 10);
                }
            }
        }
    }

    updateShellCasings() {
        for (let i = this.shellCasings.length - 1; i >= 0; i--) {
            this.shellCasings[i].update();
            if (this.shellCasings[i].life <= 0) {
                this.shellCasings.splice(i, 1);
            }
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
                points: [],
                recording: true,
                player,
                reach: 95,
                color: 'rgba(180,230,255,0.9)',
                glowColor: '#aaddff',
                maxWidth: 5,
                maxPoints: 12
            });
        } else if (player.weapon.name === 'Baseball Bat') {
            this.weaponTrails.push({
                points: [],
                recording: true,
                player,
                reach: 95,
                color: 'rgba(180,120,60,0.6)',
                glowColor: '#b4783c',
                maxWidth: 8,
                maxPoints: 8
            });
        }
    }

    checkCollisions() {
        if (!this.player1 || !this.player2) return;

        resolvePlayerCollision(this.player1, this.player2);

        if (this.player1.currentHitbox && !this.player1.hasHitThisAttack) {
            if (checkHitboxOverlap(this.player1.currentHitbox, this.player2.hitbox)) {
                const isHeavy = this.player1.state === PlayerState.ATTACK_HEAVY;
                const damage = isHeavy ? this.player1.weapon.getHeavyAttackDamage() : this.player1.weapon.getLightAttackDamage();
                const knockback = calculateKnockback(
                    this.player1.weapon,
                    damage,
                    this.player1.facingDir,
                    this.player2.weight
                );

                const result = this.player2.takeDamage(
                    damage,
                    knockback.vx,
                    knockback.vy,
                    this.player1
                );

                this.player1.hasHitThisAttack = true;
                this.hud.addHitNumber(this.player2.x, this.player2.y - 90, result.damage, result.isCritical ? 'critical' : result.isCounter ? 'counter' : 'normal');
                this.addFloatingText(this.player2.x, this.player2.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : result.damage > 15 ? '#ffaa00' : '#ffffff', 14 + Math.floor(result.damage / 5));

                if (this.settings.blood) {
                    this.particleSystem.bloodSplatter(this.player2.x, this.player2.y - 50, this.player1.facingDir, result.damage);
                    addWound(this.player2, this.player1.facingDir, result.damage);
                }
                this.particleSystem.hitSpark(this.player2.x, this.player2.y - 50, this.player1.glowColor);

                if (isHeavy) {
                    this.hitStopFrames = 3;
                    this.triggerScreenShake(result.damage > 30 ? 8 : 5, 15);
                } else if (result.damage > 15) {
                    this.triggerScreenShake(4, 10);
                }
            }
        }

        if (this.player2.currentHitbox && !this.player2.hasHitThisAttack) {
            if (checkHitboxOverlap(this.player2.currentHitbox, this.player1.hitbox)) {
                const isHeavy = this.player2.state === PlayerState.ATTACK_HEAVY;
                const damage = isHeavy ? this.player2.weapon.getHeavyAttackDamage() : this.player2.weapon.getLightAttackDamage();
                const knockback = calculateKnockback(
                    this.player2.weapon,
                    damage,
                    this.player2.facingDir,
                    this.player1.weight
                );

                const result = this.player1.takeDamage(
                    damage,
                    knockback.vx,
                    knockback.vy,
                    this.player2
                );

                this.player2.hasHitThisAttack = true;
                this.hud.addHitNumber(this.player1.x, this.player1.y - 90, result.damage, result.isCritical ? 'critical' : result.isCounter ? 'counter' : 'normal');
                this.addFloatingText(this.player1.x, this.player1.y - 90, result.damage.toString(), result.damage > 30 ? '#ff4400' : result.damage > 15 ? '#ffaa00' : '#ffffff', 14 + Math.floor(result.damage / 5));

                if (this.settings.blood) {
                    this.particleSystem.bloodSplatter(this.player1.x, this.player1.y - 50, this.player2.facingDir, result.damage);
                    addWound(this.player1, this.player2.facingDir, result.damage);
                }
                this.particleSystem.hitSpark(this.player1.x, this.player1.y - 50, this.player2.glowColor);

                if (isHeavy) {
                    this.hitStopFrames = 3;
                    this.triggerScreenShake(result.damage > 30 ? 8 : 5, 15);
                } else if (result.damage > 15) {
                    this.triggerScreenShake(4, 10);
                }
            }
        }
    }

    checkWinCondition() {
        if (this.player1.hp <= 0 && this.player1.state !== PlayerState.DEATH) {
            this.player1.state = PlayerState.DEATH;
            this.player1.vy = -8;
            this.particleSystem.deathExplosion(this.player1.x, this.player1.y - 40, this.player1.glowColor);
            this.triggerScreenShake(12, 20);

            if (this.settings.blood) {
                for (let i = 0; i < 5; i++) {
                    window.bloodDecals.push({
                        x: this.player1.x + (Math.random() - 0.5) * 40,
                        y: FLOOR_Y,
                        radius: 4 + Math.random() * 8,
                        alpha: 0.7,
                        age: 0
                    });
                }
            }
        }

        if (this.player2.hp <= 0 && this.player2.state !== PlayerState.DEATH) {
            this.player2.state = PlayerState.DEATH;
            this.player2.vy = -8;
            this.particleSystem.deathExplosion(this.player2.x, this.player2.y - 40, this.player2.glowColor);
            this.triggerScreenShake(12, 20);

            if (this.settings.blood) {
                for (let i = 0; i < 5; i++) {
                    window.bloodDecals.push({
                        x: this.player2.x + (Math.random() - 0.5) * 40,
                        y: FLOOR_Y,
                        radius: 4 + Math.random() * 8,
                        alpha: 0.7,
                        age: 0
                    });
                }
            }
        }

        if ((this.player1.hp <= 0 && this.player1.y >= FLOOR_Y) ||
            (this.player2.hp <= 0 && this.player2.y >= FLOOR_Y)) {
            if (this.state === GameState.FIGHTING) {
                this.endRound();
            }
        }
    }

    endRound() {
        this.state = GameState.ROUND_END;
        this.koTimer = 180;

        const p1Dead = this.player1.hp <= 0;
        const p2Dead = this.player2.hp <= 0;

        if (p1Dead && p2Dead) {
        } else if (p1Dead) {
            this.p2Wins++;
        } else if (p2Dead) {
            this.p1Wins++;
        } else {
            if (this.player1.hp > this.player2.hp) {
                this.p1Wins++;
            } else if (this.player2.hp > this.player1.hp) {
                this.p2Wins++;
            }
        }

        const koScreen = document.getElementById('ko-screen');
        const koText = document.getElementById('ko-text');
        const koSubtext = document.getElementById('ko-subtext');
        const koSpecial = document.getElementById('ko-special');

        koScreen.classList.remove('hidden');
        koText.classList.add('slam-in');

        const winner = p2Dead || (!p1Dead && this.player1.hp > this.player2.hp) ? 'PLAYER 1' : 'PLAYER 2';
        const winColor = p2Dead || (!p1Dead && this.player1.hp > this.player2.hp) ? this.p1Color.color : this.p2Color.color;

        koSubtext.textContent = `${winner} WINS THE ROUND!`;
        koSubtext.style.color = winColor;

        if (!p1Dead && this.player1.hp === this.player1.maxHp) {
            koSpecial.textContent = 'PERFECT!';
            koSpecial.classList.remove('hidden');
        } else if (!p2Dead && this.player2.hp === this.player2.maxHp) {
            koSpecial.textContent = 'PERFECT!';
            koSpecial.classList.remove('hidden');
        } else {
            koSpecial.classList.add('hidden');
        }

        setTimeout(() => {
            koText.classList.remove('slam-in');
        }, 500);
    }

    nextRound() {
        const winsNeeded = Math.ceil(this.maxRounds / 2);

        if (this.p1Wins >= winsNeeded || this.p2Wins >= winsNeeded) {
            this.endGame();
            return;
        }

        this.round++;
        this.player1.reset(300, FLOOR_Y);
        this.player2.reset(980, FLOOR_Y);
        this.hud.clear();
        this.particleSystem.clear();
        this.bullets = [];
        this.shellCasings = [];
        this.weaponTrails = [];
        this.floatingTexts = [];
        window.bloodDecals = [];
        this.timer = this.maxTimer;
        this.timerCounter = 0;
        this.state = GameState.FIGHTING;
        this.startRoundAnnouncement();
    }

    endGame() {
        this.state = GameState.GAME_OVER;

        const koScreen = document.getElementById('ko-screen');
        const koText = document.getElementById('ko-text');
        const koSubtext = document.getElementById('ko-subtext');
        const koSpecial = document.getElementById('ko-special');

        koText.textContent = 'GAME OVER';
        const winner = this.p1Wins > this.p2Wins ? 'PLAYER 1' : 'PLAYER 2';
        const winColor = this.p1Wins > this.p2Wins ? this.p1Color.color : this.p2Color.color;
        koSubtext.textContent = `${winner} WINS ${this.p1Wins}-${this.p2Wins}!`;
        koSubtext.style.color = winColor;
        koSpecial.classList.add('hidden');

        setTimeout(() => {
            koScreen.classList.add('hidden');
            this.quitToMenu();
        }, 3000);
    }

    update() {
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--;
            this.draw();
            return;
        }

        this.inputHandler.update();

        if (this.state === GameState.FIGHTING) {
            if (this.roundAnnouncementTimer > 0) {
                this.roundAnnouncementTimer--;
                return;
            }

            const p1Input = this.inputHandler.getPlayerInput(1);
            let p2Input;

            if (this.gameMode === 'vs-cpu') {
                p2Input = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false };
                this.aiController.update(this.player2, this.player1, p2Input);
            } else {
                p2Input = this.inputHandler.getPlayerInput(2);
            }

            this.player1.update(p1Input, this.player2);
            this.player2.update(p2Input, this.player1);

            if (this.inputHandler.isActionDown(1, 'lightAttack')) {
                const result = this.player1.attack('light');
                if (result !== null && this.player1.weapon.name === 'Pistol' && this.player1.weapon.hasAmmo()) {
                    const newBullets = this.player1.weapon.fire(this.player1.x, this.player1.y, this.player1.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        this.shellCasings.push(new ShellCasing(this.player1.x + this.player1.facingDir * 20, this.player1.y - 50, this.player1.facingDir));
                    }
                    this.startWeaponTrail(this.player1);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player1);
                }
            } else if (this.inputHandler.isActionDown(1, 'heavyAttack')) {
                const result = this.player1.attack('heavy');
                if (result !== null && this.player1.weapon.name === 'Pistol' && this.player1.weapon.hasAmmo()) {
                    const newBullets = this.player1.weapon.fire(this.player1.x, this.player1.y, this.player1.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        this.shellCasings.push(new ShellCasing(this.player1.x + this.player1.facingDir * 20, this.player1.y - 50, this.player1.facingDir));
                    }
                    this.startWeaponTrail(this.player1);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player1);
                }
            } else if (this.inputHandler.isActionDown(1, 'special')) {
                this.player1.attack('special');
            }

            if (p2Input.lightAttack) {
                const result = this.player2.attack('light');
                if (result !== null && this.player2.weapon.name === 'Pistol' && this.player2.weapon.hasAmmo()) {
                    const newBullets = this.player2.weapon.fire(this.player2.x, this.player2.y, this.player2.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        this.shellCasings.push(new ShellCasing(this.player2.x + this.player2.facingDir * 20, this.player2.y - 50, this.player2.facingDir));
                    }
                    this.startWeaponTrail(this.player2);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player2);
                }
            } else if (p2Input.heavyAttack) {
                const result = this.player2.attack('heavy');
                if (result !== null && this.player2.weapon.name === 'Pistol' && this.player2.weapon.hasAmmo()) {
                    const newBullets = this.player2.weapon.fire(this.player2.x, this.player2.y, this.player2.facingDir);
                    if (newBullets) {
                        this.bullets.push(...newBullets);
                        this.shellCasings.push(new ShellCasing(this.player2.x + this.player2.facingDir * 20, this.player2.y - 50, this.player2.facingDir));
                    }
                    this.startWeaponTrail(this.player2);
                } else if (result !== null) {
                    this.startWeaponTrail(this.player2);
                }
            } else if (p2Input.special) {
                this.player2.attack('special');
            }

            if (this.player1.weapon.muzzleFlashFrames > 0) this.player1.weapon.muzzleFlashFrames--;
            if (this.player2.weapon.muzzleFlashFrames > 0) this.player2.weapon.muzzleFlashFrames--;

            this.updateBullets();
            this.updateShellCasings();
            this.updateWeaponTrails();
            this.checkCollisions();
            this.checkWinCondition();

            if (this.maxTimer > 0) {
                this.timerCounter++;
                if (this.timerCounter >= 60) {
                    this.timerCounter = 0;
                    this.timer--;
                    if (this.timer <= 0) {
                        this.timer = 0;
                        this.endRound();
                    }
                }
            }
        } else if (this.state === GameState.ROUND_END) {
            this.koTimer--;
            if (this.koTimer <= 0) {
                document.getElementById('ko-screen').classList.add('hidden');
                this.nextRound();
            }
        }

        this.particleSystem.update();
        this.updateScreenShake();
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);

        this.ctx.clearRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

        this.drawBackground();

        if (this.state === GameState.FIGHTING || this.state === GameState.ROUND_END || this.state === GameState.PAUSED) {
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

            for (const casing of this.shellCasings) {
                casing.draw(this.ctx);
            }

            drawWeaponTrails(this.ctx, this.weaponTrails);

            for (const bullet of this.bullets) {
                bullet.draw(this.ctx);
            }

            if (this.player1) this.player1.draw(this.ctx);
            if (this.player2) this.player2.draw(this.ctx);

            this.particleSystem.draw(this.ctx);

            if (this.player1 && this.player1.weapon.muzzleFlashFrames > 0) {
                drawMuzzleFlash(this.ctx, this.player1.x + this.player1.facingDir * 50, this.player1.y - 50, this.player1.facingDir);
            }
            if (this.player2 && this.player2.weapon.muzzleFlashFrames > 0) {
                drawMuzzleFlash(this.ctx, this.player2.x + this.player2.facingDir * 50, this.player2.y - 50, this.player2.facingDir);
            }

            this.hud.drawHealthBars(this.ctx, this.player1, this.player2);
            this.hud.drawSpecialMeters(this.ctx, this.player1, this.player2);
            this.hud.drawTimer(this.ctx, this.timer, this.maxTimer);
            this.hud.drawRoundIndicators(this.ctx, this.p1Wins, this.p2Wins, this.maxRounds);

            if (this.player1) this.hud.drawComboCounter(this.ctx, this.player1, this.player1.x, this.player1.y - 120);
            if (this.player2) this.hud.drawComboCounter(this.ctx, this.player2, this.player2.x, this.player2.y - 120);

            this.hud.drawHitNumbers(this.ctx);
            this.drawFloatingTexts(this.ctx);

            this.hud.drawWeaponIcon(this.ctx, this.player1, 60, 105);
            this.hud.drawWeaponIcon(this.ctx, this.player2, CANVAS_WIDTH - 60, 105);
        }

        this.ctx.restore();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#0f0f1a');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
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
        this.ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
        const skyline = [
            { x: 50, w: 80, h: 200 },
            { x: 150, w: 60, h: 150 },
            { x: 250, w: 100, h: 250 },
            { x: 400, w: 70, h: 180 },
            { x: 900, w: 90, h: 220 },
            { x: 1020, w: 60, h: 160 },
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
