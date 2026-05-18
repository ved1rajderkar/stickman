// ============================================================
// Ragdoll System — physics-driven limb animation
// Each body part is a PhysicsBody connected by spring constraints.
// Normal state: limbs follow animation targets via stiff springs.
// Ragdoll state: springs go loose, limbs flail under gravity.
// ============================================================
import { PhysicsBody } from './physics.js';
import {
    RAGDOLL_SPRING_STIFFNESS, RAGDOLL_SPRING_DAMPING,
    RAGDOLL_LOOSE_STIFFNESS, RAGDOLL_LOOSE_DAMPING,
    GRAVITY, PLAYER_HALF_WIDTH, PLAYER_HEIGHT
} from './constants.js';

/**
 * RagdollLimb — a single body part with spring constraint to parent.
 */
class RagdollLimb {
    constructor(name, offsetX, offsetY, mass = 0.5) {
        this.name = name;
        this.offsetX = offsetX; // offset from torso center at rest
        this.offsetY = offsetY;
        this.body = new PhysicsBody(offsetX, offsetY, 4, 4, mass);
        this.body.vx = 0;
        this.body.vy = 0;
        this.targetX = offsetX;
        this.targetY = offsetY;
        this.stiffness = RAGDOLL_SPRING_STIFFNESS;
        this.damping = RAGDOLL_SPRING_DAMPING;
        this.angle = 0; // current angle for rendering
        this.targetAngle = 0;
        this.angleVel = 0;
        this.length = Math.sqrt(offsetX * offsetX + offsetY * offsetY) || 1;
    }

    /** Spring toward target position */
    update() {
        const dx = this.targetX - this.body.x;
        const dy = this.targetY - this.body.y;
        this.body.vx += dx * this.stiffness;
        this.body.vy += dy * this.stiffness;
        this.body.vx *= this.damping;
        this.body.vy *= this.damping;
        this.body.x += this.body.vx;
        this.body.y += this.body.vy;

        // Compute angle from torso to limb
        this.angle = Math.atan2(this.body.y - this.targetY, this.body.x - this.targetX);

        // Spring angle toward target
        const angleDiff = this.targetAngle - this.angle;
        this.angleVel += angleDiff * this.stiffness * 2;
        this.angleVel *= this.damping;
        this.angle += this.angleVel;
    }

    /** Set target position relative to torso */
    setTarget(tx, ty, angle = 0) {
        this.targetX = tx;
        this.targetY = ty;
        this.targetAngle = angle;
    }

    /** Go ragdoll: loose springs, add random velocity */
    goRagdoll(impulseX = 0, impulseY = 0) {
        this.stiffness = RAGDOLL_LOOSE_STIFFNESS;
        this.damping = RAGDOLL_LOOSE_DAMPING;
        this.body.vx += impulseX * (0.5 + Math.random());
        this.body.vy += impulseY * (0.5 + Math.random());
    }

    /** Restore normal stiffness */
    restore() {
        this.stiffness = RAGDOLL_SPRING_STIFFNESS;
        this.damping = RAGDOLL_SPRING_DAMPING;
        this.body.vx *= 0.3;
        this.body.vy *= 0.3;
    }
}

/**
 * Ragdoll — collection of limbs attached to a torso PhysicsBody.
 */
export class Ragdoll {
    constructor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
        this.isRagdoll = false;
        this.ragdollTimer = 0;

        // Torso is the main physics body
        this.torso = new PhysicsBody(0, 0, PLAYER_HALF_WIDTH * 2, PLAYER_HEIGHT, 1.0);

        // Limbs (offsets from torso center)
        this.head = new RagdollLimb('head', 0, -55, 0.3);
        this.head.length = 55;
        this.leftArm = new RagdollLimb('leftArm', -20, -30, 0.2);
        this.leftArm.length = 35;
        this.rightArm = new RagdollLimb('rightArm', 20, -30, 0.2);
        this.rightArm.length = 35;
        this.leftLeg = new RagdollLimb('leftLeg', -10, 30, 0.3);
        this.leftLeg.length = 40;
        this.rightLeg = new RagdollLimb('rightLeg', 10, 30, 0.3);
        this.rightLeg.length = 40;

        this.limbs = [this.head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg];
    }

    /**
     * Update all limbs with spring physics.
     * @param {number} torsoX — world x of torso
     * @param {number} torsoY — world y of torso
     * @param {number} facingDir — 1 or -1
     */
    update(torsoX, torsoY, facingDir) {
        this.torso.x = torsoX;
        this.torso.y = torsoY;

        for (const limb of this.limbs) {
            limb.update();
        }

        if (this.isRagdoll) {
            this.ragdollTimer--;
            if (this.ragdollTimer <= 0) this.restore();
        }
    }

    /** Set limb targets from animation state */
    setAnimationTargets(animState, frame, facingDir, weaponName) {
        if (this.isRagdoll) return;

        const fd = facingDir;
        const targets = this.getAnimationTargets(animState, frame, fd, weaponName);

        this.head.setTarget(targets.headX, targets.headY, 0);
        this.leftArm.setTarget(targets.laX, targets.laY, targets.laAngle);
        this.rightArm.setTarget(targets.raX, targets.raY, targets.raAngle);
        this.leftLeg.setTarget(targets.llX, targets.llY, targets.llAngle);
        this.rightLeg.setTarget(targets.rlX, targets.rlY, targets.rlAngle);
    }

    /** Get target positions for each limb based on animation state */
    getAnimationTargets(anim, frame, fd, weapon) {
        const breath = Math.sin(frame * 0.05) * 2;
        const walkCycle = Math.sin(frame * 0.3);

        switch (anim) {
            case 'IDLE':
                return {
                    headX: 0, headY: -55 + breath,
                    laX: -fd * 15, laY: -25, laAngle: 0.3 * fd,
                    raX: fd * 15, raY: -25, raAngle: -0.3 * fd,
                    llX: -8, llY: 35, llAngle: 0.1,
                    rlX: 8, rlY: 35, rlAngle: -0.1
                };
            case 'WALK':
                return {
                    headX: fd * 3, headY: -55 + Math.abs(walkCycle) * 3,
                    laX: -fd * 15 + walkCycle * 10, laY: -25, laAngle: walkCycle * 0.5,
                    raX: fd * 15 - walkCycle * 10, raY: -25, raAngle: -walkCycle * 0.5,
                    llX: -8 - walkCycle * 8, llY: 35, llAngle: -walkCycle * 0.4,
                    rlX: 8 + walkCycle * 8, rlY: 35, rlAngle: walkCycle * 0.4
                };
            case 'JUMP':
                return {
                    headX: 0, headY: -58,
                    laX: -fd * 20, laY: -40, laAngle: -0.8,
                    raX: fd * 20, raY: -40, raAngle: 0.8,
                    llX: -12, llY: 25, llAngle: -0.4,
                    rlX: 12, rlY: 25, rlAngle: 0.4
                };
            case 'FALL':
                return {
                    headX: -fd * 2, headY: -52,
                    laX: -fd * 15 + Math.sin(frame * 0.2) * 15, laY: -30, laAngle: Math.sin(frame * 0.2) * 1.2,
                    raX: fd * 15 - Math.sin(frame * 0.2) * 15, raY: -30, raAngle: -Math.sin(frame * 0.2) * 1.2,
                    llX: -10, llY: 30, llAngle: 0.3,
                    rlX: 10, rlY: 30, rlAngle: -0.3
                };
            case 'BLOCK':
                return {
                    headX: -fd * 3, headY: -52,
                    laX: fd * 5, laY: -35, laAngle: fd === 1 ? -0.8 : 0.8,
                    raX: fd * 8, raY: -30, raAngle: fd === 1 ? 0.8 : -0.8,
                    llX: -8, llY: 35, llAngle: 0.2,
                    rlX: 8, rlY: 35, rlAngle: -0.2
                };
            case 'ATTACK_LIGHT':
            case 'ATTACK_AERIAL_LIGHT': {
                const t = Math.min(1, frame / 8);
                const strike = t > 0.4 && t < 0.8;
                return {
                    headX: fd * 5 * t, headY: -55 - 2 * t,
                    laX: -fd * 10, laY: -28, laAngle: 0.3,
                    raX: fd * (15 + 30 * t), raY: -30 - 10 * t, raAngle: strike ? fd * 1.5 : -0.3 - t * 0.7,
                    llX: -8 - 3 * t, llY: 35, llAngle: 0.1,
                    rlX: 8 + 3 * t, rlY: 35, rlAngle: -0.1
                };
            }
            case 'ATTACK_HEAVY':
            case 'ATTACK_AERIAL_HEAVY': {
                const t = Math.min(1, frame / 12);
                const strike = t > 0.35 && t < 0.7;
                return {
                    headX: fd * 8 * t, headY: -55 - 5 * t,
                    laX: -fd * 12, laY: -30, laAngle: 0.3 + t * 0.3,
                    raX: fd * (10 + 40 * t), raY: -35 - 15 * t, raAngle: strike ? fd * 2.0 : -0.3 - t * 1.5,
                    llX: -10 - 5 * t, llY: 35, llAngle: 0.15,
                    rlX: 10 + 5 * t, rlY: 35, rlAngle: -0.15
                };
            }
            case 'HIT':
            case 'HITSTUN':
                return {
                    headX: -fd * 8, headY: -50,
                    laX: -fd * 5, laY: -20, laAngle: 0.5,
                    raX: fd * 5, raY: -20, raAngle: -0.5,
                    llX: -5, llY: 30, llAngle: 0.1,
                    rlX: 5, rlY: 30, rlAngle: -0.1
                };
            case 'KNOCKDOWN':
                return {
                    headX: -fd * 12, headY: -45,
                    laX: -fd * 10, laY: -15, laAngle: 0.8,
                    raX: fd * 10, raY: -15, raAngle: -0.8,
                    llX: -10, llY: 25, llAngle: 0.3,
                    rlX: 10, rlY: 25, rlAngle: -0.3
                };
            case 'DEATH':
                return {
                    headX: -fd * (10 + frame * 0.5), headY: -40 + frame * 0.3,
                    laX: -fd * 15 + frame * 0.5, laY: -10, laAngle: 1.2 + frame * 0.1,
                    raX: fd * 15 - frame * 0.5, raY: -10, raAngle: -1.2 - frame * 0.1,
                    llX: -10 + frame * 0.2, llY: 20, llAngle: 0.5 + frame * 0.05,
                    rlX: 10 - frame * 0.2, rlY: 20, rlAngle: -0.5 - frame * 0.05
                };
            default:
                return this.getAnimationTargets('IDLE', frame, fd, weapon);
        }
    }

    /** Trigger ragdoll mode (on KO or heavy hit) */
    triggerRagdoll(duration = 60, impulseX = 0, impulseY = 0) {
        this.isRagdoll = true;
        this.ragdollTimer = duration;
        for (const limb of this.limbs) {
            limb.goRagdoll(impulseX, impulseY);
        }
    }

    /** Restore normal animation */
    restore() {
        this.isRagdoll = false;
        this.ragdollTimer = 0;
        for (const limb of this.limbs) {
            limb.restore();
        }
    }

    /** Draw the ragdoll stickman on canvas */
    draw(ctx, worldX, worldY, facingDir, weapon, player) {
        ctx.save();
        ctx.translate(worldX, worldY);
        ctx.scale(facingDir, 1);

        const thickness = player?.stickman?.skinStyle === 'chunky' ? 8 : player?.stickman?.skinStyle === 'slim' ? 3 : 5;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;

        // Draw torso line
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Draw head
        const headR = player?.stickman?.skinStyle === 'chunky' ? 20 : player?.stickman?.skinStyle === 'slim' ? 15 : player?.stickman?.skinStyle === 'robot' ? 18 : 18;
        ctx.beginPath();
        if (player?.stickman?.skinStyle === 'robot') {
            ctx.fillRect(this.head.body.x - 8, this.head.body.y - headR, 16, headR * 2);
        } else {
            ctx.arc(this.head.body.x, this.head.body.y, headR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw limbs
        this.drawLimb(ctx, this.leftArm, 0, -35);
        this.drawLimb(ctx, this.rightArm, 0, -35);
        this.drawLimb(ctx, this.leftLeg, 0, 0);
        this.drawLimb(ctx, this.rightLeg, 0, 0);

        // Draw weapon at right hand position
        if (weapon && player) {
            this.drawWeapon(ctx, this.rightArm.body.x, this.rightArm.body.y, this.rightArm.angle, weapon, player);
        }

        // Draw accessory on head
        if (player?.stickman?.accessory) {
            this.drawAccessory(ctx, this.head.body.x, this.head.body.y, headR, player.stickman.accessory);
        }

        ctx.restore();
    }

    drawLimb(ctx, limb, startX, startY) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(limb.body.x, limb.body.y);
        ctx.stroke();
    }

    drawWeapon(ctx, handX, handY, armAngle, weapon, player) {
        const fd = player.facingDir;
        const isAttacking = player && (player.state === 'ATTACK_LIGHT' || player.state === 'ATTACK_HEAVY' || player.state === 'ATTACK_AERIAL_LIGHT' || player.state === 'ATTACK_AERIAL_HEAVY');
        const isSlashing = isAttacking && player.attackFrame > 0;

        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(armAngle + 0.3);
        ctx.scale(fd, 1);

        if (weapon.name === 'Katana') {
            ctx.fillStyle = '#1a0a00';
            ctx.fillRect(0, -5, 18, 10);
            ctx.strokeStyle = '#4a3000';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath(); ctx.moveTo(i * 3 + 1, -5); ctx.lineTo(i * 3 + 4, 5); ctx.stroke();
            }
            ctx.fillStyle = '#8B7536';
            ctx.beginPath(); ctx.ellipse(18, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#5a4a20'; ctx.lineWidth = 1; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(20, -3); ctx.lineTo(90, -1); ctx.lineTo(95, 0); ctx.lineTo(90, 2); ctx.lineTo(20, 3);
            ctx.closePath(); ctx.fillStyle = '#d0d8e0'; ctx.fill();
            if (isSlashing) {
                ctx.shadowColor = 'rgba(150,220,255,0.9)'; ctx.shadowBlur = 20;
                ctx.strokeStyle = 'rgba(180,230,255,0.7)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(55, -2, 95, 0); ctx.stroke();
            }
        } else if (weapon.name === 'Fists') {
            const r = isSlashing ? 8 : 5;
            if (isSlashing) { ctx.shadowColor = player.color; ctx.shadowBlur = 12; }
            ctx.fillStyle = player.color;
            ctx.beginPath(); ctx.arc(handX, handY, r, 0, Math.PI * 2); ctx.fill();
        } else if (weapon.name === 'Portal Gun') {
            ctx.fillStyle = '#333'; ctx.fillRect(0, -6, 30, 12);
            ctx.fillStyle = '#0fa'; ctx.fillRect(28, -4, 8, 8);
        } else if (weapon.name === 'Guitar') {
            ctx.fillStyle = '#8B4513';
            ctx.beginPath(); ctx.ellipse(10, 5, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#555'; ctx.fillRect(-2, -25, 4, 30);
            if (isSlashing) {
                ctx.shadowColor = '#fa4'; ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(255,170,68,0.5)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(20, 0, 30, -0.5, 0.5); ctx.stroke();
            }
        } else if (weapon.name === 'Ice Cream') {
            ctx.fillStyle = '#da7';
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f8a'; ctx.beginPath(); ctx.arc(0, -6, 7, 0, Math.PI * 2); ctx.fill();
        } else if (weapon.name === 'Rocket Launcher') {
            ctx.fillStyle = '#444'; ctx.fillRect(0, -6, 40, 12);
            ctx.fillStyle = '#333'; ctx.fillRect(35, -8, 10, 16);
        } else if (weapon.name === 'Boomerang') {
            ctx.strokeStyle = '#4f8'; ctx.shadowColor = '#4f8'; ctx.shadowBlur = 8;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 15, -0.8, Math.PI + 0.8); ctx.stroke();
        }
        ctx.restore();
    }

    drawAccessory(ctx, headX, headY, headR, type) {
        ctx.save();
        switch (type) {
            case 'crown':
                ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(headX - 12, headY - headR + 2); ctx.lineTo(headX - 12, headY - headR - 10);
                ctx.lineTo(headX - 6, headY - headR - 4); ctx.lineTo(headX, headY - headR - 14);
                ctx.lineTo(headX + 6, headY - headR - 4); ctx.lineTo(headX + 12, headY - headR - 10);
                ctx.lineTo(headX + 12, headY - headR + 2); ctx.closePath(); ctx.fill();
                break;
            case 'helmet':
                ctx.fillStyle = '#888'; ctx.shadowBlur = 5;
                ctx.beginPath(); ctx.arc(headX, headY - 2, headR + 3, Math.PI, 0);
                ctx.lineTo(headX + headR + 3, headY + 2); ctx.lineTo(headX - headR - 3, headY + 2);
                ctx.closePath(); ctx.fill();
                break;
            case 'cap':
                ctx.fillStyle = '#c33'; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(headX, headY - 3, headR + 1, Math.PI, 0); ctx.fill();
                ctx.fillRect(headX, headY - headR - 2, headR + 10, 4);
                break;
            case 'halo':
                ctx.strokeStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 15;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(headX, headY - headR - 12, 14, 5, 0, 0, Math.PI * 2); ctx.stroke();
                break;
            case 'bandana':
                ctx.fillStyle = '#c33'; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(headX, headY, headR + 1, -0.3, Math.PI + 0.3); ctx.fill();
                ctx.fillRect(headX + headR - 2, headY - 2, 12, 3);
                ctx.fillRect(headX + headR + 8, headY, 8, 3);
                break;
        }
        ctx.restore();
    }
}
