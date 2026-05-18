// ============================================================
// AI Controller — physics-aware CPU opponent
// Accounts for jump arcs, knockback prediction, and combo routing.
// ============================================================
import { JUMP_FORCE, GRAVITY } from './constants.js';

export class AIController {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.comboCount = 0;
        this.aggressionTimer = 0;
        this.isAggressive = true;
        this.dodgeCooldown = 0;
        this.reactionDelay = 0;
        this.patternMemory = [];
        this.setDifficulty(difficulty);
    }

    setDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                this.reactionDelay = 25; this.aggressionLevel = 0.3;
                this.blockChance = 0.2; this.comboLimit = 2;
                this.specialUsage = 0.2; this.jumpInChance = 0.03;
                this.readAbility = 0; this.predictionRange = 0;
                break;
            case 'medium':
                this.reactionDelay = 12; this.aggressionLevel = 0.5;
                this.blockChance = 0.45; this.comboLimit = 3;
                this.specialUsage = 0.5; this.jumpInChance = 0.06;
                this.readAbility = 0.3; this.predictionRange = 60;
                break;
            case 'hard':
            default:
                this.reactionDelay = 6; this.aggressionLevel = 0.7;
                this.blockChance = 0.7; this.comboLimit = 4;
                this.specialUsage = 0.85; this.jumpInChance = 0.1;
                this.readAbility = 0.7; this.predictionRange = 120;
                break;
        }
    }

    update(ai, opponent, inputState) {
        const distance = Math.abs(ai.x - opponent.x);
        const yDiff = opponent.y - ai.y;
        const opponentAttacking = ['ATTACK_LIGHT', 'ATTACK_HEAVY', 'ATTACK_AERIAL_LIGHT', 'ATTACK_AERIAL_HEAVY', 'SPECIAL'].includes(opponent.state);

        if (this.dodgeCooldown > 0) this.dodgeCooldown--;
        if (this.reactionDelay > 0) { this.reactionDelay--; return; }

        if (this.aggressionTimer > 0) { this.aggressionTimer--; }
        else { this.isAggressive = Math.random() < this.aggressionLevel; this.aggressionTimer = 60 + Math.random() * 120; }

        if (this.readAbility > 0) this.recordPattern(opponent);

        this.clearInput(inputState);

        if (['HITSTUN', 'DEATH', 'KNOCKDOWN', 'GRABBED'].includes(ai.state)) return;
        if (['ATTACK_LIGHT', 'ATTACK_HEAVY', 'ATTACK_AERIAL_LIGHT', 'ATTACK_AERIAL_HEAVY', 'SPECIAL', 'GRAB', 'THROW'].includes(ai.state)) return;

        // React to opponent attacks
        if (opponentAttacking && distance < 120) {
            if (Math.random() < this.blockChance) {
                if (this.difficulty === 'hard' && Math.random() < 0.3) {
                    inputState.block = true;
                    if (opponent.x > ai.x) inputState.left = true;
                    else inputState.right = true;
                    this.dodgeCooldown = 25;
                    return;
                }
                inputState.block = true; this.stateTimer = 15;
                if (Math.random() < 0.35 && this.dodgeCooldown <= 0) {
                    inputState.block = false;
                    if (opponent.x > ai.x) inputState.left = true;
                    else inputState.right = true;
                    this.dodgeCooldown = 30;
                }
                return;
            }
        }

        // Combo follow-up when opponent is in hitstun
        if (opponent.state === 'HITSTUN' && distance < 100) {
            this.comboCount++;
            if (this.comboCount <= this.comboLimit) {
                inputState.lightAttack = true; this.stateTimer = 12; return;
            } else {
                // Use heavy or uppercut to juggle
                if (!opponent.onGround && this.difficulty === 'hard') {
                    inputState.heavyAttack = true; // air slam for juggle
                } else {
                    inputState.heavyAttack = true;
                }
                this.comboCount = 0; this.stateTimer = 20; return;
            }
        } else { this.comboCount = 0; }

        // Use special when available and in range
        if (ai.specialMeter >= 100 && distance < 150 && Math.random() < this.specialUsage) {
            inputState.special = true; this.stateTimer = 40; return;
        }

        // Physics-aware approach: predict opponent position
        if (distance > 250) {
            this.approach(ai, opponent, inputState, distance, yDiff);
        } else if (distance > 120) {
            this.midRange(ai, opponent, inputState, distance, yDiff);
        } else {
            this.closeRange(ai, opponent, inputState, distance, yDiff);
        }

        // Emergency block
        if (opponentAttacking && distance < 80 && Math.random() < 0.5) {
            this.clearInput(inputState);
            inputState.block = true; this.stateTimer = 20;
        }
    }

    /**
     * Approach with jump arc prediction.
     * Calculates where opponent will land if airborne.
     */
    approach(ai, opponent, inputState, distance, yDiff) {
        let targetX = opponent.x;

        // Predict landing position for airborne opponent
        if (!opponent.onGround && this.predictionRange > 0) {
            const framesToLand = Math.abs(opponent.vy) / 0.6 + Math.sqrt(2 * Math.abs(opponent.y - 580) / 0.6);
            const predictedX = opponent.x + opponent.vx * Math.min(framesToLand, this.predictionRange);
            targetX = predictedX;
        }

        if (targetX > ai.x) inputState.right = true;
        else inputState.left = true;

        // Jump to approach if opponent is above
        if (yDiff < -50 && Math.random() < 0.04) {
            inputState.up = true;
            if (targetX > ai.x) inputState.right = true;
            else inputState.left = true;
        }

        // Dash approach when far
        if (distance > 400 && Math.random() < 0.015) {
            // Double-tap for dash (AI simulates by just moving fast)
            inputState.right = targetX > ai.x;
            inputState.left = targetX < ai.x;
        }

        this.state = 'APPROACH';
    }

    midRange(ai, opponent, inputState, distance, yDiff) {
        if (this.isAggressive) {
            if (opponent.x > ai.x) inputState.right = true;
            else inputState.left = true;

            // Jump-in attack
            if (distance < 180 && Math.random() < this.jumpInChance) {
                inputState.up = true;
                if (opponent.x > ai.x) inputState.right = true;
                else inputState.left = true;
            }

            // Use uppercut when opponent is above (y-distance check)
            if (yDiff < -30 && this.difficulty === 'hard' && Math.random() < 0.15) {
                inputState.up = true;
                inputState.heavyAttack = true; // uppercut
                this.stateTimer = 25;
                return;
            }
        } else {
            if (Math.random() < 0.3) {
                if (opponent.x > ai.x) inputState.left = true;
                else inputState.right = true;
            }
        }
        this.state = 'MID_RANGE';
    }

    closeRange(ai, opponent, inputState, distance, yDiff) {
        if (this.isAggressive) {
            const attackRoll = Math.random();
            if (attackRoll < 0.12) {
                inputState.lightAttack = true; this.stateTimer = 10; this.state = 'ATTACK';
            } else if (attackRoll < 0.18) {
                inputState.heavyAttack = true; this.stateTimer = 18; this.state = 'ATTACK';
            } else if (attackRoll < 0.24) {
                inputState.grab = true; this.stateTimer = 25;
            } else if (attackRoll < 0.32) {
                // Jump-in or uppercut
                if (!opponent.onGround && this.difficulty === 'hard') {
                    inputState.up = true; // anti-air
                    inputState.heavyAttack = true;
                } else {
                    inputState.up = true;
                    if (opponent.x > ai.x) inputState.right = true;
                    else inputState.left = true;
                }
                this.stateTimer = 15;
            }
        } else {
            if (opponent.x > ai.x) inputState.left = true;
            else inputState.right = true;
        }
        this.state = 'CLOSE';
    }

    recordPattern(opponent) {
        if (['ATTACK_LIGHT', 'ATTACK_HEAVY', 'SPECIAL'].includes(opponent.state)) {
            this.patternMemory.push({ action: opponent.state, time: Date.now(), x: opponent.x });
            if (this.patternMemory.length > 20) this.patternMemory.shift();
        }
    }

    clearInput(inputState) {
        inputState.left = false; inputState.right = false;
        inputState.up = false; inputState.down = false;
        inputState.lightAttack = false; inputState.heavyAttack = false;
        inputState.special = false; inputState.block = false; inputState.grab = false;
    }
}
