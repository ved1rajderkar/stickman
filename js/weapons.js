import { LEFT_WALL, RIGHT_WALL } from './constants.js';

export class Bullet {
    constructor(x, y, vx, vy, ownerColor, damage = 15, owner = null, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ownerColor = ownerColor;
        this.damage = damage;
        this.owner = owner;
        this.type = type;
        this.alive = true;
        this.trailPoints = [];
        this.frameAge = 0;
        this.gravity = 0;
        this.explodeRadius = 0;
        this.bounces = 0;
        this.returnsToOwner = false;
        this.returning = false;
    }

    update() {
        this.trailPoints.push({ x: this.x, y: this.y });
        if (this.trailPoints.length > 8) this.trailPoints.shift();
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.frameAge++;

        if (this.returnsToOwner && this.owner && this.frameAge > 30) {
            this.returning = true;
            const dx = this.owner.x - this.x;
            const dy = (this.owner.y - 50) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const speed = 8;
                this.vx = (dx / dist) * speed;
                this.vy = (dy / dist) * speed;
            }
            if (dist < 30) this.alive = false;
        }

        if (this.type === 'rocket' && this.frameAge > 60) {
            this.explode();
        }

        if (this.y > 640 || this.y < -50 || this.x < -100 || this.x > 1400) {
            this.alive = false;
        }
    }

    explode() {
        this.alive = false;
        this.exploded = true;
    }

    draw(ctx) {
        this.trailPoints.forEach((pt, i) => {
            const alpha = (i / this.trailPoints.length) * 0.6;
            const width = (i / this.trailPoints.length) * 4;
            ctx.save();
            ctx.globalAlpha = alpha;
            const color = this.type === 'rocket' ? '#ff4400' : this.type === 'boomerang' ? '#00ffaa' : '#ffff88';
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, width, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        const color = this.type === 'rocket' ? '#ff6600' : this.type === 'boomerang' ? '#00ffcc' : this.type === 'ice' ? '#88ddff' : '#ffe066';
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;

        if (this.type === 'rocket') {
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 8, 5, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.ellipse(this.x - this.vx * 0.3, this.y - this.vy * 0.3, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'boomerang') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.frameAge * 0.3);
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'ice') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'shockwave') {
            const radius = 10 + this.frameAge * 3;
            ctx.globalAlpha = Math.max(0, 1 - this.frameAge / 20);
            ctx.strokeStyle = '#aa66ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
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

export class WeaponPickup {
    constructor(x, y, weaponType) {
        this.x = x;
        this.y = y;
        this.weaponType = weaponType;
        this.uses = 10;
        this.alive = true;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.glowPhase = 0;
    }

    update() {
        this.bobPhase += 0.05;
        this.glowPhase += 0.08;
    }

    draw(ctx) {
        const bobY = Math.sin(this.bobPhase) * 5;
        const glow = Math.sin(this.glowPhase) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(this.x, this.y + bobY);

        ctx.shadowColor = this.getColor();
        ctx.shadowBlur = 15 * glow;
        ctx.strokeStyle = this.getColor();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + glow * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;
        this.drawIcon(ctx);

        ctx.font = 'bold 9px Orbitron';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.uses.toString(), 0, 32);

        ctx.restore();
    }

    getColor() {
        const colors = { katana: '#aaddff', portalGun: '#00ffaa', guitar: '#ffaa44', iceCream: '#88ddff', rocketLauncher: '#ff4400', boomerang: '#44ff88' };
        return colors[this.weaponType] || '#ffffff';
    }

    drawIcon(ctx) {
        ctx.fillStyle = this.getColor();
        switch (this.weaponType) {
            case 'katana':
                ctx.fillRect(-2, -15, 4, 30);
                ctx.fillRect(-6, -18, 12, 4);
                break;
            case 'portalGun':
                ctx.fillRect(-8, -4, 16, 8);
                ctx.fillRect(8, -2, 6, 4);
                break;
            case 'guitar':
                ctx.beginPath();
                ctx.ellipse(0, 4, 8, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(-2, -14, 4, 14);
                break;
            case 'iceCream':
                ctx.beginPath();
                ctx.moveTo(-6, 0);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 14);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, -4, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'rocketLauncher':
                ctx.fillRect(-4, -12, 8, 24);
                ctx.fillRect(-7, -14, 14, 4);
                break;
            case 'boomerang':
                ctx.beginPath();
                ctx.arc(0, 0, 10, -0.8, Math.PI + 0.8);
                ctx.lineWidth = 4;
                ctx.strokeStyle = this.getColor();
                ctx.stroke();
                break;
        }
    }
}

export class Weapon {
    constructor(name, lightDamage, heavyDamage, reach, lightFrames, heavyFrames, lightKB, heavyKB, ammo = null) {
        this.name = name;
        this.lightDamage = lightDamage;
        this.heavyDamage = heavyDamage;
        this.reach = reach;
        this.lightFrames = lightFrames;
        this.heavyFrames = heavyFrames;
        this.lightKB = lightKB;
        this.heavyKB = heavyKB;
        this.ammo = ammo;
        this.maxAmmo = ammo;
        this.muzzleFlashFrames = 0;
        this.slashTrail = [];
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? this.reach * 1.3 : this.reach * 1.1;
        return {
            x: facingDir === 1 ? x + 10 : x - reach - 10,
            y: y - 70,
            w: reach,
            h: 50
        };
    }

    getLightAttackDamage() { return this.lightDamage; }
    getHeavyAttackDamage() { return this.heavyDamage; }
    getLightAttackDuration() { return this.lightFrames; }
    getHeavyAttackDuration() { return this.heavyFrames; }
    getSpecialDamage() { return this.heavyDamage * 1.5; }

    hasAmmo() { return this.ammo === null || this.ammo > 0; }
    useAmmo() { if (this.ammo !== null) this.ammo--; }
    reload() { if (this.ammo !== null) this.ammo = this.maxAmmo; }

    getStartupFrames(isHeavy) { return isHeavy ? Math.round(this.heavyFrames * 0.4) : Math.round(this.lightFrames * 0.35); }
    getActiveFrames(isHeavy) { return isHeavy ? Math.round(this.heavyFrames * 0.3) : Math.round(this.lightFrames * 0.3); }
    getRecoveryFrames(isHeavy) { return isHeavy ? this.heavyFrames - this.getStartupFrames(true) - this.getActiveFrames(true) : this.lightFrames - this.getStartupFrames(false) - this.getActiveFrames(false); }

    fire(x, y, facingDir, isSpecial = false) { return null; }
    getAerialLightDamage() { return this.lightDamage; }
    getAerialHeavyDamage() { return Math.round(this.heavyDamage * 1.2); }
}

export class Fists extends Weapon {
    constructor() {
        super('Fists', 8, 16, 55, 14, 24, 3, 6, null);
        this.comboCount = 0;
        this.comboTimer = 0;
    }

    getLightAttackDamage() {
        if (this.comboTimer > 0) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.comboTimer = 25;
        if (this.comboCount >= 3) {
            this.comboCount = 0;
            return 22;
        }
        return this.lightDamage;
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 65 : 50;
        return { x: facingDir === 1 ? x + 10 : x - reach - 10, y: y - 65, w: reach, h: 45 };
    }
}

export class KatanaWeapon extends Weapon {
    constructor() {
        super('Katana', 18, 32, 95, 16, 28, 5, 10, 10);
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 110 : 95;
        return { x: facingDir === 1 ? x + 10 : x - reach - 10, y: y - 75, w: reach, h: 40 };
    }

    getSpecialDamage() { return 48; }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 3;
        const slashes = [];
        for (let i = 0; i < 3; i++) {
            slashes.push({
                x: x + facingDir * (30 + i * 20),
                y: y - 50,
                damage: 12,
                facingDir,
                life: 15,
                maxLife: 15,
                type: 'slash'
            });
        }
        return slashes;
    }
}

export class PortalGun extends Weapon {
    constructor() {
        super('Portal Gun', 10, 20, 200, 20, 35, 3, 8, 10);
        this.portals = { blue: null, orange: null };
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        return { x: facingDir === 1 ? x + 30 : x - 200 - 30, y: y - 55, w: 200, h: 20 };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 4;

        if (isSpecial) {
            this.portals.blue = { x: facingDir === 1 ? LEFT_WALL + 20 : RIGHT_WALL - 20, y: 300, facingDir: 1 };
            this.portals.orange = { x: facingDir === 1 ? RIGHT_WALL - 20 : LEFT_WALL + 20, y: 400, facingDir: -1 };
            return [];
        }

        const bullet = new Bullet(x + facingDir * 30, y - 50, facingDir * 14, 0, '#00ffaa', this.lightDamage, null, 'portal');
        return [bullet];
    }

    checkPortalTeleport(bullet) {
        if (!this.portals.blue || !this.portals.orange) return null;
        const p = this.portals;
        if (Math.abs(bullet.x - p.blue.x) < 20 && Math.abs(bullet.y - p.blue.y) < 40) {
            return { x: p.orange.x, y: p.orange.y, vx: p.orange.facingDir * Math.abs(bullet.vx) };
        }
        if (Math.abs(bullet.x - p.orange.x) < 20 && Math.abs(bullet.y - p.orange.y) < 40) {
            return { x: p.blue.x, y: p.blue.y, vx: p.blue.facingDir * Math.abs(bullet.vx) };
        }
        return null;
    }

    drawPortals(ctx) {
        if (this.portals.blue) {
            ctx.save();
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(this.portals.blue.x, this.portals.blue.y, 15, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0,170,255,0.2)';
            ctx.fill();
            ctx.restore();
        }
        if (this.portals.orange) {
            ctx.save();
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(this.portals.orange.x, this.portals.orange.y, 15, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,136,0,0.2)';
            ctx.fill();
            ctx.restore();
        }
    }
}

export class GuitarWeapon extends Weapon {
    constructor() {
        super('Guitar', 24, 40, 80, 22, 38, 6, 12, 10);
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 95 : 80;
        return { x: facingDir === 1 ? x + 10 : x - reach - 10, y: y - 70, w: reach, h: 45 };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 5;
        const shockwave = new Bullet(x + facingDir * 40, y - 40, facingDir * 6, 0, '#aa66ff', 18, null, 'shockwave');
        shockwave.gravity = 0;
        return [shockwave];
    }

    getSpecialDamage() { return 55; }
}

export class IceCreamWeapon extends Weapon {
    constructor() {
        super('Ice Cream', 12, 22, 60, 18, 30, 4, 7, 10);
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 75 : 60;
        return { x: facingDir === 1 ? x + 10 : x - reach - 10, y: y - 65, w: reach, h: 40 };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 3;
        const scoop = new Bullet(x + facingDir * 25, y - 55, facingDir * 8, -2, '#88ddff', 10, null, 'ice');
        scoop.gravity = 0.15;
        return [scoop];
    }

    getSpecialDamage() { return 35; }
}

export class RocketLauncher extends Weapon {
    constructor() {
        super('Rocket Launcher', 30, 45, 250, 30, 45, 8, 14, 10);
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        return { x: facingDir === 1 ? x + 30 : x - 250 - 30, y: y - 60, w: 250, h: 30 };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 6;
        const rocket = new Bullet(x + facingDir * 35, y - 50, facingDir * 8, -1, '#ff4400', 30, null, 'rocket');
        rocket.gravity = 0.05;
        rocket.explodeRadius = 80;
        return [rocket];
    }

    getSpecialDamage() { return 65; }
}

export class BoomerangWeapon extends Weapon {
    constructor() {
        super('Boomerang', 14, 25, 200, 16, 28, 4, 8, 10);
    }

    getHitbox(x, y, facingDir, isHeavy = false) {
        return { x: facingDir === 1 ? x + 10 : x - 200 - 10, y: y - 60, w: 200, h: 30 };
    }

    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        this.useAmmo();
        this.muzzleFlashFrames = 2;
        const boom = new Bullet(x + facingDir * 20, y - 50, facingDir * 10, -3, '#44ff88', 14, null, 'boomerang');
        boom.gravity = 0.08;
        boom.returnsToOwner = true;
        return [boom];
    }

    getSpecialDamage() { return 38; }
}

export function createWeapon(type) {
    switch (type) {
        case 'fists': return new Fists();
        case 'katana': return new KatanaWeapon();
        case 'portalGun': return new PortalGun();
        case 'guitar': return new GuitarWeapon();
        case 'iceCream': return new IceCreamWeapon();
        case 'rocketLauncher': return new RocketLauncher();
        case 'boomerang': return new BoomerangWeapon();
        default: return new Fists();
    }
}

export const WEAPON_TYPES = ['fists', 'katana', 'portalGun', 'guitar', 'iceCream', 'rocketLauncher', 'boomerang'];

export const WEAPON_COLORS = {
    fists: '#ffffff',
    katana: '#aaddff',
    portalGun: '#00ffaa',
    guitar: '#ffaa44',
    iceCream: '#88ddff',
    rocketLauncher: '#ff4400',
    boomerang: '#44ff88'
};
