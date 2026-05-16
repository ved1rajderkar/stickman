export class InputHandler {
    constructor() {
        this.keysDown = new Set();
        this.justPressed = new Set();
        this.justReleased = new Set();
        this._pendingPress = new Set();
        this._pendingRelease = new Set();

        this.scrollKeys = new Set([
            'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End'
        ]);

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

        this.gamepads = [null, null];

        this.mobileState = {
            left: false, right: false, up: false, down: false,
            lightAttack: false, heavyAttack: false, special: false, block: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.scrollKeys.has(e.code)) {
                e.preventDefault();
            }
            if (!this.keysDown.has(e.code)) {
                this._pendingPress.add(e.code);
            }
            this.keysDown.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keysDown.delete(e.code);
            this._pendingRelease.add(e.code);
        });

        window.addEventListener('blur', () => {
            this.keysDown.clear();
            this.justPressed.clear();
            this._pendingPress.clear();
        });

        this.initMobileControls();
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
        for (let i = 0; i < 2; i++) {
            this.gamepads[i] = gamepads[i];
        }
    }

    isDown(code) { return this.keysDown.has(code); }
    wasPressed(code) { return this.justPressed.has(code); }
    wasReleased(code) { return this.justReleased.has(code); }

    getPlayerInput(playerNum) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const gamepad = this.gamepads[playerNum - 1];

        const input = {
            left: false,
            right: false,
            up: false,
            down: false,
            lightAttack: false,
            heavyAttack: false,
            special: false,
            block: false
        };

        if (playerNum === 1) {
            input.left = this.isDown(controls.left) || this.mobileState.left;
            input.right = this.isDown(controls.right) || this.mobileState.right;
            input.up = this.isDown(controls.up) || this.mobileState.up;
            input.down = this.isDown(controls.down) || this.mobileState.down;
            input.lightAttack = this.isDown(controls.lightAttack) || this.mobileState.lightAttack;
            input.heavyAttack = this.isDown(controls.heavyAttack) || this.mobileState.heavyAttack;
            input.special = this.isDown(controls.special) || this.mobileState.special;
            input.block = this.isDown(controls.block) || this.mobileState.block;
        } else {
            input.left = this.isDown(controls.left);
            input.right = this.isDown(controls.right);
            input.up = this.isDown(controls.up);
            input.down = this.isDown(controls.down);
            input.lightAttack = this.isDown(controls.lightAttack) || this.isDown('KeyU');
            input.heavyAttack = this.isDown(controls.heavyAttack) || this.isDown('KeyI');
            input.special = this.isDown(controls.special) || this.isDown('KeyO');
            input.block = this.isDown(controls.block) || this.isDown('KeyP');
        }

        if (gamepad) {
            if (gamepad.axes[0] < -0.5) input.left = true;
            if (gamepad.axes[0] > 0.5) input.right = true;
            if (gamepad.axes[1] < -0.5) input.up = true;
            if (gamepad.axes[1] > 0.5) input.down = true;
            if (gamepad.buttons[0]?.pressed) input.lightAttack = true;
            if (gamepad.buttons[1]?.pressed) input.heavyAttack = true;
            if (gamepad.buttons[2]?.pressed) input.special = true;
            if (gamepad.buttons[3]?.pressed || gamepad.buttons[5]?.pressed || gamepad.buttons[7]?.pressed) input.block = true;
        }

        return input;
    }

    isActionDown(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        if (playerNum === 1) {
            return this.keysDown.has(keyCode) || this.mobileState[action];
        }
        return this.keysDown.has(keyCode);
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
            btn.addEventListener('touchcancel', (e) => {
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
