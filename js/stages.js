import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOOR_Y, LEFT_WALL, RIGHT_WALL } from './physics.js';

export const STAGES = {
    neon_city: {
        id: 'neon_city',
        name: 'Neon City',
        unlocked: true,
        bgColors: ['#0a0e27', '#1a1a2e', '#16213e'],
        gridColor: 'rgba(139, 92, 246, 0.08)',
        platformColor: '#2a2a4a',
        platformGlow: '#6366f1',
        floorColor: '#1a1a3a',
        floorGlow: '#8b5cf6',
        hasMovingPlatform: true,
        hasFallingSign: true,
        hazards: ['moving_platform', 'falling_sign']
    },
    blood_dojo: {
        id: 'blood_dojo',
        name: 'Blood Dojo',
        unlocked: false,
        unlockCondition: 'win_10_matches',
        bgColors: ['#1a0a0a', '#2a1515', '#1a0f0f'],
        gridColor: 'rgba(255, 50, 50, 0.06)',
        platformColor: '#3a2020',
        platformGlow: '#cc3333',
        floorColor: '#2a1515',
        floorGlow: '#aa2222',
        hasSpikeTraps: true,
        hazards: ['spike_traps']
    },
    cyber_void: {
        id: 'cyber_void',
        name: 'Cyber Void',
        unlocked: false,
        unlockCondition: 'win_25_matches',
        bgColors: ['#050510', '#0a0a20', '#080818'],
        gridColor: 'rgba(0, 255, 255, 0.05)',
        platformColor: '#1a2a2a',
        platformGlow: '#00cccc',
        floorColor: '#0a1a1a',
        floorGlow: '#00aaaa',
        hasElectricWalls: true,
        hazards: ['electric_walls']
    },
    kraken_depths: {
        id: 'kraken_depths',
        name: 'Kraken Depths',
        unlocked: false,
        unlockCondition: 'win_50_matches',
        bgColors: ['#0a1520', '#0a2030', '#081828'],
        gridColor: 'rgba(0, 100, 200, 0.05)',
        platformColor: '#1a2a3a',
        platformGlow: '#2266aa',
        floorColor: '#0a1a2a',
        floorGlow: '#1155aa',
        hasTentacle: true,
        hazards: ['tentacle_sweep']
    }
};

export class StageManager {
    constructor(stageId) {
        this.stage = STAGES[stageId] || STAGES.neon_city;
        this.stageId = stageId;
        this.frameCount = 0;
        this.hazards = [];
        this.initHazards();
    }

    initHazards() {
        if (this.stage.hasMovingPlatform) {
            this.hazards.push({
                type: 'moving_platform',
                x: 400, y: 380, width: 120, height: 12,
                startX: 400, range: 160, speed: 0.015,
                vx: 0, prevX: 400, type: 'moving'
            });
        }
        if (this.stage.hasFallingSign) {
            this.hazards.push({
                type: 'falling_sign',
                x: 640, y: -60, width: 50, height: 60,
                vy: 0, active: false, timer: 180, warningTimer: 0,
                warningX: 640, cooldown: 300
            });
        }
        if (this.stage.hasSpikeTraps) {
            for (let i = 0; i < 3; i++) {
                this.hazards.push({
                    type: 'spike_trap',
                    x: 200 + i * 300, y: FLOOR_Y,
                    width: 60, height: 15,
                    active: false, timer: 120 + i * 40,
                    warningTimer: 0, cooldown: 180
                });
            }
        }
        if (this.stage.hasElectricWalls) {
            this.hazards.push({
                type: 'electric_walls',
                leftActive: false, rightActive: false,
                timer: 0, cycle: 240, activeDuration: 60,
                damage: 15, pulsePhase: 0
            });
        }
        if (this.stage.hasTentacle) {
            this.hazards.push({
                type: 'tentacle_sweep',
                x: -200, y: FLOOR_Y - 40,
                width: 200, height: 40,
                speed: 12, active: false,
                timer: 900, cooldown: 900,
                sweeping: false, direction: 1
            });
        }
    }

    update(players) {
        this.frameCount++;

        for (const hazard of this.hazards) {
            switch (hazard.type) {
                case 'moving_platform':
                    hazard.prevX = hazard.x;
                    hazard.x = hazard.startX + Math.sin(this.frameCount * hazard.speed) * hazard.range;
                    hazard.vx = hazard.x - hazard.prevX;
                    break;

                case 'falling_sign':
                    hazard.timer--;
                    if (hazard.timer <= 0 && !hazard.active) {
                        hazard.active = true;
                        hazard.vy = 0;
                        hazard.x = 100 + Math.random() * (CANVAS_WIDTH - 200);
                        hazard.y = -60;
                    }
                    if (hazard.active) {
                        hazard.vy += 0.5;
                        hazard.y += hazard.vy;
                        if (hazard.y > FLOOR_Y) {
                            hazard.active = false;
                            hazard.timer = hazard.cooldown;
                        }
                    }
                    break;

                case 'spike_trap':
                    hazard.timer--;
                    if (hazard.timer <= 0) {
                        if (!hazard.active) {
                            hazard.warningTimer = 45;
                            hazard.timer = hazard.warningTimer;
                        } else {
                            hazard.active = false;
                            hazard.timer = hazard.cooldown;
                        }
                    }
                    if (hazard.warningTimer > 0 && !hazard.active) {
                        hazard.warningTimer--;
                        if (hazard.warningTimer <= 0) {
                            hazard.active = true;
                            hazard.timer = 60;
                        }
                    }
                    break;

                case 'electric_walls':
                    hazard.timer++;
                    hazard.pulsePhase += 0.1;
                    const cyclePos = hazard.timer % hazard.cycle;
                    hazard.leftActive = cyclePos < hazard.activeDuration;
                    hazard.rightActive = cyclePos >= hazard.cycle / 2 && cyclePos < hazard.cycle / 2 + hazard.activeDuration;
                    break;

                case 'tentacle_sweep':
                    hazard.timer--;
                    if (hazard.timer <= 0 && !hazard.sweeping) {
                        hazard.sweeping = true;
                        hazard.direction = this.frameCount % 1800 < 900 ? 1 : -1;
                        hazard.x = hazard.direction === 1 ? -200 : CANVAS_WIDTH + 200;
                    }
                    if (hazard.sweeping) {
                        hazard.x += hazard.speed * hazard.direction;
                        if ((hazard.direction === 1 && hazard.x > CANVAS_WIDTH + 200) ||
                            (hazard.direction === -1 && hazard.x < -200)) {
                            hazard.sweeping = false;
                            hazard.timer = hazard.cooldown;
                        }
                    }
                    break;
            }
        }

        for (const player of players) {
            if (!player || player.dead) continue;
            this.checkHazardCollision(player);
        }
    }

    checkHazardCollision(player) {
        for (const hazard of this.hazards) {
            switch (hazard.type) {
                case 'falling_sign':
                    if (hazard.active && this.overlaps(player, hazard)) {
                        player.takeStageDamage(20, hazard.x > player.x ? 1 : -1);
                        hazard.active = false;
                        hazard.timer = hazard.cooldown;
                    }
                    break;

                case 'spike_trap':
                    if (hazard.active && this.overlaps(player, hazard)) {
                        player.takeStageDamage(25, 0);
                    }
                    break;

                case 'electric_walls':
                    if (hazard.leftActive && player.x <= LEFT_WALL + 30) {
                        player.takeStageDamage(hazard.damage, 1);
                    }
                    if (hazard.rightActive && player.x >= RIGHT_WALL - 30) {
                        player.takeStageDamage(hazard.damage, -1);
                    }
                    break;

                case 'tentacle_sweep':
                    if (hazard.sweeping && this.overlaps(player, hazard)) {
                        player.takeStageDamage(30, hazard.direction);
                    }
                    break;
            }
        }
    }

    overlaps(player, hazard) {
        const px = player.x, py = player.y;
        return (
            px + 15 > hazard.x &&
            px - 15 < hazard.x + (hazard.width || 0) &&
            py > hazard.y - 90 &&
            py < hazard.y + (hazard.height || 0)
        );
    }

    getPlatforms() {
        const platforms = [];
        for (const hazard of this.hazards) {
            if (hazard.type === 'moving_platform') {
                platforms.push({
                    x: hazard.x, y: hazard.y,
                    width: hazard.width, height: hazard.height,
                    type: 'moving', vx: hazard.vx
                });
            }
        }
        return platforms;
    }

    drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, this.stage.bgColors[0]);
        gradient.addColorStop(0.5, this.stage.bgColors[1]);
        gradient.addColorStop(1, this.stage.bgColors[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.save();
        ctx.strokeStyle = this.stage.gridColor;
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }
        ctx.restore();

        this.drawParallax(ctx);
    }

    drawParallax(ctx) {
        ctx.save();
        const alpha = 0.04;
        ctx.fillStyle = this.stage.platformGlow.replace(')', `,${alpha})`).replace('rgb', 'rgba');

        if (this.stageId === 'neon_city') {
            const buildings = [
                { x: 50, w: 80, h: 200 }, { x: 150, w: 60, h: 150 },
                { x: 250, w: 100, h: 250 }, { x: 400, w: 70, h: 180 },
                { x: 900, w: 90, h: 220 }, { x: 1020, w: 60, h: 160 },
                { x: 1120, w: 80, h: 190 }
            ];
            for (const b of buildings) {
                ctx.fillRect(b.x, FLOOR_Y - b.h, b.w, b.h);
            }
        } else if (this.stageId === 'blood_dojo') {
            for (let i = 0; i < 5; i++) {
                const x = 100 + i * 250;
                ctx.fillRect(x, FLOOR_Y - 180, 40, 180);
                ctx.fillRect(x + 60, FLOOR_Y - 140, 30, 140);
            }
        } else if (this.stageId === 'cyber_void') {
            for (let i = 0; i < 20; i++) {
                const x = (i * 73 + this.frameCount * 0.2) % CANVAS_WIDTH;
                const y = 50 + (i * 37) % (FLOOR_Y - 100);
                ctx.fillRect(x, y, 2, 20);
            }
        } else if (this.stageId === 'kraken_depths') {
            for (let i = 0; i < 8; i++) {
                const x = i * 170 + 30;
                const sway = Math.sin(this.frameCount * 0.02 + i) * 10;
                ctx.fillRect(x + sway, FLOOR_Y - 120 - i * 15, 20, 120 + i * 15);
            }
        }
        ctx.restore();
    }

    drawFloor(ctx) {
        ctx.save();
        ctx.fillStyle = this.stage.floorColor;
        ctx.strokeStyle = this.stage.floorGlow;
        ctx.shadowColor = this.stage.floorGlow;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.fillRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
        ctx.strokeRect(LEFT_WALL, FLOOR_Y, RIGHT_WALL - LEFT_WALL, 5);
        ctx.restore();
    }

    drawPlatforms(ctx, staticPlatforms) {
        for (const platform of staticPlatforms) {
            ctx.save();
            ctx.fillStyle = this.stage.platformColor;
            ctx.strokeStyle = this.stage.platformGlow;
            ctx.shadowColor = this.stage.platformGlow;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            ctx.restore();
        }

        for (const hazard of this.hazards) {
            if (hazard.type === 'moving_platform') {
                ctx.save();
                ctx.fillStyle = this.stage.platformColor;
                ctx.strokeStyle = '#ffcc00';
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 12;
                ctx.lineWidth = 2;
                ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
                ctx.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
                ctx.restore();
            }
        }
    }

    drawHazards(ctx) {
        for (const hazard of this.hazards) {
            switch (hazard.type) {
                case 'falling_sign':
                    if (hazard.active || hazard.warningTimer > 0) {
                        ctx.save();
                        if (hazard.warningTimer > 0 && !hazard.active) {
                            ctx.globalAlpha = 0.3 + Math.sin(this.frameCount * 0.3) * 0.2;
                            ctx.strokeStyle = '#ff4444';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([5, 5]);
                            ctx.strokeRect(hazard.x, FLOOR_Y - 60, hazard.width, 60);
                        }
                        if (hazard.active) {
                            ctx.fillStyle = '#cc8844';
                            ctx.strokeStyle = '#aa6622';
                            ctx.shadowColor = '#ff8800';
                            ctx.shadowBlur = 10;
                            ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
                            ctx.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
                            ctx.font = 'bold 12px Orbitron';
                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.fillText('DANGER', hazard.x + hazard.width / 2, hazard.y + hazard.height / 2 + 4);
                        }
                        ctx.restore();
                    }
                    break;

                case 'spike_trap':
                    ctx.save();
                    if (!hazard.active && hazard.warningTimer > 0) {
                        ctx.globalAlpha = 0.3 + Math.sin(this.frameCount * 0.4) * 0.2;
                        ctx.strokeStyle = '#ff0000';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(hazard.x, hazard.y - 5, hazard.width, 10);
                    }
                    if (hazard.active) {
                        ctx.fillStyle = '#cc0000';
                        ctx.shadowColor = '#ff0000';
                        ctx.shadowBlur = 8;
                        const spikeCount = Math.floor(hazard.width / 10);
                        for (let i = 0; i < spikeCount; i++) {
                            const sx = hazard.x + i * 10;
                            ctx.beginPath();
                            ctx.moveTo(sx, hazard.y);
                            ctx.lineTo(sx + 5, hazard.y - 14);
                            ctx.lineTo(sx + 10, hazard.y);
                            ctx.fill();
                        }
                    }
                    ctx.restore();
                    break;

                case 'electric_walls':
                    ctx.save();
                    if (hazard.leftActive) {
                        const pulse = Math.sin(hazard.pulsePhase) * 0.3 + 0.7;
                        ctx.globalAlpha = pulse;
                        ctx.fillStyle = '#00ccff';
                        ctx.shadowColor = '#00ffff';
                        ctx.shadowBlur = 30;
                        ctx.fillRect(LEFT_WALL - 5, 0, 15, FLOOR_Y + 5);
                    }
                    if (hazard.rightActive) {
                        const pulse = Math.sin(hazard.pulsePhase + Math.PI) * 0.3 + 0.7;
                        ctx.globalAlpha = pulse;
                        ctx.fillStyle = '#00ccff';
                        ctx.shadowColor = '#00ffff';
                        ctx.shadowBlur = 30;
                        ctx.fillRect(RIGHT_WALL - 10, 0, 15, FLOOR_Y + 5);
                    }
                    ctx.restore();
                    break;

                case 'tentacle_sweep':
                    if (hazard.sweeping) {
                        ctx.save();
                        ctx.fillStyle = '#2a5533';
                        ctx.strokeStyle = '#44aa55';
                        ctx.shadowColor = '#44ff66';
                        ctx.shadowBlur = 15;
                        ctx.lineWidth = 2;

                        const segments = 8;
                        const segWidth = hazard.width / segments;
                        for (let i = 0; i < segments; i++) {
                            const sx = hazard.x + i * segWidth;
                            const wave = Math.sin(this.frameCount * 0.15 + i * 0.5) * 8;
                            ctx.beginPath();
                            ctx.ellipse(sx + segWidth / 2, hazard.y + wave, segWidth / 2 + 5, hazard.height / 2 + 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }

                        ctx.fillStyle = '#ff4444';
                        ctx.beginPath();
                        ctx.arc(hazard.x + (hazard.direction === 1 ? hazard.width - 10 : 10), hazard.y, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    break;
            }
        }
    }

    drawWarningIndicators(ctx) {
        for (const hazard of this.hazards) {
            if (hazard.type === 'falling_sign' && hazard.warningTimer > 30 && !hazard.active) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 20px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('!', hazard.x + hazard.width / 2, FLOOR_Y - 70);
                ctx.restore();
            }
            if (hazard.type === 'tentacle_sweep' && hazard.timer < 180 && hazard.timer > 0 && !hazard.sweeping) {
                ctx.save();
                ctx.globalAlpha = 0.5 + Math.sin(this.frameCount * 0.2) * 0.3;
                ctx.fillStyle = '#ff6644';
                ctx.font = 'bold 14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('TENTACLE INCOMING!', CANVAS_WIDTH / 2, 100);
                ctx.restore();
            }
        }
    }
}
