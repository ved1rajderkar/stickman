/**
 * Economy — Persistent roguelite progression system
 * Pillar 2: Roguelite Loop & Local Storage Metrics State
 *
 * Tracks: gold, unlocked weapons (17 ids across 3 rarity pools),
 * skin variants, perk upgrades, high-wave streaks.
 * All data persists via window.localStorage with error catching.
 */

// ── Weapon Pool Definitions — 17 weapons across 3 rarities ──────────────
export const WEAPON_POOLS = {
    COMMON: [
        { id: 'fists', name: 'Fists', price: 0, desc: 'Always available', damage: 8, unlocked: true },
        { id: 'katana', name: 'Katana', price: 0, desc: 'Swift blade strikes', damage: 20, unlocked: true },
        { id: 'baseball_bat', name: 'Baseball Bat', price: 0, desc: 'Heavy wooden knockback', damage: 22, unlocked: true },
        { id: 'pistol', name: 'Pistol', price: 0, desc: '8 rounds of ranged fire', damage: 15, unlocked: true },
        { id: 'shotgun', name: 'Shotgun', price: 50, desc: '8-pellet spread blast', damage: 48, unlocked: false },
        { id: 'nunchucks', name: 'Nunchucks', price: 75, desc: 'Rapid 2-hit combos', damage: 12, unlocked: false },
        { id: 'spear', name: 'Spear', price: 60, desc: 'Long reach thrusts', damage: 18, unlocked: false }
    ],
    RARE: [
        { id: 'battle_axe', name: 'Battle Axe', price: 120, desc: 'Ground slam shockwaves', damage: 28, unlocked: false },
        { id: 'kunai', name: 'Kunai x3', price: 100, desc: 'Throwing star bursts', damage: 15, unlocked: false },
        { id: 'grenade', name: 'Grenade', price: 130, desc: 'Bouncing explosive arcs', damage: 60, unlocked: false },
        { id: 'flamethrower', name: 'Flamethrower', price: 150, desc: 'Continuous burn cone', damage: 5, unlocked: false },
        { id: 'sniper_rifle', name: 'Sniper Rifle', price: 140, desc: 'Penetrating headshots', damage: 70, unlocked: false },
        { id: 'dual_blades', name: 'Dual Blades', price: 220, desc: '8-hit blade storm', damage: 12, unlocked: false },
        { id: 'energy_gauntlets', name: 'Energy Gauntlets', price: 190, desc: '2x damage power surge', damage: 25, unlocked: false }
    ],
    MYTHIC: [
        { id: 'thunder_staff', name: 'Thunder Staff', price: 200, desc: 'Lightning storm call', damage: 22, unlocked: false },
        { id: 'scythe', name: 'Scythe', price: 180, desc: 'Reaper 360° spin', damage: 25, unlocked: false },
        { id: 'rocket_launcher', name: 'Rocket Launcher', price: 250, desc: 'Cluster rocket splits', damage: 80, unlocked: false },
        { id: 'shadow_katana', name: 'Shadow Katana', price: 300, desc: 'Teleport slash phantom', damage: 35, unlocked: false },
        { id: 'void_cannon', name: 'Void Cannon', price: 350, desc: 'Black hole implosion', damage: 100, unlocked: false }
    ]
};

// ── Perk Definitions — Permanent stat upgrades purchasable with gold ───
export const PERKS = {
    lifesteal: { id: 'lifesteal', name: 'Lifesteal', maxLevel: 5, baseCost: 100, desc: 'Heal % of damage dealt' },
    movement_speed: { id: 'movement_speed', name: 'Speed Boost', maxLevel: 5, baseCost: 80, desc: '+10% movement per level' },
    damage_boost: { id: 'damage_boost', name: 'Power Strike', maxLevel: 5, baseCost: 120, desc: '+15% damage per level' },
    max_hp: { id: 'max_hp', name: 'Vitality', maxLevel: 5, baseCost: 90, desc: '+20 max HP per level' },
    special_charge: { id: 'special_charge', name: 'Special Charge', maxLevel: 3, baseCost: 150, desc: '+25% special meter gain' }
};

// ── Skin Variants — Cosmetic color unlocks ──────────────────────────────
export const SKINS = [
    { id: 'crimson', name: 'Crimson', color: '#FF2D55', glow: '#FF2D55', price: 0, unlocked: true },
    { id: 'cobalt', name: 'Cobalt', color: '#00B8FF', glow: '#00B8FF', price: 0, unlocked: true },
    { id: 'venom', name: 'Venom', color: '#00FF41', glow: '#00FF41', price: 50, unlocked: false },
    { id: 'blaze', name: 'Blaze', color: '#FFD60A', glow: '#FFD60A', price: 50, unlocked: false },
    { id: 'phantom', name: 'Phantom', color: '#B537F2', glow: '#B537F2', price: 75, unlocked: false },
    { id: 'inferno', name: 'Inferno', color: '#FF6B35', glow: '#FF6B35', price: 75, unlocked: false },
    { id: 'ghost', name: 'Ghost', color: '#F0F0F0', glow: '#F0F0F0', price: 100, unlocked: false },
    { id: 'slash', name: 'Slash', color: '#FF69B4', glow: '#FF69B4', price: 100, unlocked: false }
];

export const Economy = {
    /**
     * Get current gold balance
     */
    getGold() {
        try {
            return parseInt(localStorage.getItem('sm_gold') || '0');
        } catch { return 0; }
    },

    /**
     * Add gold to balance and persist
     */
    addGold(amount) {
        try {
            const current = this.getGold();
            localStorage.setItem('sm_gold', current + amount);
            return current + amount;
        } catch { return this.getGold(); }
    },

    /**
     * Spend gold — returns true if successful, false if insufficient
     */
    spendGold(amount) {
        try {
            const current = this.getGold();
            if (current < amount) return false;
            localStorage.setItem('sm_gold', current - amount);
            return true;
        } catch { return false; }
    },

    /**
     * Get unlocked weapon IDs set
     */
    getUnlockedWeapons() {
        try {
            return JSON.parse(localStorage.getItem('sm_weapons') || '{"fists":true,"katana":true,"baseball_bat":true,"pistol":true}');
        } catch { return { fists: true, katana: true, baseball_bat: true, pistol: true }; }
    },

    /**
     * Unlock a weapon by ID
     */
    unlockWeapon(weaponId) {
        try {
            const weapons = this.getUnlockedWeapons();
            weapons[weaponId] = true;
            localStorage.setItem('sm_weapons', JSON.stringify(weapons));
        } catch {}
    },

    /**
     * Check if a weapon is unlocked
     */
    isWeaponUnlocked(weaponId) {
        return this.getUnlockedWeapons()[weaponId] === true;
    },

    /**
     * Get unlocked skin IDs
     */
    getUnlockedSkins() {
        try {
            return JSON.parse(localStorage.getItem('sm_skins') || '{"crimson":true,"cobalt":true}');
        } catch { return { crimson: true, cobalt: true }; }
    },

    /**
     * Unlock a skin by ID
     */
    unlockSkin(skinId) {
        try {
            const skins = this.getUnlockedSkins();
            skins[skinId] = true;
            localStorage.setItem('sm_skins', JSON.stringify(skins));
        } catch {}
    },

    /**
     * Check if a skin is unlocked
     */
    isSkinUnlocked(skinId) {
        return this.getUnlockedSkins()[skinId] === true;
    },

    /**
     * Get perk levels map { perkId: level }
     */
    getPerkLevels() {
        try {
            return JSON.parse(localStorage.getItem('sm_perks') || '{}');
        } catch { return {}; }
    },

    /**
     * Upgrade a perk by one level — returns new level or -1 if maxed/can't afford
     */
    upgradePerk(perkId) {
        try {
            const perk = PERKS[perkId];
            if (!perk) return -1;
            const levels = this.getPerkLevels();
            const currentLevel = levels[perkId] || 0;
            if (currentLevel >= perk.maxLevel) return -1;
            const cost = perk.baseCost * (currentLevel + 1);
            if (!this.spendGold(cost)) return -1;
            levels[perkId] = currentLevel + 1;
            localStorage.setItem('sm_perks', JSON.stringify(levels));
            return currentLevel + 1;
        } catch { return -1; }
    },

    /**
     * Get perk level for a specific perk
     */
    getPerkLevel(perkId) {
        return this.getPerkLevels()[perkId] || 0;
    },

    /**
     * Get high score (best survival wave)
     */
    getHighScore() {
        try {
            return parseInt(localStorage.getItem('sm_highscore') || '0');
        } catch { return 0; }
    },

    /**
     * Set high score if new score is higher — returns true if record broken
     */
    setHighScore(score) {
        try {
            const current = this.getHighScore();
            if (score > current) {
                localStorage.setItem('sm_highscore', score);
                return true;
            }
            return false;
        } catch { return false; }
    },

    /**
     * Get total matches played
     */
    getMatchesPlayed() {
        try {
            return parseInt(localStorage.getItem('sm_matches') || '0');
        } catch { return 0; }
    },

    /**
     * Increment matches played counter
     */
    incrementMatches() {
        try {
            const current = this.getMatchesPlayed();
            localStorage.setItem('sm_matches', current + 1);
        } catch {}
    },

    /**
     * Get all unlocked stages
     */
    getUnlockedStages() {
        try {
            return JSON.parse(localStorage.getItem('sm_stages') || '{"neon_city":true}');
        } catch { return { neon_city: true }; }
    },

    /**
     * Unlock a stage
     */
    unlockStage(stageId) {
        try {
            const stages = this.getUnlockedStages();
            stages[stageId] = true;
            localStorage.setItem('sm_stages', JSON.stringify(stages));
        } catch {}
    },

    /**
     * Check if stage is unlocked
     */
    isStageUnlocked(stageId) {
        return this.getUnlockedStages()[stageId] === true;
    },

    /**
     * Get total gold earned (lifetime, not current balance)
     */
    getTotalGoldEarned() {
        try {
            return parseInt(localStorage.getItem('sm_total_gold') || '0');
        } catch { return 0; }
    },

    /**
     * Add to lifetime gold total
     */
    addTotalGold(amount) {
        try {
            const current = this.getTotalGoldEarned();
            localStorage.setItem('sm_total_gold', current + amount);
        } catch {}
    },

    /**
     * Full save — serialize all state at once (called on game exit)
     */
    fullSave(data) {
        try {
            localStorage.setItem('sm_save', JSON.stringify(data));
        } catch {}
    },

    /**
     * Full load — deserialize all state (called on game init)
     */
    fullLoad() {
        try {
            return JSON.parse(localStorage.getItem('sm_save') || 'null');
        } catch { return null; }
    },

    /**
     * Reset ALL progress (for testing)
     */
    resetAll() {
        try {
            localStorage.removeItem('sm_gold');
            localStorage.removeItem('sm_weapons');
            localStorage.removeItem('sm_skins');
            localStorage.removeItem('sm_perks');
            localStorage.removeItem('sm_highscore');
            localStorage.removeItem('sm_matches');
            localStorage.removeItem('sm_stages');
            localStorage.removeItem('sm_total_gold');
            localStorage.removeItem('sm_save');
        } catch {}
    }
};

/**
 * Rewarded ad hook — wraps CrazyGames SDK or falls back to stub
 */
export function showRewardedAd(rewardCallback) {
    try {
        if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
            window.CrazyGames.SDK.ad.requestAd('rewarded', {
                adFinished: () => {
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStart();
                    }
                    rewardCallback();
                },
                adError: () => {
                    console.warn('[AD] Rewarded ad failed, granting reward anyway');
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStart();
                    }
                    rewardCallback();
                },
                adStarted: () => {
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStop();
                    }
                }
            });
        } else {
            // Stub for local testing without SDK
            console.log('[AD STUB] Rewarded ad shown');
            setTimeout(() => rewardCallback(), 1000);
        }
    } catch (e) {
        console.error('[AD] Error showing rewarded ad:', e);
        setTimeout(() => rewardCallback(), 1000);
    }
}

/**
 * Interstitial ad hook
 */
export function showInterstitialAd(callback) {
    try {
        if (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.ad) {
            window.CrazyGames.SDK.ad.requestAd('midgame', {
                adFinished: () => {
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStart();
                    }
                    if (callback) callback();
                },
                adError: () => {
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStart();
                    }
                    if (callback) callback();
                },
                adStarted: () => {
                    if (window.CrazyGames && window.CrazyGames.SDK.game) {
                        window.CrazyGames.SDK.game.gameplayStop();
                    }
                }
            });
        } else {
            console.log('[AD STUB] Interstitial ad shown');
            setTimeout(() => { if (callback) callback(); }, 1000);
        }
    } catch (e) {
        console.error('[AD] Error showing interstitial ad:', e);
        if (callback) callback();
    }
}
