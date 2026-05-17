/**
 * InputHandler — Commercial-grade input system
 * Pillar 1: Input Interception & Virtual Joystick Layout
 *
 * Features:
 * - Browser scroll blocking for all structural gaming keys
 * - Physical key code tracking (event.code) for international keyboard support
 * - Virtual thumb-stick + action buttons for mobile touch devices
 * - Gamepad API polling with deadzone handling
 * - Frame-accurate justPressed/justReleased state tracking
 */
export class InputHandler {
    constructor() {
        // Physical key codes currently held down
        this.keysDown = new Set();
        // Keys pressed THIS frame only (cleared next frame)
        this.justPressed = new Set();
        // Keys released THIS frame only
        this.justReleased = new Set();
        // Pending state changes resolved during update()
        this._pendingPress = new Set();
        this._pendingRelease = new Set();

        // Keys that trigger browser page scrolling — MUST be intercepted
        this.scrollKeys = new Set([
            'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End', 'Tab'
        ]);

        // Player 1 desktop controls (physical positions — works on AZERTY/QWERTZ/Dvorak)
        this.p1Controls = {
            left: 'KeyA',
            right: 'KeyD',
            up: 'KeyW',
            down: 'KeyS',
            lightAttack: 'KeyG',
            heavyAttack: 'KeyH',
            special: 'KeyJ',
            block: 'KeyK'
        };

        // Player 2 desktop controls
        this.p2Controls = {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            up: 'ArrowUp',
            down: 'ArrowDown',
            lightAttack: 'Numpad1',
            heavyAttack: 'Numpad2',
            special: 'Numpad3',
            block: 'Numpad4'
        };

        // Gamepad state cache
        this.gamepads = [null, null];

        // Mobile touch state — merged with keyboard state during getPlayerInput()
        this.mobileState = {
            left: false, right: false, up: false, down: false,
            lightAttack: false, heavyAttack: false, special: false, block: false
        };

        // Virtual joystick tracking
        this.joystickActive = false;
        this.joystickOrigin = { x: 0, y: 0 };
        this.joystickCurrent = { x: 0, y: 0 };
        this.joystickTouchId = null;
        this.joystickVector = { x: 0, y: 0 }; // Normalized -1 to 1

        // Bind native event listeners with passive:false for preventDefault()
        window.addEventListener('keydown', (e) => this._onKeyDown(e), { passive: false });
        window.addEventListener('keyup', (e) => this._onKeyUp(e), { passive: false });

        // Prevent mouse wheel scrolling during gameplay
        window.addEventListener('wheel', (e) => {
            if (document.getElementById('gameCanvas')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Blur handler — clear all keys when tab loses focus (prevents stuck movement)
        window.addEventListener('blur', () => {
            this.keysDown.clear();
            this.justPressed.clear();
            this._pendingPress.clear();
            this._pendingRelease.clear();
            this.mobileState = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false };
        });

        // Initialize mobile touch HUD if device supports touch
        this.initMobileControls();
    }

    /**
     * KEY DOWN — Intercept scroll keys, track physical codes
     */
    _onKeyDown(e) {
        // CRITICAL: Block browser scroll for ALL structural gaming keys
        if (this.scrollKeys.has(e.code)) {
            e.preventDefault();
        }
        // Track first press of each key for justPressed detection
        if (!this.keysDown.has(e.code)) {
            this._pendingPress.add(e.code);
        }
        this.keysDown.add(e.code);
    }

    /**
     * KEY UP — Track release for frame-accurate justReleased detection
     */
    _onKeyUp(e) {
        this.keysDown.delete(e.code);
        this._pendingRelease.add(e.code);
    }

    /**
     * UPDATE — Called once per frame at the START of the game loop.
     * Resolves pending press/release events into justPressed/justReleased sets.
     */
    update() {
        this.justPressed = new Set(this._pendingPress);
        this.justReleased = new Set(this._pendingRelease);
        this._pendingPress.clear();
        this._pendingRelease.clear();
        this.pollGamepads();
    }

    /**
     * Poll navigator.getGamepads() and cache for this frame
     */
    pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 2; i++) {
            this.gamepads[i] = gamepads[i];
        }
    }

    /**
     * Check if a physical key code is currently held down
     */
    isDown(code) { return this.keysDown.has(code); }

    /**
     * Check if a key was pressed THIS frame only (single-frame pulse)
     */
    wasPressed(code) { return this.justPressed.has(code); }

    /**
     * Check if a key was released THIS frame only
     */
    wasReleased(code) { return this.justReleased.has(code); }

    /**
     * Get merged input state for a player (keyboard + mobile + gamepad)
     * @param {number} playerNum — 1 or 2
     * @returns {object} InputState with boolean flags
     */
    getPlayerInput(playerNum) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const gamepad = this.gamepads[playerNum - 1];

        const input = {
            left: false, right: false, up: false, down: false,
            lightAttack: false, heavyAttack: false, special: false, block: false
        };

        // Player 1: merge keyboard + mobile touch
        if (playerNum === 1) {
            // Use joystick vector for movement if active
            if (this.joystickActive) {
                if (this.joystickVector.x < -0.3) input.left = true;
                if (this.joystickVector.x > 0.3) input.right = true;
                if (this.joystickVector.y < -0.3) input.up = true;
                if (this.joystickVector.y > 0.3) input.down = true;
            } else {
                input.left = this.isDown(controls.left) || this.mobileState.left;
                input.right = this.isDown(controls.right) || this.mobileState.right;
                input.up = this.isDown(controls.up) || this.mobileState.up;
                input.down = this.isDown(controls.down) || this.mobileState.down;
            }
            input.lightAttack = this.isDown(controls.lightAttack) || this.mobileState.lightAttack;
            input.heavyAttack = this.isDown(controls.heavyAttack) || this.mobileState.heavyAttack;
            input.special = this.isDown(controls.special) || this.mobileState.special;
            input.block = this.isDown(controls.block) || this.mobileState.block;
        } else {
            // Player 2: keyboard only (+ alternate key bindings)
            input.left = this.isDown(controls.left);
            input.right = this.isDown(controls.right);
            input.up = this.isDown(controls.up);
            input.down = this.isDown(controls.down);
            input.lightAttack = this.isDown(controls.lightAttack) || this.isDown('KeyU');
            input.heavyAttack = this.isDown(controls.heavyAttack) || this.isDown('KeyI');
            input.special = this.isDown(controls.special) || this.isDown('KeyO');
            input.block = this.isDown(controls.block) || this.isDown('KeyP');
        }

        // Gamepad input (standard mapping — works with Xbox/PlayStation controllers)
        if (gamepad) {
            // Left stick with deadzone
            if (gamepad.axes[0] < -0.3) input.left = true;
            if (gamepad.axes[0] > 0.3) input.right = true;
            if (gamepad.axes[1] < -0.3) input.up = true;
            if (gamepad.axes[1] > 0.3) input.down = true;
            // Buttons: A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7
            if (gamepad.buttons[0]?.pressed) input.lightAttack = true;
            if (gamepad.buttons[1]?.pressed) input.heavyAttack = true;
            if (gamepad.buttons[2]?.pressed) input.special = true;
            if (gamepad.buttons[3]?.pressed || gamepad.buttons[4]?.pressed || gamepad.buttons[6]?.pressed) input.block = true;
        }

        return input;
    }

    /**
     * Check if a specific action is currently active for a player
     */
    isActionDown(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        if (playerNum === 1) {
            return this.keysDown.has(keyCode) || this.mobileState[action];
        }
        return this.keysDown.has(keyCode);
    }

    /**
     * Pause toggle — works on Escape or P key
     */
    isPausePressed() {
        return this.wasPressed('Escape') || this.wasPressed('KeyP');
    }

    /**
     * MOBILE TOUCH HUD — Virtual joystick + action buttons
     * Detects touch capability and creates interactive overlay elements
     */
    initMobileControls() {
        const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (!hasTouch) return;

        const mobileEl = document.getElementById('mobile-controls');
        if (!mobileEl) return;
        mobileEl.classList.remove('hidden');

        // ── Virtual Joystick (bottom-left) ──────────────────────────────
        // Track touch origin, calculate normalized direction vector
        const dpadZone = document.getElementById('dpad-zone');
        if (dpadZone) {
            dpadZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                this.joystickTouchId = touch.identifier;
                this.joystickActive = true;
                this.joystickOrigin = { x: touch.clientX, y: touch.clientY };
                this.joystickCurrent = { x: touch.clientX, y: touch.clientY };
                this.joystickVector = { x: 0, y: 0 };
            }, { passive: false });

            dpadZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.joystickTouchId) {
                        this.joystickCurrent = { x: touch.clientX, y: touch.clientY };
                        const dx = this.joystickCurrent.x - this.joystickOrigin.x;
                        const dy = this.joystickCurrent.y - this.joystickOrigin.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const maxDist = 50; // Joystick radius
                        const clampedDist = Math.min(distance, maxDist);
                        const angle = Math.atan2(dy, dx);
                        // Normalize to -1..1 range
                        this.joystickVector.x = (Math.cos(angle) * clampedDist) / maxDist;
                        this.joystickVector.y = (Math.sin(angle) * clampedDist) / maxDist;
                    }
                }
            }, { passive: false });

            dpadZone.addEventListener('touchend', (e) => {
                for (const touch of e.changedTouches) {
                    if (touch.identifier === this.joystickTouchId) {
                        this.joystickActive = false;
                        this.joystickTouchId = null;
                        this.joystickVector = { x: 0, y: 0 };
                    }
                }
            });

            dpadZone.addEventListener('touchcancel', () => {
                this.joystickActive = false;
                this.joystickTouchId = null;
                this.joystickVector = { x: 0, y: 0 };
            });
        }

        // ── Action Buttons (bottom-right) ───────────────────────────────
        // Each button maps to a game action via touchstart/touchend
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mobileState[key] = true;
            }, { passive: false });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.mobileState[key] = false;
            }, { passive: false });
            btn.addEventListener('touchcancel', () => {
                this.mobileState[key] = false;
            });
        };

        bindBtn('m-left', 'left');
        bindBtn('m-right', 'right');
        bindBtn('m-jump', 'up');
        bindBtn('m-down', 'down');
        bindBtn('m-light', 'lightAttack');
        bindBtn('m-heavy', 'heavyAttack');
        bindBtn('m-special', 'special');
        bindBtn('m-block', 'block');
    }
}
