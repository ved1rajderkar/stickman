export const Economy = {
    getGold() {
        return parseInt(localStorage.getItem('sm_gold') || '0');
    },

    addGold(amount) {
        const current = this.getGold();
        localStorage.setItem('sm_gold', current + amount);
        return current + amount;
    },

    spendGold(amount) {
        const current = this.getGold();
        if (current < amount) return false;
        localStorage.setItem('sm_gold', current - amount);
        return true;
    },

    getUnlocks() {
        return JSON.parse(localStorage.getItem('sm_unlocks') || '{}');
    },

    unlock(itemId) {
        const unlocks = this.getUnlocks();
        unlocks[itemId] = true;
        localStorage.setItem('sm_unlocks', JSON.stringify(unlocks));
    },

    isUnlocked(itemId) {
        return this.getUnlocks()[itemId] === true;
    },

    getHighScore() {
        return parseInt(localStorage.getItem('sm_highscore') || '0');
    },

    setHighScore(score) {
        const current = this.getHighScore();
        if (score > current) {
            localStorage.setItem('sm_highscore', score);
            return true;
        }
        return false;
    }
};

export const SHOP_ITEMS = {
    weapons: [
        { id: 'thunder_staff', name: 'Thunder Staff', price: 200, desc: 'Lightning strikes from the sky' },
        { id: 'scythe', name: 'Scythe', price: 180, desc: 'Reaper spin of death' },
        { id: 'rocket_launcher', name: 'Rocket Launcher', price: 250, desc: 'Explosive cluster rockets' },
        { id: 'dual_blades', name: 'Dual Blades', price: 220, desc: '8-hit blade storm combo' },
        { id: 'energy_gauntlets', name: 'Energy Gauntlets', price: 190, desc: '2x damage power surge' }
    ],
    stages: [
        { id: 'blood_dojo', name: 'Blood Dojo', price: 150, desc: 'Japanese dojo with red lighting' },
        { id: 'cyber_void', name: 'Cyber Void', price: 300, desc: 'Matrix-style void arena' }
    ]
};

export function showRewardedAd(rewardCallback) {
    console.log('[AD STUB] Rewarded ad shown');
    setTimeout(() => rewardCallback(), 1000);
}
