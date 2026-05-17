export const SKINS = [
    { id: 'cyan', name: 'Cyan', color: '#00FFFF', glow: '#00FFFF', unlockLevel: 1 },
    { id: 'green', name: 'Neon Green', color: '#00FF41', glow: '#00FF41', unlockLevel: 5 },
    { id: 'purple', name: 'Electric Purple', color: '#9D00FF', glow: '#9D00FF', unlockLevel: 10 },
    { id: 'red', name: 'Crimson', color: '#FF2D55', glow: '#FF2D55', unlockLevel: 15 },
    { id: 'gold', name: 'Gold', color: '#FFD700', glow: '#FFD700', unlockLevel: 25 },
    { id: 'orange', name: 'Blaze', color: '#FF6B35', glow: '#FF6B35', unlockLevel: 35 },
    { id: 'pink', name: 'Slash', color: '#FF69B4', glow: '#FF69B4', unlockLevel: 50 },
    { id: 'white', name: 'Ghost', color: '#F0F0F0', glow: '#F0F0F0', unlockLevel: 75 }
];

export const Economy = {
    getPerkLevel(id) { return 0; },

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

    isSkinUnlocked(color) {
        return this.getUnlockedSkins().includes(color);
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

    checkSkinUnlocks(level) {
        for (const skin of SKINS) {
            if (level >= skin.unlockLevel && !this.isSkinUnlocked(skin.color)) {
                this.unlockSkin(skin.color);
            }
        }
    },

    resetAll() {
        try {
            localStorage.removeItem('stickman_unlockedSkins');
            localStorage.removeItem('stickman_selectedSkin');
        } catch {}
    }
};
