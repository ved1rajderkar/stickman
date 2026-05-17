import { SaveSystem } from './saveSystem.js';

export const LevelManager = {
    isBossLevel(level) {
        return level % 25 === 0;
    },

    isCheckpointLevel(level) {
        return level === 50 || level === 100;
    },

    getLevelConfig(level) {
        const isBoss = this.isBossLevel(level);
        const isCheckpoint = this.isCheckpointLevel(level);

        let enemyCount, enemyHealth, enemySpeed, enemyDamage, hasSpikes, spikeCount;

        if (level <= 10) {
            enemyCount = 1 + Math.floor(level / 3);
            enemyHealth = 80 + level * 2;
            enemySpeed = 3.0 + level * 0.1;
            enemyDamage = 8 + level;
            hasSpikes = level >= 5;
            spikeCount = Math.floor((level - 4) / 2);
        } else if (level <= 25) {
            enemyCount = 2 + Math.floor((level - 10) / 3);
            enemyHealth = 100 + (level - 10) * 3;
            enemySpeed = 3.5 + (level - 10) * 0.15;
            enemyDamage = 12 + (level - 10) * 1.5;
            hasSpikes = true;
            spikeCount = 2 + Math.floor((level - 10) / 4);
        } else if (level <= 50) {
            enemyCount = 2 + Math.floor((level - 25) / 4);
            enemyHealth = 130 + (level - 25) * 4;
            enemySpeed = 4.0 + (level - 25) * 0.1;
            enemyDamage = 18 + (level - 25) * 2;
            hasSpikes = true;
            spikeCount = 3 + Math.floor((level - 25) / 5);
        } else if (level <= 75) {
            enemyCount = 3 + Math.floor((level - 50) / 4);
            enemyHealth = 160 + (level - 50) * 5;
            enemySpeed = 4.5 + (level - 50) * 0.12;
            enemyDamage = 22 + (level - 50) * 2.5;
            hasSpikes = true;
            spikeCount = 4 + Math.floor((level - 50) / 4);
        } else if (level <= 100) {
            enemyCount = 3 + Math.floor((level - 75) / 3);
            enemyHealth = 200 + (level - 75) * 6;
            enemySpeed = 5.0 + (level - 75) * 0.1;
            enemyDamage = 28 + (level - 75) * 3;
            hasSpikes = true;
            spikeCount = 5 + Math.floor((level - 75) / 3);
        } else {
            const endlessScale = level - 100;
            enemyCount = Math.min(6, 4 + Math.floor(endlessScale / 10));
            enemyHealth = 250 + endlessScale * 8;
            enemySpeed = Math.min(7, 5.5 + endlessScale * 0.05);
            enemyDamage = 35 + endlessScale * 4;
            hasSpikes = true;
            spikeCount = Math.min(10, 6 + Math.floor(endlessScale / 8));
        }

        if (isBoss) {
            enemyCount = 1;
            enemyHealth = Math.round(enemyHealth * 3);
            enemySpeed = Math.min(6, enemySpeed * 1.2);
            enemyDamage = Math.round(enemyDamage * 1.5);
        }

        return {
            level,
            isBoss,
            isCheckpoint,
            enemyCount: Math.min(enemyCount, isBoss ? 1 : 6),
            enemyHealth,
            enemySpeed,
            enemyDamage,
            hasSpikes,
            spikeCount: Math.min(spikeCount, 10),
            timeLimit: isBoss ? 120 : (level <= 25 ? 90 : 60),
            stars: {
                one: true,
                two: level <= 50 || true,
                three: level <= 25 || true
            }
        };
    },

    calculateStars(level, timeRemaining, hpPercent, deaths) {
        const config = this.getLevelConfig(level);
        let stars = 1;

        if (hpPercent > 0.5 && deaths === 0) stars = 2;
        if (hpPercent > 0.7 && deaths === 0 && timeRemaining > config.timeLimit * 0.4) stars = 3;

        return stars;
    },

    getNextLevel(currentLevel) {
        return currentLevel + 1;
    },

    getLevelDisplayName(level) {
        if (this.isBossLevel(level)) {
            return `BOSS - Level ${level}`;
        }
        return `Level ${level}`;
    },

    getVideoForLevel(level) {
        if (level === 1) return 'assets/videos/intro.mp4';
        if (level === 50) return 'assets/videos/checkpoint_50.mp4';
        if (level === 100) return 'assets/videos/checkpoint_100.mp4';
        return null;
    },

    shouldShowVideo(level) {
        return level === 1 || level === 50 || level === 100;
    },

    getDifficultyLabel(level) {
        if (level <= 10) return 'Easy';
        if (level <= 25) return 'Medium';
        if (level <= 50) return 'Hard';
        if (level <= 75) return 'Very Hard';
        if (level <= 100) return 'Extreme';
        return `Nightmare ${level - 100}`;
    }
};
