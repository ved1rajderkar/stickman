export class InputHandler {
    constructor() {
        this.keysDown = new Set();
        this.justPressed = new Set();
        this.justReleased = new Set();
        this._pendingPress = new Set();
        this._pendingRelease = new Set();

        this.scrollKeys = new Set([
            'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End', 'Tab'
        ]);

        this.p1Controls = {
            left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
            lightAttack: 'KeyG', heavyAttack: 'KeyH', special: 'KeyJ',
            block: 'ShiftLeft', grab: 'KeyF'
        };

        this.p2Controls = {
            left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
            lightAttack: 'Numpad1', heavyAttack: 'Numpad2', special: 'Numpad3',
            block: 'Numpad0', grab: 'Numpad5'
        };

        this.gamepads = [null, null];

        this.mobileState = {
            left: false, right: false, up: false, down: false,
            lightAttack: false, heavyAttack: false, special: false, block: false, grab: false
        };

        this.joystickActive = false;
        this.joystickOrigin = { x: 0, y: 0 };
        this.joystickCurrent = { x: 0, y: 0 };
        this.joystickTouchId = null;
        this.joystickVector = { x: 0, y: 0 };

        window.addEventListener('keydown', (e) => this._onKeyDown(e), { passive: false });
        window.addEventListener('keyup', (e) => this._onKeyUp(e), { passive: false });
        window.addEventListener('wheel', (e) => {
            if (document.getElementById('gameCanvas')) e.preventDefault();
        }, { passive: false });
        window.addEventListener('blur', () => {
            this.keysDown.clear();
            this.justPressed.clear();
            this._pendingPress.clear();
            this._pendingRelease.clear();
            this.mobileState = { left: false, right: false, up: false, down: false, lightAttack: false, heavyAttack: false, special: false, block: false, grab: false };
        });

        this.initMobileControls();
    }

    _onKeyDown(e) {
        if (this.scrollKeys.has(e.code)) e.preventDefault();
        if (!this.keysDown.has(e.code)) this._pendingPress.add(e.code);
        this.keysDown.add(e.code);
    }

    _onKeyUp(e) {
        this.keysDown.delete(e.code);
        this._pendingRelease.add(e.code);
    }

    update() {
        this.justPressed = new Set(this._pendingPress);
        this.justReleased = new Set(this._pendingRelease);
        this._pendingPress.clear();
        this._pendingRelease.clear();
        this.pollGamepads();
    }

    pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 2; i++) this.gamepads[i] = gamepads[i];
    }

    isDown(code) { return this.keysDown.has(code); }
    wasPressed(code) { return this.justPressed.has(code); }
    wasReleased(code) { return this.justReleased.has(code); }

    getPlayerInput(playerNum) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const gamepad = this.gamepads[playerNum - 1];

        const input = {
            left: false, right: false, up: false, down: false,
            lightAttack: false, heavyAttack: false, special: false,
            block: false, grab: false
        };

        if (playerNum === 1) {
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
            input.grab = this.isDown(controls.grab) || this.mobileState.grab;
        } else {
            input.left = this.isDown(controls.left);
            input.right = this.isDown(controls.right);
            input.up = this.isDown(controls.up);
            input.down = this.isDown(controls.down);
            input.lightAttack = this.isDown(controls.lightAttack) || this.isDown('KeyU');
            input.heavyAttack = this.isDown(controls.heavyAttack) || this.isDown('KeyI');
            input.special = this.isDown(controls.special) || this.isDown('KeyO');
            input.block = this.isDown(controls.block) || this.isDown('KeyP');
            input.grab = this.isDown(controls.grab) || this.isDown('KeyL');
        }

        if (gamepad) {
            if (gamepad.axes[0] < -0.3) input.left = true;
            if (gamepad.axes[0] > 0.3) input.right = true;
            if (gamepad.axes[1] < -0.3) input.up = true;
            if (gamepad.axes[1] > 0.3) input.down = true;
            if (gamepad.buttons[0]?.pressed) input.lightAttack = true;
            if (gamepad.buttons[1]?.pressed) input.heavyAttack = true;
            if (gamepad.buttons[2]?.pressed) input.special = true;
            if (gamepad.buttons[3]?.pressed || gamepad.buttons[4]?.pressed || gamepad.buttons[6]?.pressed) input.block = true;
            if (gamepad.buttons[5]?.pressed || gamepad.buttons[7]?.pressed) input.grab = true;
        }

        return input;
    }

    isActionDown(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        if (playerNum === 1) return this.keysDown.has(keyCode) || this.mobileState[action];
        return this.keysDown.has(keyCode);
    }

    isActionPressed(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        if (playerNum === 1) return this.justPressed.has(keyCode) || this.mobileState[action];
        return this.justPressed.has(keyCode);
    }

    isPausePressed() {
        return this.wasPressed('Escape') || this.wasPressed('KeyP');
    }

    initMobileControls() {
        const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (!hasTouch) return;
        const mobileEl = document.getElementById('mobile-controls');
        if (!mobileEl) return;
        mobileEl.classList.remove('hidden');

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
                        const maxDist = 50;
                        const clampedDist = Math.min(distance, maxDist);
                        const angle = Math.atan2(dy, dx);
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

        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.mobileState[key] = true; }, { passive: false });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.mobileState[key] = false; }, { passive: false });
            btn.addEventListener('touchcancel', () => { this.mobileState[key] = false; });
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
