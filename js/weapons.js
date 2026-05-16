export class Bullet {
    constructor(x, y, facingDir, ownerColor, damage = 15, vx = null) {
        this.x = x;
        this.y = y;
        this.vx = vx !== null ? vx : facingDir * 22;
        this.vy = 0;
        this.facingDir = facingDir;
        this.ownerColor = ownerColor;
        this.damage = damage;
        this.alive = true;
        this.trailPoints = [];
        this.frameAge = 0;
    }

    update() {
        this.trailPoints.push({ x: this.x, y: this.y });
        if (this.trailPoints.length > 6) this.trailPoints.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.frameAge++;
        if (this.x < 0 || this.x > 1280 || this.y < 0 || this.y > 640) this.alive = false;
    }

    draw(ctx) {
        this.trailPoints.forEach((pt, i) => {
            const alpha = (i / this.trailPoints.length) * 0.6;
            const width = (i / this.trailPoints.length) * 4;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ffff88';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffffaa';
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, width, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.facingDir * 7, this.y - 1, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class ShellCasing {
    constructor(x, y, facingDir) {
        this.x = x;
        this.y = y;
        this.vx = -facingDir * (1 + Math.random() * 2);
        this.vy = -(2 + Math.random() * 3);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.life = 40;
        this.maxLife = 40;
        this.gravity = 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life > 10 ? 1 : this.life / 10;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = '#c8a400';
        ctx.fillRect(-2, -1, 4, 2);
        ctx.restore();
    }
}

export class Weapon {
    constructor(name, damage, heavyDamage, reach, cooldown, heavyCooldown, knockback, heavyKnockback, ammo = null) {
        this.name = name;
        this.damage = damage;
        this.heavyDamage = heavyDamage;
        this.reach = reach;
        this.cooldown = cooldown;
        this.heavyCooldown = heavyCooldown;
        this.knockback = knockback;
        this.heavyKnockback = heavyKnockback;
        this.ammo = ammo;
        this.maxAmmo = ammo;
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? this.reach * 1.4 : this.reach * 1.2;
        return {
            x: facingDir === 1 ? x + 10 : x - reach - 10,
            y: y - 70,
            w: reach,
            h: 50
        };
    }

    getLightAttackDamage() { return this.damage; }
    getHeavyAttackDamage() { return this.heavyDamage; }
    getLightAttackDuration() { return Math.round(this.cooldown * 60); }
    getHeavyAttackDuration() { return Math.round(this.heavyCooldown * 60); }
    getSpecialDamage() { return this.heavyDamage * 1.5; }

    hasAmmo() { return this.ammo === null || this.ammo > 0; }
    useAmmo() { if (this.ammo !== null) this.ammo--; }
    reload() { if (this.ammo !== null) this.ammo = this.maxAmmo; }
}

export class Fists extends Weapon {
    constructor() {
        super('Fists', 8, 18, 55, 0.3, 0.7, 3, 6, null);
        this.comboCount = 0;
        this.comboTimer = 0;
        this.lastLightAttackTime = 0;
    }

    getLightAttackDamage() {
        const now = Date.now();
        if (now - this.lastLightAttackTime < 400) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.lastLightAttackTime = now;

        if (this.comboCount >= 3) {
            this.comboCount = 0;
            return 25;
        }
        return this.damage;
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 70 : 55;
        return {
            x: facingDir === 1 ? x + 10 : x - reach - 10,
            y: y - 65,
            w: reach,
            h: 45
        };
    }
}

export class Katana extends Weapon {
    constructor() {
        super('Katana', 20, 35, 100, 0.4, 1.0, 5, 10, null);
        this.slashTrail = [];
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 115 : 100;
        return {
            x: facingDir === 1 ? x + 10 : x - reach - 10,
            y: y - 75,
            w: reach,
            h: 40
        };
    }

    getSpecialDamage() { return 50; }
}

export class BaseballBat extends Weapon {
    constructor() {
        super('Baseball Bat', 22, 40, 90, 0.5, 0.9, 8, 15, null);
        this.swingTrail = [];
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 105 : 90;
        return {
            x: facingDir === 1 ? x + 10 : x - reach - 10,
            y: y - 70,
            w: reach,
            h: 40
        };
    }

    getSpecialDamage() { return 40; }
}

export class Pistol extends Weapon {
    constructor() {
        super('Pistol', 15, 15, 200, 0.4, 0.4, 4, 4, 8);
        this.muzzleFlashFrames = 0;
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        return {
            x: facingDir === 1 ? x + 30 : x - 200 - 30,
            y: y - 55,
            w: 200,
            h: 20
        };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 4;

        if (isSpecial) {
            const projectiles = [];
            for (let i = 0; i < 3; i++) {
                projectiles.push(new Bullet(
                    x + facingDir * 30, y - 50, facingDir, '#FFD700', 12, facingDir * (12 + i * 2)
                ));
            }
            return projectiles;
        }

        return [new Bullet(x + facingDir * 30, y - 50, facingDir, '#FFFF00', this.damage)];
    }

    getSpecialDamage() { return 36; }
}
