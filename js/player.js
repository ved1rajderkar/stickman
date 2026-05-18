import { StickMan } from './stickman.js';
import { Fists, createWeapon } from './weapons.js';
import { soundManager } from './sound.js';
import {
    GRAVITY, FLOOR_Y, LEFT_WALL, RIGHT_WALL,
    applyGravity, applyHorizontalMovement,
    resolveFloorCollision, resolveWallCollision, resolvePlatformCollision,
    handleWallSlide, tryWallJump,
    calculateKnockback, calculateHitstun,
    getStagePlatforms
} from './physics.js';

export const PlayerState = {
    IDLE: 'IDLE',
    WALK: 'WALK',
    JUMP: 'JUMP',
    FALL: 'FALL',
    WALL_SLIDE: 'WALL_SLIDE',
    ATTACK_LIGHT: 'ATTACK_LIGHT',
    ATTACK_HEAVY: 'ATTACK_HEAVY',
    ATTACK_AERIAL_LIGHT: 'ATTACK_AERIAL_LIGHT',
    ATTACK_AERIAL_HEAVY: 'ATTACK_AERIAL_HEAVY',
    BLOCK: 'BLOCK',
    PARRY: 'PARRY',
    HITSTUN: 'HITSTUN',
    KNOCKDOWN: 'KNOCKDOWN',
    GRAB: 'GRAB',
    GRABBED: 'GRABBED',
    THROW: 'THROW',
    SPECIAL: 'SPECIAL',
    DEATH: 'DEATH'
};

export class Player {
    constructor(x, y, color, glowColor, playerNum = 1) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.facingDir = playerNum === 1 ? 1 : -1;
        this.state = PlayerState.IDLE;
        this.color = color;
        this.glowColor = glowColor;
        this.playerNum = playerNum;
        this.name = playerNum === 1 ? 'Player' : 'Enemy';

        this.damagePercent = 0;
        this.stocks = 3;
        this.weight = 1.0;
        this.baseSpeed = 5.5;
        this.speed = this.baseSpeed;
        this.jumpForce = -14.5;

        this.weapon = new Fists();
        this.specialMeter = 0;
        this.maxSpecialMeter = 100;

        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboDisplayTimer = 0;

        this.attackTimer = 0;
        this.attackFrame = 0;
        this.hitstunTimer = 0;
        this.blockTimer = 0;
        this.stateTimer = 0;
        this.parryWindow = 0;
        this.parryCooldown = 0;

        this.grabTarget = null;
        this.grabTimer = 0;
        this.throwDir = 0;

        this.wallSliding = false;
        this.wallSlideDir = 0;
        this.wallJumpCooldown = 0;
        this.jumpHeld = false;
        this.justLanded = false;
        this.landingImpact = 0;
        this.coyoteTime = 0;
        this.jumpBufferTimer = 0;

        this.stickman = new StickMan(color, glowColor);

        this.hitbox = { x: 0, y: 0, w: 40, h: 90 };
        this.currentHitbox = null;
        this.hasHitThisAttack = false;

        this.animFrame = 0;
        this.wounds = [];
        this.deathAlpha = 1.0;
        this.dead = false;
        this.respawnTimer = 0;

        this.frozen = false;
        this.freezeTimer = 0;
        this.statusEffects = [];

        this.accessory = null;
        this.skinStyle = 'classic';

        this.lastLightTime = 0;
        this.lightChain = 0;
    }

    update(input, opponent, platforms = [], stageManager = null) {
        if (this.dead) {
            this.respawnTimer--;
            this.vy += GRAVITY * 0.5;
            this.y += this.vy;
            if (this.y >= FLOOR_Y) { this.y = FLOOR_Y; this.vy = 0; }
            this.deathAlpha = Math.max(0, this.deathAlpha - 0.015);
            this.hitbox = { x: this.x - 20, y: this.y - 90, w: 40, h: 90 };
            return;
        }

        if (this.frozen) {
            this.freezeTimer--;
            if (this.freezeTimer <= 0) this.frozen = false;
            this.stickman.setAnimation(this.state, this.facingDir, this.animFrame, this.weapon.name);
            this.stickman.update();
            this.animFrame++;
            this.updateHitbox();
            return;
        }

        this.justLanded = false;
        if (this.wallJumpCooldown > 0) this.wallJumpCooldown--;
        if (this.parryCooldown > 0) this.parryCooldown--;

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) { this.comboCount = 0; this.lightChain = 0; }
        }
        if (this.comboDisplayTimer > 0) this.comboDisplayTimer--;

        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            this.statusEffects[i].duration--;
            if (this.statusEffects[i].duration <= 0) this.statusEffects.splice(i, 1);
        }

        const isFrozen = this.hasStatusEffect('frozen');
        if (isFrozen) {
            this.handleStateTimers();
            this.applyPhysics(platforms);
            this.updateAnimation();
            this.updateHitbox();
            return;
        }

        switch (this.state) {
            case PlayerState.DEATH:
                this.handleDeath();
                break;
            case PlayerState.HITSTUN:
                this.handleHitstun();
                break;
            case PlayerState.KNOCKDOWN:
                this.handleKnockdown();
                break;
            case PlayerState.ATTACK_LIGHT:
            case PlayerState.ATTACK_HEAVY:
                this.handleAttack();
                break;
            case PlayerState.ATTACK_AERIAL_LIGHT:
            case PlayerState.ATTACK_AERIAL_HEAVY:
                this.handleAerialAttack();
                break;
            case PlayerState.SPECIAL:
                this.handleSpecial();
                break;
            case PlayerState.BLOCK:
                this.handleBlock(input);
                break;
            case PlayerState.PARRY:
                this.handleParry();
                break;
            case PlayerState.GRAB:
                this.handleGrab();
                break;
            case PlayerState.GRABBED:
                this.handleGrabbed();
                break;
            case PlayerState.THROW:
                this.handleThrow();
                break;
            default:
                this.handleMovement(input, opponent);
                break;
        }

        this.applyPhysics(platforms);
        this.updateAnimation();
        this.updateHitbox();

        if (opponent && this.state !== PlayerState.GRAB && this.state !== PlayerState.THROW) {
            this.facingDir = opponent.x > this.x ? 1 : -1;
        }
    }

    handleMovement(input, opponent) {
        if (input.grab && this.parryCooldown <= 0) {
            this.state = PlayerState.GRAB;
            this.grabTimer = 20;
            this.animFrame = 0;
            return;
        }

        const holdingBack = (this.facingDir === 1 && input.left) || (this.facingDir === -1 && input.right);

        if (input.block) {
            if (holdingBack && this.parryCooldown <= 0) {
                this.state = PlayerState.PARRY;
                this.parryWindow = 12;
                this.stateTimer = 20;
                this.animFrame = 0;
                return;
            }
            this.state = PlayerState.BLOCK;
            this.animFrame = 0;
            return;
        }

        if (this.wallJumpCooldown <= 0 && input.up && this.wallSliding) {
            tryWallJump(this);
            soundManager?.synthJump();
            return;
        }

        const canJump = this.onGround || this.coyoteTime > 0;
        if (input.up) {
            this.jumpHeld = true;
            if (canJump || this.jumpBufferTimer > 0) {
                this.vy = this.jumpForce;
                this.onGround = false;
                this.coyoteTime = 0;
                this.jumpBufferTimer = 0;
                soundManager?.synthJump();
            }
        } else {
            this.jumpHeld = false;
        }

        if (input.up && !this.onGround) {
            this.jumpBufferTimer = 8;
        }
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

        if (this.onGround) {
            this.coyoteTime = 6;
        }
        if (this.coyoteTime > 0) this.coyoteTime--;

        applyHorizontalMovement(this, input);
        handleWallSlide(this);

        if (this.onGround) {
            this.state = Math.abs(this.vx) > 0.5 ? PlayerState.WALK : PlayerState.IDLE;
        } else {
            if (this.wallSliding) {
                this.state = PlayerState.WALL_SLIDE;
            } else {
                this.state = this.vy < 0 ? PlayerState.JUMP : PlayerState.FALL;
            }
        }
    }

    handleAttack() {
        this.attackTimer--;
        this.attackFrame++;

        const isHeavy = this.state === PlayerState.ATTACK_HEAVY;
        const startup = this.weapon.getStartupFrames(isHeavy);
        const active = this.weapon.getActiveFrames(isHeavy);
        const framesElapsed = (isHeavy ? this.weapon.heavyFrames : this.weapon.lightFrames) - this.attackTimer;

        if (framesElapsed >= startup && framesElapsed < startup + active) {
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
    }

    handleAerialAttack() {
        this.attackTimer--;
        this.attackFrame++;

        const isHeavy = this.state === PlayerState.ATTACK_AERIAL_HEAVY;
        const totalFrames = isHeavy ? 22 : 16;
        const startup = Math.round(totalFrames * 0.3);
        const active = Math.round(totalFrames * 0.35);
        const framesElapsed = totalFrames - this.attackTimer;

        if (framesElapsed >= startup && framesElapsed < startup + active) {
            const reach = isHeavy ? this.weapon.reach * 1.4 : this.weapon.reach * 1.2;
            this.currentHitbox = {
                x: this.facingDir === 1 ? this.x + 10 : this.x - reach - 10,
                y: this.y - 80,
                w: reach,
                h: 60
            };
        } else {
            this.currentHitbox = null;
        }

        if (this.attackTimer <= 0) {
            this.state = this.onGround ? PlayerState.IDLE : PlayerState.FALL;
            this.currentHitbox = null;
            this.hasHitThisAttack = false;
            this.attackFrame = 0;
        }
    }

    handleSpecial() {
        this.attackTimer--;
        this.attackFrame++;

        if (this.attackFrame === 10) {
            const projectiles = this.weapon.fire(this.x, this.y, this.facingDir, true);
            if (projectiles) {
                this.projectiles = projectiles;
            }
        }

        if (this.attackFrame === 15) {
            this.currentHitbox = this.weapon.getHitbox(this.x, this.y, this.facingDir, true);
        } else {
            this.currentHitbox = null;
        }

        if (this.attackTimer <= 0) {
            this.state = PlayerState.IDLE;
            this.currentHitbox = null;
            this.hasHitThisAttack = false;
            this.attackFrame = 0;
        }
    }

    handleBlock(input) {
        this.stickman.setAnimation('BLOCK', this.facingDir, this.animFrame);
        this.stickman.update();
        this.animFrame++;

        if (!input.block) {
            this.state = PlayerState.IDLE;
            this.animFrame = 0;
        }
    }

    handleParry() {
        this.stateTimer--;
        this.parryWindow--;
        this.stickman.setAnimation('PARRY', this.facingDir, this.animFrame);
        this.stickman.update();
        this.animFrame++;

        if (this.stateTimer <= 0) {
            this.state = PlayerState.IDLE;
            this.parryCooldown = 30;
            this.animFrame = 0;
        }
    }

    handleGrab() {
        this.grabTimer--;
        this.stickman.setAnimation('GRAB', this.facingDir, this.animFrame);
        this.stickman.update();
        this.animFrame++;

        if (this.grabTimer === 12 && this.grabTarget && this.grabTarget.state !== PlayerState.GRABBED) {
            const dist = Math.abs(this.x - this.grabTarget.x);
            if (dist < 60 && Math.abs(this.y - this.grabTarget.y) < 40) {
                this.grabTarget.state = PlayerState.GRABBED;
                this.grabTarget.grabbedBy = this;
                this.grabTarget.vx = 0;
                this.grabTarget.vy = 0;
            }
        }

        if (this.grabTimer <= 0) {
            if (this.grabTarget && this.grabTarget.state === PlayerState.GRABBED) {
                this.state = PlayerState.THROW;
                this.grabTimer = 15;
                this.throwDir = this.facingDir;
            } else {
                this.state = PlayerState.IDLE;
                this.grabTarget = null;
            }
            this.animFrame = 0;
        }
    }

    handleGrabbed() {
        if (this.grabbedBy) {
            this.x = this.grabbedBy.x + this.grabbedBy.facingDir * 25;
            this.y = this.grabbedBy.y;
            this.vx = 0;
            this.vy = 0;
        }
    }

    handleThrow() {
        this.grabTimer--;
        if (this.grabTimer === 8 && this.grabTarget) {
            const kb = calculateKnockback(this.grabTarget.damagePercent, 8, 5, this.throwDir, this.grabTarget.weight, true);
            this.grabTarget.vx = kb.vx;
            this.grabTarget.vy = kb.vy;
            this.grabTarget.state = PlayerState.HITSTUN;
            this.grabTarget.hitstunTimer = calculateHitstun(15);
            this.grabTarget.takeDamage(15, this);
            this.grabTarget.state = PlayerState.HITSTUN;
            this.grabTarget.grabbedBy = null;
        }
        if (this.grabTimer <= 0) {
            this.state = PlayerState.IDLE;
            this.grabTarget = null;
            this.animFrame = 0;
        }
    }

    handleHitstun() {
        this.hitstunTimer--;
        this.vx *= 0.92;

        if (this.hitstunTimer <= 0) {
            if (this.onGround) {
                this.state = PlayerState.IDLE;
            } else {
                this.state = this.vy < 0 ? PlayerState.JUMP : PlayerState.FALL;
            }
        }
    }

    handleKnockdown() {
        this.stateTimer--;
        this.vx *= 0.9;

        if (this.stateTimer <= 0 && this.onGround) {
            this.state = PlayerState.IDLE;
            this.animFrame = 0;
        }
    }

    handleDeath() {
        this.vy += GRAVITY * 0.5;
        this.y += this.vy;
        if (this.y >= FLOOR_Y) { this.y = FLOOR_Y; this.vy = 0; }
        this.stickman.setAnimation('DEATH', this.facingDir, this.animFrame);
        this.stickman.update();
        this.animFrame++;
        this.deathAlpha = Math.max(0.3, this.deathAlpha - 0.01);
        this.updateHitbox();
    }

    applyPhysics(platforms) {
        applyGravity(this);
        this.x += this.vx;
        this.y += this.vy;

        resolveWallCollision(this);
        resolveFloorCollision(this);

        const allPlatforms = [...platforms];
        resolvePlatformCollision(this, allPlatforms);

        if (this.justLanded) {
            this.justLanded = false;
        }
    }

    updateAnimation() {
        const animMap = {
            [PlayerState.ATTACK_AERIAL_LIGHT]: 'ATTACK_LIGHT',
            [PlayerState.ATTACK_AERIAL_HEAVY]: 'ATTACK_HEAVY',
            [PlayerState.WALL_SLIDE]: 'WALL_SLIDE',
            [PlayerState.PARRY]: 'PARRY',
            [PlayerState.GRAB]: 'GRAB',
            [PlayerState.GRABBED]: 'GRABBED',
            [PlayerState.THROW]: 'THROW',
            [PlayerState.KNOCKDOWN]: 'HIT',
        };

        const animName = animMap[this.state] || this.state;
        const isHeavy = this.state === PlayerState.ATTACK_HEAVY || this.state === PlayerState.ATTACK_AERIAL_HEAVY;
        this.stickman.setAnimation(animName, this.facingDir, this.animFrame, this.weapon.name, isHeavy);
        this.stickman.update();
        this.animFrame++;
    }

    updateHitbox() {
        this.hitbox = { x: this.x - 20, y: this.y - 90, w: 40, h: 90 };
    }

    attack(type) {
        const busyStates = [
            PlayerState.ATTACK_LIGHT, PlayerState.ATTACK_HEAVY,
            PlayerState.ATTACK_AERIAL_LIGHT, PlayerState.ATTACK_AERIAL_HEAVY,
            PlayerState.SPECIAL, PlayerState.HITSTUN, PlayerState.DEATH,
            PlayerState.GRAB, PlayerState.THROW, PlayerState.GRABBED,
            PlayerState.KNOCKDOWN
        ];
        if (busyStates.includes(this.state)) return null;

        const isAerial = !this.onGround;

        if (type === 'light') {
            this.state = isAerial ? PlayerState.ATTACK_AERIAL_LIGHT : PlayerState.ATTACK_LIGHT;
            this.attackTimer = isAerial ? 16 : this.weapon.getLightAttackDuration();
            this.attackFrame = 0;
            this.hasHitThisAttack = false;
            return isAerial ? this.weapon.getAerialLightDamage() : this.weapon.getLightAttackDamage();
        } else if (type === 'heavy') {
            this.state = isAerial ? PlayerState.ATTACK_AERIAL_HEAVY : PlayerState.ATTACK_HEAVY;
            this.attackTimer = isAerial ? 22 : this.weapon.getHeavyAttackDuration();
            this.attackFrame = 0;
            this.hasHitThisAttack = false;
            return isAerial ? this.weapon.getAerialHeavyDamage() : this.weapon.getHeavyAttackDamage();
        } else if (type === 'special') {
            if (this.specialMeter >= this.maxSpecialMeter) {
                this.state = PlayerState.SPECIAL;
                this.attackTimer = 35;
                this.attackFrame = 0;
                this.specialMeter = 0;
                this.hasHitThisAttack = false;
                return this.weapon.getSpecialDamage();
            }
        }
        return null;
    }

    takeDamage(amount, attacker) {
        if (this.state === PlayerState.PARRY && this.parryWindow > 0) {
            this.state = PlayerState.IDLE;
            this.parryWindow = 0;
            this.parryCooldown = 45;
            if (attacker) {
                attacker.hitstunTimer = 20;
                attacker.state = PlayerState.HITSTUN;
                attacker.frozen = true;
                attacker.freezeTimer = 8;
            }
            return { damage: 0, blocked: false, parried: true, counterHit: true };
        }

        if (this.state === PlayerState.BLOCK) {
            const reducedDamage = Math.round(amount * 0.15);
            this.damagePercent += reducedDamage;
            this.specialMeter = Math.min(this.maxSpecialMeter, this.specialMeter + 8);
            if (attacker) attacker.specialMeter = Math.min(attacker.maxSpecialMeter, attacker.specialMeter + 3);
            const kb = calculateKnockback(this.damagePercent, 2, 1, attacker ? attacker.facingDir : 1, this.weight);
            this.vx = kb.vx * 0.3;
            this.vy = kb.vy * 0.3;
            return { damage: reducedDamage, blocked: true, parried: false, counterHit: false };
        }

        const isAerial = !this.onGround;
        const aerialMult = isAerial ? 1.25 : 1.0;
        const isCounter = attacker && (attacker.state === PlayerState.ATTACK_LIGHT || attacker.state === PlayerState.ATTACK_HEAVY || attacker.state === PlayerState.SPECIAL);
        const counterMult = isCounter ? 1.3 : 1.0;
        const finalDamage = Math.round(amount * aerialMult * counterMult);

        this.damagePercent += finalDamage;

        const kb = calculateKnockback(this.damagePercent, 4, 4, attacker ? attacker.facingDir : 1, this.weight, attacker?.state === PlayerState.ATTACK_HEAVY || attacker?.state === PlayerState.ATTACK_AERIAL_HEAVY);
        this.vx = kb.vx;
        this.vy = kb.vy;

        this.hitstunTimer = calculateHitstun(finalDamage);
        this.state = PlayerState.HITSTUN;

        if (this.damagePercent >= 100 && (attacker?.state === PlayerState.ATTACK_HEAVY || attacker?.state === PlayerState.ATTACK_AERIAL_HEAVY)) {
            this.state = PlayerState.KNOCKDOWN;
            this.stateTimer = 40;
            this.vy = -12;
            this.vx = kb.vx * 1.5;
        }

        if (attacker) {
            attacker.comboCount++;
            attacker.comboTimer = 60;
            attacker.comboDisplayTimer = 90;
            attacker.specialMeter = Math.min(attacker.maxSpecialMeter, attacker.specialMeter + (8 + attacker.comboCount * 4));
        }

        this.stickman.applyHitImpulse(attacker ? attacker.facingDir : 1, finalDamage);

        return {
            damage: finalDamage,
            blocked: false,
            parried: false,
            counterHit: isCounter,
            isAerial,
            knockdown: this.state === PlayerState.KNOCKDOWN
        };
    }

    takeStageDamage(amount, knockDir) {
        this.damagePercent += amount;
        const kb = calculateKnockback(this.damagePercent, 5, 3, knockDir, this.weight);
        this.vx = kb.vx;
        this.vy = kb.vy - 4;
        this.hitstunTimer = calculateHitstun(amount);
        this.state = PlayerState.HITSTUN;
    }

    addStatusEffect(type, duration) {
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) {
            existing.duration = Math.max(existing.duration, duration);
        } else {
            this.statusEffects.push({ type, duration });
        }
    }

    hasStatusEffect(type) {
        return this.statusEffects.some(e => e.type === type);
    }

    loseStock() {
        this.stocks--;
        if (this.stocks <= 0) {
            this.dead = true;
            this.state = PlayerState.DEATH;
            this.respawnTimer = 120;
        } else {
            this.respawn();
        }
    }

    respawn() {
        this.damagePercent = 0;
        this.specialMeter = 0;
        this.state = PlayerState.IDLE;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.deathAlpha = 1.0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.hitstunTimer = 0;
        this.statusEffects = [];
        this.wounds = [];
        this.animFrame = 0;
    }

    setWeapon(weapon) {
        this.weapon = weapon;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.state = PlayerState.IDLE;
        this.damagePercent = 0;
        this.specialMeter = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.statusEffects = [];
        this.attackTimer = 0;
        this.attackFrame = 0;
        this.hitstunTimer = 0;
        this.stateTimer = 0;
        this.animFrame = 0;
        this.currentHitbox = null;
        this.hasHitThisAttack = false;
        this.weapon = new Fists();
        this.wounds = [];
        this.deathAlpha = 1.0;
        this.dead = false;
        this.wallSliding = false;
        this.wallJumpCooldown = 0;
        this.parryCooldown = 0;
        this.coyoteTime = 0;
        this.jumpBufferTimer = 0;
        this.grabTarget = null;
        this.frozen = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.deathAlpha;
        if (this.hasStatusEffect('frozen')) {
            ctx.globalAlpha = 0.7;
        }
        this.stickman.draw(ctx, this.x, this.y, this.facingDir, 1, this.weapon, this);

        if (this.hasStatusEffect('frozen')) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#88ddff';
            ctx.shadowColor = '#88ddff';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 45, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawDebug(ctx) {
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);

        if (this.currentHitbox) {
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(this.currentHitbox.x, this.currentHitbox.y, this.currentHitbox.w, this.currentHitbox.h);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${this.state} ${Math.round(this.damagePercent)}%`, this.x - 30, this.y - 100);
        ctx.restore();
    }
}
