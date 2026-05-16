export class AIController {
    constructor(difficulty = 'hard') {
        this.difficulty = difficulty;
        this.state = 'IDLE';
        this.stateTimer = 0;
        this.lastActionTime = 0;
        this.comboCount = 0;
        this.lastAttackFrame = 0;
        this.aggressionTimer = 0;
        this.isAggressive = true;
        this.dodgeCooldown = 0;
    }
    
    update(player, opponent, inputState) {
        const now = Date.now();
        const distance = Math.abs(player.x - opponent.x);
        const opponentAttacking = opponent.state === 'ATTACK_LIGHT' || opponent.state === 'ATTACK_HEAVY';
        
        if (this.dodgeCooldown > 0) this.dodgeCooldown--;
        if (this.aggressionTimer > 0) {
            this.aggressionTimer--;
        } else {
            this.isAggressive = Math.random() < 0.7;
            this.aggressionTimer = 60 + Math.random() * 120;
        }
        
        this.clearInput(inputState);
        
        if (player.state === 'HIT' || player.state === 'DEATH') {
            return;
        }
        
        if (player.state === 'ATTACK_LIGHT' || player.state === 'ATTACK_HEAVY' || player.state === 'SPECIAL') {
            return;
        }
        
        if (opponentAttacking && distance < 120) {
            if (Math.random() < 0.75) {
                inputState.block = true;
                this.stateTimer = 15;
                
                if (Math.random() < 0.4 && this.dodgeCooldown <= 0) {
                    inputState.block = false;
                    if (opponent.x > player.x) {
                        inputState.left = true;
                    } else {
                        inputState.right = true;
                    }
                    this.dodgeCooldown = 30;
                }
                return;
            }
        }
        
        if (opponent.state === 'HIT' && distance < 100) {
            this.comboCount++;
            if (this.comboCount <= 3) {
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
        
        if (player.specialMeter >= 100 && distance < 150) {
            inputState.special = true;
            this.lastActionTime = now;
            this.stateTimer = 40;
            return;
        }
        
        if (distance > 250) {
            if (opponent.x > player.x) {
                inputState.right = true;
            } else {
                inputState.left = true;
            }
            
            if (distance > 400 && Math.random() < 0.02) {
                inputState.up = true;
            }
            this.state = 'APPROACH';
        } else if (distance > 120) {
            if (this.isAggressive) {
                if (opponent.x > player.x) {
                    inputState.right = true;
                } else {
                    inputState.left = true;
                }
                
                if (distance < 180 && Math.random() < 0.08) {
                    inputState.up = true;
                    if (opponent.x > player.x) {
                        inputState.right = true;
                    } else {
                        inputState.left = true;
                    }
                }
            } else {
                if (Math.random() < 0.3) {
                    if (opponent.x > player.x) {
                        inputState.left = true;
                    } else {
                        inputState.right = true;
                    }
                }
            }
            this.state = 'MID_RANGE';
        } else {
            if (this.isAggressive) {
                const attackRoll = Math.random();
                if (attackRoll < 0.12) {
                    inputState.lightAttack = true;
                    this.lastActionTime = now;
                    this.stateTimer = 10;
                    this.state = 'ATTACK';
                } else if (attackRoll < 0.18) {
                    inputState.heavyAttack = true;
                    this.lastActionTime = now;
                    this.stateTimer = 18;
                    this.state = 'ATTACK';
                } else if (attackRoll < 0.22) {
                    inputState.up = true;
                    if (opponent.x > player.x) {
                        inputState.right = true;
                    } else {
                        inputState.left = true;
                    }
                    this.stateTimer = 15;
                }
            } else {
                if (opponent.x > player.x) {
                    inputState.left = true;
                } else {
                    inputState.right = true;
                }
            }
            this.state = 'CLOSE';
        }
        
        if (opponentAttacking && distance < 80 && Math.random() < 0.5) {
            this.clearInput(inputState);
            inputState.block = true;
            this.stateTimer = 20;
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
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }
}
