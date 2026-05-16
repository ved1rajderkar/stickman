export class StickMan {
    constructor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
        this.animState = {
            leftArmAngle: 0,
            rightArmAngle: 0,
            leftLegAngle: 0,
            rightLegAngle: 0,
            torsoLean: 0,
            headBob: 0
        };
        this.targetState = { ...this.animState };
        this.lerpSpeed = 0.2;
        this.breathCycle = 0;
        this.attackPhaseAngles = null;
        this.lerpSpeedOverride = null;
    }

    setColor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
    }

    setAnimation(animName, facingDir = 1, frame = 0, weaponName = 'Fists', isHeavy = false) {
        const animations = {
            IDLE: {
                leftArmAngle: 0.3 + Math.sin(this.breathCycle) * 0.05,
                rightArmAngle: -0.3 - Math.sin(this.breathCycle) * 0.05,
                leftLegAngle: 0.1,
                rightLegAngle: -0.1,
                torsoLean: 0,
                headBob: Math.sin(this.breathCycle) * 2
            },
            WALK: {
                leftArmAngle: Math.sin(frame * 0.3) * 0.5,
                rightArmAngle: -Math.sin(frame * 0.3) * 0.5,
                leftLegAngle: -Math.sin(frame * 0.3) * 0.4,
                rightLegAngle: Math.sin(frame * 0.3) * 0.4,
                torsoLean: 0.05 * facingDir,
                headBob: Math.abs(Math.sin(frame * 0.3)) * 3
            },
            JUMP: {
                leftArmAngle: -0.8,
                rightArmAngle: 0.8,
                leftLegAngle: -0.4,
                rightLegAngle: 0.4,
                torsoLean: 0,
                headBob: 0
            },
            FALL: {
                leftArmAngle: Math.sin(frame * 0.2) * 1.2,
                rightArmAngle: -Math.sin(frame * 0.2) * 1.2,
                leftLegAngle: 0.3,
                rightLegAngle: -0.3,
                torsoLean: -0.1 * facingDir,
                headBob: 0
            },
            BLOCK: {
                leftArmAngle: facingDir === 1 ? -0.8 : 0.8,
                rightArmAngle: facingDir === 1 ? 0.8 : -0.8,
                leftLegAngle: 0.2,
                rightLegAngle: -0.2,
                torsoLean: -0.1 * facingDir,
                headBob: -2
            },
            HIT: {
                leftArmAngle: 0.5,
                rightArmAngle: -0.5,
                leftLegAngle: 0.1,
                rightLegAngle: -0.1,
                torsoLean: -0.2 * facingDir,
                headBob: 3
            },
            DEATH: {
                leftArmAngle: 1.2 + frame * 0.1,
                rightArmAngle: -1.2 - frame * 0.1,
                leftLegAngle: 0.5 + frame * 0.05,
                rightLegAngle: -0.5 - frame * 0.05,
                torsoLean: -0.3 * facingDir,
                headBob: 5
            }
        };

        if (animName === 'ATTACK_LIGHT' || animName === 'ATTACK_HEAVY') {
            this.setAttackAnimation(animName, facingDir, frame, weaponName, isHeavy);
        } else if (animName === 'SPECIAL') {
            this.targetState = {
                leftArmAngle: -1.5 + Math.sin(frame * 0.4) * 0.5,
                rightArmAngle: 1.5 - Math.sin(frame * 0.4) * 0.5,
                leftLegAngle: -0.3,
                rightLegAngle: 0.3,
                torsoLean: 0.2 * facingDir,
                headBob: Math.sin(frame * 0.4) * 4
            };
        } else {
            this.targetState = animations[animName] || animations.IDLE;
        }
    }

    setAttackAnimation(animName, facingDir, frame, weaponName, isHeavy) {
        const fd = facingDir;
        const isLight = animName === 'ATTACK_LIGHT';

        if (weaponName === 'Fists') {
            if (isLight) {
                if (frame <= 4) {
                    const t = frame / 4;
                    this.targetState = {
                        leftArmAngle: fd === 1 ? 0.3 - t * 0.7 : -0.3 + t * 0.7,
                        rightArmAngle: fd === 1 ? -0.3 - t * 0.7 : 0.3 + t * 0.7,
                        leftLegAngle: 0.1 + t * 0.05,
                        rightLegAngle: -0.1 - t * 0.05,
                        torsoLean: -0.1 * fd * t,
                        headBob: -2 * t
                    };
                } else if (frame <= 9) {
                    const t = (frame - 4) / 5;
                    this.targetState = {
                        leftArmAngle: fd === 1 ? -0.4 + t * 0.7 : 0.4 - t * 0.7,
                        rightArmAngle: fd === 1 ? -1.0 + t * 1.3 : 1.0 - t * 1.3,
                        leftLegAngle: 0.15 - t * 0.1,
                        rightLegAngle: -0.15 + t * 0.1,
                        torsoLean: 0.15 * fd * t,
                        headBob: -2 + t * 2
                    };
                } else {
                    const t = (frame - 9) / 9;
                    this.targetState = {
                        leftArmAngle: 0.3 * (1 - t) + (fd === 1 ? -0.4 : 0.4) * t,
                        rightArmAngle: -0.3 * (1 - t) + (fd === 1 ? -1.0 : 1.0) * t,
                        leftLegAngle: 0.05 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.05 * (1 - t) - 0.1 * t,
                        torsoLean: 0.15 * fd * (1 - t),
                        headBob: 0
                    };
                }
            } else {
                if (frame <= 8) {
                    const t = frame / 8;
                    this.targetState = {
                        leftArmAngle: fd === 1 ? 0.3 - t * 0.5 : -0.3 + t * 0.5,
                        rightArmAngle: fd === 1 ? -0.3 - t * 1.0 : 0.3 + t * 1.0,
                        leftLegAngle: 0.1 + t * 0.15,
                        rightLegAngle: -0.1 - t * 0.15,
                        torsoLean: -0.25 * fd * t,
                        headBob: -5 * t
                    };
                } else if (frame <= 14) {
                    const t = (frame - 8) / 6;
                    this.targetState = {
                        leftArmAngle: fd === 1 ? -0.2 + t * 0.5 : 0.2 - t * 0.5,
                        rightArmAngle: fd === 1 ? -1.3 + t * 1.8 : 1.3 - t * 1.8,
                        leftLegAngle: 0.25 - t * 0.15,
                        rightLegAngle: -0.25 + t * 0.15,
                        torsoLean: 0.35 * fd * t,
                        headBob: -5 + t * 8
                    };
                } else {
                    const t = (frame - 14) / 14;
                    this.targetState = {
                        leftArmAngle: 0.3 * (1 - t) + (fd === 1 ? -0.2 : 0.2) * t,
                        rightArmAngle: -0.3 * (1 - t) + (fd === 1 ? -1.3 : 1.3) * t,
                        leftLegAngle: 0.1 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.1 * (1 - t) - 0.1 * t,
                        torsoLean: 0.35 * fd * (1 - t),
                        headBob: 3 * (1 - t)
                    };
                }
            }
        } else if (weaponName === 'Katana') {
            if (isLight) {
                if (frame <= 4) {
                    const t = frame / 4;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 1.2,
                        leftArmAngle: 0.3 + t * 0.3,
                        leftLegAngle: 0.1 + t * 0.1,
                        rightLegAngle: -0.1 - t * 0.1,
                        torsoLean: -0.15 * fd * t,
                        headBob: -3 * t
                    };
                } else if (frame <= 10) {
                    const t = (frame - 4) / 6;
                    this.targetState = {
                        rightArmAngle: -1.5 + t * 2.1,
                        leftArmAngle: 0.6 - t * 0.3,
                        leftLegAngle: 0.2 - t * 0.1,
                        rightLegAngle: -0.2 + t * 0.1,
                        torsoLean: 0.2 * fd * t,
                        headBob: -3 + t * 3
                    };
                } else {
                    const t = (frame - 10) / 6;
                    this.targetState = {
                        rightArmAngle: 0.6 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.1 * (1 - t) - 0.1 * t,
                        torsoLean: 0.2 * fd * (1 - t),
                        headBob: 0
                    };
                }
            } else {
                if (frame <= 7) {
                    const t = frame / 7;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 1.5,
                        leftArmAngle: 0.3 + t * 0.5,
                        leftLegAngle: 0.1 + t * 0.2,
                        rightLegAngle: -0.1 - t * 0.2,
                        torsoLean: -0.25 * fd * t,
                        headBob: -5 * t
                    };
                } else if (frame <= 15) {
                    const t = (frame - 7) / 8;
                    this.targetState = {
                        rightArmAngle: -1.8 + t * 2.8,
                        leftArmAngle: 0.8 - t * 0.5,
                        leftLegAngle: 0.3 - t * 0.2,
                        rightLegAngle: -0.3 + t * 0.2,
                        torsoLean: 0.3 * fd * t,
                        headBob: -5 + t * 5
                    };
                } else {
                    const t = (frame - 15) / 9;
                    this.targetState = {
                        rightArmAngle: 1.0 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.1 * (1 - t) - 0.1 * t,
                        torsoLean: 0.3 * fd * (1 - t),
                        headBob: 0
                    };
                }
            }
        } else if (weaponName === 'Baseball Bat') {
            if (isLight) {
                if (frame <= 5) {
                    const t = frame / 5;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 1.4,
                        leftArmAngle: 0.3 + t * 0.4,
                        leftLegAngle: 0.1 + t * 0.15,
                        rightLegAngle: -0.1 - t * 0.15,
                        torsoLean: -0.2 * fd * t,
                        headBob: -4 * t
                    };
                } else if (frame <= 11) {
                    const t = (frame - 5) / 6;
                    this.targetState = {
                        rightArmAngle: -1.7 + t * 2.2,
                        leftArmAngle: 0.7 - t * 0.4,
                        leftLegAngle: 0.25 - t * 0.15,
                        rightLegAngle: -0.25 + t * 0.15,
                        torsoLean: 0.25 * fd * t,
                        headBob: -4 + t * 4
                    };
                } else {
                    const t = (frame - 11) / 7;
                    this.targetState = {
                        rightArmAngle: 0.5 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.1 * (1 - t) - 0.1 * t,
                        torsoLean: 0.25 * fd * (1 - t),
                        headBob: 0
                    };
                }
            } else {
                if (frame <= 8) {
                    const t = frame / 8;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 1.7,
                        leftArmAngle: 0.3 + t * 0.5,
                        leftLegAngle: 0.1 + t * 0.25,
                        rightLegAngle: -0.1 - t * 0.25,
                        torsoLean: -0.3 * fd * t,
                        headBob: -6 * t
                    };
                } else if (frame <= 16) {
                    const t = (frame - 8) / 8;
                    this.targetState = {
                        rightArmAngle: -2.0 + t * 3.0,
                        leftArmAngle: 0.8 - t * 0.5,
                        leftLegAngle: 0.35 - t * 0.25,
                        rightLegAngle: -0.35 + t * 0.25,
                        torsoLean: 0.35 * fd * t,
                        headBob: -6 + t * 6
                    };
                } else {
                    const t = (frame - 16) / 10;
                    this.targetState = {
                        rightArmAngle: 1.0 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1 * (1 - t) + 0.1 * t,
                        rightLegAngle: -0.1 * (1 - t) - 0.1 * t,
                        torsoLean: 0.35 * fd * (1 - t),
                        headBob: 0
                    };
                }
            }
        } else if (weaponName === 'Pistol') {
            if (isLight) {
                if (frame <= 2) {
                    const t = frame / 2;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 0.5,
                        leftArmAngle: 0.3 + t * 0.2,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.05 * fd * t,
                        headBob: -1 * t
                    };
                } else if (frame <= 6) {
                    const t = (frame - 2) / 4;
                    this.targetState = {
                        rightArmAngle: -0.8 + t * 0.5,
                        leftArmAngle: 0.5 - t * 0.2,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.05 * fd,
                        headBob: -1 + t
                    };
                } else {
                    const t = (frame - 6) / 6;
                    this.targetState = {
                        rightArmAngle: -0.3 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.05 * fd * (1 - t),
                        headBob: 0
                    };
                }
            } else {
                if (frame <= 3) {
                    const t = frame / 3;
                    this.targetState = {
                        rightArmAngle: -0.3 - t * 0.6,
                        leftArmAngle: 0.3 + t * 0.3,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.08 * fd * t,
                        headBob: -2 * t
                    };
                } else if (frame <= 8) {
                    const t = (frame - 3) / 5;
                    this.targetState = {
                        rightArmAngle: -0.9 + t * 0.6,
                        leftArmAngle: 0.6 - t * 0.3,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.08 * fd,
                        headBob: -2 + t * 2
                    };
                } else {
                    const t = (frame - 8) / 8;
                    this.targetState = {
                        rightArmAngle: -0.3 * (1 - t) - 0.3 * t,
                        leftArmAngle: 0.3 * (1 - t) + 0.3 * t,
                        leftLegAngle: 0.1,
                        rightLegAngle: -0.1,
                        torsoLean: 0.08 * fd * (1 - t),
                        headBob: 0
                    };
                }
            }
        } else {
            this.targetState = {
                leftArmAngle: fd === 1 ? -1.2 : 0.3,
                rightArmAngle: fd === 1 ? 0.3 : -1.2,
                leftLegAngle: 0.2,
                rightLegAngle: -0.2,
                torsoLean: 0.1 * fd,
                headBob: 0
            };
        }
    }

    lerp(current, target, speed) {
        return current + (target - current) * speed;
    }

    update() {
        this.breathCycle += 0.05;
        const speed = this.lerpSpeedOverride || this.lerpSpeed;
        this.lerpSpeedOverride = null;

        this.animState.leftArmAngle = this.lerp(this.animState.leftArmAngle, this.targetState.leftArmAngle, speed);
        this.animState.rightArmAngle = this.lerp(this.animState.rightArmAngle, this.targetState.rightArmAngle, speed);
        this.animState.leftLegAngle = this.lerp(this.animState.leftLegAngle, this.targetState.leftLegAngle, speed);
        this.animState.rightLegAngle = this.lerp(this.animState.rightLegAngle, this.targetState.rightLegAngle, speed);
        this.animState.torsoLean = this.lerp(this.animState.torsoLean, this.targetState.torsoLean, speed);
        this.animState.headBob = this.lerp(this.animState.headBob, this.targetState.headBob, speed);
    }

    getBodyPartPositions(ctx, x, y, facingDir, scale = 1) {
        const headRadius = 18;
        const torsoLength = 45;
        const armLength = 35;
        const legLength = 40;

        const headY = -torsoLength - headRadius + this.animState.headBob;
        const torsoTopY = -torsoLength + this.animState.headBob;
        const torsoBottomY = this.animState.headBob;
        const shoulderY = torsoTopY + 5;
        const hipY = torsoBottomY;

        const leftArmEndX = Math.cos(Math.PI / 2 + this.animState.leftArmAngle) * armLength;
        const leftArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.animState.leftArmAngle) * armLength;
        const rightArmEndX = Math.cos(Math.PI / 2 + this.animState.rightArmAngle) * armLength;
        const rightArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.animState.rightArmAngle) * armLength;

        const leftLegEndX = Math.cos(Math.PI / 2 + this.animState.leftLegAngle) * legLength;
        const leftLegEndY = hipY + Math.sin(Math.PI / 2 + this.animState.leftLegAngle) * legLength;
        const rightLegEndX = Math.cos(Math.PI / 2 + this.animState.rightLegAngle) * legLength;
        const rightLegEndY = hipY + Math.sin(Math.PI / 2 + this.animState.rightLegAngle) * legLength;

        const fd = facingDir;
        const s = scale;
        const cosLean = Math.cos(this.animState.torsoLean);
        const sinLean = Math.sin(this.animState.torsoLean);

        const transformPoint = (px, py) => {
            const rx = px * cosLean - py * sinLean;
            const ry = px * sinLean + py * cosLean;
            return {
                x: x + rx * fd * s,
                y: y + ry * s
            };
        };

        return {
            head: transformPoint(0, headY),
            torso: transformPoint(0, torsoTopY + torsoLength / 2),
            leftArm: transformPoint(leftArmEndX, leftArmEndY),
            rightArm: transformPoint(rightArmEndX, rightArmEndY),
            leftLeg: transformPoint(leftLegEndX, leftLegEndY),
            rightLeg: transformPoint(rightLegEndX, rightLegEndY),
            shoulder: transformPoint(0, shoulderY),
            hip: transformPoint(0, hipY)
        };
    }

    draw(ctx, x, y, facingDir = 1, scale = 1, weapon = null, player = null) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facingDir * scale, scale);

        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.lineWidth = 5;

        const headRadius = 18;
        const torsoLength = 45;
        const armLength = 35;
        const legLength = 40;

        const headY = -torsoLength - headRadius + this.animState.headBob;
        const torsoTopY = -torsoLength + this.animState.headBob;
        const torsoBottomY = this.animState.headBob;

        ctx.save();
        ctx.rotate(this.animState.torsoLean);

        ctx.beginPath();
        ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, torsoTopY);
        ctx.lineTo(0, torsoBottomY);
        ctx.stroke();

        const shoulderY = torsoTopY + 5;
        const leftArmEndX = Math.cos(Math.PI / 2 + this.animState.leftArmAngle) * armLength;
        const leftArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.animState.leftArmAngle) * armLength;
        const rightArmEndX = Math.cos(Math.PI / 2 + this.animState.rightArmAngle) * armLength;
        const rightArmEndY = shoulderY + Math.sin(Math.PI / 2 + this.animState.rightArmAngle) * armLength;

        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(leftArmEndX, leftArmEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(rightArmEndX, rightArmEndY);
        ctx.stroke();

        const hipY = torsoBottomY;
        const leftLegEndX = Math.cos(Math.PI / 2 + this.animState.leftLegAngle) * legLength;
        const leftLegEndY = hipY + Math.sin(Math.PI / 2 + this.animState.leftLegAngle) * legLength;
        const rightLegEndX = Math.cos(Math.PI / 2 + this.animState.rightLegAngle) * legLength;
        const rightLegEndY = hipY + Math.sin(Math.PI / 2 + this.animState.rightLegAngle) * legLength;

        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(leftLegEndX, leftLegEndY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(rightLegEndX, rightLegEndY);
        ctx.stroke();

        if (weapon && player) {
            this.drawWeapon(ctx, rightArmEndX, rightArmEndY, this.animState.rightArmAngle, facingDir, weapon, player);
        }

        ctx.restore();

        if (player && player.wounds && player.wounds.length > 0) {
            this.drawWounds(ctx, x, y, facingDir, scale, player);
        }

        ctx.restore();
    }

    drawWeapon(ctx, handX, handY, armAngle, facingDir, weapon, player) {
        const fd = facingDir;
        const isAttacking = player && (player.state === 'ATTACK_LIGHT' || player.state === 'ATTACK_HEAVY');
        const isSlashing = isAttacking && player.attackFrame > 0;

        if (weapon.name === 'Pistol') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.5);
            ctx.scale(fd, 1);

            ctx.beginPath();
            ctx.rect(2, -5, 28, 8);
            ctx.fillStyle = '#2a2a2a';
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.rect(2, 3, 11, 16);
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(8, 6, 6, 0, Math.PI * 0.7);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(8, -5);
            ctx.lineTo(28, -5);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.rect(28, -6, 4, 10);
            ctx.fillStyle = '#111';
            ctx.fill();

            ctx.fillStyle = '#888';
            ctx.fillRect(22, -8, 4, 3);

            ctx.restore();
        } else if (weapon.name === 'Katana') {
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
            ctx.moveTo(14, 0); ctx.lineTo(22, 0);
            ctx.moveTo(18, -9); ctx.lineTo(18, 9);
            ctx.strokeStyle = '#5a4a20';
            ctx.lineWidth = 1;
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

            ctx.beginPath();
            ctx.moveTo(20, -3);
            ctx.quadraticCurveTo(55, -4, 95, 0);
            ctx.strokeStyle = '#f0f5ff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(22, 0);
            ctx.lineTo(85, 0);
            ctx.strokeStyle = '#aab5c0';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(25, -1.5);
            ctx.lineTo(80, -1);
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

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
        } else if (weapon.name === 'Baseball Bat') {
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(armAngle + 0.3);
            ctx.scale(fd, 1);

            ctx.fillStyle = '#111111';
            ctx.fillRect(0, -4, 16, 8);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 4, -4);
                ctx.lineTo(i * 4 + 2, 4);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(14, -3.5);
            ctx.lineTo(55, -5);
            ctx.lineTo(55, 5);
            ctx.lineTo(14, 3.5);
            ctx.closePath();
            ctx.fillStyle = '#8B4513';
            ctx.fill();
            ctx.strokeStyle = '#6B3310';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(55, -5);
            ctx.lineTo(65, -9);
            ctx.lineTo(65, 9);
            ctx.lineTo(55, 5);
            ctx.closePath();
            ctx.fillStyle = '#7a3c10';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(65, -9);
            ctx.lineTo(95, -10);
            ctx.lineTo(95, 10);
            ctx.lineTo(65, 9);
            ctx.closePath();
            ctx.fillStyle = '#A0522D';
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(95, 0, 3, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#8B4513';
            ctx.fill();

            ctx.strokeStyle = 'rgba(60,20,0,0.4)';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(65 + i * 10, -9);
                ctx.lineTo(65 + i * 10, 9);
                ctx.stroke();
            }

            ctx.strokeStyle = player.color || '#ff00ff';
            ctx.shadowColor = player.color || '#ff00ff';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(8, -5); ctx.lineTo(14, -5);
            ctx.moveTo(8, 5); ctx.lineTo(14, 5);
            ctx.stroke();

            if (isSlashing) {
                ctx.shadowColor = 'rgba(255,200,100,0.8)';
                ctx.shadowBlur = 25;
                ctx.strokeStyle = 'rgba(255,200,100,0.4)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(65, 0); ctx.lineTo(95, 0);
                ctx.stroke();
            }

            ctx.restore();
        } else if (weapon.name === 'Fists') {
            const isStrikePhase = player && player.state === 'ATTACK_LIGHT' && player.attackFrame >= 5 && player.attackFrame <= 9;
            const isHeavyStrike = player && player.state === 'ATTACK_HEAVY' && player.attackFrame >= 9 && player.attackFrame <= 14;
            const radius = isHeavyStrike ? 12 : (isStrikePhase ? 8 : 5);
            const glow = isStrikePhase || isHeavyStrike;

            ctx.save();
            if (glow) {
                ctx.shadowColor = player.color;
                ctx.shadowBlur = 12;
            }
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(handX, handY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawWounds(ctx, x, y, facingDir, scale, player) {
        const positions = this.getBodyPartPositions(ctx, x, y, facingDir, scale);

        player.wounds.forEach(wound => {
            let pos;
            switch (wound.bodyPart) {
                case 'head': pos = positions.head; break;
                case 'torso': pos = positions.torso; break;
                case 'leftArm': pos = positions.leftArm; break;
                case 'rightArm': pos = positions.rightArm; break;
                case 'leftLeg': pos = positions.leftLeg; break;
                case 'rightLeg': pos = positions.rightLeg; break;
                default: pos = positions.torso;
            }

            const alpha = wound.age < 200 ? 1.0 : 1.0 - (wound.age - 200) / 100;

            ctx.save();
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = '#8b0000';
            ctx.shadowColor = '#cc0000';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(pos.x + wound.offsetX, pos.y + wound.offsetY, wound.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#cc0000';
            ctx.beginPath();
            ctx.arc(pos.x + wound.offsetX, pos.y + wound.offsetY + wound.size * 1.3, wound.size * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(pos.x + wound.offsetX - 1, pos.y + wound.offsetY - 1, wound.size * 0.4, 0, Math.PI * 2);
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
