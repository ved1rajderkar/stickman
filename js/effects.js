// ============================================================
// Particle System — physics-based particles with gravity,
// object pooling, and emitter presets.
// ============================================================
import { PARTICLE_GRAVITY_MULT, MAX_PARTICLES, GRAVITY } from './constants.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = MAX_PARTICLES;
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += (p.gravity || 0) * PARTICLE_GRAVITY_MULT;
            p.life--;
            p.alpha = p.life / p.maxLife;
            if (p.shape === 'elongated') p.angle = Math.atan2(p.vy, p.vx);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        while (this.particles.length > this.maxParticles) this.particles.shift();
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = p.glow; }
            if (p.shape === 'elongated') {
                ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
                ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            } else if (p.shape === 'rect') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.alpha, p.size * p.alpha);
            } else if (p.shape === 'line') {
                ctx.strokeStyle = p.color; ctx.lineWidth = p.size * p.alpha; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke();
            } else if (p.shape === 'star') {
                this.drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.5);
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3; const step = Math.PI / spikes;
        ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
        }
        ctx.closePath(); ctx.fill();
    }

    /** Emit particles from a pool (reuses dead ones) */
    emit(config) {
        let p = this.particles.find(pp => pp.life <= 0);
        if (!p) {
            if (this.particles.length >= this.maxParticles) return;
            p = {};
            this.particles.push(p);
        }
        Object.assign(p, config, { alpha: 1 });
    }

    // ── Emitter presets ──

    /** Dust burst on landing — 8 particles, brown/grey, light gravity */
    dust(x, y, intensity = 1) {
        const count = Math.floor(8 * intensity);
        for (let i = 0; i < count; i++) {
            this.emit({
                x: x + (Math.random() - 0.5) * 20, y,
                vx: (Math.random() - 0.5) * 3 * intensity,
                vy: -(2 + Math.random() * 2) * intensity,
                life: 15 + Math.random() * 10, maxLife: 25,
                size: 2 + Math.random() * 3,
                color: `hsl(30, ${10 + Math.random() * 20}%, ${40 + Math.random() * 20}%)`,
                gravity: GRAVITY * 0.3, shape: 'circle'
            });
        }
    }

    /** Blood splatter on hit — 12 particles, arc away from hit direction */
    bloodSplatter(x, y, direction, damage) {
        const count = Math.min(Math.floor(damage / 4) + 5, 18);
        const colors = ['#cc0000', '#aa0000', '#880000', '#ff2222', '#dd1111'];
        for (let i = 0; i < count; i++) {
            this.emit({
                x, y,
                vx: direction * (1 + Math.random() * 6) + (Math.random() - 0.5) * 2,
                vy: -(1 + Math.random() * 5),
                life: 30 + Math.random() * 20, maxLife: 50,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: GRAVITY * 0.4,
                shape: Math.random() < 0.7 ? 'circle' : 'elongated'
            });
        }
    }

    /** Sparks on weapon clash — 16 particles, high speed, yellow/white */
    sparks(x, y) {
        for (let i = 0; i < 16; i++) {
            this.emit({
                x, y,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16 - 2,
                life: 8 + Math.random() * 8, maxLife: 16,
                size: 1 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#ffff88' : '#ffffff',
                gravity: GRAVITY * 0.1, shape: 'circle', glow: 8
            });
        }
    }

    /** Hit spark burst — radial burst of colored particles */
    hitSpark(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 3 + Math.random() * 4;
            this.emit({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 15 + Math.random() * 10, maxLife: 25,
                size: 3 + Math.random() * 3, color,
                gravity: GRAVITY * 0.1, shape: 'circle', glow: 5
            });
        }
    }

    /** Spark impact — dense burst for normal hits */
    sparkImpact(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.emit({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
                life: 10 + Math.random() * 10, maxLife: 20,
                size: 2 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#ffffff' : '#ffcc44',
                gravity: GRAVITY * 0.15, shape: 'circle', glow: 6
            });
        }
    }

    /** Heavy hit spark — larger burst with star particles */
    heavyHitSpark(x, y) {
        this.hitSpark(x, y, '#ffffff', 15);
        this.sparks(x, y);
        for (let i = 0; i < 5; i++) {
            this.emit({
                x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                life: 20 + Math.random() * 15, maxLife: 35,
                size: 4 + Math.random() * 4, color: '#FFD700',
                gravity: GRAVITY * 0.1, shape: 'star', glow: 12
            });
        }
    }

    /** Parry spark — golden starburst */
    parrySpark(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            this.emit({
                x, y, vx: Math.cos(angle) * (4 + Math.random() * 3), vy: Math.sin(angle) * (4 + Math.random() * 3),
                life: 20 + Math.random() * 10, maxLife: 30,
                size: 2 + Math.random() * 3, color: '#FFD700',
                gravity: 0, shape: 'star', glow: 15
            });
        }
    }

    /** Death explosion — radial burst */
    deathExplosion(x, y, color, count = 25) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 2 + Math.random() * 6;
            this.emit({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20, maxLife: 50,
                size: 4 + Math.random() * 6, color,
                gravity: GRAVITY * 0.05, shape: 'circle', glow: 8
            });
        }
    }

    /** Freeze effect — light blue upward drift */
    freezeEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            this.emit({
                x, y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                life: 20 + Math.random() * 15, maxLife: 35,
                size: 2 + Math.random() * 3, color: '#88ddff',
                gravity: -GRAVITY * 0.05, shape: 'circle', glow: 8
            });
        }
    }

    /** Explosion AoE — fire particles */
    explosionAoE(x, y, radius) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            this.emit({
                x: x + Math.cos(angle) * radius * 0.3, y: y + Math.sin(angle) * radius * 0.3,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
                life: 20 + Math.random() * 20, maxLife: 40,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00',
                gravity: GRAVITY * 0.15, shape: 'circle', glow: 10
            });
        }
    }

    /** Smoke on dash — slow upward drift, grey, large */
    smoke(x, y) {
        for (let i = 0; i < 5; i++) {
            this.emit({
                x: x + (Math.random() - 0.5) * 10, y,
                vx: (Math.random() - 0.5) * 0.5, vy: -(0.5 + Math.random()),
                life: 20 + Math.random() * 15, maxLife: 35,
                size: 6 + Math.random() * 8, color: '#666666',
                gravity: -GRAVITY * 0.05, shape: 'circle'
            });
        }
    }

    /** Shockwave ring — expanding circle overlay effect */
    shockwave(x, y) {
        this.emit({
            x, y, vx: 0, vy: 0,
            life: 20, maxLife: 20,
            size: 0, maxSize: 80,
            color: '#ffffff', gravity: 0, shape: 'ring', glow: 20
        });
    }

    /** Muzzle flash */
    muzzleFlash(x, y, facingDir) {
        for (let i = 0; i < 6; i++) {
            this.emit({
                x, y, vx: facingDir * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 3,
                life: 4 + Math.random() * 4, maxLife: 8,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#FFFFFF' : '#FFD700',
                gravity: 0, shape: 'circle', glow: 15
            });
        }
    }

    /** Bullet trail */
    bulletTrail(x, y, vx, vy, color = '#FFFF88') {
        this.emit({ x, y, vx: vx * 0.1, vy: vy * 0.1, life: 8, maxLife: 8, size: 3, color, alpha: 1, gravity: 0, shape: 'line', glow: 10 });
    }

    screenFlash(ctx, color, alpha) {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    }

    clear() { this.particles = []; }
}

export function addWound(player, attackerFacingDir, damage) {
    if (!player.wounds) player.wounds = [];
    const bodyParts = ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    player.wounds.push({ bodyPart: bodyParts[Math.floor(Math.random() * bodyParts.length)], offsetX: (Math.random() - 0.5) * 16, offsetY: (Math.random() - 0.5) * 16, size: 3 + damage / 8, age: 0, maxAge: 300 });
    if (damage > 25) player.wounds.push({ bodyPart: 'head', offsetX: (Math.random() - 0.5) * 12, offsetY: (Math.random() - 0.5) * 12, size: 2 + damage / 10, age: 0, maxAge: 300 });
    if (player.wounds.length > 8) player.wounds.shift();
}

export function drawBloodDecals(ctx) {
    if (!window.bloodDecals) window.bloodDecals = [];
    for (let i = window.bloodDecals.length - 1; i >= 0; i--) {
        const d = window.bloodDecals[i];
        ctx.save(); ctx.globalAlpha = d.alpha * Math.max(0, 1 - d.age / 600);
        ctx.fillStyle = '#5a0000'; ctx.shadowColor = '#880000'; ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); d.age++;
    }
    if (window.bloodDecals.length > 30) window.bloodDecals.shift();
}

export function drawMuzzleFlashOverlay(ctx, muzzleX, muzzleY, facingDir) {
    ctx.save(); ctx.shadowColor = 'white'; ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,255,220,0.95)';
    ctx.beginPath(); ctx.ellipse(muzzleX, muzzleY, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

export function drawWeaponTrails(ctx, trails) {
    for (const trail of trails) {
        if (trail.points.length < 2) continue;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (let i = 1; i < trail.points.length; i++) {
            const alpha = (i / trail.points.length) * 0.7;
            const width = (i / trail.points.length) * trail.maxWidth;
            ctx.globalAlpha = alpha; ctx.strokeStyle = trail.color;
            ctx.shadowColor = trail.glowColor; ctx.shadowBlur = 15;
            ctx.lineWidth = width; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
            ctx.lineTo(trail.points[i].x, trail.points[i].y); ctx.stroke();
        }
        ctx.restore();
    }
}

export class ScreenShake {
    constructor() { this.x = 0; this.y = 0; this.intensity = 0; this.duration = 0; this.enabled = true; }
    trigger(intensity, duration) { if (!this.enabled) return; this.intensity = intensity; this.duration = duration; }
    update() {
        if (this.duration > 0) {
            const decay = (this.duration / 20) ** 2;
            this.x = (Math.random() - 0.5) * this.intensity * decay * 2;
            this.y = (Math.random() - 0.5) * this.intensity * decay * 2;
            this.duration--;
        } else { this.x = 0; this.y = 0; }
        return { x: this.x, y: this.y };
    }
    apply(ctx) { ctx.translate(this.x, this.y); }
}

export class HitstopManager {
    constructor() { this.frames = 0; }
    trigger(damage) { this.frames = damage >= 40 ? 6 : damage >= 20 ? 4 : 2; }
    triggerHeavy() { this.frames = 8; }
    triggerParry() { this.frames = 10; }
    triggerKO() { this.frames = 12; }
    update() { if (this.frames > 0) { this.frames--; return true; } return false; }
    isActive() { return this.frames > 0; }
}

export class SlowdownManager {
    constructor() { this.active = false; this.timer = 0; this.factor = 0.3; }
    trigger(duration = 12, factor = 0.3) { this.active = true; this.timer = duration; this.factor = factor; }
    update() { if (this.active) { this.timer--; if (this.timer <= 0) this.active = false; return this.factor; } return 1.0; }
    isActive() { return this.active; }
}
