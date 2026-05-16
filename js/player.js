import { StickMan } from './stickman.js';
import { Fists, Katana, BaseballBat, Pistol } from './weapons.js';
import {
    GRAVITY,
    FLOOR_Y,
    LEFT_WALL,
    RIGHT_WALL,
    applyGravity,
    applyFriction,
    resolveFloorCollision,
    resolveWallCollision,
    resolvePlatformCollision,
    checkHitboxOverlap,
    calculateKnockback,
    platforms
} from './physics.js';

export const PlayerState = {
    IDLE: 'IDLE',
    WALK: 'WALK',
    RUN: 'RUN',
    JUMP: 'JUMP',
    FALL: 'FALL',
    ATTACK_LIGHT: 'ATTACK_LIGHT',
    ATTACK_HEAVY: 'ATTACK_HEAVY',
    BLOCK: 'BLOCK',
    HIT: 'HIT',
    DEATH: 'DEATH',
    SPECIAL: 'SPECIAL'
};

export class Player {
    constructor(x, y, color, glowColor, playerNum = 1) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.onGround = false;
        this.facingDir = playerNum === 1 ? 1 : -1;
        this.state = PlayerState.IDLE;
        this.color = color;
        this.glowColor = glowColor;
        this.playerNum = playerNum;

        this.speed = 5;
        this.jumpForce = -14;
        this.weight = 1.0;

        this.weapon = new Fists();
        this.specialMeter = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.statusEffects = [];

        this.attackTimer = 0;
        this.attackFrame = 0;
        this.hitTimer = 0;
        this.blockTimer = 0;
        this.stateTimer = 0;

        this.stickman = new StickMan(color, glowColor);

        this.hitbox = { x: 0, y: 0, w: 50, h: 90 };
        this.currentHitbox = null;
        this.hasHitThisAttack = false;

        this.animFrame = 0;
        this.wounds = [];
        this.deathAlpha = 1.0;
    }

    update(input, opponent, gameSettings = {}) {
        if (this.state === PlayerState.DEATH) {
            this.stickman.setAnimation('DEATH', this.facingDir, this.animFrame);
            this.stickman.update();
            this.animFrame++;
            this.vy += GRAVITY;
            this.y += this.vy;
            if (this.y >= FLOOR_Y) {
                this.y = FLOOR_Y;
                this.vy = 0;
            }

            this.hitbox = {
                x: this.x - 25,
                y: this.y - 90,
                w: 50,
                h: 90
            };

            this.deathAlpha = Math.max(0, this.deathAlpha - 0.012);
            return;
        }

        if (this.state === PlayerState.HIT) {
            this.stateTimer--;
            this.vx *= 0.9;
            this.vy += GRAVITY;
            this.x += this.vx;
            this.y += this.vy;
            resolveWallCollision(this);
            resolveFloorCollision(this);
            resolvePlatformCollision(this);

            this.stickman.setAnimation('HIT', this.facingDir, this.animFrame);
            this.stickman.update();
            this.animFrame++;

            this.hitbox = {
                x: this.x - 25,
                y: this.y - 90,
                w: 50,
                h: 90
            };

            if (this.stateTimer <= 0) {
                this.state = PlayerState.IDLE;
                this.animFrame = 0;
            }
            return;
        }

        if (this.state === PlayerState.ATTACK_LIGHT || this.state === PlayerState.ATTACK_HEAVY) {
            this.attackTimer--;
            this.attackFrame++;

            const isHeavy = this.state === PlayerState.ATTACK_HEAVY;
            const weaponName = this.weapon.name;

            let startupFrames, activeFrames, recoveryFrames;
            if (weaponName === 'Fists') {
                startupFrames = isHeavy ? 8 : 4;
                activeFrames = isHeavy ? 5 : 3;
                recoveryFrames = isHeavy ? 15 : 8;
            } else if (weaponName === 'Katana') {
                startupFrames = isHeavy ? 7 : 4;
                activeFrames = isHeavy ? 7 : 5;
                recoveryFrames = isHeavy ? 10 : 6;
            } else if (weaponName === 'BaseballBat') {
                startupFrames = isHeavy ? 8 : 5;
                activeFrames = isHeavy ? 7 : 5;
                recoveryFrames = isHeavy ? 10 : 6;
            } else if (weaponName === 'Pistol') {
                startupFrames = isHeavy ? 3 : 2;
                activeFrames = isHeavy ? 4 : 3;
                recoveryFrames = isHeavy ? 8 : 6;
            } else {
                startupFrames = isHeavy ? 12 : 4;
                activeFrames = isHeavy ? 5 : 3;
                recoveryFrames = isHeavy ? 15 : 8;
            }

            const totalFrames = startupFrames + activeFrames + recoveryFrames;
            const framesElapsed = totalFrames - this.attackTimer;

            if (framesElapsed >= startupFrames && framesElapsed < startupFrames + activeFrames) {
                this.currentHitbox = this.weapon.getHitbox(this.x, this.y, this.facingDir, isHeavy);
            } else {
                this.currentHitbox = null;
            }

            if (this.attackTimer <= 0) {
                this.state = PlayerState.IDLE;
                this.currentHitbox = null;
                this.hasHitThisAttack = false;
                this.attackFrame = 0;
            }

            this.stickman.setAnimation(isHeavy ? 'ATTACK_HEAVY' : 'ATTACK_LIGHT', this.facingDir, this.attackFrame, weaponName, isHeavy);
            this.stickman.update();

            this.vy += GRAVITY;
            this.x += this.vx * 0.5;
            this.y += this.vy;
            resolveWallCollision(this);
            resolveFloorCollision(this);

            this.hitbox = {
                x: this.x - 25,
                y: this.y - 90,
                w: 50,
                h: 90
            };

            return;
        }

        if (this.state === PlayerState.SPECIAL) {
            this.attackTimer--;
            this.attackFrame++;

            if (this.attackTimer <= 0) {
                this.state = PlayerState.IDLE;
                this.attackFrame = 0;
            }

            this.stickman.setAnimation('SPECIAL', this.facingDir, this.attackFrame);
            this.stickman.update();

            this.vy += GRAVITY;
            this.x += this.vx * 0.3;
            this.y += this.vy;
            resolveWallCollision(this);
            resolveFloorCollision(this);

            this.hitbox = {
                x: this.x - 25,
                y: this.y - 90,
                w: 50,
                h: 90
            };

            return;
        }

        if (this.state === PlayerState.BLOCK) {
            this.stickman.setAnimation('BLOCK', this.facingDir, this.animFrame);
            this.stickman.update();
            this.animFrame++;

            this.hitbox = {
                x: this.x - 25,
                y: this.y - 90,
                w: 50,
                h: 90
            };

            if (!input.block) {
                this.state = PlayerState.IDLE;
                this.animFrame = 0;
            }
            return;
        }

        if (input.block) {
            this.state = PlayerState.BLOCK;
            this.stickman.setAnimation('BLOCK', this.facingDir, this.animFrame);
            this.stickman.update();
            this.animFrame++;
            return;
        }

        this.vx = 0;
        if (input.left) {
            this.vx = -this.speed;
            this.facingDir = -1;
        }
        if (input.right) {
            this.vx = this.speed;
            this.facingDir = 1;
        }

        if (input.up && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
        }

        if (this.vx !== 0 && this.onGround) {
            this.state = PlayerState.WALK;
        } else if (!this.onGround) {
            this.state = this.vy < 0 ? PlayerState.JUMP : PlayerState.FALL;
        } else {
            this.state = PlayerState.IDLE;
        }

        this.stickman.setAnimation(this.state, this.facingDir, this.animFrame, this.weapon.name);
        this.stickman.update();
        this.animFrame++;

        if (opponent) {
            this.facingDir = opponent.x > this.x ? 1 : -1;
        }

        applyGravity(this);
        applyFriction(this);
        this.x += this.vx;
        this.y += this.vy;

        resolveWallCollision(this);
        resolveFloorCollision(this);
        resolvePlatformCollision(this);

        this.hitbox = {
            x: this.x - 25,
            y: this.y - 90,
            w: 50,
            h: 90
        };

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i];
            effect.duration--;
            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }
    }

    attack(type) {
        if (this.state === PlayerState.ATTACK_LIGHT ||
            this.state === PlayerState.ATTACK_HEAVY ||
            this.state === PlayerState.SPECIAL ||
            this.state === PlayerState.HIT ||
            this.state === PlayerState.DEATH) {
            return null;
        }

        if (type === 'light') {
            this.state = PlayerState.ATTACK_LIGHT;
            this.attackTimer = this.weapon.getLightAttackDuration();
            this.attackFrame = 0;
            this.hasHitThisAttack = false;
            return this.weapon.getLightAttackDamage();
        } else if (type === 'heavy') {
            this.state = PlayerState.ATTACK_HEAVY;
            this.attackTimer = this.weapon.getHeavyAttackDuration();
            this.attackFrame = 0;
            this.hasHitThisAttack = false;
            return this.weapon.getHeavyAttackDamage();
        } else if (type === 'special') {
            if (this.specialMeter >= 100) {
                this.state = PlayerState.SPECIAL;
                this.attackTimer = 30;
                this.attackFrame = 0;
                this.specialMeter = 0;
                return this.weapon.getSpecialDamage();
            }
        }

        return null;
    }

    takeDamage(amount, knockbackX, knockbackY, attacker) {
        let isBlocked = this.state === PlayerState.BLOCK;
        let damageMultiplier = 1.0;

        if (isBlocked) {
            damageMultiplier = 0.2;
            knockbackX *= 0.3;
            knockbackY *= 0.3;
        }

        const isCounter = attacker && (attacker.state === PlayerState.ATTACK_LIGHT || attacker.state === PlayerState.ATTACK_HEAVY) && this.state === PlayerState.BLOCK;
        if (isCounter) {
            damageMultiplier = 1.5;
        }

        const isAerial = !this.onGround;
        if (isAerial) {
            damageMultiplier *= 1.2;
        }

        const isCritical = Math.random() < 0.1;
        if (isCritical) {
            damageMultiplier *= 2.0;
        }

        const finalDamage = Math.round(amount * damageMultiplier);
        this.hp = Math.max(0, this.hp - finalDamage);

        this.vx = knockbackX;
        this.vy = knockbackY;

        if (!isBlocked) {
            this.state = PlayerState.HIT;
            this.stateTimer = 18;
            this.animFrame = 0;

            if (attacker) {
                attacker.comboCount++;
                attacker.comboTimer = 60;
                attacker.specialMeter = Math.min(100, attacker.specialMeter + 10 + attacker.comboCount * 5);
            }
        } else {
            this.specialMeter = Math.min(100, this.specialMeter + 15);
            if (attacker) {
                attacker.specialMeter = Math.min(100, attacker.specialMeter + 5);
            }
        }

        return {
            damage: finalDamage,
            isBlocked,
            isCounter,
            isCritical,
            isAerial
        };
    }

    setWeapon(weapon) {
        this.weapon = weapon;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.onGround = false;
        this.state = PlayerState.IDLE;
        this.specialMeter = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.statusEffects = [];
        this.attackTimer = 0;
        this.attackFrame = 0;
        this.hitTimer = 0;
        this.stateTimer = 0;
        this.animFrame = 0;
        this.currentHitbox = null;
        this.hasHitThisAttack = false;
        this.weapon = new Fists();
        this.wounds = [];
        this.deathAlpha = 1.0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.deathAlpha;
        this.stickman.draw(ctx, this.x, this.y, this.facingDir, 1, this.weapon, this);
        ctx.restore();
    }
}
