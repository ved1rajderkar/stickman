// ============================================================
// Physics Constants — all tunable values in one place
// Units: pixels, frames (at 60fps), or dimensionless ratios
// ============================================================

// Canvas dimensions
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 640;

// World boundaries (pixels from canvas edges)
export const LEFT_WALL = 40;
export const RIGHT_WALL = 1240;
export const FLOOR_Y = 580;
export const KILL_Y = 750; // below this = ring-out KO

// Gravity & fall limits (pixels/frame², pixels/frame)
export const GRAVITY = 0.6;
export const MAX_FALL_SPEED = 18;

// Horizontal movement (pixels/frame² applied as force, pixels/frame max)
export const WALK_FORCE = 0.8;
export const MAX_SPEED = 7;
export const AIR_CONTROL_MULT = 0.4; // 60% reduction in air
export const GROUND_FRICTION = 0.75; // multiplier per frame
export const AIR_DRAG = 0.98; // multiplier per frame

// Jumping (pixels/frame impulse, frame counts)
export const JUMP_FORCE = 14;
export const JUMP_CUTOFF_MULT = 0.5; // early release cuts vy
export const COYOTE_FRAMES = 6; // grace after leaving edge
export const JUMP_BUFFER_FRAMES = 8; // queue before landing

// Dashing (pixels/frame impulse, ms cooldown, frames)
export const DASH_FORCE = 12;
export const DASH_COOLDOWN_MS = 500;
export const DASH_INVINCIBLE_FRAMES = 15;

// Combat physics (base knockback in pixels/frame)
export const KNOCKBACK_SCALING_PER_DAMAGE = 0.018;
export const KNOCKBACK_BASE = 1.0;
export const WALL_BOUNCE_X = -0.6; // vx multiplier on wall hit
export const WALL_BOUNCE_Y = 0.4; // vy multiplier on wall hit
export const GROUND_BOUNCE_Y = -0.5; // vy multiplier on ground bounce
export const AERIAL_KB_Y_BONUS = 1.2; // +20% knockbackY when target airborne

// Hitstun & blockstun (frames)
export const HITSTUN_PER_DAMAGE = 0.6;
export const MIN_HITSTUN = 8;
export const MAX_HITSTUN = 45;

// Collision restitution (bounciness 0-1)
export const RESTITUTION_GROUND = 0.1;
export const RESTITUTION_WALL = 0.3;

// Platform collision
export const PLATFORM_PASS_SPEED = 3; // min vy to pass through passthrough
export const PLAYER_HALF_WIDTH = 18;
export const PLAYER_HEIGHT = 90;

// Ragdoll
export const RAGDOLL_SPRING_STIFFNESS = 0.15;
export const RAGDOLL_SPRING_DAMPING = 0.85;
export const RAGDOLL_LOOSE_STIFFNESS = 0.02;
export const RAGDOLL_LOOSE_DAMPING = 0.95;

// Camera
export const CAM_LERP = 0.08;
export const CAM_ZOOM_MIN = 0.85;
export const CAM_ZOOM_MAX = 1.15;
export const CAM_ZOOM_RANGE = 300; // player distance for zoom range

// Particle physics
export const PARTICLE_GRAVITY_MULT = 0.3; // lighter gravity for particles
export const MAX_PARTICLES = 300;
