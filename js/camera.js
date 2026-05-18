// ============================================================
// Camera System — tracks midpoint between players with lerp,
// dynamic zoom, and screen shake.
// ============================================================
import { CANVAS_WIDTH, CANVAS_HEIGHT, CAM_LERP, CAM_ZOOM_MIN, CAM_ZOOM_MAX, CAM_ZOOM_RANGE } from './constants.js';

export class Camera {
    constructor() {
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.enabled = true;
    }

    /**
     * Update camera target to midpoint between two players.
     * @param {object} p1 — { x, y }
     * @param {object} p2 — { x, y }
     */
    trackPlayers(p1, p2) {
        if (!p1 || !p2) return;
        this.targetX = (p1.x + p2.x) / 2;
        this.targetY = (p1.y + p2.y) / 2 - 40;

        // Dynamic zoom: zoom out when players are far apart
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        const zoomRatio = Math.min(1, dist / CAM_ZOOM_RANGE);
        this.targetZoom = CAM_ZOOM_MAX - zoomRatio * (CAM_ZOOM_MAX - CAM_ZOOM_MIN);
    }

    /** Apply lerp smoothing to position and zoom */
    update() {
        this.x += (this.targetX - this.x) * CAM_LERP;
        this.y += (this.targetY - this.y) * CAM_LERP;
        this.zoom += (this.targetZoom - this.zoom) * CAM_LERP;

        // Screen shake decay
        if (this.shakeDuration > 0) {
            const decay = (this.shakeDuration / 30) ** 2;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay * 2;
            this.shakeDuration--;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    /**
     * Trigger screen shake.
     * @param {number} intensity — max offset in pixels
     * @param {number} duration — frames
     */
    shake(intensity, duration) {
        if (!this.enabled) return;
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /** Apply camera transform to canvas context */
    apply(ctx) {
        const offsetX = CANVAS_WIDTH / 2 - this.x * this.zoom + this.shakeX;
        const offsetY = CANVAS_HEIGHT / 2 - this.y * this.zoom + this.shakeY;
        ctx.translate(offsetX, offsetY);
        ctx.scale(this.zoom, this.zoom);
    }

    /** Convert world coordinates to screen coordinates */
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + CANVAS_WIDTH / 2 + this.shakeX,
            y: (wy - this.y) * this.zoom + CANVAS_HEIGHT / 2 + this.shakeY
        };
    }
}
