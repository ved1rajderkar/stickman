export const GRAVITY = 0.6;
export const FRICTION_GROUND = 0.82;
export const FRICTION_AIR = 0.95;
export const FLOOR_Y = 580;
export const LEFT_WALL = 40;
export const RIGHT_WALL = 1240;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 640;

export const platforms = [
    { x: 200, y: 420, width: 180, height: 15 },
    { x: 900, y: 420, width: 180, height: 15 },
    { x: 550, y: 320, width: 180, height: 15 }
];

export function applyGravity(player) {
    player.vy += GRAVITY;
}

export function applyFriction(player) {
    const friction = player.onGround ? FRICTION_GROUND : FRICTION_AIR;
    player.vx *= friction;
}

export function resolveFloorCollision(player, floorY = FLOOR_Y) {
    if (player.y >= floorY) {
        player.y = floorY;
        player.vy = 0;
        player.onGround = true;
    }
}

export function resolveWallCollision(player) {
    if (player.x < LEFT_WALL) {
        player.x = LEFT_WALL;
        player.vx = 0;
    }
    if (player.x > RIGHT_WALL) {
        player.x = RIGHT_WALL;
        player.vx = 0;
    }
}

export function resolvePlatformCollision(player, plats = platforms) {
    for (const platform of plats) {
        if (player.vy >= 0) {
            const playerBottom = player.y;
            const prevBottom = player.y - player.vy;
            
            if (
                player.x + 20 > platform.x &&
                player.x - 20 < platform.x + platform.width &&
                playerBottom >= platform.y &&
                prevBottom <= platform.y + 5
            ) {
                player.y = platform.y;
                player.vy = 0;
                player.onGround = true;
            }
        }
    }
}

export function resolvePlayerCollision(p1, p2) {
    const dx = p2.x - p1.x;
    const distance = Math.abs(dx);
    const minDistance = 40;
    
    if (distance < minDistance) {
        const overlap = minDistance - distance;
        const pushDir = dx > 0 ? 1 : -1;
        p1.x -= overlap * 0.5 * pushDir;
        p2.x += overlap * 0.5 * pushDir;
    }
}

export function checkHitboxOverlap(boxA, boxB) {
    return (
        boxA.x < boxB.x + boxB.w &&
        boxA.x + boxA.w > boxB.x &&
        boxA.y < boxB.y + boxB.h &&
        boxA.y + boxA.h > boxB.y
    );
}

export function calculateKnockback(weapon, damage, attackerFacingDir, targetWeight = 1.0) {
    const knockback = (weapon.knockback + damage * 0.1) / targetWeight;
    return {
        vx: knockback * attackerFacingDir,
        vy: -knockback * 0.4
    };
}
