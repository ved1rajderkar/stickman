// ============================================================
// Physics Engine — PhysicsBody class + collision resolution
// All positions in pixels, velocities in px/frame, forces in px/frame²
// ============================================================
import {
    GRAVITY, MAX_FALL_SPEED, GROUND_FRICTION, AIR_DRAG,
    LEFT_WALL, RIGHT_WALL, FLOOR_Y, KILL_Y,
    RESTITUTION_GROUND, RESTITUTION_WALL,
    WALL_BOUNCE_X, WALL_BOUNCE_Y, GROUND_BOUNCE_Y,
    PLAYER_HALF_WIDTH, PLAYER_HEIGHT,
    CANVAS_WIDTH, CANVAS_HEIGHT
} from './constants.js';

// Re-export constants for convenience (used by main.js, stages.js)
export { FLOOR_Y, LEFT_WALL, RIGHT_WALL, KILL_Y, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_HALF_WIDTH, PLAYER_HEIGHT };

/**
 * PhysicsBody — a single rigid body with position, velocity, mass
 * Used for players, limbs, thrown weapons, and particles.
 */
export class PhysicsBody {
    constructor(x, y, width, height, mass = 1.0) {
        this.x = x; // center x (pixels)
        this.y = y; // center y (pixels, increases downward)
        this.vx = 0; // horizontal velocity (px/frame)
        this.vy = 0; // vertical velocity (px/frame)
        this.ax = 0; // horizontal acceleration (px/frame², reset each frame)
        this.ay = 0; // vertical acceleration
        this.mass = mass; // mass in arbitrary units (affects impulse response)
        this.width = width; // collision box width
        this.height = height; // collision box height
        this.onGround = false;
        this.friction = GROUND_FRICTION;
        this.invulnerable = false;
    }

    /**
     * Apply a continuous force (added to acceleration, integrated next update)
     * @param {number} fx — force in x (px/frame²)
     * @param {number} fy — force in y (px/frame²)
     */
    applyForce(fx, fy) {
        this.ax += fx / this.mass;
        this.ay += fy / this.mass;
    }

    /**
     * Apply an instant impulse (direct velocity change)
     * @param {number} ix — impulse in x (px/frame)
     * @param {number} iy — impulse in y (px/frame)
     */
    applyImpulse(ix, iy) {
        this.vx += ix / this.mass;
        this.vy += iy / this.mass;
    }

    /**
     * Integrate physics for one frame:
     * 1. Add gravity to vertical acceleration
     * 2. Integrate velocity → position
     * 3. Apply friction/drag
     * 4. Clamp terminal velocity
     * 5. Reset accelerations
     */
    update() {
        // Gravity
        this.ay += GRAVITY;

        // Integrate velocity
        this.vx += this.ax;
        this.vy += this.ay;

        // Terminal velocity cap
        if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;
        if (this.vy < -MAX_FALL_SPEED) this.vy = -MAX_FALL_SPEED;

        // Integrate position
        this.x += this.vx;
        this.y += this.vy;

        // Friction / drag
        if (this.onGround) {
            this.vx *= this.friction;
        } else {
            this.vx *= AIR_DRAG;
        }

        // Reset accelerations for next frame
        this.ax = 0;
        this.ay = 0;
    }

    /** AABB collision box (top-left corner) */
    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height,
            bottom: this.y
        };
    }

    /** Check overlap with another PhysicsBody */
    overlaps(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
}

/**
 * Resolve player vs floor collision.
 * Sets onGround, zeroes vy, applies restitution bounce.
 * @param {PhysicsBody} body
 * @param {number} floorY — y coordinate of floor surface
 * @returns {boolean} true if collision occurred
 */
export function resolveFloor(body, floorY = FLOOR_Y) {
    const wasAirborne = !body.onGround;
    if (body.y >= floorY) {
        body.y = floorY;
        if (body.vy > 2) {
            body.vy *= -RESTITUTION_GROUND;
            if (Math.abs(body.vy) < 0.5) body.vy = 0;
        } else {
            body.vy = 0;
        }
        body.onGround = true;
        return true;
    }
    body.onGround = false;
    return false;
}

/**
 * Resolve player vs wall boundaries.
 * Bounces with restitution, clamps position.
 * @param {PhysicsBody} body
 * @returns {object} { bounced: boolean, dir: -1|1|0 }
 */
export function resolveWalls(body) {
    let bounced = false;
    let dir = 0;
    if (body.x - body.width / 2 < LEFT_WALL) {
        body.x = LEFT_WALL + body.width / 2;
        body.vx *= WALL_BOUNCE_X;
        body.vy *= WALL_BOUNCE_Y;
        bounced = true;
        dir = 1;
    }
    if (body.x + body.width / 2 > RIGHT_WALL) {
        body.x = RIGHT_WALL - body.width / 2;
        body.vx *= WALL_BOUNCE_X;
        body.vy *= WALL_BOUNCE_Y;
        bounced = true;
        dir = -1;
    }
    return { bounced, dir };
}

/**
 * Resolve player vs platform collisions.
 * Supports solid and passthrough platforms.
 * @param {PhysicsBody} body
 * @param {Array} platforms — [{ x, y, width, height, type }]
 * @returns {boolean} true if landed on any platform
 */
export function resolvePlatforms(body, platforms) {
    let landed = false;
    for (const plat of platforms) {
        const b = body.getBounds();
        // Horizontal overlap check
        if (b.right <= plat.x || b.left >= plat.x + plat.width) continue;

        if (plat.type === 'passthrough') {
            // Only collide when falling through from above
            if (body.vy <= 0) continue;
            const prevBottom = body.y - body.vy;
            if (prevBottom > plat.y) continue; // already below
            if (b.bottom < plat.y) continue; // not yet reached
            body.y = plat.y;
            body.vy = 0;
            body.onGround = true;
            landed = true;
            // Add moving platform velocity
            if (plat.vx) body.x += plat.vx;
        } else {
            // Solid platform — one-way from top
            if (body.vy >= 0) {
                const prevBottom = body.y - body.vy;
                if (b.bottom >= plat.y && prevBottom <= plat.y + 4) {
                    body.y = plat.y;
                    if (body.vy > 2) body.vy *= -RESTITUTION_GROUND;
                    else body.vy = 0;
                    body.onGround = true;
                    landed = true;
                    if (plat.vx) body.x += plat.vx;
                }
            }
        }
    }
    return landed;
}

/**
 * Resolve overlap between two PhysicsBody objects.
 * Pushes them apart proportional to mass.
 * @param {PhysicsBody} a
 * @param {PhysicsBody} b
 */
export function resolveBodyOverlap(a, b) {
    const ab = a.getBounds();
    const bb = b.getBounds();
    const overlapX = Math.min(ab.right - bb.left, bb.right - ab.left);
    const overlapY = Math.min(ab.bottom - bb.top, bb.bottom - ab.top);
    if (overlapX <= 0 || overlapY <= 0) return;

    const totalMass = a.mass + b.mass;
    const ratioA = b.mass / totalMass;
    const ratioB = a.mass / totalMass;

    if (overlapX < overlapY) {
        const sign = (a.x < b.x) ? -1 : 1;
        a.x += overlapX * ratioA * sign;
        b.x -= overlapX * ratioB * sign;
        // Share horizontal velocity
        const avgVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
        a.vx = avgVx * 0.8;
        b.vx = avgVx * 0.8;
    } else {
        const sign = (a.y < b.y) ? -1 : 1;
        a.y += overlapY * ratioA * sign;
        b.y -= overlapY * ratioB * sign;
    }
}

/**
 * AABB overlap test for hitboxes (plain objects with x,y,w,h)
 * @param {object} a — { x, y, w, h }
 * @param {object} b — { x, y, w, h }
 * @returns {boolean}
 */
export function checkHitboxOverlap(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Generate stage platforms for a given stage type.
 * @param {string} stageId
 * @param {number} frameCount — for moving platform animation
 * @returns {Array} platform objects
 */
export function getStagePlatforms(stageId, frameCount) {
    const base = [
        { x: 150, y: 450, width: 160, height: 14, type: 'solid' },
        { x: 970, y: 450, width: 160, height: 14, type: 'solid' },
        { x: 560, y: 340, width: 160, height: 14, type: 'solid' }
    ];
    if (stageId === 'neon_city') {
        const oscX = Math.sin(frameCount * 0.015) * 80;
        base.push({ x: 400 + oscX, y: 380, width: 120, height: 12, type: 'solid', vx: Math.cos(frameCount * 0.015) * 80 * 0.015 });
    } else if (stageId === 'blood_dojo') {
        base.push({ x: 300, y: 280, width: 140, height: 12, type: 'solid' });
        base.push({ x: 840, y: 280, width: 140, height: 12, type: 'solid' });
    } else if (stageId === 'cyber_void') {
        base.push({ x: 200, y: 300, width: 100, height: 12, type: 'solid' });
        base.push({ x: 980, y: 300, width: 100, height: 12, type: 'solid' });
        base.push({ x: 590, y: 220, width: 100, height: 12, type: 'solid' });
    } else if (stageId === 'kraken_depths') {
        base.push({ x: 100, y: 350, width: 130, height: 12, type: 'solid' });
        base.push({ x: 1050, y: 350, width: 130, height: 12, type: 'solid' });
        base.push({ x: 530, y: 260, width: 220, height: 12, type: 'solid' });
    }
    return base;
}

/**
 * Resolve player vs player collision (push apart horizontally).
 * @param {object} p1 — player with x, width
 * @param {object} p2 — player with x, width
 */
export function resolvePlayerCollision(p1, p2) {
    const halfW = (p1.width || PLAYER_HALF_WIDTH * 2) / 2;
    const dist = Math.abs(p1.x - p2.x);
    const minDist = halfW + (p2.width || PLAYER_HALF_WIDTH * 2) / 2;
    if (dist < minDist) {
        const overlap = minDist - dist;
        const push = overlap / 2;
        if (p1.x < p2.x) {
            p1.x -= push;
            p2.x += push;
        } else {
            p1.x += push;
            p2.x -= push;
        }
    }
}
