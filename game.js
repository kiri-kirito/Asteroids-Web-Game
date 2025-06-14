// --- GAME CONSTANTS ---
const FPS = 30; // frames per second
const SHIP_SIZE = 30; // ship base size in pixels (height)
const SHIP_SPEED = 200; // ship movement speed in pixels per second
const BULLET_SPEED = 500; // bullet speed in pixels per second
const BULLET_MAX_DIST = 0.4; // max distance a bullet can travel as fraction of screen width
const BULLET_EXPLODE_TIME = 0.1; // time in seconds for bullet explosion animation
const ASTEROID_NUM = 3; // initial number of asteroids
const ASTEROID_SPEED = 50; // max initial speed of asteroids in pixels per second
const ASTEROID_SIZE = 100; // starting size of asteroids in pixels
const ASTEROID_VERTICES = 10; // avg number of vertices on each asteroid
const ASTEROID_JAGGEDNESS = 0.4; // jaggedness of the asteroids (0 = smooth, 1 = very jagged)
const GAME_LIVES = 3; // starting number of lives
const TEXT_FADE_TIME = 2.5; // text fade time in seconds
const TEXT_SIZE = 40; // text font size in pixels
const GAME_OVER_TEXT = "GAME OVER";
const SAVE_HIGH_SCORE_NAME = "asteroids_high_score";

// Gamepad Constants
const GAMEPAD_THRESHOLD = 0.5; // Min value for analog stick input to register
const GAMEPAD_FIRE_BUTTON = 0; // Standard button for 'A' on Xbox, 'X' on PlayStation
const GAMEPAD_UP_BUTTON = 12; // D-pad Up
const GAMEPAD_DOWN_BUTTON = 13; // D-pad Down
const GAMEPAD_LEFT_BUTTON = 14; // D-pad Left
const GAMEPAD_RIGHT_BUTTON = 15; // D-pad Right

// Star Background Constants
const NUM_STARS = 100;
const STAR_SIZE_MIN = 1;
const STAR_SIZE_MAX = 3;
const SHOOTING_STAR_CHANCE = 0.005; // Chance per frame for a shooting star
const SHOOTING_STAR_SPEED = 300; // Pixels per second
const SHOOTING_STAR_LENGTH = 100; // Pixels

// Image Paths (IMPORTANT: Update these if your image names/paths are different)
const WATERMARK_IMAGE_SRC = "./image/• 𝘒𝘢𝘮𝘰𝘯𝘰𝘩𝘢𝘴𝘩𝘪 𝘙𝘰𝘯.jpeg";
const MY_IMAGE_SRC = "./image/• 𝘒𝘢𝘮𝘰𝘯𝘰𝘩𝘢𝘴𝘩𝘪 𝘙𝘰𝘯.jpeg"; // Your personal image for intro screen

// --- GAME VARIABLES ---
let canvas, ctx;
let ship;
let asteroids = [];
let bullets = [];
let stars = [];
let shootingStars = [];
let level;
let score;
let scoreHigh;
let lives;
let text;
let textAlpha;
let gameOver;
let gamepads = {}; // To store connected gamepads
let watermarkImage = new Image();
let myIntroImage = new Image();
let imagesLoaded = 0; // Counter for image loading
const TOTAL_IMAGES_TO_LOAD = 2; // Adjust if you add more images

// Game States
const GAME_STATE = {
    LOADING: 0,
    INTRO: 1,
    PLAYING: 2,
    GAME_OVER: 3
};
let gameState = GAME_STATE.LOADING; // Initial state

// Input state for smoother movement with multiple keys
let keys = {
    up: false, down: false, left: false, right: false,
    shoot: false
};

// --- EVENT LISTENERS ---
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);
document.addEventListener("mousedown", handleIntroClick); // For mouse click on intro
document.addEventListener("touchend", handleIntroClick); // For touch on intro

// Gamepad connection events
window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected:", e.gamepad.id);
    gamepads[e.gamepad.index] = e.gamepad;
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected:", e.gamepad.id);
    delete gamepads[e.gamepad.index];
});

// --- SETUP GAME ---
window.onload = function() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    scoreHigh = localStorage.getItem(SAVE_HIGH_SCORE_NAME) == null ? 0 :
        parseInt(localStorage.getItem(SAVE_HIGH_SCORE_NAME));

    createStars(); // Initialize background stars

    // Load images
    watermarkImage.onload = imageLoadHandler;
    myIntroImage.onload = imageLoadHandler;
    watermarkImage.src = WATERMARK_IMAGE_SRC;
    myIntroImage.src = MY_IMAGE_SRC;

    // Create the touch controls HTML elements and set up their listeners
    createTouchControls();
    setupTouchListeners();

    // Set up the game loop
    setInterval(update, 1000 / FPS);
}

function imageLoadHandler() {
    imagesLoaded++;
    if (imagesLoaded === TOTAL_IMAGES_TO_LOAD) {
        // All images loaded, transition to intro state
        gameState = GAME_STATE.INTRO;
    }
}

function newGame() {
    level = 0;
    score = 0;
    lives = GAME_LIVES;
    ship = new Ship();
    gameOver = false;
    newLevel();
    // Reset key states on new game
    keys = { up: false, down: false, left: false, right: false, shoot: false };
    gameState = GAME_STATE.PLAYING; // Transition to playing state
}

function newLevel() {
    text = "Level " + (level + 1);
    textAlpha = 1.0;
    createAsteroids();
}

function createAsteroids() {
    asteroids = [];
    let x, y;
    for (let i = 0; i < ASTEROID_NUM + level; i++) {
        do {
            x = Math.floor(Math.random() * canvas.width);
            y = Math.floor(Math.random() * canvas.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < ASTEROID_SIZE * 2 + ship.radius); // Ensure asteroids don't spawn on ship
        asteroids.push(new Asteroid(x, y, Math.ceil(ASTEROID_SIZE / 2))); // initial size is half ASTEROID_SIZE, will be multiplied by 2 later
    }
}

function createStars() {
    stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * (STAR_SIZE_MAX - STAR_SIZE_MIN) + STAR_SIZE_MIN
        });
    }
}

function gameOverScreen() {
    gameOver = true;
    text = GAME_OVER_TEXT;
    textAlpha = 1.0;
    gameState = GAME_STATE.GAME_OVER; // Transition to game over state
}

// --- SHIP OBJECT ---
function Ship() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.radius = SHIP_SIZE / 2;
    this.angle = 90 / 180 * Math.PI; // default facing up (90 deg)
    this.vel = { x: 0, y: 0 }; // Velocity for absolute movement
    this.exploding = false;
    this.explodeTime = 0;
    this.blinkOn = false;
    this.blinkTime = Math.ceil(FPS / 5); // blink 5 times per second
    this.blinkNum = Math.ceil(FPS * 3); // 3 seconds invulnerability
    this.canShoot = true; // For bullet cooldown
    this.shootTimer = 0;

    this.draw = function() {
        if (!this.exploding && (this.blinkOn || this.blinkNum == 0)) {
            // Draw a more spaceship-like design
            ctx.strokeStyle = "white";
            ctx.lineWidth = SHIP_SIZE / 20;

            ctx.beginPath();
            // Main body
            ctx.moveTo(this.x + this.radius * 1.5 * Math.cos(this.angle), this.y - this.radius * 1.5 * Math.sin(this.angle)); // Nose
            ctx.lineTo(this.x + this.radius * 0.5 * Math.cos(this.angle + 0.7 * Math.PI), this.y - this.radius * 0.5 * Math.sin(this.angle + 0.7 * Math.PI)); // Back-left wing
            ctx.lineTo(this.x + this.radius * 0.5 * Math.cos(this.angle - 0.7 * Math.PI), this.y - this.radius * 0.5 * Math.sin(this.angle - 0.7 * Math.PI)); // Back-right wing
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = "grey";
            ctx.fill();

            // Cockpit (small circle)
            ctx.beginPath();
            ctx.arc(this.x + this.radius * 0.5 * Math.cos(this.angle), this.y - this.radius * 0.5 * Math.sin(this.angle), this.radius * 0.3, 0, Math.PI * 2, false);
            ctx.fillStyle = "skyblue";
            ctx.fill();
            ctx.stroke();

            // Rear engine
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.7 * Math.cos(this.angle), this.y + this.radius * 0.7 * Math.sin(this.angle), this.radius * 0.4, 0, Math.PI * 2, false);
            ctx.fillStyle = "darkgrey";
            ctx.fill();
            ctx.stroke();

            // Simple "exhaust" if moving
            if (keys.up || keys.down || keys.left || keys.right) {
                ctx.fillStyle = "cyan"; // Exhaust glow
                ctx.beginPath();
                ctx.arc(this.x - this.radius * 0.7 * Math.cos(this.angle), this.y + this.radius * 0.7 * Math.sin(this.angle), this.radius * 0.3 + Math.random() * this.radius * 0.1, 0, Math.PI * 2, false);
                ctx.fill();
            }

        } else if (this.exploding) {
            ctx.fillStyle = "darkred";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.7, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.1, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    this.update = function() {
        if (this.exploding) {
            this.explodeTime--;
            if (this.explodeTime == 0) {
                lives--;
                if (lives == 0) {
                    gameOverScreen();
                } else {
                    ship = new Ship(); // respawn
                }
            }
        } else {
            // Blink when invulnerable
            if (this.blinkNum > 0) {
                this.blinkOn = this.blinkTime % Math.ceil(FPS / 5) == 0;
                this.blinkNum--;
                if (this.blinkNum == 0) {
                    this.blinkOn = false;
                }
            }

            // Update ship velocity based on keys
            this.vel.x = 0;
            this.vel.y = 0;

            if (keys.left) {
                this.vel.x = -SHIP_SPEED / FPS;
                this.angle = 180 / 180 * Math.PI; // Face left
            }
            if (keys.right) {
                this.vel.x = SHIP_SPEED / FPS;
                this.angle = 0 / 180 * Math.PI; // Face right
            }
            if (keys.up) {
                this.vel.y = -SHIP_SPEED / FPS;
                this.angle = 90 / 180 * Math.PI; // Face up
            }
            if (keys.down) {
                this.vel.y = SHIP_SPEED / FPS;
                this.angle = 270 / 180 * Math.PI; // Face down
            }

            // Handle diagonal movement (adjust angle if two keys pressed)
            if (keys.up && keys.left) this.angle = 135 / 180 * Math.PI;
            else if (keys.up && keys.right) this.angle = 45 / 180 * Math.PI;
            else if (keys.down && keys.left) this.angle = 225 / 180 * Math.PI;
            else if (keys.down && keys.right) this.angle = 315 / 180 * Math.PI;

            // Move ship
            this.x += this.vel.x;
            this.y += this.vel.y;

            // Handle edge of screen
            if (this.x < 0 - this.radius) {
                this.x = canvas.width + this.radius;
            } else if (this.x > canvas.width + this.radius) {
                this.x = 0 - this.radius;
            }
            if (this.y < 0 - this.radius) {
                this.y = canvas.height + this.radius;
            } else if (this.y > canvas.height + this.radius) {
                this.y = 0 - this.radius;
            }

            // Bullet cooldown
            if (!this.canShoot) {
                this.shootTimer++;
                if (this.shootTimer >= Math.ceil(FPS * 0.2)) { // 0.2 seconds cooldown
                    this.canShoot = true;
                    this.shootTimer = 0;
                }
            }

            // Shoot if shoot key is pressed
            if (keys.shoot) {
                this.shoot();
            }
        }
    }

    this.explode = function() {
        this.exploding = true;
        this.explodeTime = Math.ceil(FPS * 1.5); // 1.5 seconds explosion
    }

    this.shoot = function() {
        if (this.canShoot && !this.exploding) {
            bullets.push(new Bullet(this.x, this.y, this.angle));
            this.canShoot = false;
        }
    }
}

// --- BULLET OBJECT ---
function Bullet(x, y, angle) {
    this.x = x;
    this.y = y;
    this.radius = SHIP_SIZE / 15;
    this.velX = BULLET_SPEED * Math.cos(angle) / FPS;
    this.velY = -BULLET_SPEED * Math.sin(angle) / FPS; // Y-axis inverted in canvas
    this.distTraveled = 0;
    this.explodeTime = 0;

    this.draw = function() {
        if (this.explodeTime == 0) {
            ctx.fillStyle = "lime";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fill();
        } else {
            ctx.fillStyle = "orangered";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.75, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "pink";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.25, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    this.update = function() {
        if (this.explodeTime > 0) {
            this.explodeTime--;
            return; // Don't move exploding bullets
        }

        this.x += this.velX;
        this.y += this.velY;
        this.distTraveled += Math.sqrt(this.velX * this.velX + this.velY * this.velY);

        // Handle edge of screen
        if (this.x < 0) {
            this.x = canvas.width;
        } else if (this.x > canvas.width) {
            this.x = 0;
        }
        if (this.y < 0) {
            this.y = canvas.height;
        } else if (this.y > canvas.height) {
            this.y = 0;
        }

        // Remove bullet if it traveled too far
        if (this.distTraveled > BULLET_MAX_DIST * canvas.width) {
            let index = bullets.indexOf(this);
            if (index > -1) {
                bullets.splice(index, 1);
            }
        }
    }

    this.explode = function() {
        this.explodeTime = Math.ceil(FPS * BULLET_EXPLODE_TIME);
    }
}

// --- ASTEROID OBJECT ---
function Asteroid(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.level = level;

    // random velocity
    this.velX = Math.random() * ASTEROID_SPEED / FPS * (Math.random() < 0.5 ? 1 : -1);
    this.velY = Math.random() * ASTEROID_SPEED / FPS * (Math.random() < 0.5 ? 1 : -1);

    this.angle = Math.random() * Math.PI * 2; // in radians
    this.rotationSpeed = Math.random() * ASTEROID_SPEED / FPS * (Math.random() < 0.5 ? 1 : -1);

    this.vertices = Math.floor(Math.random() * (ASTEROID_VERTICES + 1) + ASTEROID_VERTICES / 2);
    this.offsets = [];
    for (let i = 0; i < this.vertices; i++) {
        this.offsets[i] = Math.random() * ASTEROID_JAGGEDNESS * 2 + 1 - ASTEROID_JAGGEDNESS;
    }

    this.draw = function() {
        ctx.strokeStyle = "slategrey";
        ctx.lineWidth = SHIP_SIZE / 20;

        // draw a path
        ctx.beginPath();
        ctx.moveTo(
            this.x + this.radius * this.offsets[0] * Math.cos(this.angle),
            this.y + this.radius * this.offsets[0] * Math.sin(this.angle)
        );

        // draw the polygon
        for (let i = 1; i < this.vertices; i++) {
            ctx.lineTo(
                this.x + this.radius * this.offsets[i] * Math.cos(this.angle + i * Math.PI * 2 / this.vertices),
                this.y + this.radius * this.offsets[i] * Math.sin(this.angle + i * Math.PI * 2 / this.vertices)
            );
        }
        ctx.closePath();
        ctx.stroke();
    }

    this.update = function() {
        this.x += this.velX;
        this.y += this.velY;
        this.angle += this.rotationSpeed / FPS; // Rotate the asteroid

        // Handle edge of screen
        if (this.x < 0 - this.radius) {
            this.x = canvas.width + this.radius;
        } else if (this.x > canvas.width + this.radius) {
            this.x = 0 - this.radius;
        }
        if (this.y < 0 - this.radius) {
            this.y = canvas.height + this.radius;
        } else if (this.y > canvas.height + this.radius) {
            this.y = 0 - this.radius;
        }
    }
}

// --- GAME LOOP ---
function update() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw space background (black fill first)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw static stars
    drawStars();

    // Game state management
    switch (gameState) {
        case GAME_STATE.LOADING:
            drawLoadingScreen();
            break;
        case GAME_STATE.INTRO:
            drawIntroScreen();
            break;
        case GAME_STATE.PLAYING:
        case GAME_STATE.GAME_OVER: // Game over screen will still draw game elements underneath
            // Generate and draw shooting stars (only in playing/game over state)
            if (Math.random() < SHOOTING_STAR_CHANCE) {
                let side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
                let x, y, dx, dy;
                switch (side) {
                    case 0: // Top
                        x = Math.random() * canvas.width;
                        y = -SHOOTING_STAR_LENGTH;
                        dx = (Math.random() - 0.5) * SHOOTING_STAR_SPEED / FPS;
                        dy = (Math.random() * 0.5 + 0.5) * SHOOTING_STAR_SPEED / FPS;
                        break;
                    case 1: // Right
                        x = canvas.width + SHOOTING_STAR_LENGTH;
                        y = Math.random() * canvas.height;
                        dx = -(Math.random() * 0.5 + 0.5) * SHOOTING_STAR_SPEED / FPS;
                        dy = (Math.random() - 0.5) * SHOOTING_STAR_SPEED / FPS;
                        break;
                    case 2: // Bottom
                        x = Math.random() * canvas.width;
                        y = canvas.height + SHOOTING_STAR_LENGTH;
                        dx = (Math.random() - 0.5) * SHOOTING_STAR_SPEED / FPS;
                        dy = -(Math.random() * 0.5 + 0.5) * SHOOTING_STAR_SPEED / FPS;
                        break;
                    case 3: // Left
                        x = -SHOOTING_STAR_LENGTH;
                        y = Math.random() * canvas.height;
                        dx = (Math.random() * 0.5 + 0.5) * SHOOTING_STAR_SPEED / FPS;
                        dy = (Math.random() - 0.5) * SHOOTING_STAR_SPEED / FPS;
                        break;
                }
                shootingStars.push({
                    x: x, y: y, dx: dx, dy: dy,
                    length: SHOOTING_STAR_LENGTH,
                    alpha: 1.0,
                    fadeRate: 1.0 / (FPS * (SHOOTING_STAR_LENGTH / SHOOTING_STAR_SPEED) * 2) // Fade over twice travel time
                });
            }

            for (let i = shootingStars.length - 1; i >= 0; i--) {
                let ss = shootingStars[i];
                ss.x += ss.dx;
                ss.y += ss.dy;
                ss.alpha -= ss.fadeRate;

                if (ss.alpha <= 0 || ss.x < -ss.length || ss.x > canvas.width + ss.length || ss.y < -ss.length || ss.y > canvas.height + ss.length) {
                    shootingStars.splice(i, 1);
                } else {
                    ctx.strokeStyle = "rgba(255, 255, 200, " + ss.alpha + ")";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(ss.x, ss.y);
                    // Calculate tail end point by moving backward along the velocity vector
                    const tailX = ss.x - ss.dx / (SHOOTING_STAR_SPEED / FPS) * ss.length;
                    const tailY = ss.y - ss.dy / (SHOOTING_STAR_SPEED / FPS) * ss.length;
                    ctx.lineTo(tailX, tailY);
                    ctx.stroke();
                }
            }

            handleGamepadInput(); // Process gamepad input if playing/game over
            
            // Only update game elements if in PLAYING state
            if (gameState === GAME_STATE.PLAYING) {
                ship.update();
                for (let i = bullets.length - 1; i >= 0; i--) {
                    bullets[i].update();
                }
                for (let i = asteroids.length - 1; i >= 0; i--) {
                    asteroids[i].update();
                }

                // Collision detection (only if playing)
                if (!ship.exploding && ship.blinkNum == 0) {
                    // Ship-asteroid collisions
                    for (let i = asteroids.length - 1; i >= 0; i--) {
                        if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.radius + asteroids[i].radius) {
                            ship.explode();
                            break;
                        }
                    }
                }

                // Bullet-asteroid collisions
                for (let i = bullets.length - 1; i >= 0; i--) {
                    if (bullets[i].explodeTime > 0) {
                        continue;
                    }

                    for (let j = asteroids.length - 1; j >= 0; j--) {
                        if (distBetweenPoints(bullets[i].x, bullets[i].y, asteroids[j].x, asteroids[j].y) < bullets[i].radius + asteroids[j].radius) {
                            bullets[i].explode();
                            breakAsteroid(j);
                            score += (ASTEROID_SIZE - asteroids[j].radius) / ASTEROID_SIZE * 100 + 50;
                            break;
                        }
                    }
                }

                if (asteroids.length == 0) {
                    level++;
                    newLevel();
                }
            }

            // Draw game elements (ship, bullets, asteroids) for both PLAYING and GAME_OVER
            ship.draw();
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].draw();
            }
            for (let i = asteroids.length - 1; i >= 0; i--) {
                asteroids[i].draw();
            }
            
            // Draw score, high score, lives (always visible during gameplay & game over)
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.font = `${TEXT_SIZE * 0.75}px "Times New Roman"`; // Changed font
            ctx.fillText("SCORE: " + score, canvas.width - SHIP_SIZE / 2, SHIP_SIZE);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.font = `${TEXT_SIZE * 0.75}px "Times New Roman"`; // Changed font
            ctx.fillText("HIGH SCORE: " + scoreHigh, canvas.width / 2, SHIP_SIZE);

            let lifeColor;
            for (let i = 0; i < lives; i++) {
                lifeColor = ship.exploding && i == lives - 1 ? "red" : "white";
                drawShipLifeIcon(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI, lifeColor);
            }

            // Draw game over text if applicable
            if (gameOver) {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "white";
                ctx.font = `bold ${TEXT_SIZE}px "Times New Roman"`; // Changed font, bold for game over
                ctx.fillText(GAME_OVER_TEXT, canvas.width / 2, canvas.height * 0.75);
                ctx.font = `${TEXT_SIZE * 0.75}px "Times New Roman"`; // Changed font
                ctx.fillText("Press Any Key or Gamepad Button to Restart", canvas.width / 2, canvas.height * 0.85);

                if (score > scoreHigh) {
                    scoreHigh = score;
                    localStorage.setItem(SAVE_HIGH_SCORE_NAME, scoreHigh);
                }
            } else if (textAlpha >= 0) { // Draw level text if not game over
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
                ctx.font = `bold ${TEXT_SIZE}px "Times New Roman"`; // Changed font, bold for level
                ctx.fillText(text, canvas.width / 2, canvas.height * 0.75);
                textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
            }
            
            // Draw Watermark Image (only in playing/game over states)
            if (watermarkImage.complete && watermarkImage.naturalWidth !== 0) {
                const originalWidth = watermarkImage.naturalWidth;
                const originalHeight = watermarkImage.naturalHeight;
                const targetWidth = 60; // Adjusted target width
                const scaleFactor = targetWidth / originalWidth;
                const targetHeight = originalHeight * scaleFactor;

                const wmX = canvas.width - targetWidth - 10; // 10px padding from right edge
                const wmY = canvas.height - targetHeight - 10; // 10px padding from bottom edge

                ctx.globalAlpha = 0.3; // Make it semi-transparent
                ctx.drawImage(watermarkImage, wmX, wmY, targetWidth, targetHeight);
                ctx.globalAlpha = 1.0; // Reset alpha for other drawings
            }
            break;
    }
}

function drawLoadingScreen() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = `${TEXT_SIZE}px "Times New Roman"`; // Changed font
    ctx.fillText("Loading Assets...", canvas.width / 2, canvas.height / 2);
    ctx.font = `${TEXT_SIZE * 0.75}px "Times New Roman"`; // Changed font
    ctx.fillText(`(${imagesLoaded} / ${TOTAL_IMAGES_TO_LOAD} images loaded)`, canvas.width / 2, canvas.height / 2 + TEXT_SIZE);
}

function drawIntroScreen() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";

    // Game Title - Adjusted Y position to move it up
    ctx.font = `bold italic ${TEXT_SIZE * 1.5}px "Times New Roman"`; // Changed font, bold italic
    ctx.fillText("ASTEROIDS", canvas.width / 2, canvas.height * 0.2);

    // My Image - Adjusted Y position relative to canvas height
    if (myIntroImage.complete && myIntroImage.naturalWidth !== 0) {
        const imgWidth = myIntroImage.naturalWidth;
        const imgHeight = myIntroImage.naturalHeight;
        const targetWidth = 150; // Max width for the intro image
        const scale = targetWidth / imgWidth;
        const scaledHeight = imgHeight * scale;

        ctx.drawImage(myIntroImage,
                      canvas.width / 2 - targetWidth / 2,
                      canvas.height * 0.4 - scaledHeight / 2, // Moved down to avoid title
                      targetWidth,
                      scaledHeight);
    } else {
        // Fallback if image isn't loaded or invalid
        ctx.font = `${TEXT_SIZE}px "Times New Roman"`; // Changed font
        ctx.fillText("[My Image Placeholder]", canvas.width / 2, canvas.height * 0.4);
    }

    // Created By - Adjusted Y position
    ctx.font = `${TEXT_SIZE}px "Times New Roman"`; // Changed font
    ctx.fillText("Created by Rayyan", canvas.width / 2, canvas.height * 0.65);

    // Click/Tap to Start - Adjusted Y position
    ctx.font = `italic ${TEXT_SIZE * 0.75}px "Times New Roman"`; // Changed font, italic
    ctx.fillText("Click / Tap to Start", canvas.width / 2, canvas.height * 0.85);
}


function handleIntroClick(/** @type {MouseEvent | TouchEvent} */ ev) {
    if (gameState === GAME_STATE.INTRO) {
        // Prevent default actions for clicks/taps on the intro screen
        ev.preventDefault();
        // Start the game
        newGame();
    }
}


function drawStars() {
    ctx.fillStyle = "white";
    for (let i = 0; i < stars.length; i++) {
        ctx.beginPath();
        ctx.arc(stars[i].x, stars[i].y, stars[i].radius, 0, Math.PI * 2, false);
        ctx.fill();
    }
}

function breakAsteroid(index) {
    let a = asteroids[index];
    if (a.radius == Math.ceil(ASTEROID_SIZE / 4)) { // smallest asteroid
        asteroids.splice(index, 1);
    } else {
        // split asteroid in two
        asteroids.push(new Asteroid(a.x, a.y, Math.ceil(a.radius / 2)));
        asteroids.push(new Asteroid(a.x, a.y, Math.ceil(a.radius / 2)));
        asteroids.splice(index, 1);
    }
}

// Helper function to draw a simplified ship for lives display
function drawShipLifeIcon(x, y, angle, color = "white") {
    ctx.strokeStyle = color;
    ctx.lineWidth = SHIP_SIZE / 20;

    ctx.beginPath();
    ctx.moveTo( // nose of the ship
        x + SHIP_SIZE / 2 * Math.cos(angle),
        y - SHIP_SIZE / 2 * Math.sin(angle)
    );
    ctx.lineTo( // rear left
        x - SHIP_SIZE / 2 * (Math.cos(angle) + Math.sin(angle)),
        y + SHIP_SIZE / 2 * (Math.sin(angle) - Math.cos(angle))
    );
    ctx.lineTo( // rear right
        x - SHIP_SIZE / 2 * (Math.cos(angle) - Math.sin(angle)),
        y + SHIP_SIZE / 2 * (Math.sin(angle) + Math.cos(angle))
    );
    ctx.closePath();
    ctx.stroke();
}

// --- INPUT HANDLING ---
function keyDown(/** @type {KeyboardEvent} */ ev) {
    // If game over, any key restarts the game (keyboard input for intro/game over)
    if (gameOver && gameState === GAME_STATE.GAME_OVER) {
        newGame();
        return;
    }
    // If in intro, any key starts the game
    if (gameState === GAME_STATE.INTRO) {
        newGame();
        return;
    }
    // If loading, ignore keys
    if (gameState === GAME_STATE.LOADING) return;

    // Prevent default browser actions for game keys (e.g., spacebar scrolling)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(ev.key)) {
        ev.preventDefault();
    }

    switch (ev.key) {
        case "ArrowLeft":
        case "a":
            keys.left = true;
            break;
        case "ArrowUp":
        case "w":
            keys.up = true;
            break;
        case "ArrowRight":
        case "d":
            keys.right = true;
            break;
        case "ArrowDown":
        case "s":
            keys.down = true;
            break;
        case " ": // Spacebar
            keys.shoot = true;
            break;
    }
}

function keyUp(/** @type {KeyboardEvent} */ ev) {
    // Only process keyUp if playing
    if (gameState !== GAME_STATE.PLAYING) return;

    // Prevent default browser actions for game keys (e.g., spacebar scrolling)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(ev.key)) {
        ev.preventDefault();
    }

    switch (ev.key) {
        case "ArrowLeft":
        case "a":
            keys.left = false;
            break;
        case "ArrowUp":
        case "w":
            keys.up = false;
            break;
        case "ArrowRight":
        case "d":
            keys.right = false;
            break;
        case "ArrowDown":
        case "s":
            keys.down = false;
            break;
        case " ": // Spacebar
            keys.shoot = false;
            break;
    }
}

function handleGamepadInput() {
    let gp = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gp) return; // No gamepad support

    for (let i = 0; i < gp.length; i++) {
        let gamepad = gp[i];
        if (gamepad && gamepad.connected) {
            // Restart game on any button press if game over or intro
            if (gameState === GAME_STATE.GAME_OVER || gameState === GAME_STATE.INTRO) {
                for (let b = 0; b < gamepad.buttons.length; b++) {
                    if (gamepad.buttons[b].pressed) {
                        newGame();
                        return; // Exit function after restarting
                    }
                }
                // Also check analog stick movement as a "button press"
                if (Math.abs(gamepad.axes[0]) > GAMEPAD_THRESHOLD || Math.abs(gamepad.axes[1]) > GAMEPAD_THRESHOLD) {
                    newGame();
                    return;
                }
            }

            // Only process game controls if in PLAYING state
            if (gameState === GAME_STATE.PLAYING) {
                // Gamepad Movement
                keys.up = (gamepad.axes[1] < -GAMEPAD_THRESHOLD || gamepad.buttons[GAMEPAD_UP_BUTTON]?.pressed);
                keys.down = (gamepad.axes[1] > GAMEPAD_THRESHOLD || gamepad.buttons[GAMEPAD_DOWN_BUTTON]?.pressed);
                keys.left = (gamepad.axes[0] < -GAMEPAD_THRESHOLD || gamepad.buttons[GAMEPAD_LEFT_BUTTON]?.pressed);
                keys.right = (gamepad.axes[0] > GAMEPAD_THRESHOLD || gamepad.buttons[GAMEPAD_RIGHT_BUTTON]?.pressed);

                // Gamepad Shoot
                keys.shoot = gamepad.buttons[GAMEPAD_FIRE_BUTTON]?.pressed;
            } else {
                // Reset keys if not in playing state to prevent stuck input from gamepad
                keys.up = keys.down = keys.left = keys.right = keys.shoot = false;
            }
        }
    }
}

// --- ON-SCREEN TOUCH CONTROLS (Dynamically created and managed) ---

// This function creates the HTML elements for the touch controls
function createTouchControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'touch-controls';
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.bottom = '10px';
    controlsContainer.style.left = '10px';
    controlsContainer.style.right = '10px';
    controlsContainer.style.justifyContent = 'space-between';
    controlsContainer.style.pointerEvents = 'none';
    controlsContainer.style.zIndex = '10';

    // Left controls (Movement D-pad style)
    const leftControls = document.createElement('div');
    leftControls.style.display = 'grid';
    leftControls.style.gridTemplateColumns = 'repeat(3, 70px)';
    leftControls.style.gridTemplateRows = 'repeat(3, 70px)';
    leftControls.style.gap = '5px';
    leftControls.style.pointerEvents = 'auto';

    leftControls.innerHTML = `
        <div class="touch-control-spacer"></div>
        <div id="touch-up" class="touch-button">▲</div>
        <div class="touch-control-spacer"></div>
        <div id="touch-left" class="touch-button">◀</div>
        <div class="touch-control-spacer"></div>
        <div id="touch-right" class="touch-button">▶</div>
        <div class="touch-control-spacer"></div>
        <div id="touch-down" class="touch-button">▼</div>
        <div class="touch-control-spacer"></div>
    `;
    controlsContainer.appendChild(leftControls);

    // Right controls (Shoot button)
    const rightControls = document.createElement('div');
    rightControls.style.display = 'flex';
    rightControls.style.alignItems = 'flex-end';
    rightControls.style.pointerEvents = 'auto';

    const shootButton = document.createElement('div');
    shootButton.id = 'touch-shoot';
    shootButton.className = 'touch-button';
    shootButton.textContent = 'FIRE';
    shootButton.style.borderRadius = '50%';
    shootButton.style.width = '90px';
    shootButton.style.height = '90px';
    shootButton.style.fontSize = '30px';

    rightControls.appendChild(shootButton);
    controlsContainer.appendChild(rightControls);

    document.body.appendChild(controlsContainer);
}


// This function sets up the event listeners for the touch controls
function setupTouchListeners() {
    const touchUp = document.getElementById('touch-up');
    const touchDown = document.getElementById('touch-down');
    const touchLeft = document.getElementById('touch-left');
    const touchRight = document.getElementById('touch-right');
    const touchShoot = document.getElementById('touch-shoot');

    // Helper to add touch event listeners to a button
    function addTouchListeners(element, keyStateName) {
        element.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default browser actions (scrolling, zooming)
            // If in intro/game over state, touch starts the game
            if (gameState === GAME_STATE.INTRO || gameState === GAME_STATE.GAME_OVER) {
                newGame();
                return;
            }
            if (gameState !== GAME_STATE.PLAYING) return; // Only apply control if playing

            keys[keyStateName] = true;
            element.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; // Visual feedback
        }, { passive: false }); // `passive: false` allows `preventDefault()`

        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Don't reset keys if we just started a new game from touch
            if (gameState !== GAME_STATE.PLAYING) return;

            keys[keyStateName] = false;
            element.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // Reset visual feedback
        });
    }

    addTouchListeners(touchUp, 'up');
    addTouchListeners(touchDown, 'down');
    addTouchListeners(touchLeft, 'left');
    addTouchListeners(touchRight, 'right');
    addTouchListeners(touchShoot, 'shoot');
}


// --- HELPER FUNCTIONS ---
function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
