export const GRAVITY = 0.55;
export const GRAVITY_HOLD_REDUCTION = 0.45;
export const MAX_FALL_SPEED = 18;
export const ACCELERATION = 0.85;
export const DECELERATION = 0.78;
export const AIR_ACCELERATION = 0.45;
export const FRICTION_GROUND = 0.82;
export const FRICTION_AIR = 0.97;
export const WALL_SLIDE_SPEED = 2.0;
export const WALL_JUMP_FORCE_X = 10;
export const WALL_JUMP_FORCE_Y = -13;
export const FLOOR_Y = 580;
export const LEFT_WALL = 40;
export const RIGHT_WALL = 1240;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 640;
export const KNOCKBACK_DAMAGE_SCALING = 0.018;
export const KNOCKBACK_BASE = 1.0;
export const HITSTUN_PER_DAMAGE = 0.6;
export const MIN_HITSTUN = 8;
export const MAX_HITSTUN = 45;

export function getStagePlatforms(stageId, frameCount) {
    const base = [
        { x: 150, y: 450, width: 160, height: 14, type: 'solid' },
        { x: 970, y: 450, width: 160, height: 14, type: 'solid' },
        { x: 560, y: 340, width: 160, height: 14, type: 'solid' }
    ];

    if (stageId === 'neon_city') {
        const oscX = Math.sin(frameCount * 0.015) * 80;
        base.push({ x: 400 + oscX, y: 380, width: 120, height: 12, type: 'moving' });
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

export function applyGravity(player) {
    const jumpHeld = player.jumpHeld && player.vy < 0;
    const grav = jumpHeld ? GRAVITY * GRAVITY_HOLD_REDUCTION : GRAVITY;
    player.vy += grav;
    if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
}

export function applyHorizontalMovement(player, input) {
    if (input.left) {
        if (player.vx > 0) {
            player.vx -= DECELERATION;
            if (player.vx < 0) player.vx = 0;
        } else {
            player.vx -= player.onGround ? ACCELERATION : AIR_ACCELERATION;
        }
    } else if (input.right) {
        if (player.vx < 0) {
            player.vx += DECELERATION;
            if (player.vx > 0) player.vx = 0;
        } else {
            player.vx += player.onGround ? ACCELERATION : AIR_ACCELERATION;
        }
    } else {
        player.vx *= player.onGround ? FRICTION_GROUND : FRICTION_AIR;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    const maxSpeed = player.speed || 5;
    if (player.vx > maxSpeed) player.vx = maxSpeed;
    if (player.vx < -maxSpeed) player.vx = -maxSpeed;
}

export function applyFriction(player) {
    const friction = player.onGround ? FRICTION_GROUND : FRICTION_AIR;
    player.vx *= friction;
}

export function handleWallSlide(player) {
    if (!player.onGround && player.vy > 0) {
        const atLeftWall = player.x <= LEFT_WALL + 5;
        const atRightWall = player.x >= RIGHT_WALL - 5;
        if ((atLeftWall && player.vx < 0) || (atRightWall && player.vx > 0)) {
            player.wallSliding = true;
            player.wallSlideDir = atLeftWall ? -1 : 1;
            if (player.vy > WALL_SLIDE_SPEED) player.vy = WALL_SLIDE_SPEED;
            return true;
        }
    }
    player.wallSliding = false;
    player.wallSlideDir = 0;
    return false;
}

export function tryWallJump(player) {
    if (player.wallSliding) {
        player.vx = -player.wallSlideDir * WALL_JUMP_FORCE_X;
        player.vy = WALL_JUMP_FORCE_Y;
        player.onGround = false;
        player.wallSliding = false;
        player.wallJumpCooldown = 10;
        return true;
    }
    return false;
}

export function resolveFloorCollision(player, floorY = FLOOR_Y) {
    const wasAirborne = !player.onGround;
    if (player.y >= floorY) {
        player.y = floorY;
        if (player.vy > 3 && wasAirborne) {
            player.justLanded = true;
            player.landingImpact = player.vy;
        }
        player.vy = 0;
        player.onGround = true;
        player.wallSliding = false;
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

export function resolvePlatformCollision(player, plats) {
    for (const platform of plats) {
        if (platform.type === 'hazard') continue;
        if (player.vy >= 0) {
            const playerBottom = player.y;
            const prevBottom = player.y - player.vy;
            if (
                player.x + 18 > platform.x &&
                player.x - 18 < platform.x + platform.width &&
                playerBottom >= platform.y &&
                prevBottom <= platform.y + 8
            ) {
                const wasAirborne = !player.onGround;
                player.y = platform.y;
                if (player.vy > 3 && wasAirborne) {
                    player.justLanded = true;
                    player.landingImpact = player.vy;
                }
                player.vy = 0;
                player.onGround = true;
                player.wallSliding = false;
                if (platform.type === 'moving' && platform.vx) {
                    player.x += platform.vx;
                }
            }
        }
    }
}

export function resolvePlayerCollision(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = 36;
    if (distance < minDistance && distance > 0) {
        const overlap = minDistance - distance;
        const pushDirX = dx / distance;
        const pushDirY = dy / distance;
        p1.x -= overlap * 0.5 * pushDirX;
        p2.x += overlap * 0.5 * pushDirX;
        if (Math.abs(dy) < 30) {
            p1.y -= overlap * 0.25 * pushDirY;
            p2.y += overlap * 0.25 * pushDirY;
        }
    }
}

export function checkHitboxOverlap(boxA, boxB) {
    if (!boxA || !boxB) return false;
    return (
        boxA.x < boxB.x + boxB.w &&
        boxA.x + boxA.w > boxB.x &&
        boxA.y < boxB.y + boxB.h &&
        boxA.y + boxA.h > boxB.y
    );
}

export function calculateKnockback(damagePercent, baseKnockbackX, baseKnockbackY, attackerDir, targetWeight = 1.0, isHeavy = false) {
    const scaling = 1 + (damagePercent * KNOCKBACK_DAMAGE_SCALING);
    const heavyMult = isHeavy ? 1.6 : 1.0;
    const kb = (KNOCKBACK_BASE + baseKnockbackX * scaling * heavyMult) / targetWeight;
    const kbY = -(baseKnockbackY * scaling * heavyMult * 0.5 + 2);
    return {
        vx: kb * attackerDir,
        vy: kbY
    };
}

export function calculateHitstun(damage) {
    const stun = Math.round(damage * HITSTUN_PER_DAMAGE);
    return Math.max(MIN_HITSTUN, Math.min(MAX_HITSTUN, stun));
}
