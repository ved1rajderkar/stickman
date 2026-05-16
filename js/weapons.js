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
        const reach = isHeavy ? this.reach * 1.3 : this.reach;
        return {
            x: facingDir === 1 ? x : x - reach,
            y: y - 60,
            w: reach,
            h: 40
        };
    }
    
    getLightAttackDamage() {
        return this.damage;
    }
    
    getHeavyAttackDamage() {
        return this.heavyDamage;
    }
    
    getLightAttackDuration() {
        return Math.round(this.cooldown * 60);
    }
    
    getHeavyAttackDuration() {
        return Math.round(this.heavyCooldown * 60);
    }
    
    getSpecialDamage() {
        return this.heavyDamage * 1.5;
    }
    
    draw(ctx, x, y, facingDir, color) {
    }
    
    hasAmmo() {
        return this.ammo === null || this.ammo > 0;
    }
    
    useAmmo() {
        if (this.ammo !== null) {
            this.ammo--;
        }
    }
    
    reload() {
        if (this.ammo !== null) {
            this.ammo = this.maxAmmo;
        }
    }
}

export class Fists extends Weapon {
    constructor() {
        super('Fists', 8, 18, 12, 0.3, 0.7, 3, 6, null);
        this.comboCount = 0;
        this.comboTimer = 0;
    }
    
    getLightAttackDamage() {
        this.comboCount++;
        if (this.comboCount >= 3) {
            this.comboCount = 0;
            return 25;
        }
        return this.damage;
    }
    
    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? 25 : 20;
        return {
            x: facingDir === 1 ? x - 5 : x - reach + 5,
            y: y - 65,
            w: reach,
            h: 45
        };
    }
    
    draw(ctx, x, y, facingDir, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + facingDir * 25, y - 45, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class Katana extends Weapon {
    constructor() {
        super('Katana', 20, 35, 55, 0.4, 1.0, 5, 10, null);
    }
    
    getHitbox(x, y, facingDir, isHeavy = false) {
        const reach = isHeavy ? this.reach * 1.4 : this.reach * 1.2;
        return {
            x: facingDir === 1 ? x : x - reach,
            y: y - 70,
            w: reach,
            h: 50
        };
    }
    
    draw(ctx, x, y, facingDir, color) {
        ctx.save();
        ctx.strokeStyle = '#E0E0E0';
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        const startX = x + facingDir * 20;
        const startY = y - 45;
        const endX = x + facingDir * (20 + this.reach);
        const endY = y - 55;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
    
    getSpecialDamage() {
        return 50;
    }
}

export class BaseballBat extends Weapon {
    constructor() {
        super('Baseball Bat', 22, 40, 50, 0.5, 0.9, 8, 15, null);
    }
    
    draw(ctx, x, y, facingDir, color) {
        ctx.save();
        ctx.fillStyle = '#8B4513';
        ctx.strokeStyle = '#A0522D';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        
        const batX = x + facingDir * 15;
        const batY = y - 50;
        
        ctx.save();
        ctx.translate(batX, batY);
        ctx.rotate(facingDir * 0.3);
        ctx.fillRect(0, -3, 45, 6);
        ctx.strokeRect(0, -3, 45, 6);
        ctx.restore();
        ctx.restore();
    }
    
    getSpecialDamage() {
        return 40;
    }
}

export class Pistol extends Weapon {
    constructor() {
        super('Pistol', 15, 15, 200, 0.4, 0.4, 4, 4, 8);
        this.projectiles = [];
    }
    
    getHitbox(x, y, facingDir, isHeavy = false) {
        return {
            x: facingDir === 1 ? x : x - 200,
            y: y - 55,
            w: 200,
            h: 20
        };
    }
    
    fire(x, y, facingDir, isSpecial = false) {
        if (!this.hasAmmo()) return null;
        
        this.useAmmo();
        
        if (isSpecial) {
            const projectiles = [];
            for (let i = 0; i < 3; i++) {
                projectiles.push({
                    x: x + facingDir * 30,
                    y: y - 50,
                    vx: facingDir * (12 + i * 2),
                    vy: (i - 1) * 2,
                    damage: 12,
                    life: 60,
                    color: '#FFD700'
                });
            }
            return projectiles;
        }
        
        return [{
            x: x + facingDir * 30,
            y: y - 50,
            vx: facingDir * 15,
            vy: 0,
            damage: this.damage,
            life: 40,
            color: '#FFFF00'
        }];
    }
    
    draw(ctx, x, y, facingDir, color) {
        ctx.save();
        ctx.fillStyle = '#404040';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        
        const gunX = x + facingDir * 15;
        const gunY = y - 48;
        
        ctx.fillRect(gunX, gunY, 20, 8);
        ctx.fillRect(gunX + 5, gunY + 5, 8, 12);
        ctx.restore();
    }
    
    getSpecialDamage() {
        return 36;
    }
}
