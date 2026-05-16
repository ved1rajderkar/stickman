export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 150;
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.life--;
            p.alpha = p.life / p.maxLife;

            if (p.shape === 'elongated') {
                p.angle = Math.atan2(p.vy, p.vx);
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.glow;
            }

            if (p.shape === 'elongated') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle || 0);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'rect') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.alpha, p.size * p.alpha);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    hitSpark(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 3 + Math.random() * 4;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 3 + Math.random() * 3,
                color,
                alpha: 1,
                gravity: 0.1,
                shape: 'circle',
                glow: 5
            });
        }
    }

    bloodSplatter(x, y, direction, damage) {
        const count = Math.floor(damage / 4) + 5;
        const clampedCount = Math.min(count, 18);
        const bloodColors = ['#cc0000', '#aa0000', '#880000', '#ff2222', '#dd1111'];

        for (let i = 0; i < clampedCount; i++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = 1 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: direction * speed + Math.cos(angle) * 2,
                vy: -(1 + Math.random() * 5),
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 2 + Math.random() * 4,
                color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
                alpha: 1,
                gravity: 0.4,
                shape: Math.random() < 0.7 ? 'circle' : 'elongated'
            });
        }
    }

    deathExplosion(x, y, color, count = 25) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 4 + Math.random() * 6,
                color,
                alpha: 1,
                gravity: 0.05,
                shape: 'circle',
                glow: 8
            });
        }
    }

    weaponTrail(x, y, color) {
        this.particles.push({
            x, y,
            vx: 0,
            vy: 0,
            life: 10,
            maxLife: 10,
            size: 5,
            color,
            alpha: 0.5,
            gravity: 0,
            shape: 'circle'
        });
    }

    fireStream(x, y, direction, count = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + Math.random() * 10 - 5,
                y: y + Math.random() * 10 - 5,
                vx: direction * (2 + Math.random() * 3),
                vy: -1 + Math.random() * 2,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#FF6600' : '#FFCC00',
                alpha: 1,
                gravity: -0.1,
                shape: 'circle'
            });
        }
    }

    electricArc(x1, y1, x2, y2) {
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20;
            this.particles.push({
                x, y,
                vx: 0,
                vy: 0,
                life: 8,
                maxLife: 8,
                size: 4,
                color: '#00FFFF',
                alpha: 1,
                gravity: 0,
                shape: 'rect',
                glow: 10
            });
        }
    }

    shockwave(x, y) {
        this.particles.push({
            x, y,
            vx: 0,
            vy: 0,
            life: 20,
            maxLife: 20,
            size: 10,
            color: '#FFFFFF',
            alpha: 0.8,
            gravity: 0,
            shape: 'circle'
        });
    }

    groundImpact(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 2 + Math.random() * 3,
                color: '#888888',
                alpha: 1,
                gravity: 0.1,
                shape: 'circle'
            });
        }
    }

    screenFlash(ctx, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    clear() {
        this.particles = [];
    }
}

export function addWound(player, attackerFacingDir, damage) {
    if (!player.wounds) player.wounds = [];

    const bodyParts = ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const bodyPart = bodyParts[Math.floor(Math.random() * bodyParts.length)];

    player.wounds.push({
        bodyPart,
        offsetX: (Math.random() - 0.5) * 16,
        offsetY: (Math.random() - 0.5) * 16,
        size: 3 + damage / 8,
        age: 0,
        maxAge: 300
    });

    if (damage > 25) {
        player.wounds.push({
            bodyPart: 'head',
            offsetX: (Math.random() - 0.5) * 12,
            offsetY: (Math.random() - 0.5) * 12,
            size: 2 + damage / 10,
            age: 0,
            maxAge: 300
        });
    }

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

export function drawMuzzleFlash(ctx, muzzleX, muzzleY, facingDir) {
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
        for (let i = 1; i < trail.points.length; i++) {
            const alpha = (i / trail.points.length) * 0.7;
            const width = (i / trail.points.length) * trail.maxWidth;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = trail.color;
            ctx.shadowColor = trail.glowColor;
            ctx.shadowBlur = 15;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(trail.points[i - 1].x, trail.points[i - 1].y);
            ctx.lineTo(trail.points[i].x, trail.points[i].y);
            ctx.stroke();
        }
        ctx.restore();
    }
}
