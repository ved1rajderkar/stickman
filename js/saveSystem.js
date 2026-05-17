export const SaveSystem = {
    getPlayerName() {
        try {
            return localStorage.getItem('stickman_playerName') || 'Player1';
        } catch { return 'Player1'; }
    },

    setPlayerName(name) {
        try {
            localStorage.setItem('stickman_playerName', name);
        } catch {}
    },

    getCurrentLevel() {
        try {
            return parseInt(localStorage.getItem('stickman_currentLevel') || '1');
        } catch { return 1; }
    },

    setCurrentLevel(level) {
        try {
            localStorage.setItem('stickman_currentLevel', level.toString());
        } catch {}
    },

    getLevelStars(level) {
        try {
            const stars = JSON.parse(localStorage.getItem('stickman_levelStars') || '{}');
            return stars[level] || 0;
        } catch { return 0; }
    },

    setLevelStars(level, stars) {
        try {
            const all = JSON.parse(localStorage.getItem('stickman_levelStars') || '{}');
            if (!all[level] || stars > all[level]) {
                all[level] = stars;
                localStorage.setItem('stickman_levelStars', JSON.stringify(all));
            }
        } catch {}
    },

    getStats() {
        try {
            return JSON.parse(localStorage.getItem('stickman_stats') || JSON.stringify({
                totalLevelsCompleted: 0,
                totalPlaytime: 0,
                highestLevel: 1,
                bossesDefeated: 0,
                currentStreak: 0,
                bestStreak: 0,
                deaths: 0,
                totalKills: 0,
                achievements: []
            }));
        } catch {
            return {
                totalLevelsCompleted: 0,
                totalPlaytime: 0,
                highestLevel: 1,
                bossesDefeated: 0,
                currentStreak: 0,
                bestStreak: 0,
                deaths: 0,
                totalKills: 0,
                achievements: []
            };
        }
    },

    saveStats(stats) {
        try {
            localStorage.setItem('stickman_stats', JSON.stringify(stats));
        } catch {}
    },

    unlockAchievement(id) {
        try {
            const stats = this.getStats();
            if (!stats.achievements.includes(id)) {
                stats.achievements.push(id);
                this.saveStats(stats);
                return true;
            }
            return false;
        } catch { return false; }
    },

    hasAchievement(id) {
        const stats = this.getStats();
        return stats.achievements.includes(id);
    },

    getSelectedSkin() {
        try {
            return localStorage.getItem('stickman_selectedSkin') || '#00FFFF';
        } catch { return '#00FFFF'; }
    },

    setSelectedSkin(color) {
        try {
            localStorage.setItem('stickman_selectedSkin', color);
        } catch {}
    },

    getUnlockedSkins() {
        try {
            return JSON.parse(localStorage.getItem('stickman_unlockedSkins') || '["#00FFFF"]');
        } catch { return ['#00FFFF']; }
    },

    unlockSkin(color) {
        try {
            const skins = this.getUnlockedSkins();
            if (!skins.includes(color)) {
                skins.push(color);
                localStorage.setItem('stickman_unlockedSkins', JSON.stringify(skins));
            }
        } catch {}
    },

    resetAll() {
        try {
            localStorage.removeItem('stickman_playerName');
            localStorage.removeItem('stickman_currentLevel');
            localStorage.removeItem('stickman_levelStars');
            localStorage.removeItem('stickman_stats');
            localStorage.removeItem('stickman_selectedSkin');
            localStorage.removeItem('stickman_unlockedSkins');
        } catch {}
    }
};
