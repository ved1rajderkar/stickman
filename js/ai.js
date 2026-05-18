export class AIController {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.lastActionTime = 0;
        this.comboCount = 0;
        this.aggressionTimer = 0;
        this.isAggressive = true;
        this.dodgeCooldown = 0;
        this.reactionDelay = 0;
        this.patternMemory = [];
        this.readCount = 0;
        this.setDifficulty(difficulty);
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        switch (difficulty) {
            case 'easy':
                this.reactionDelay = 25;
                this.aggressionLevel = 0.3;
                this.blockChance = 0.2;
                this.comboLimit = 2;
                this.specialUsage = 0.2;
                this.jumpInChance = 0.03;
                this.readAbility = 0;
                break;
            case 'medium':
                this.reactionDelay = 12;
                this.aggressionLevel = 0.5;
                this.blockChance = 0.45;
                this.comboLimit = 3;
                this.specialUsage = 0.5;
                this.jumpInChance = 0.06;
                this.readAbility = 0.3;
                break;
            case 'hard':
            default:
                this.reactionDelay = 6;
                this.aggressionLevel = 0.7;
                this.blockChance = 0.7;
                this.comboLimit = 4;
                this.specialUsage = 0.85;
                this.jumpInChance = 0.1;
                this.readAbility = 0.7;
                break;
        }
    }

    update(ai, opponent, inputState) {
        const distance = Math.abs(ai.x - opponent.x);
        const opponentAttacking = ['ATTACK_LIGHT', 'ATTACK_HEAVY', 'ATTACK_AERIAL_LIGHT', 'ATTACK_AERIAL_HEAVY', 'SPECIAL'].includes(opponent.state);

        if (this.dodgeCooldown > 0) this.dodgeCooldown--;
        if (this.reactionDelay > 0) { this.reactionDelay--; return; }

        if (this.aggressionTimer > 0) {
            this.aggressionTimer--;
        } else {
            this.isAggressive = Math.random() < this.aggressionLevel;
            this.aggressionTimer = 60 + Math.random() * 120;
        }

        if (this.difficulty === 'hard' && this.readAbility > 0) {
            this.recordPattern(opponent);
        }

        this.clearInput(inputState);

        if (ai.state === 'HIT' || ai.state === 'DEATH' || ai.state === 'KNOCKDOWN' || ai.state === 'GRABBED') return;
        if (['ATTACK_LIGHT', 'ATTACK_HEAVY', 'ATTACK_AERIAL_LIGHT', 'ATTACK_AERIAL_HEAVY', 'SPECIAL', 'GRAB', 'THROW'].includes(ai.state)) return;

        if (opponentAttacking && distance < 120) {
            if (Math.random() < this.blockChance) {
                if (this.difficulty === 'hard' && Math.random() < 0.3) {
                    inputState.block = true;
                    inputState.left = opponent.x > ai.x;
                    inputState.right = opponent.x < ai.x;
                    this.dodgeCooldown = 25;
                    return;
                }
                inputState.block = true;
                this.stateTimer = 15;
                if (Math.random() < 0.35 && this.dodgeCooldown <= 0) {
                    inputState.block = false;
                    if (opponent.x > ai.x) inputState.left = true;
                    else inputState.right = true;
                    this.dodgeCooldown = 30;
                }
                return;
            }
        }

        if (opponent.state === 'HITSTUN' && distance < 100) {
            this.comboCount++;
            if (this.comboCount <= this.comboLimit) {
                inputState.lightAttack = true;
                this.stateTimer = 12;
                return;
            } else {
                inputState.heavyAttack = true;
                this.comboCount = 0;
                this.stateTimer = 20;
                return;
            }
        } else {
            this.comboCount = 0;
        }

        if (ai.specialMeter >= 100 && distance < 150 && Math.random() < this.specialUsage) {
            inputState.special = true;
            this.stateTimer = 40;
            return;
        }

        if (distance > 250) {
            if (opponent.x > ai.x) inputState.right = true;
            else inputState.left = true;
            if (distance > 400 && Math.random() < 0.02) inputState.up = true;
            this.state = 'APPROACH';
        } else if (distance > 120) {
            if (this.isAggressive) {
                if (opponent.x > ai.x) inputState.right = true;
                else inputState.left = true;
                if (distance < 180 && Math.random() < this.jumpInChance) {
                    inputState.up = true;
                    if (opponent.x > ai.x) inputState.right = true;
                    else inputState.left = true;
                }
            } else {
                if (Math.random() < 0.3) {
                    if (opponent.x > ai.x) inputState.left = true;
                    else inputState.right = true;
                }
            }
            this.state = 'MID_RANGE';
        } else {
            if (this.isAggressive) {
                const attackRoll = Math.random();
                if (attackRoll < 0.12) {
                    inputState.lightAttack = true;
                    this.stateTimer = 10;
                    this.state = 'ATTACK';
                } else if (attackRoll < 0.18) {
                    inputState.heavyAttack = true;
                    this.stateTimer = 18;
                    this.state = 'ATTACK';
                } else if (attackRoll < 0.24) {
                    inputState.grab = true;
                    this.stateTimer = 25;
                } else if (attackRoll < 0.28) {
                    inputState.up = true;
                    if (opponent.x > ai.x) inputState.right = true;
                    else inputState.left = true;
                    this.stateTimer = 15;
                }
            } else {
                if (opponent.x > ai.x) inputState.left = true;
                else inputState.right = true;
            }
            this.state = 'CLOSE';
        }

        if (opponentAttacking && distance < 80 && Math.random() < 0.5) {
            this.clearInput(inputState);
            inputState.block = true;
            this.stateTimer = 20;
        }
    }

    recordPattern(opponent) {
        if (['ATTACK_LIGHT', 'ATTACK_HEAVY', 'SPECIAL'].includes(opponent.state)) {
            this.patternMemory.push({ action: opponent.state, time: Date.now(), x: opponent.x });
            if (this.patternMemory.length > 20) this.patternMemory.shift();
        }
    }

    clearInput(inputState) {
        inputState.left = false;
        inputState.right = false;
        inputState.up = false;
        inputState.down = false;
        inputState.lightAttack = false;
        inputState.heavyAttack = false;
        inputState.special = false;
        inputState.block = false;
        inputState.grab = false;
    }
}
