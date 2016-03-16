/******************************************************
 * Helper Functions and global variables
 ******************************************************/
var isGameOver = false;
var isReady = false; // Is user ready for a new game
var scores = {'High Score' : 0, 'Last Score' : 0};

// Send these to the canvas variable in the Engine
var CANVAS_WIDTH = 505;
var CANVAS_HEIGHT = 606;

// The playing space is a square and the sprites are rectangles
var HEIGHT_OFFSET = -20; // Here is the pixel difference
var NUM_ROWS = 6;
var NUM_COLS = 5;
// Define the size of a gameboard space
var space = {
    'height' : (CANVAS_HEIGHT / NUM_ROWS) + HEIGHT_OFFSET,
    'width' : (CANVAS_WIDTH / NUM_COLS)
};

// Create random number in a given range
function getRandomInt(minInt, maxInt) {
    'use strict';
    return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
}

// Check for collisions between two given (rectangular) objects
// Returns true if collision detected, otherwise false
function checkCollisions(object1, object2) {
    // Get object shapes
    // (I'm simply using the board space size minus a small number,
    //  trying to account for the transparent edges of the sprite
    //  to make the collisions feel a little more realistic)
    // TODO: If possible, get visible image shapes somehow
    object1.w = space.width - 25;
    object2.w = space.width - 25;
    object1.h = space.height + HEIGHT_OFFSET - 10;
    object2.h = space.height + HEIGHT_OFFSET - 10;

    // Check if boundaries overlap anywhere
    if (object1.x < object2.x + object2.w &&
        object1.x + object1.w > object2.x &&
        object1.y < object2.y + object2.h &&
        object1.h + object1.y > object2.y) {
        return true;
    }
    return false;
}

// Game over screen
function showGameOver() {
    messages.print('GAME OVER!!', 60, 50);
}

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down'
    };

    player.handleInput(allowedKeys[e.keyCode]);
});

/******************************************************
 * Definitions
 *****************************************************/

// Enemies our player must avoid **********************************
var Enemy = function() {
    // The image/sprite for our enemies
    this.sprite = 'images/enemy-bug.png';

    // Set the Enemy initial location
    this.initLoc();

    // Set the Enemy speed
    this.initSpeed();
};

// Initialize enemy location
Enemy.prototype.initLoc = function(){
    // Randomly set enemy starting column to be negative, to stagger canvas debut
    this.x = getRandomInt(-CANVAS_WIDTH, 0) - space.width;
    // Randomly set enemy row to any but the bottom
    this.y = (getRandomInt(0, NUM_ROWS - 2) * space.height) + HEIGHT_OFFSET;
};

// Initialize enemy speed, a random number between a given range
Enemy.prototype.initSpeed = function() {
    this.speed = getRandomInt(75, 275);
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x += (this.speed * dt);

    // If enemy reaches the end of the visible board,
    // reset to new initial space
    if (this.x > CANVAS_WIDTH) {
        this.initLoc();
        this.initSpeed();
    }
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};


// Goodies to collect *****************************************
// Set to take multiple parameters to easily make different goody objects
var Goody = function(
    name, sprite, spawnrate, cooldown, lifespan, isObjective) {
    // Set name and image sprite of goody
    this.name = name;
    this.sprite = sprite;

    // Function that decides if goody should spawn now
    // Based on spawn rate, goody will have a 1 in x chance to spawn
    this.spawnrate = spawnrate;
    this.setIsSpawned = function() {
        var odds = getRandomInt(0, this.spawnrate);
        this.isSpawned = ((odds > 1) ? false : true);
    };

    // Set whether goody is a game-critical objective or not
    this.isObjective = isObjective;

    // Initialize Goody
    this.cooldownInit = cooldown;
    this.lifespanInit = lifespan;
    this.initGoody();
};

// Function to easily initialize goody to it's desired original state
Goody.prototype.initGoody = function() {
    // Decide if goody is spawned or not
    this.setIsSpawned();

    // Set time to next possible respawn
    this.cooldown = this.cooldownInit;

    // Set lifespan of goody
    this.lifespan = this.lifespanInit;

    // Set initial location
    this.initLoc();
};

// Initial location of goody
Goody.prototype.initLoc = function() {
    // Set to spawn on any space in the top row (if spawned)
    if (this.isSpawned) {
        this.x = (getRandomInt(0, NUM_COLS - 1) * space.width);
        this.y = HEIGHT_OFFSET;
    }
};

// Function to remove piece from the board
Goody.prototype.despawn = function() {
    // Set spawn status as not spawned
    this.isSpawned = false;

    // Remove piece from board
    this.x = NaN;
    this.y = NaN;
};

// Update Goody status
Goody.prototype.update = function(dt) {
    // Check if goody is spawned or awaiting respawn
    if (this.isSpawned) {
        // Set visibilty to true
        this.isVisible = true;

        // Countdown lifespan of goody
        this.lifespan -= (1 * dt);

        // Flicker sprite if lifespan is nearly over
        var flickerSpeed = 5; // Set to 0-10. 0 is no flicker.
        var flickerRate = Math.floor(this.lifespan * 3 * flickerSpeed);
        if (this.lifespan < 2) {
            // Set isVisible to on or off, based on flickerRate
            this.isVisible = ((flickerRate % 2) === 0) ? true : false;
        }

        // If lifespan expires, despawn goody
        if (this.lifespan <= 0) {
            this.despawn();
        }
    }
    // If currently despawned, countdown timer to respawn
    else {
        this.cooldown -= (1 * dt);
        // Reinitialize goody once cooldown is complete
        if (this.cooldown <= 0) {
            this.initGoody();
        }
    }
};

// Draw the goody on the screen
Goody.prototype.render = function() {
    // Check if goody is visible
    if (this.isVisible) {
        ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
    }
};

// Now write your own player class ********************************
// This class requires an update(), render() and
// a handleInput() method.
var Player = function() {
    // Sprite for player
    this.sprite = 'images/char-boy.png';

    // Set player initial location
    this.initLoc();

    // An amount to add to the current position
    this.move = {'x' : 0, 'y' : 0};

    // Goody Scores, use to keep track of goodies acquired
    this.score = {'star' : 0};

    // Track lives remaining
    this.health = 2;
};

// Set player initial location
Player.prototype.initLoc = function() {
    // Sets player to the the middle column
    this.x = (space.width * Math.floor(NUM_COLS / 2));
    // Sets player to the bottom row
    this.y = (space.height * (NUM_ROWS - 1)) + HEIGHT_OFFSET;
};

// Update the player's position
Player.prototype.update = function(dt) {

    // If proposed move is in bounds, add move to current position
    this.x += (!isGameOver && this.moveIsInBounds()) ? this.move.x : 0;
    this.y += (!isGameOver && this.moveIsInBounds()) ? this.move.y : 0;

    // Reset move to 0
    this.move = {'x' : 0, 'y' : 0};

    // Set update-critical states
    var hitEnemy = false;
    var gotWet = false;
    var gotObjective = false;

    // Check if player hit enemy
    for (var i = 0; i < allEnemies.length; i++) {
        if (checkCollisions(this, allEnemies[i])) {
            hitEnemy = true;
        }
    }

    // Check if player went into the water (top row)
    if (this.y < space.height + HEIGHT_OFFSET) {
        // If no objective reached, player got wet
        // (If player gets an objective, no life is lost)
        if (!stars.isSpawned || !checkCollisions(this, stars)) {
            gotWet = true;
        }
    }

    // Check if player reached objective without hitting enemy
    if (!hitEnemy && checkCollisions(this, stars)) {
        gotObjective = true;
        // Despawn goody sprite if so
        stars.despawn();
    }

    // Update player accordingly
    if (hitEnemy || gotObjective || gotWet) {
        // Reset player to beginning
        this.initLoc();
        // If objective reached, update score and display message
        if (gotObjective && !hitEnemy) {
            messages.print('Got One!', 40, 1);
            this.score.star++;
        }
        // If health will be affected
        else if (hitEnemy || (gotWet && !gotObjective)) {
            // End game if out of health
            if (this.health === 0) {
                isGameOver = true;
            }
            // Otherwise deduct health and send message
            else {
                // Subtract health
                this.health--;
                // Display message
                if (hitEnemy) {
                    messages.print('Ouch!', 40, 1);
                }
                else if (gotWet) {
                    messages.print("Don't get wet!", 40, 1);
                }
            }
        }
    }
};

// Draw the player on the screen
Player.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// Account for user input
Player.prototype.handleInput = function(input, dt) {
    // Let any button press skip any message
    messages.messageLength = 0;

    // Check for any key to ready a new game
    if (isGameOver) {
        isReady = true;
    }

    // Pass key input into move variable (to be checked in update)
    switch (input) {
        case 'left':
            this.move = {'x' : -space.width, 'y' : 0};
            break;
        case 'right':
            this.move = {'x' : space.width, 'y' : 0};
            break;
        case 'up':
            this.move = {'x' : 0, 'y' : -space.height};
            break;
        case 'down':
            this.move = {'x' : 0, 'y' : space.height};
            break;
        default:
            // Do nothing :)
            break;
    }
};

// Returns true if player position plus given move will be inbounds
Player.prototype.moveIsInBounds = function(){
    if (this.x + this.move.x >= 0 &&
        this.x + this.move.x < space.width * NUM_COLS &&
        this.y + this.move.y >= 0 + HEIGHT_OFFSET &&
        this.y + this.move.y < space.height * (NUM_ROWS - 1)) {
        return true;
    }
    return false;
};


// Scoreboard for the top section of the screen ****************
var Scoreboard = function() {
    // Health item
    this.health = {
        'count' : player.health,
        'sprite' : 'images/Heart.png'
    };
    // Score item
    this.score = {
        'count' : player.score.star,
        'sprite' : 'images/Star.png'
    };
    // Past scores
    this.highScore = scores['High Score'];
    this.lastScore = scores['Last Score'];
};

// Update scoreboard info
Scoreboard.prototype.update = function() {
    this.health.count = player.health;
    this.score.count = player.score.star;

    // Update scores
    if (isGameOver) {
        // Update final score from previous game
        scores['Last Score'] = player.score.star;
    }
    // Update High Score if current score is the new high score
    if (player.score.star > scores['High Score']) {
        scores['High Score'] = player.score.star;
    }
};

// Render Scoreboard
Scoreboard.prototype.render = function() {
    // Clear area of any pixel remnants
    ctx.clearRect(0, HEIGHT_OFFSET, CANVAS_WIDTH, space.height - 11);

    ctx.font = 'bold 20px Courier';
    ctx.fillStyle = '#000'; // For black text

    // Render Health
    // Draw Health Icon
    var sprite = Resources.get(this.health.sprite);
    ctx.drawImage(sprite, CANVAS_WIDTH - (space.width * 5), HEIGHT_OFFSET + 5,
        sprite.width * 0.4, sprite.height * 0.4);
    // Draw Health Amount
    var scoreString =  'x ' + this.health.count;
    ctx.fillText(scoreString,
        CANVAS_WIDTH - (space.width * 5) + (sprite.width / 2), 30);

    // Render Score
    // Draw score icon
    sprite = Resources.get(this.score.sprite);
    ctx.drawImage(sprite, CANVAS_WIDTH - space.width, HEIGHT_OFFSET - 10,
        sprite.width * 0.5, sprite.height * 0.5);
    // Draw Score amount
    scoreString = 'x ' + ((this.score.count) ? this.score.count : '0');
    ctx.fillText(scoreString,
        (CANVAS_WIDTH - space.width) + (sprite.width / 2), 30);

    // Render High Score
    scoreString = 'High Score: ' + scores['High Score'];
    this.printStringCenter(scoreString, 16, 25);

    // Render Last Score
    scoreString = 'Last Score: ' + scores['Last Score'];
    this.printStringCenter(scoreString, 16, 40);
};

// Render single line of text, centered, given message string and height y
Scoreboard.prototype.printStringCenter = function(string, fontSize, y) {
    ctx.font = 'bold ' + fontSize + 'px Courier';
    var stringWidth = string.length * (fontSize * 0.58);
    ctx.fillText(string, CANVAS_WIDTH / 2 - stringWidth / 2, y);
};


// Messages, to be printed as overlays to the action***************
var Message = function() {
    this.message = '';
    this.isOnDisplay = false;
};

// Function that can be called to print a message
// Parameters for message string, font size and length of time of message
Message.prototype.print = function(message, fontSize, length) {
    this.message = message;
    this.fontSize = fontSize;
    this.messageLength = length;
    this.isOnDisplay = true;
};

// Update message, for visibility
Message.prototype.update = function(dt) {
    // Check if message is supposed to be visible
    if (this.isOnDisplay) {
        // Count down timer of visibility
        this.messageLength -= (1 * dt);
        // Check if timer is up
        if (this.messageLength <= 0) {
            this.isOnDisplay = false;
        }
    }
};

// Render message on the canvas
Message.prototype.render = function() {
    // Check that that the message is visible
    if (this.isOnDisplay) {
        // Find message width and height in pixels, based on font size
        // and length of message string
        var messageWidth = (this.fontSize * 0.58) * this.message.length;
        var messageHeight = (this.fontSize * 1.4);

        // Clear space behind words
        ctx.clearRect(0, 200, CANVAS_WIDTH, 100);

        // Set font style
        ctx.font = 'bold ' + this.fontSize + 'px Courier';
        ctx.fillStyle = '#000';

        // Print message
        ctx.fillText(this.message,
            CANVAS_WIDTH / 2 - messageWidth / 2, 200 + messageHeight);

        // If game is over, also display final score
        if (isGameOver) {
            // Clear background
            ctx.clearRect(0, 300, CANVAS_WIDTH, 100);

            // Set font properties
            var finalScore = player.score.star;
            var subFontSize = 28;
            ctx.font = 'normal ' + subFontSize + 'px Courier';

            // Print final score
            this.message = 'Final Score: ' + finalScore;
            messageWidth = (subFontSize * 0.58) * this.message.length;
            messageHeight = (this.fontSize * 1.2);
            ctx.fillText(this.message,
                CANVAS_WIDTH / 2 - messageWidth / 2, 250 + messageHeight);

            // Print press any key to continue
            this.message = 'Press any key to continue...';
            messageWidth = (subFontSize * 0.58) * this.message.length;
            ctx.fillText(this.message,
                CANVAS_WIDTH / 2 - messageWidth / 2, 300 + messageHeight);
        }
    }
};

/**********************************************************
* Now instantiate your objects.
**********************************************************/
// Place all enemy objects in an array called allEnemies
var allEnemies = [];

// Fill all enemies array with set amount of enemies
function generateEnemies(numOfEnemies) {
    for (var i = 0; i < numOfEnemies; i++) {
        allEnemies.push(new Enemy());
    }
}

// Create goodies to be collected
var stars;

// Create player
var player = new Player();

// Create the scoreboard
var score;

// Create message holder
var messages = new Message();

// Create a fresh game state, called by the engine
// at the beginning of every new game
function initGame() {
    // Display opening message
    messages.print('SHALL WE PLAY A GAME?', 36, 2);
    // Set game state to not over
    isGameOver = false;
    // Is ready is reset
    isReady = false;
    // Instantiate player
    player = new Player();
    // Instantiate enemies
    allEnemies = [];
    generateEnemies(10);
    // Instantiate stars
    stars = new Goody('star', 'images/Star.png', 2, 5, 7, true);
    // Make the scoreboard
    score = new Scoreboard();
}
