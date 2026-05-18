export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 300;
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
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
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle || 0);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'rect') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.alpha, p.size * p.alpha);
            } else if (p.shape === 'line') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * p.alpha;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
                ctx.stroke();
            } else if (p.shape === 'star') {
                this.drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.5);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }

    bulletTrail(x, y, vx, vy, color = '#FFFF88') {
        this.particles.push({ x, y, vx: vx * 0.1, vy: vy * 0.1, life: 8, maxLife: 8, size: 3, color, alpha: 1, gravity: 0, shape: 'line', glow: 10 });
    }

    muzzleFlash(x, y, facingDir) {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.random() - 0.5) * 0.8;
            const speed = 2 + Math.random() * 4;
            this.particles.push({ x, y, vx: facingDir * speed + Math.cos(angle) * 2, vy: Math.sin(angle) * 3, life: 4 + Math.random() * 4, maxLife: 8, size: 2 + Math.random() * 3, color: Math.random() > 0.5 ? '#FFFFFF' : '#FFD700', alpha: 1, gravity: 0, shape: 'circle', glow: 15 });
        }
        for (let i = 0; i < 3; i++) {
            this.particles.push({ x: x + facingDir * 10, y: y + (Math.random() - 0.5) * 5, vx: facingDir * (1 + Math.random()), vy: (Math.random() - 0.5) * 2, life: 15 + Math.random() * 10, maxLife: 25, size: 4 + Math.random() * 4, color: '#888888', alpha: 0.5, gravity: -0.05, shape: 'circle' });
        }
    }

    sparkImpact(x, y, count = 12) {
        const colors = ['#FFD700', '#FFFFFF', '#FFA500', '#FFFF88'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: 10 + Math.random() * 10, maxLife: 20, size: 1 + Math.random() * 2, color: colors[Math.floor(Math.random() * colors.length)], alpha: 1, gravity: 0.2, shape: 'circle', glow: 8 });
        }
    }

    hitSpark(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 3 + Math.random() * 4;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 15 + Math.random() * 10, maxLife: 25, size: 3 + Math.random() * 3, color, alpha: 1, gravity: 0.1, shape: 'circle', glow: 5 });
        }
    }

    heavyHitSpark(x, y) {
        this.hitSpark(x, y, '#ffffff', 15);
        this.sparkImpact(x, y, 20);
        for (let i = 0; i < 5; i++) {
            this.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 20 + Math.random() * 15, maxLife: 35, size: 4 + Math.random() * 4, color: '#FFD700', alpha: 1, gravity: 0.1, shape: 'star', glow: 12 });
        }
    }

    parrySpark(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const speed = 4 + Math.random() * 3;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 20 + Math.random() * 10, maxLife: 30, size: 2 + Math.random() * 3, color: '#FFD700', alpha: 1, gravity: 0, shape: 'star', glow: 15 });
        }
    }

    bloodSplatter(x, y, direction, damage) {
        const count = Math.min(Math.floor(damage / 4) + 5, 18);
        const bloodColors = ['#cc0000', '#aa0000', '#880000', '#ff2222', '#dd1111'];
        for (let i = 0; i < count; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = 1 + Math.random() * 6;
            this.particles.push({ x, y, vx: direction * speed + Math.cos(angle) * 2, vy: -(1 + Math.random() * 5), life: 30 + Math.random() * 20, maxLife: 50, size: 2 + Math.random() * 4, color: bloodColors[Math.floor(Math.random() * bloodColors.length)], alpha: 1, gravity: 0.4, shape: Math.random() < 0.7 ? 'circle' : 'elongated' });
        }
    }

    deathExplosion(x, y, color, count = 25) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 2 + Math.random() * 6;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 30 + Math.random() * 20, maxLife: 50, size: 4 + Math.random() * 6, color, alpha: 1, gravity: 0.05, shape: 'circle', glow: 8 });
        }
    }

    groundImpact(x, y, intensity = 1) {
        const count = Math.floor(8 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = (1 + Math.random() * 3) * intensity;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: 15 + Math.random() * 10, maxLife: 25, size: 2 + Math.random() * 3, color: '#888888', alpha: 1, gravity: 0.1, shape: 'circle' });
        }
    }

    freezeEffect(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 20 + Math.random() * 15, maxLife: 35, size: 2 + Math.random() * 3, color: '#88ddff', alpha: 1, gravity: -0.05, shape: 'circle', glow: 8 });
        }
    }

    explosionAoE(x, y, radius) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            this.particles.push({ x: x + Math.cos(angle) * radius * 0.3, y: y + Math.sin(angle) * radius * 0.3, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, life: 20 + Math.random() * 20, maxLife: 40, size: 3 + Math.random() * 5, color: Math.random() > 0.5 ? '#ff4400' : '#ffaa00', alpha: 1, gravity: 0.15, shape: 'circle', glow: 10 });
        }
    }

    weaponTrail(x, y, color) {
        this.particles.push({ x, y, vx: 0, vy: 0, life: 10, maxLife: 10, size: 5, color, alpha: 0.5, gravity: 0, shape: 'circle' });
    }

    screenFlash(ctx, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    clear() { this.particles = []; }
}

export function addWound(player, attackerFacingDir, damage) {
    if (!player.wounds) player.wounds = [];
    const bodyParts = ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const bodyPart = bodyParts[Math.floor(Math.random() * bodyParts.length)];
    player.wounds.push({ bodyPart, offsetX: (Math.random() - 0.5) * 16, offsetY: (Math.random() - 0.5) * 16, size: 3 + damage / 8, age: 0, maxAge: 300 });
    if (damage > 25) player.wounds.push({ bodyPart: 'head', offsetX: (Math.random() - 0.5) * 12, offsetY: (Math.random() - 0.5) * 12, size: 2 + damage / 10, age: 0, maxAge: 300 });
    if (player.wounds.length > 8) player.wounds.shift();
}

export function drawBloodDecals(ctx) {
    if (!window.bloodDecals) window.bloodDecals = [];
    for (let i = window.bloodDecals.length - 1; i >= 0; i--) {
        const decal = window.bloodDecals[i];
        ctx.save();
        ctx.globalAlpha = decal.alpha * Math.max(0, 1 - decal.age / 600);
        ctx.fillStyle = '#5a0000';
        ctx.shadowColor = '#880000';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.ellipse(decal.x, decal.y, decal.radius, decal.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        decal.age++;
    }
    if (window.bloodDecals.length > 30) window.bloodDecals.shift();
}

export function drawMuzzleFlashOverlay(ctx, muzzleX, muzzleY, facingDir) {
    ctx.save();
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,255,220,0.95)';
    ctx.beginPath();
    ctx.ellipse(muzzleX, muzzleY, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'orange';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,140,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(muzzleX, muzzleY, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(muzzleX, muzzleY);
        ctx.lineTo(muzzleX + facingDir * (20 + Math.random() * 10), muzzleY + i * 8);
        ctx.strokeStyle = 'rgba(255,220,100,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    ctx.restore();
}

export function drawWeaponTrails(ctx, trails) {
    for (const trail of trails) {
        if (trail.points.length < 2) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 1; i < trail.points.length; i++) {
            const alpha = (i / trail.points.length) * 0.7;
            const width = (i / trail.points.length) * trail.maxWidth;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = trail.color;
            ctx.shadowColor = trail.glowColor;
            ctx.shadowBlur = 15;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
            ctx.lineTo(trail.points[i].x, trail.points[i].y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export class ScreenShake {
    constructor() {
        this.x = 0; this.y = 0; this.intensity = 0; this.duration = 0; this.enabled = true;
    }
    trigger(intensity, duration) {
        if (!this.enabled) return;
        this.intensity = intensity;
        this.duration = duration;
    }
    update() {
        if (this.duration > 0) {
            const decay = Math.pow(this.duration / 20, 2);
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
    trigger(damage) {
        if (damage >= 40) this.frames = 6;
        else if (damage >= 20) this.frames = 4;
        else this.frames = 2;
    }
    triggerHeavy() { this.frames = 8; }
    triggerParry() { this.frames = 10; }
    triggerKO() { this.frames = 12; }
    update() {
        if (this.frames > 0) { this.frames--; return true; }
        return false;
    }
    isActive() { return this.frames > 0; }
}

export class SlowdownManager {
    constructor() { this.active = false; this.timer = 0; this.duration = 0; this.factor = 0.3; }
    trigger(duration = 12, factor = 0.3) {
        this.active = true;
        this.timer = duration;
        this.duration = duration;
        this.factor = factor;
    }
    update() {
        if (this.active) {
            this.timer--;
            if (this.timer <= 0) this.active = false;
            return this.factor;
        }
        return 1.0;
    }
    isActive() { return this.active; }
}
