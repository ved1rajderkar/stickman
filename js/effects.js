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
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.alpha, p.size * p.alpha);
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
                shape: 'circle'
            });
        }
    }
    
    bloodSplatter(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                size: 2 + Math.random() * 4,
                color: '#FF0040',
                alpha: 1,
                gravity: 0.3,
                shape: 'circle'
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
                shape: 'circle'
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
                shape: 'rect'
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
