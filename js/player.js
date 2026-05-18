import { soundManager } from './sound.js';
import { createWeapon, Fists } from './weapons.js';
import { Ragdoll } from './ragdoll.js';
import { StickMan } from './stickman.js';
import { PhysicsBody, resolveFloor, resolveWalls, resolvePlatforms, resolveBodyOverlap, checkHitboxOverlap } from './physics.js';
import {
    WALK_FORCE, MAX_SPEED, AIR_CONTROL_MULT, GROUND_FRICTION, AIR_DRAG,
    JUMP_FORCE, JUMP_CUTOFF_MULT, COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
    DASH_FORCE, DASH_COOLDOWN_MS, DASH_INVINCIBLE_FRAMES,
    KNOCKBACK_SCALING_PER_DAMAGE, KNOCKBACK_BASE,
    HITSTUN_PER_DAMAGE, MIN_HITSTUN, MAX_HITSTUN,
    AERIAL_KB_Y_BONUS, PLAYER_HALF_WIDTH, PLAYER_HEIGHT, FLOOR_Y
} from './constants.js';

export const PlayerState = {
    IDLE: 'IDLE', WALK: 'WALK', JUMP: 'JUMP', FALL: 'FALL',
    ATTACK_LIGHT: 'ATTACK_LIGHT', ATTACK_HEAVY: 'ATTACK_HEAVY',
    ATTACK_AERIAL_LIGHT: 'ATTACK_AERIAL_LIGHT', ATTACK_AERIAL_HEAVY: 'ATTACK_AERIAL_HEAVY',
    BLOCK: 'BLOCK', PARRY: 'PARRY', HITSTUN: 'HITSTUN', KNOCKDOWN: 'KNOCKDOWN',
    GRAB: 'GRAB', GRABBED: 'GRABBED', THROW: 'THROW', SPECIAL: 'SPECIAL', DEATH: 'DEATH'
};

export class Player {
    constructor(x, y, color, glowColor, playerNum = 1) {
        // Physics body for the player
        this.body = new PhysicsBody(x, y, PLAYER_HALF_WIDTH * 2, PLAYER_HEIGHT, 1.0);
        this.x = x; this.y = y; this.vx = 0; this.vy = 0;
        this.onGround = false;
        this.facingDir = playerNum === 1 ? 1 : -1;
        this.state = PlayerState.IDLE;
        this.color = color; this.glowColor = glowColor;
        this.playerNum = playerNum;
        this.name = playerNum === 1 ? 'Player' : 'Enemy';

        // Ragdoll for physics-driven limbs
        this.ragdoll = new Ragdoll(color, glowColor);
        this.stickman = new StickMan(color, glowColor);

        // Combat stats (damage % system)
        this.damagePercent = 0;
        this.stocks = 3;
        this.weight = 1.0;
        this.baseSpeed = MAX_SPEED;
        this.speed = this.baseSpeed;

        this.weapon = new Fists();
        this.specialMeter = 0;
        this.maxSpecialMeter = 100;
        this.comboCount = 0; this.comboTimer = 0; this.comboDisplayTimer = 0;

        // Attack state
        this.attackTimer = 0; this.attackFrame = 0;
        this.hitstunTimer = 0; this.blockTimer = 0; this.stateTimer = 0;
        this.parryWindow = 0; this.parryCooldown = 0;
        this.grabTarget = null; this.grabTimer = 0; this.throwDir = 0;

        // Movement state
        this.wallSliding = false; this.wallSlideDir = 0; this.wallJumpCooldown = 0;
        this.jumpHeld = false; this.justLanded = false; this.landingImpact = 0;
        this.coyoteTimer = 0; this.jumpBufferTimer = 0;

        // Dash state
        this.dashCooldown = 0; this.dashTimer = 0; this.dashDir = 0;
        this.invincibleTimer = 0; this.lastTapTime = { left: 0, right: 0 };

        // Hitbox
        this.hitbox = { x: 0, y: 0, w: PLAYER_HALF_WIDTH * 2, h: PLAYER_HEIGHT };
        this.currentHitbox = null;
        this.hasHitThisAttack = false;

        this.animFrame = 0;
        this.wounds = [];
        this.deathAlpha = 1.0;
        this.dead = false;
        this.respawnTimer = 0;
        this.frozen = false; this.freezeTimer = 0;
        this.statusEffects = [];
        this.accessory = null;
        this.skinStyle = 'classic';
        this.projectiles = [];
    }

    get x() { return this.body.x; }
    set x(v) { this.body.x = v; }
    get y() { return this.body.y; }
    set y(v) { this.body.y = v; }
    get vx() { return this.body.vx; }
    set vx(v) { this.body.vx = v; }
    get vy() { return this.body.vy; }
    set vy(v) { this.body.vy = v; }

    applyForce(fx, fy) { this.body.applyForce(fx, fy); }
    applyImpulse(ix, iy) { this.body.applyImpulse(ix, iy); }

    update(input, opponent, platforms = [], stageManager = null) {
        if (this.dead) {
            this.respawnTimer--;
            this.vy += 0.3;
            this.y += this.vy;
            if (this.y >= FLOOR_Y) { this.y = FLOOR_Y; this.vy = 0; }
            this.deathAlpha = Math.max(0, this.deathAlpha - 0.015);
            this.updateHitbox();
            return;
        }

        if (this.frozen) {
            this.freezeTimer--;
            if (this.freezeTimer <= 0) this.frozen = false;
            this.updateRagdoll();
            this.updateHitbox();
            return;
        }

        if (this.dashTimer > 0) {
            this.dashTimer--;
            this.vx = this.dashDir * DASH_FORCE;
            this.vy = 0;
            if (this.dashTimer <= 0) this.vx *= 0.3;
        }

        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.wallJumpCooldown > 0) this.wallJumpCooldown--;
        if (this.parryCooldown > 0) this.parryCooldown--;

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) { this.comboCount = 0; }
        }
        if (this.comboDisplayTimer > 0) this.comboDisplayTimer--;

        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            this.statusEffects[i].duration--;
            if (this.statusEffects[i].duration <= 0) this.statusEffects.splice(i, 1);
        }

        if (this.hasStatusEffect('frozen')) {
            this.handleStateTimers();
            this.applyPhysics(platforms);
            this.updateRagdoll();
            this.updateHitbox();
            return;
        }

        switch (this.state) {
            case PlayerState.DEATH: this.handleDeath(); break;
            case PlayerState.HITSTUN: this.handleHitstun(); break;
            case PlayerState.KNOCKDOWN: this.handleKnockdown(); break;
            case PlayerState.ATTACK_LIGHT: case PlayerState.ATTACK_HEAVY: this.handleAttack(); break;
            case PlayerState.ATTACK_AERIAL_LIGHT: case PlayerState.ATTACK_AERIAL_HEAVY: this.handleAerialAttack(); break;
            case PlayerState.SPECIAL: this.handleSpecial(); break;
            case PlayerState.BLOCK: this.handleBlock(input); break;
            case PlayerState.PARRY: this.handleParry(); break;
            case PlayerState.GRAB: this.handleGrab(); break;
            case PlayerState.GRABBED: this.handleGrabbed(); break;
            case PlayerState.THROW: this.handleThrow(); break;
            default: this.handleMovement(input, opponent); break;
        }

        this.applyPhysics(platforms);
        this.updateRagdoll();
        this.updateHitbox();

        if (opponent && this.state !== PlayerState.GRAB && this.state !== PlayerState.THROW) {
            this.facingDir = opponent.x > this.x ? 1 : -1;
        }
    }

    handleMovement(input, opponent) {
        // Dash detection: double-tap direction
        const now = Date.now();
        if (input.left && now - this.lastTapTime.left < 250 && this.dashCooldown <= 0) {
            this.dashTimer = 8; this.dashDir = -1;
            this.dashCooldown = DASH_COOLDOWN_MS / 16.67;
            this.invincibleTimer = DASH_INVINCIBLE_FRAMES;
            this.lastTapTime.left = 0;
            soundManager?.synthPunchWhoosh();
            return;
        }
        if (input.right && now - this.lastTapTime.right < 250 && this.dashCooldown <= 0) {
            this.dashTimer = 8; this.dashDir = 1;
            this.dashCooldown = DASH_COOLDOWN_MS / 16.67;
            this.invincibleTimer = DASH_INVINCIBLE_FRAMES;
            this.lastTapTime.right = 0;
            soundManager?.synthPunchWhoosh();
            return;
        }
        if (input.left) this.lastTapTime.left = now;
        if (input.right) this.lastTapTime.right = now;

        // Grab
        if (input.grab && this.parryCooldown <= 0) {
            this.state = PlayerState.GRAB; this.grabTimer = 20; this.animFrame = 0;
            return;
        }

        const holdingBack = (this.facingDir === 1 && input.left) || (this.facingDir === -1 && input.right);

        // Block / Parry
        if (input.block) {
            if (holdingBack && this.parryCooldown <= 0) {
                this.state = PlayerState.PARRY; this.parryWindow = 12; this.stateTimer = 20; this.animFrame = 0;
                return;
            }
            this.state = PlayerState.BLOCK; this.animFrame = 0;
            return;
        }

        // Wall jump
        if (this.wallJumpCooldown <= 0 && input.up && this.wallSliding) {
            this.applyImpulse(-this.wallSlideDir * 10, -13);
            this.onGround = false; this.wallSliding = false; this.wallJumpCooldown = 10;
            soundManager?.synthJump();
            return;
        }

        // Jump with coyote time and buffer
        const canJump = this.onGround || this.coyoteTimer > 0;
        if (input.up) {
            this.jumpHeld = true;
            if (canJump || this.jumpBufferTimer > 0) {
                this.applyImpulse(0, -JUMP_FORCE);
                this.onGround = false; this.coyoteTimer = 0; this.jumpBufferTimer = 0;
                soundManager?.synthJump();
            }
        } else {
            // Variable jump height: cut jump if released early
            if (this.jumpHeld && this.vy < -4) {
                this.vy *= JUMP_CUTOFF_MULT;
            }
            this.jumpHeld = false;
        }
        if (input.up && !this.onGround) this.jumpBufferTimer = JUMP_BUFFER_FRAMES;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

        if (this.onGround) this.coyoteTimer = COYOTE_FRAMES;
        if (this.coyoteTimer > 0) this.coyoteTimer--;

        // Physics-driven horizontal movement
        const airMult = this.onGround ? 1.0 : AIR_CONTROL_MULT;
        if (input.left) {
            this.applyForce(-WALK_FORCE * airMult, 0);
        } else if (input.right) {
            this.applyForce(WALK_FORCE * airMult, 0);
        }

        // Speed cap
        if (this.vx > this.speed) this.vx = this.speed;
        if (this.vx < -this.speed) this.vx = -this.speed;

        // Wall slide
        if (!this.onGround && this.vy > 0) {
            const atLeft = this.x <= 45;
            const atRight = this.x >= 1235;
            if ((atLeft && this.vx < 0) || (atRight && this.vx > 0)) {
                this.wallSliding = true;
                this.wallSlideDir = atLeft ? -1 : 1;
                if (this.vy > 2) this.vy = 2;
            } else {
                this.wallSliding = false;
            }
        } else {
            this.wallSliding = false;
        }

        // State assignment
        if (this.onGround) {
            this.state = Math.abs(this.vx) > 0.5 ? PlayerState.WALK : PlayerState.IDLE;
        } else {
            this.state = this.wallSliding ? 'WALL_SLIDE' : (this.vy < 0 ? PlayerState.JUMP : PlayerState.FALL);
        }
    }

    handleAttack() {
        this.attackTimer--; this.attackFrame++;
        const isHeavy = this.state === PlayerState.ATTACK_HEAVY;
        const startup = this.weapon.getStartupFrames(isHeavy);
        const active = this.weapon.getActiveFrames(isHeavy);
        const total = isHeavy ? this.weapon.heavyFrames : this.weapon.lightFrames;
        const elapsed = total - this.attackTimer;
        this.currentHitbox = (elapsed >= startup && elapsed < startup + active)
            ? this.weapon.getHitbox(this.x, this.y, this.facingDir, isHeavy) : null;
        if (this.attackTimer <= 0) {
            this.state = PlayerState.IDLE; this.currentHitbox = null;
            this.hasHitThisAttack = false; this.attackFrame = 0;
        }
    }

    handleAerialAttack() {
        this.attackTimer--; this.attackFrame++;
        const isHeavy = this.state === PlayerState.ATTACK_AERIAL_HEAVY;
        const total = isHeavy ? 22 : 16;
        const startup = Math.round(total * 0.3);
        const active = Math.round(total * 0.35);
        const elapsed = total - this.attackTimer;
        const reach = isHeavy ? this.weapon.reach * 1.4 : this.weapon.reach * 1.2;
        this.currentHitbox = (elapsed >= startup && elapsed < startup + active)
            ? { x: this.facingDir === 1 ? this.x + 10 : this.x - reach - 10, y: this.y - 80, w: reach, h: 60 } : null;
        if (this.attackTimer <= 0) {
            this.state = this.onGround ? PlayerState.IDLE : PlayerState.FALL;
            this.currentHitbox = null; this.hasHitThisAttack = false; this.attackFrame = 0;
        }
    }

    handleSpecial() {
        this.attackTimer--; this.attackFrame++;
        if (this.attackFrame === 10) {
            const projectiles = this.weapon.fire(this.x, this.y, this.facingDir, true);
            if (projectiles) this.projectiles = projectiles;
        }
        this.currentHitbox = this.attackFrame === 15 ? this.weapon.getHitbox(this.x, this.y, this.facingDir, true) : null;
        if (this.attackTimer <= 0) {
            this.state = PlayerState.IDLE; this.currentHitbox = null;
            this.hasHitThisAttack = false; this.attackFrame = 0;
        }
    }

    handleBlock(input) {
        if (!input.block) { this.state = PlayerState.IDLE; this.animFrame = 0; }
    }

    handleParry() {
        this.stateTimer--; this.parryWindow--;
        if (this.stateTimer <= 0) { this.state = PlayerState.IDLE; this.parryCooldown = 30; this.animFrame = 0; }
    }

    handleGrab() {
        this.grabTimer--;
        if (this.grabTimer === 12 && this.grabTarget && this.grabTarget.state !== PlayerState.GRABBED) {
            if (Math.abs(this.x - this.grabTarget.x) < 60 && Math.abs(this.y - this.grabTarget.y) < 40) {
                this.grabTarget.state = PlayerState.GRABBED;
                this.grabTarget.grabbedBy = this; this.grabTarget.vx = 0; this.grabTarget.vy = 0;
            }
        }
        if (this.grabTimer <= 0) {
            if (this.grabTarget?.state === PlayerState.GRABBED) {
                this.state = PlayerState.THROW; this.grabTimer = 15; this.throwDir = this.facingDir;
            } else { this.state = PlayerState.IDLE; this.grabTarget = null; }
            this.animFrame = 0;
        }
    }

    handleGrabbed() {
        if (this.grabbedBy) {
            this.x = this.grabbedBy.x + this.grabbedBy.facingDir * 25;
            this.y = this.grabbedBy.y; this.vx = 0; this.vy = 0;
        }
    }

    handleThrow() {
        this.grabTimer--;
        if (this.grabTimer === 8 && this.grabTarget) {
            const kb = this.calcKnockback(this.grabTarget.damagePercent, 8, 5, this.throwDir, true);
            this.grabTarget.applyImpulse(kb.vx, kb.vy);
            this.grabTarget.takeDamage(15, this);
            this.grabTarget.state = PlayerState.HITSTUN;
            this.grabTarget.hitstunTimer = this.calcHitstun(15);
            this.grabTarget.grabbedBy = null;
        }
        if (this.grabTimer <= 0) { this.state = PlayerState.IDLE; this.grabTarget = null; this.animFrame = 0; }
    }

    handleHitstun() {
        this.hitstunTimer--; this.vx *= 0.92;
        if (this.hitstunTimer <= 0) {
            this.state = this.onGround ? PlayerState.IDLE : (this.vy < 0 ? PlayerState.JUMP : PlayerState.FALL);
        }
    }

    handleKnockdown() {
        this.stateTimer--; this.vx *= 0.9;
        if (this.stateTimer <= 0 && this.onGround) { this.state = PlayerState.IDLE; this.animFrame = 0; }
    }

    handleDeath() {
        this.vy += 0.3; this.y += this.vy;
        if (this.y >= FLOOR_Y) { this.y = FLOOR_Y; this.vy = 0; }
        this.deathAlpha = Math.max(0.3, this.deathAlpha - 0.01);
        this.updateHitbox();
    }

    handleStateTimers() {
        if (this.attackTimer > 0) this.attackTimer--;
        if (this.hitstunTimer > 0) this.hitstunTimer--;
        if (this.stateTimer > 0) this.stateTimer--;
        if (this.grabTimer > 0) this.grabTimer--;
    }

    applyPhysics(platforms) {
        // Apply forces through physics body
        this.body.update();

        // Resolve collisions
        resolveFloor(this.body);
        resolveWalls(this.body);
        resolvePlatforms(this.body, platforms);

        // Sync convenience properties
        this.x = this.body.x; this.y = this.body.y;
        this.vx = this.body.vx; this.vy = this.body.vy;
        this.onGround = this.body.onGround;

        if (this.justLanded) this.justLanded = false;
    }

    updateRagdoll() {
        const animMap = {
            ATTACK_AERIAL_LIGHT: 'ATTACK_LIGHT', ATTACK_AERIAL_HEAVY: 'ATTACK_HEAVY',
            WALL_SLIDE: 'WALL_SLIDE', KNOCKDOWN: 'KNOCKDOWN'
        };
        const animName = animMap[this.state] || this.state;
        this.ragdoll.setAnimationTargets(animName, this.animFrame, this.facingDir, this.weapon.name);
        this.ragdoll.update(this.x, this.y, this.facingDir);
        this.animFrame++;
    }

    updateHitbox() {
        this.hitbox = { x: this.x - PLAYER_HALF_WIDTH, y: this.y - PLAYER_HEIGHT, w: PLAYER_HALF_WIDTH * 2, h: PLAYER_HEIGHT };
    }

    calcKnockback(dmgPercent, baseX, baseY, dir, isHeavy = false) {
        const scaling = 1 + dmgPercent * KNOCKBACK_SCALING_PER_DAMAGE;
        const heavyMult = isHeavy ? 1.6 : 1.0;
        const kb = (KNOCKBACK_BASE + baseX * scaling * heavyMult) / this.weight;
        return { vx: kb * dir, vy: -(baseY * scaling * heavyMult * 0.5 + 2) };
    }

    calcHitstun(damage) {
        const stun = Math.round(damage * HITSTUN_PER_DAMAGE);
        return Math.max(MIN_HITSTUN, Math.min(MAX_HITSTUN, stun));
    }

    attack(type) {
        const busy = [PlayerState.ATTACK_LIGHT, PlayerState.ATTACK_HEAVY, PlayerState.ATTACK_AERIAL_LIGHT, PlayerState.ATTACK_AERIAL_HEAVY, PlayerState.SPECIAL, PlayerState.HITSTUN, PlayerState.DEATH, PlayerState.GRAB, PlayerState.THROW, PlayerState.GRABBED, PlayerState.KNOCKDOWN];
        if (busy.includes(this.state)) return null;
        const isAerial = !this.onGround;
        if (type === 'light') {
            this.state = isAerial ? PlayerState.ATTACK_AERIAL_LIGHT : PlayerState.ATTACK_LIGHT;
            this.attackTimer = isAerial ? 16 : this.weapon.getLightAttackDuration();
            this.attackFrame = 0; this.hasHitThisAttack = false;
            return isAerial ? this.weapon.getAerialLightDamage() : this.weapon.getLightAttackDamage();
        } else if (type === 'heavy') {
            this.state = isAerial ? PlayerState.ATTACK_AERIAL_HEAVY : PlayerState.ATTACK_HEAVY;
            this.attackTimer = isAerial ? 22 : this.weapon.getHeavyAttackDuration();
            this.attackFrame = 0; this.hasHitThisAttack = false;
            return isAerial ? this.weapon.getAerialHeavyDamage() : this.weapon.getHeavyAttackDamage();
        } else if (type === 'special') {
            if (this.specialMeter >= this.maxSpecialMeter) {
                this.state = PlayerState.SPECIAL; this.attackTimer = 35; this.attackFrame = 0;
                this.specialMeter = 0; this.hasHitThisAttack = false;
                return this.weapon.getSpecialDamage();
            }
        }
        return null;
    }

    takeDamage(amount, attacker) {
        if (this.state === PlayerState.PARRY && this.parryWindow > 0) {
            this.state = PlayerState.IDLE; this.parryWindow = 0; this.parryCooldown = 45;
            if (attacker) { attacker.hitstunTimer = 20; attacker.state = PlayerState.HITSTUN; attacker.frozen = true; attacker.freezeTimer = 8; }
            return { damage: 0, blocked: false, parried: true, counterHit: true };
        }
        if (this.state === PlayerState.BLOCK) {
            const reduced = Math.round(amount * 0.15);
            this.damagePercent += reduced;
            this.specialMeter = Math.min(this.maxSpecialMeter, this.specialMeter + 8);
            if (attacker) attacker.specialMeter = Math.min(attacker.maxSpecialMeter, attacker.specialMeter + 3);
            const kb = this.calcKnockback(this.damagePercent, 2, 1, attacker?.facingDir || 1);
            this.applyImpulse(kb.vx * 0.3, kb.vy * 0.3);
            return { damage: reduced, blocked: true, parried: false, counterHit: false };
        }
        const aerialMult = !this.onGround ? 1.25 : 1.0;
        const counterMult = attacker && [PlayerState.ATTACK_LIGHT, PlayerState.ATTACK_HEAVY, PlayerState.SPECIAL].includes(attacker.state) ? 1.3 : 1.0;
        const finalDamage = Math.round(amount * aerialMult * counterMult);
        this.damagePercent += finalDamage;

        // Physics-based knockback impulse
        const isHeavy = attacker?.state === PlayerState.ATTACK_HEAVY || attacker?.state === PlayerState.ATTACK_AERIAL_HEAVY;
        const kb = this.calcKnockback(this.damagePercent, 4, 4, attacker?.facingDir || 1, isHeavy);
        // Juggling bonus: extra Y knockback when airborne
        const yMult = !this.onGround ? AERIAL_KB_Y_BONUS : 1.0;
        this.applyImpulse(kb.vx, kb.vy * yMult);

        this.hitstunTimer = this.calcHitstun(finalDamage);
        this.state = PlayerState.HITSTUN;

        // Knockdown at high damage + heavy hit
        if (this.damagePercent >= 100 && isHeavy) {
            this.state = PlayerState.KNOCKDOWN; this.stateTimer = 40;
            this.applyImpulse(0, -6);
            this.ragdoll.triggerRagdoll(40, attacker?.facingDir || 1, -1);
        }

        if (attacker) {
            attacker.comboCount++; attacker.comboTimer = 60; attacker.comboDisplayTimer = 90;
            attacker.specialMeter = Math.min(attacker.maxSpecialMeter, attacker.specialMeter + (8 + attacker.comboCount * 4));
        }
        this.ragdoll.triggerRagdoll(this.calcHitstun(finalDamage), attacker?.facingDir || 1, -0.5);
        return { damage: finalDamage, blocked: false, parried: false, counterHit: counterMult > 1, isAerial: !this.onGround, knockdown: this.state === PlayerState.KNOCKDOWN };
    }

    takeStageDamage(amount, knockDir) {
        this.damagePercent += amount;
        const kb = this.calcKnockback(this.damagePercent, 5, 3, knockDir);
        this.applyImpulse(kb.vx, kb.vy - 4);
        this.hitstunTimer = this.calcHitstun(amount);
        this.state = PlayerState.HITSTUN;
    }

    addStatusEffect(type, duration) {
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) existing.duration = Math.max(existing.duration, duration);
        else this.statusEffects.push({ type, duration });
    }
    hasStatusEffect(type) { return this.statusEffects.some(e => e.type === type); }

    loseStock() {
        this.stocks--;
        if (this.stocks <= 0) { this.dead = true; this.state = PlayerState.DEATH; this.respawnTimer = 120; }
        else this.respawn();
    }
    respawn() {
        this.damagePercent = 0; this.specialMeter = 0; this.state = PlayerState.IDLE;
        this.vx = 0; this.vy = 0; this.dead = false; this.deathAlpha = 1.0;
        this.comboCount = 0; this.comboTimer = 0; this.hitstunTimer = 0;
        this.statusEffects = []; this.wounds = []; this.animFrame = 0;
        this.ragdoll.restore();
    }

    setWeapon(w) { this.weapon = w; }
    reset(x, y) {
        this.body.x = x; this.body.y = y; this.body.vx = 0; this.body.vy = 0; this.body.onGround = false;
        this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.onGround = false;
        this.state = PlayerState.IDLE; this.damagePercent = 0; this.specialMeter = 0;
        this.comboCount = 0; this.comboTimer = 0; this.statusEffects = [];
        this.attackTimer = 0; this.attackFrame = 0; this.hitstunTimer = 0;
        this.stateTimer = 0; this.animFrame = 0; this.currentHitbox = null;
        this.hasHitThisAttack = false; this.weapon = new Fists();
        this.wounds = []; this.deathAlpha = 1.0; this.dead = false;
        this.wallSliding = false; this.wallJumpCooldown = 0; this.parryCooldown = 0;
        this.coyoteTimer = 0; this.jumpBufferTimer = 0; this.grabTarget = null;
        this.frozen = false; this.dashCooldown = 0; this.dashTimer = 0; this.invincibleTimer = 0;
        this.ragdoll.restore();
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.deathAlpha;
        if (this.hasStatusEffect('frozen')) ctx.globalAlpha = 0.7;
        this.ragdoll.draw(ctx, this.x, this.y, this.facingDir, this.weapon, this);
        if (this.hasStatusEffect('frozen')) {
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#88ddff'; ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(this.x, this.y - 45, 30, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawDebug(ctx) {
        ctx.save(); ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
        ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
        if (this.currentHitbox) { ctx.strokeStyle = '#f00'; ctx.strokeRect(this.currentHitbox.x, this.currentHitbox.y, this.currentHitbox.w, this.currentHitbox.h); }
        ctx.fillStyle = '#fff'; ctx.font = '10px monospace';
        ctx.fillText(`${this.state} ${Math.round(this.damagePercent)}%`, this.x - 30, this.y - 100);
        ctx.restore();
    }
}
