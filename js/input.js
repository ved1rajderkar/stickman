export class InputHandler {
    constructor() {
        this.keysDown = new Set();
        this.wasJustPressed = new Set();
        this.previousKeys = new Set();
        
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.keysDown.has(e.code)) {
                this.wasJustPressed.add(e.code);
            }
            this.keysDown.add(e.code);
            e.preventDefault();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keysDown.delete(e.code);
            e.preventDefault();
        });
    }
    
    isDown(key) {
        return this.keysDown.has(key);
    }
    
    update() {
        this.pollGamepads();
        this.previousKeys = new Set(this.keysDown);
        this.wasJustPressed.clear();
    }
    
    pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 2; i++) {
            this.gamepads[i] = gamepads[i];
        }
    }
    
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
        
        input.left = this.keysDown.has(controls.left);
        input.right = this.keysDown.has(controls.right);
        input.up = this.keysDown.has(controls.up);
        input.down = this.keysDown.has(controls.down);
        input.lightAttack = this.keysDown.has(controls.lightAttack);
        input.heavyAttack = this.keysDown.has(controls.heavyAttack);
        input.special = this.keysDown.has(controls.special);
        input.block = this.keysDown.has(controls.block);
        
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
    
    wasActionJustPressed(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        return this.wasJustPressed.has(keyCode);
    }
    
    isActionDown(playerNum, action) {
        const controls = playerNum === 1 ? this.p1Controls : this.p2Controls;
        const keyCode = controls[action];
        return this.keysDown.has(keyCode);
    }
}
