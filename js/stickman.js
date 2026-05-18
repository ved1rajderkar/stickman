export class StickMan {
    constructor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
        this.leftArmAngle = 0;
        this.rightArmAngle = 0;
        this.leftLegAngle = 0;
        this.rightLegAngle = 0;
        this.torsoLean = 0;
        this.headBob = 0;
        this.leftArmAngleVel = 0;
        this.rightArmAngleVel = 0;
        this.leftLegAngleVel = 0;
        this.rightLegAngleVel = 0;
        this.torsoLeanVel = 0;
        this.headBobVel = 0;
        this.leftArmTarget = 0;
        this.rightArmTarget = 0;
        this.leftLegTarget = 0;
        this.rightLegTarget = 0;
        this.torsoTarget = 0;
        this.headTarget = 0;
        this.stiffness = 0.2;
        this.damping = 0.8;
        this.breathCycle = 0;
        this.currentAnim = 'IDLE';
        this.accessory = null;
        this.skinStyle = 'classic';
        this.trailPoints = [];
    }

    setColor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
    }

    setAccessory(type) { this.accessory = type; }
    setSkinStyle(style) { this.skinStyle = style; }

    springAngle(current, target, velocity, stiffness, damping) {
        const force = (target - current) * stiffness;
        velocity += force;
        velocity *= damping;
        current += velocity;
        return { angle: current, vel: velocity };
    }

    update() {
        this.breathCycle += 0.05;
        let s = this.stiffness;
        let d = this.damping;

        const animSettings = {
            IDLE: { s: 0.04, d: 0.85 },
            WALK: { s: 0.12, d: 0.78 },
            JUMP: { s: 0.20, d: 0.70 },
            FALL: { s: 0.15, d: 0.75 },
            WALL_SLIDE: { s: 0.18, d: 0.72 },
            ATTACK_LIGHT: { s: 0.95, d: 0.60 },
            ATTACK_HEAVY: { s: 1.0, d: 0.50 },
            BLOCK: { s: 0.15, d: 0.80 },
            PARRY: { s: 0.90, d: 0.55 },
            HIT: { s: 0.90, d: 0.55 },
            DEATH: { s: 0.02, d: 0.92 },
            SPECIAL: { s: 0.8, d: 0.55 },
            GRAB: { s: 0.7, d: 0.60 },
            GRABBED: { s: 0.05, d: 0.90 },
            THROW: { s: 0.85, d: 0.55 }
        };

        const settings = animSettings[this.currentAnim] || animSettings.IDLE;
        s = settings.s;
        d = settings.d;

        const la = this.springAngle(this.leftArmAngle, this.leftArmTarget, this.leftArmAngleVel, s, d);
        this.leftArmAngle = la.angle; this.leftArmAngleVel = la.vel;
        const ra = this.springAngle(this.rightArmAngle, this.rightArmTarget, this.rightArmAngleVel, s, d);
        this.rightArmAngle = ra.angle; this.rightArmAngleVel = ra.vel;
        const ll = this.springAngle(this.leftLegAngle, this.leftLegTarget, this.leftLegAngleVel, s, d);
        this.leftLegAngle = ll.angle; this.leftLegAngleVel = ll.vel;
        const rl = this.springAngle(this.rightLegAngle, this.rightLegTarget, this.rightLegAngleVel, s, d);
        this.rightLegAngle = rl.angle; this.rightLegAngleVel = rl.vel;
        const tl = this.springAngle(this.torsoLean, this.torsoTarget, this.torsoLeanVel, s, d);
        this.torsoLean = tl.angle; this.torsoLeanVel = tl.vel;
        const hb = this.springAngle(this.headBob, this.headTarget, this.headBobVel, s, d);
        this.headBob = hb.angle; this.headBobVel = hb.vel;
    }

    applyHitImpulse(attackerFacingDir, damage) {
        this.torsoLeanVel += attackerFacingDir * (damage / 15);
        this.headBobVel += attackerFacingDir * (damage / 10);
        this.leftArmAngleVel -= (damage / 20);
        this.rightArmAngleVel += (damage / 20);
        this.leftLegAngleVel += (damage / 25);
        this.rightLegAngleVel -= (damage / 25);
    }

    setTargets(t) {
        this.leftArmTarget = t.leftArmAngle;
        this.rightArmTarget = t.rightArmAngle;
        this.leftLegTarget = t.leftLegAngle;
        this.rightLegTarget = t.rightLegAngle;
        this.torsoTarget = t.torsoLean;
        this.headTarget = t.headBob;
    }

    setAnimation(animName, facingDir = 1, frame = 0, weaponName = 'Fists', isHeavy = false) {
        this.currentAnim = animName;
        const fd = facingDir;

        const animations = {
            IDLE: {
                leftArmAngle: 0.3 + Math.sin(this.breathCycle) * 0.05,
                rightArmAngle: -0.3 - Math.sin(this.breathCycle) * 0.05,
                leftLegAngle: 0.1, rightLegAngle: -0.1,
                torsoLean: 0, headBob: Math.sin(this.breathCycle) * 2
            },
            WALK: {
                leftArmAngle: Math.sin(frame * 0.3) * 0.5,
                rightArmAngle: -Math.sin(frame * 0.3) * 0.5,
                leftLegAngle: -Math.sin(frame * 0.3) * 0.4,
                rightLegAngle: Math.sin(frame * 0.3) * 0.4,
                torsoLean: 0.05 * fd, headBob: Math.abs(Math.sin(frame * 0.3)) * 3
            },
            JUMP: {
                leftArmAngle: -0.8, rightArmAngle: 0.8,
                leftLegAngle: -0.4, rightLegAngle: 0.4,
                torsoLean: 0, headBob: 0
            },
            FALL: {
                leftArmAngle: Math.sin(frame * 0.2) * 1.2,
                rightArmAngle: -Math.sin(frame * 0.2) * 1.2,
                leftLegAngle: 0.3, rightLegAngle: -0.3,
                torsoLean: -0.1 * fd, headBob: 0
            },
            WALL_SLIDE: {
                leftArmAngle: fd === 1 ? -1.0 : 0.5,
                rightArmAngle: fd === 1 ? 0.5 : -1.0,
                leftLegAngle: 0.2, rightLegAngle: -0.2,
                torsoLean: -0.15 * fd, headBob: Math.sin(frame * 0.1) * 2
            },
            BLOCK: {
                leftArmAngle: fd === 1 ? -0.8 : 0.8,
                rightArmAngle: fd === 1 ? 0.8 : -0.8,
                leftLegAngle: 0.2, rightLegAngle: -0.2,
                torsoLean: -0.1 * fd, headBob: -2
            },
            PARRY: {
                leftArmAngle: fd === 1 ? -1.2 : 1.0,
                rightArmAngle: fd === 1 ? 1.0 : -1.2,
                leftLegAngle: 0.3, rightLegAngle: -0.3,
                torsoLean: 0.1 * fd, headBob: -3
            },
            HIT: {
                leftArmAngle: 0.5, rightArmAngle: -0.5,
                leftLegAngle: 0.1, rightLegAngle: -0.1,
                torsoLean: -0.2 * fd, headBob: 3
            },
            DEATH: {
                leftArmAngle: 1.2 + frame * 0.1,
                rightArmAngle: -1.2 - frame * 0.1,
                leftLegAngle: 0.5 + frame * 0.05,
                rightLegAngle: -0.5 - frame * 0.05,
                torsoLean: -0.3 * fd, headBob: 5
            },
            GRAB: {
                leftArmAngle: fd === 1 ? -1.0 : 0.8,
                rightArmAngle: fd === 1 ? -1.2 : 1.0,
                leftLegAngle: 0.2, rightLegAngle: -0.2,
                torsoLean: 0.15 * fd, headBob: -2
            },
            GRABBED: {
                leftArmAngle: Math.sin(frame * 0.15) * 0.8,
                rightArmAngle: Math.sin(frame * 0.15 + 1) * 0.8,
                leftLegAngle: 0.4, rightLegAngle: -0.4,
                torsoLean: 0, headBob: Math.sin(frame * 0.2) * 4
            },
            THROW: {
                leftArmAngle: fd === 1 ? -0.5 : 0.3,
                rightArmAngle: fd === 1 ? -1.5 + frame * 0.1 : 1.5 - frame * 0.1,
                leftLegAngle: 0.3, rightLegAngle: -0.3,
                torsoLean: 0.2 * fd, headBob: -2
            }
        };

        if (animName === 'ATTACK_LIGHT' || animName === 'ATTACK_HEAVY') {
            this.setAttackAnimation(animName, fd, frame, weaponName, isHeavy);
        } else if (animName === 'SPECIAL') {
            this.setTargets({
                leftArmAngle: -1.5 + Math.sin(frame * 0.4) * 0.5,
                rightArmAngle: 1.5 - Math.sin(frame * 0.4) * 0.5,
                leftLegAngle: -0.3, rightLegAngle: 0.3,
                torsoLean: 0.2 * fd, headBob: Math.sin(frame * 0.4) * 4
            });
        } else {
            this.setTargets(animations[animName] || animations.IDLE);
        }
    }

    setAttackAnimation(animName, fd, frame, weaponName, isHeavy) {
        const isLight = animName === 'ATTACK_LIGHT';
        const weaponAttacks = {
            Fists: {
                light: [
                    { f: 4, t: { leftArmAngle: fd===1?-0.4:0.4, rightArmAngle: fd===1?-1.0:1.0, leftLegAngle: 0.05, rightLegAngle: -0.05, torsoLean: 0.15*fd, headBob: 0 }},
                    { f: 9, t: { leftArmAngle: 0.3, rightArmAngle: -0.3, leftLegAngle: 0.1, rightLegAngle: -0.1, torsoLean: 0, headBob: 0 }}
                ],
                heavy: [
                    { f: 8, t: { leftArmAngle: fd===1?-0.2:0.2, rightArmAngle: fd===1?-1.3:1.3, leftLegAngle: 0.25, rightLegAngle: -0.25, torsoLean: 0.35*fd, headBob: -5 }},
                    { f: 14, t: { leftArmAngle: 0.3, rightArmAngle: -0.3, leftLegAngle: 0.1, rightLegAngle: -0.1, torsoLean: 0, headBob: 3 }},
                    { f: 24, t: { leftArmAngle: 0.3, rightArmAngle: -0.3, leftLegAngle: 0.1, rightLegAngle: -0.1, torsoLean: 0, headBob: 0 }}
                ]
            }
        };

        const wf = weaponAttacks[weaponName] || weaponAttacks.Fists;
        const attacks = isLight ? wf.light : wf.heavy;

        for (let i = attacks.length - 1; i >= 0; i--) {
            if (frame >= attacks[i].f) {
                this.setTargets(attacks[i].t);
                return;
            }
        }

        const first = attacks[0];
        const t = frame / first.f;
        const base = { leftArmAngle: fd===1?0.3:-0.3, rightArmAngle: fd===1?-0.3:0.3, leftLegAngle: 0.1, rightLegAngle: -0.1, torsoLean: 0, headBob: 0 };
        const target = first.t;
        this.setTargets({
            leftArmAngle: base.leftArmAngle + (target.leftArmAngle - base.leftArmAngle) * t,
            rightArmAngle: base.rightArmAngle + (target.rightArmAngle - base.rightArmAngle) * t,
            leftLegAngle: base.leftLegAngle + (target.leftLegAngle - base.leftLegAngle) * t,
            rightLegAngle: base.rightLegAngle + (target.rightLegAngle - base.rightLegAngle) * t,
            torsoLean: base.torsoLean + (target.torsoLean - base.torsoLean) * t,
            headBob: base.headBob + (target.headBob - base.headBob) * t
        });
    }

    getBodyThickness() {
        switch (this.skinStyle) {
            case 'chunky': return 8;
            case 'slim': return 3;
            case 'robot': return 5;
            default: return 5;
        }
    }

    draw(ctx, x, y, facingDir = 1, scale = 1, weapon = null, player = null) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facingDir * scale, scale);

        const thickness = this.getBodyThickness();
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;

        const headRadius = this.skinStyle === 'chunky' ? 20 : this.skinStyle === 'slim' ? 15 : 18;
        const torsoLength = this.skinStyle === 'chunky' ? 40 : this.skinStyle === 'slim' ? 50 : 45;
        const armLength = this.skinStyle === 'chunky' ? 30 : this.skinStyle === 'slim' ? 38 : 35;
        const legLength = this.skinStyle === 'chunky' ? 35 : this.skinStyle === 'slim' ? 44 : 40;

        const headY = -torsoLength - headRadius + this.headBob;
        const torsoTopY = -torsoLength + this.headBob;
        const torsoBottomY = this.headBob;

        ctx.save();
        ctx.rotate(this.torsoLean);

        if (this.skinStyle === 'robot') {
            ctx.fillStyle = this.color;
            ctx.fillRect(-8, headY - headRadius, 16, headRadius * 2);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-4, headY - 4, 3, 3);
            ctx.fillRect(2, headY - 4, 3, 3);
        } else {
            ctx.beginPath();
            ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.skinStyle === 'robot') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            ctx.moveTo(0, torsoTopY);
            ctx.lineTo(0, torsoBottomY);
            ctx.stroke();
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, torsoTopY + 10);
            ctx.lineTo(6, torsoTopY + 10);
            ctx.moveTo(-6, torsoTopY + 20);
            ctx.lineTo(6, torsoTopY + 20);
            ctx.stroke();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = thickness;
        } else {
            ctx.beginPath();
            ctx.moveTo(0, torsoTopY);
            ctx.lineTo(0, torsoBottomY);
            ctx.stroke();
        }

        const shoulderY = torsoTopY + 5;
        const leftArmEndX = Math.cos(Math.PI / 2 + this.leftArmAngle) * armLength;
        const leftArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.leftArmAngle) * armLength;
        const rightArmEndX = Math.cos(Math.PI / 2 + this.rightArmAngle) * armLength;
        const rightArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.rightArmAngle) * armLength;

        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(leftArmEndX, leftArmEndY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(rightArmEndX, rightArmEndY);
        ctx.stroke();

        const hipY = torsoBottomY;
        const leftLegEndX = Math.cos(Math.PI / 2 + this.leftLegAngle) * legLength;
        const leftLegEndY = hipY + Math.sin(Math.PI / 2 + this.leftLegAngle) * legLength;
        const rightLegEndX = Math.cos(Math.PI / 2 + this.rightLegAngle) * legLength;
        const rightLegEndY = hipY + Math.sin(Math.PI / 2 + this.rightLegAngle) * legLength;

        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(leftLegEndX, leftLegEndY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(rightLegEndX, rightLegEndY);
        ctx.stroke();

        if (weapon && player) {
            this.drawWeapon(ctx, rightArmEndX, rightArmEndY, this.rightArmAngle, facingDir, weapon, player);
        }

        this.drawAccessory(ctx, 0, headY, headRadius);

        ctx.restore();

        if (player && player.wounds && player.wounds.length > 0) {
            this.drawWounds(ctx, x, y, facingDir, scale, player);
        }

        ctx.restore();
    }

    drawAccessory(ctx, headX, headY, headRadius) {
        if (!this.accessory) return;
        ctx.save();

        switch (this.accessory) {
            case 'crown':
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(headX - 12, headY - headRadius + 2);
                ctx.lineTo(headX - 12, headY - headRadius - 10);
                ctx.lineTo(headX - 6, headY - headRadius - 4);
                ctx.lineTo(headX, headY - headRadius - 14);
                ctx.lineTo(headX + 6, headY - headRadius - 4);
                ctx.lineTo(headX + 12, headY - headRadius - 10);
                ctx.lineTo(headX + 12, headY - headRadius + 2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'helmet':
                ctx.fillStyle = '#888888';
                ctx.shadowColor = '#aaaaaa';
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(headX, headY - 2, headRadius + 3, Math.PI, 0);
                ctx.lineTo(headX + headRadius + 3, headY + 2);
                ctx.lineTo(headX - headRadius - 3, headY + 2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;

            case 'cap':
                ctx.fillStyle = '#cc3333';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(headX, headY - 3, headRadius + 1, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(headX, headY - headRadius - 2, headRadius + 10, 4);
                break;

            case 'halo':
                ctx.strokeStyle = '#FFD700';
                ctx.shadowColor = '#FFD700';
                ctx.shadowBlur = 15;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(headX, headY - headRadius - 12, 14, 5, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'bandana':
                ctx.fillStyle = '#cc3333';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(headX, headY, headRadius + 1, -0.3, Math.PI + 0.3);
                ctx.fill();
                ctx.fillRect(headX + headRadius - 2, headY - 2, 12, 3);
                ctx.fillRect(headX + headRadius + 8, headY, 8, 3);
                break;
        }
        ctx.restore();
    }

    drawWeapon(ctx, handX, handY, armAngle, facingDir, weapon, player) {
        const fd = facingDir;
        const isAttacking = player && (player.state === 'ATTACK_LIGHT' || player.state === 'ATTACK_HEAVY' || player.state === 'ATTACK_AERIAL_LIGHT' || player.state === 'ATTACK_AERIAL_HEAVY');
        const isSlashing = isAttacking && player.attackFrame > 0;

        if (weapon.name === 'Katana') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.3);
            ctx.scale(fd, 1);
            ctx.fillStyle = '#1a0a00';
            ctx.fillRect(0, -5, 18, 10);
            ctx.strokeStyle = '#4a3000';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 3 + 1, -5);
                ctx.lineTo(i * 3 + 4, 5);
                ctx.stroke();
            }
            ctx.fillStyle = '#8B7536';
            ctx.strokeStyle = '#5a4a20';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(18, 0, 7, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(20, -3);
            ctx.lineTo(90, -1);
            ctx.lineTo(95, 0);
            ctx.lineTo(90, 2);
            ctx.lineTo(20, 3);
            ctx.closePath();
            ctx.fillStyle = '#d0d8e0';
            ctx.fill();
            if (isSlashing) {
                ctx.shadowColor = 'rgba(150,220,255,0.9)';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = 'rgba(180,230,255,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.quadraticCurveTo(55, -2, 95, 0);
                ctx.stroke();
            }
            ctx.restore();
        } else if (weapon.name === 'Fists') {
            const isStrike = player && (player.state === 'ATTACK_LIGHT' || player.state === 'ATTACK_HEAVY') && player.attackFrame > 3;
            const radius = isStrike ? 8 : 5;
            ctx.save();
            if (isStrike) { ctx.shadowColor = player.color; ctx.shadowBlur = 12; }
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(handX, handY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (weapon.name === 'Portal Gun') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.5);
            ctx.scale(fd, 1);
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, -6, 30, 12);
            ctx.fillStyle = '#00ffaa';
            ctx.fillRect(28, -4, 8, 8);
            ctx.fillStyle = '#555555';
            ctx.fillRect(5, -3, 18, 6);
            ctx.restore();
        } else if (weapon.name === 'Guitar') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.4);
            ctx.scale(fd, 1);
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(10, 5, 14, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#6B3310';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#222222';
            ctx.beginPath();
            ctx.arc(10, 8, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 0.5;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(10 + i * 2, -10);
                ctx.lineTo(10 + i * 2, 20);
                ctx.stroke();
            }
            ctx.fillStyle = '#555555';
            ctx.fillRect(-2, -25, 4, 30);
            if (isSlashing) {
                ctx.shadowColor = '#ffaa44';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(255,170,68,0.5)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(20, 0, 30, -0.5, 0.5);
                ctx.stroke();
            }
            ctx.restore();
        } else if (weapon.name === 'Ice Cream') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.5);
            ctx.scale(fd, 1);
            ctx.fillStyle = '#ddaa77';
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.lineTo(5, 0);
            ctx.lineTo(0, 18);
            ctx.closePath();
            ctx.fill();
            const scoopColors = ['#ff88aa', '#88ddff', '#ffdd88'];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = scoopColors[i];
                ctx.beginPath();
                ctx.arc(0, -6 - i * 8, 7, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (weapon.name === 'Rocket Launcher') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.5);
            ctx.scale(fd, 1);
            ctx.fillStyle = '#444444';
            ctx.fillRect(0, -6, 40, 12);
            ctx.fillStyle = '#333333';
            ctx.fillRect(35, -8, 10, 16);
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(5, -3, 30, 2);
            ctx.restore();
        } else if (weapon.name === 'Boomerang') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + (isSlashing ? player.attackFrame * 0.2 : 0.5));
            ctx.scale(fd, 1);
            ctx.strokeStyle = '#44ff88';
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 15, -0.8, Math.PI + 0.8);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawWounds(ctx, x, y, facingDir, scale, player) {
        player.wounds.forEach(wound => {
            let wx = x + wound.offsetX;
            let wy = y + wound.offsetY - 45;
            const alpha = wound.age < 200 ? 1.0 : 1.0 - (wound.age - 200) / 100;
            ctx.save();
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = '#8b0000';
            ctx.shadowColor = '#cc0000';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(wx, wy, wound.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            wound.age++;
        });
        player.wounds = player.wounds.filter(w => w.age < w.maxAge);
        if (player.wounds.length > 8) player.wounds.shift();
    }

    drawPreview(ctx, x, y, animName = 'IDLE', frame = 0) {
        this.setAnimation(animName, 1, frame);
        this.update();
        this.draw(ctx, x, y, 1, 1.2);
    }
}
