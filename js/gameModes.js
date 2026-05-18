export const GameModes = {
    LOCAL_1V1: 'local_1v1',
    VS_CPU: 'vs_cpu',
    SURVIVAL: 'survival',
    TRAINING: 'training',
    TEAM_BATTLE: 'team_battle'
};

export const CPUDifficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

export class GameModeManager {
    constructor() {
        this.currentMode = null;
        this.cpuDifficulty = CPUDifficulty.MEDIUM;
        this.rounds = { p1Wins: 0, p2Wins: 0, maxRounds: 5, currentRound: 1 };
        this.survival = { wave: 0, enemiesRemaining: 0, bossWave: false, waveTimer: 0 };
        this.training = { resetTimer: 0, dummyDamage: 0 };
        this.timer = 60;
        this.maxTimer = 60;
        this.stageId = 'neon_city';
        this.p1Color = '#00FFFF';
        this.p2Color = '#FF4444';
        this.p1Weapon = 'fists';
        this.p2Weapon = 'fists';
        this.p1Accessory = null;
        this.p2Accessory = null;
        this.p1Skin = 'classic';
        this.p2Skin = 'classic';
        this.bestOf = 5;
    }

    initMode(mode, options = {}) {
        this.currentMode = mode;
        this.cpuDifficulty = options.cpuDifficulty || CPUDifficulty.MEDIUM;
        this.stageId = options.stage || 'neon_city';
        this.p1Color = options.p1Color || '#00FFFF';
        this.p2Color = options.p2Color || '#FF4444';
        this.p1Weapon = options.p1Weapon || 'fists';
        this.p2Weapon = options.p2Weapon || 'fists';
        this.p1Accessory = options.p1Accessory || null;
        this.p2Accessory = options.p2Accessory || null;
        this.p1Skin = options.p1Skin || 'classic';
        this.p2Skin = options.p2Skin || 'classic';
        this.bestOf = options.bestOf || 5;

        this.rounds = { p1Wins: 0, p2Wins: 0, maxRounds: this.bestOf, currentRound: 1 };
        this.survival = { wave: 0, enemiesRemaining: 0, bossWave: false, waveTimer: 0 };
        this.training = { resetTimer: 0, dummyDamage: 0 };
        this.timer = 60;
        this.maxTimer = 60;
    }

    isRoundBased() {
        return this.currentMode === GameModes.LOCAL_1V1 || this.currentMode === GameModes.VS_CPU || this.currentMode === GameModes.TEAM_BATTLE;
    }

    isSurvival() {
        return this.currentMode === GameModes.SURVIVAL;
    }

    isTraining() {
        return this.currentMode === GameModes.TRAINING;
    }

    needsRoundReset() {
        return this.isRoundBased() && (this.rounds.p1Wins >= Math.ceil(this.rounds.maxRounds / 2) || this.rounds.p2Wins >= Math.ceil(this.rounds.maxRounds / 2));
    }

    getWinner() {
        if (this.rounds.p1Wins > this.rounds.p2Wins) return 1;
        if (this.rounds.p2Wins > this.rounds.p1Wins) return 2;
        return 0;
    }

    recordRoundWin(winner) {
        if (winner === 1) this.rounds.p1Wins++;
        else if (winner === 2) this.rounds.p2Wins++;
        this.rounds.currentRound++;
    }

    nextSurvivalWave() {
        this.survival.wave++;
        this.survival.bossWave = this.survival.wave % 5 === 0;
        this.survival.enemiesRemaining = this.survival.bossWave ? 1 : Math.min(3, 1 + Math.floor(this.survival.wave / 3));
        this.survival.waveTimer = 120;
    }

    getRoundInfo() {
        return {
            p1Wins: this.rounds.p1Wins,
            p2Wins: this.rounds.p2Wins,
            maxRounds: this.rounds.maxRounds,
            currentRound: this.rounds.currentRound
        };
    }

    getSurvivalInfo() {
        return {
            wave: this.survival.wave,
            enemiesRemaining: this.survival.enemiesRemaining,
            bossWave: this.survival.bossWave,
            waveTimer: this.survival.waveTimer
        };
    }
}
