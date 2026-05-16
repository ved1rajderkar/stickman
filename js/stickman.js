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
    }

    setColor(color, glowColor) {
        this.color = color;
        this.glowColor = glowColor;
    }

    setAnimation(animName, facingDir = 1, frame = 0) {
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
            RUN: {
                leftArmAngle: Math.sin(frame * 0.5) * 0.7,
                rightArmAngle: -Math.sin(frame * 0.5) * 0.7,
                leftLegAngle: -Math.sin(frame * 0.5) * 0.6,
                rightLegAngle: Math.sin(frame * 0.5) * 0.6,
                torsoLean: 0.15 * facingDir,
                headBob: Math.abs(Math.sin(frame * 0.5)) * 5
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
            ATTACK_LIGHT: {
                leftArmAngle: facingDir === 1 ? -1.2 : 0.3,
                rightArmAngle: facingDir === 1 ? 0.3 : -1.2,
                leftLegAngle: 0.2,
                rightLegAngle: -0.2,
                torsoLean: 0.1 * facingDir,
                headBob: 0
            },
            ATTACK_HEAVY: {
                leftArmAngle: facingDir === 1 ? -1.5 : 0.5,
                rightArmAngle: facingDir === 1 ? 0.5 : -1.5,
                leftLegAngle: -0.3,
                rightLegAngle: 0.3,
                torsoLean: 0.25 * facingDir,
                headBob: -3
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
            },
            SPECIAL: {
                leftArmAngle: -1.5 + Math.sin(frame * 0.4) * 0.5,
                rightArmAngle: 1.5 - Math.sin(frame * 0.4) * 0.5,
                leftLegAngle: -0.3,
                rightLegAngle: 0.3,
                torsoLean: 0.2 * facingDir,
                headBob: Math.sin(frame * 0.4) * 4
            }
        };

        this.targetState = animations[animName] || animations.IDLE;
    }

    lerp(current, target, speed) {
        return current + (target - current) * speed;
    }

    update() {
        this.breathCycle += 0.05;
        
        this.animState.leftArmAngle = this.lerp(this.animState.leftArmAngle, this.targetState.leftArmAngle, this.lerpSpeed);
        this.animState.rightArmAngle = this.lerp(this.animState.rightArmAngle, this.targetState.rightArmAngle, this.lerpSpeed);
        this.animState.leftLegAngle = this.lerp(this.animState.leftLegAngle, this.targetState.leftLegAngle, this.lerpSpeed);
        this.animState.rightLegAngle = this.lerp(this.animState.rightLegAngle, this.targetState.rightLegAngle, this.lerpSpeed);
        this.animState.torsoLean = this.lerp(this.animState.torsoLean, this.targetState.torsoLean, this.lerpSpeed);
        this.animState.headBob = this.lerp(this.animState.headBob, this.targetState.headBob, this.lerpSpeed);
    }

    draw(ctx, x, y, facingDir = 1, scale = 1) {
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

        ctx.restore();
        ctx.restore();
    }

    drawPreview(ctx, x, y, animName = 'IDLE', frame = 0) {
        this.setAnimation(animName, 1, frame);
        this.update();
        this.draw(ctx, x, y, 1, 1.2);
    }
}
