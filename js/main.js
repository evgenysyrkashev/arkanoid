(function() {
  'use strict';

  var canvasH, canvasW,
      getRandomLayout, bricksLayer, showMessage,

      Ball, CollisionManager, Desk, Brick, BricksLayout, Grid,
      arkBall, arkCollisionManager, arkDesk, arkBricksLayout, arkGrid,
      processor, clearCanvas, animate, init,

      saveGameState, restoreSavedGame,
      
      bounceFactor = 1,
      gameover = false,
      pause = false,
      gameInProgress = false,
      activeBricksCounter = 0,

      canvas = document.getElementById("canvas"),
      ctx = canvas.getContext("2d");

  // Cross-browser requestAnimationFrame by Paul Irish
  // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
          window.setTimeout(callback, 1000/60);
        };
  })();

  // Setting up the size of canvas
  canvasH = (window.innerHeight > 450) ? 450 : window.innerHeight - window.innerHeight % 100;
  canvasW = (window.innerWidth > 300) ? 300 : window.innerWidth - window.innerWidth % 100;
  canvas.height = canvasH;
  canvas.width = canvasW;

  // Check for deviceorientation support
  if("ondeviceorientation" in window) {
    window.addEventListener("deviceorientation", function(e) {
      if(e.gamma !== null) {
        arkDesk.x = canvasW / 2 + Math.round(e.gamma) * canvasW / 2 / 30;
        arkCollisionManager.update(arkDesk);
      }
    });
  }

  canvas.addEventListener('mousemove', function(event) {
    if(!pause && !gameover) {
      arkDesk.x = event.offsetX - arkDesk.width / 2;
      arkCollisionManager.update(arkDesk);
    }
  }, false);

  // For touch devices
  canvas.addEventListener('touchend', flowHandle, false);

  // Spacebar keypress
  document.addEventListener('keydown', function(e) {

    // TODO: check for e.keyCode if e.which doesn't exist
    if(e.which === 32) {
      flowHandle();
    }
  }, false);

  // Change behavior of touch event and keypress events
  // TODO: function expression
  function flowHandle() {
    
    // Check if game process is running
    if(!gameInProgress) {
      gameInProgress = true;
      animate();

    // Check gameover state
    } else if(gameover) {
      gameover = false;
      init();
      getRandomLayout();
      arkBricksLayout = new BricksLayout();
    } else {

      // Otherwise change pause state
      if(pause) {
        pause = false;
        animate();
      } else {
        pause = true;
      }
    }
  }

  // Generate random array
  getRandomLayout = function() {
    var j, elemNum,
        math = Math,
        randomLayout = [];

    // Let's generate elements for 4 rows
    elemNum = math.floor(canvasW / 50) * 4;

    for(j=0; j<elemNum; j++) {
      randomLayout.push(math.round(math.random(1)));
    }
    bricksLayer = randomLayout;
    return randomLayout;
  };

  // Save game state to the localStorage
  saveGameState = function() {

    // Check for localStorage support
    if(!('localStorage' in window) && window['localStorage'] === null) return false;

    var gameState = {};

    gameState.arkBall = {};
    gameState.arkBall.x = arkBall.x;
    gameState.arkBall.y = arkBall.y;
    gameState.arkBall.vx = arkBall.vx;
    gameState.arkBall.vy = arkBall.vy;
    
    gameState.arkDesk = {};
    gameState.arkDesk.x = arkDesk.x;
    gameState.arkDesk.y = arkDesk.y;

    gameState.bricksLayer = bricksLayer;

    localStorage["arkanoidGameState"] = JSON.stringify(gameState);
  };

  // Restore saved game from localStorage
  restoreSavedGame = function() {

    // Check for localStorage support
    if(!('localStorage' in window) && window['localStorage'] === null) return false;

    var savedGameState = JSON.parse(localStorage["arkanoidGameState"]);

    bricksLayer = savedGameState.bricksLayer;

    arkBall.x = savedGameState.arkBall.x;
    arkBall.y = savedGameState.arkBall.y;
    arkBall.vx = savedGameState.arkBall.vx;
    arkBall.vy = savedGameState.arkBall.vy;
    
    arkDesk.x = savedGameState.arkDesk.x;
    arkDesk.y = savedGameState.arkDesk.y;

    bricksLayer = savedGameState.bricksLayer;
    arkBricksLayout = new BricksLayout();
  };

  // Ball class
  Ball = function(x, y, vx, vy) {

    // Coordinates of top left corner
    this.x = x;
    this.y = y;

    // Ball's speed vector
    this.vx = vx;
    this.vy = vy;

    this.radius = 5;

    // TODO: Cache drawings or 
    this.draw = function() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, false);
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.closePath();
    };

    this.move = function() {
      this.x += this.vx;
      this.y += this.vy;

      arkCollisionManager.update(this);

      // Check for collisions
      arkCollisionManager.check(this);
    };

    // Add ball object to collisionManager
    arkCollisionManager.add(this);
  };

  // Desk class
  Desk = function(x, y) {
    this.x = x;
    this.y = y;
    this.width = 60;
    this.height = 12;

    this.draw = function() {
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    };

    // Add desk object to collisionManager
    arkCollisionManager.add(this);
  };

  // Brick class
  Brick = function(x, y, index) {
    this.x = x;
    this.y = y;
    this.height = 30;
    this.width = 40;
    this.index = index;

    this.draw = function() {
      ctx.fillStyle = 'green';
      ctx.fillRect(this.x, this.y, this.width, this.height);
    };

    this.collision = function() {

      // Change global array bricksLayer
      bricksLayer[this.index] = 0;
      activeBricksCounter--;

      if(activeBricksCounter === 0) {

        // Win
        // TODO: Make 'win' state in the game
        gameover = true;
        localStorage.removeItem("arkanoidGameState");
        showMessage("YOU WIN",
                    "Press <spacebar> to play again");
      }
    };

    // Add brick object to collisionManager
    arkCollisionManager.add(this);
  };

  // BrickLayout class.
  // Build random layout with bricks
  BricksLayout = function() {
    var i,
        math = Math,
        bricks = [],
        bLayerLen = bricksLayer.length,
        bricksInRow = math.floor(canvasW / 50);

    for(i=0; i<bLayerLen; i++) {

      if(bricksLayer[i] !== 0) {

        // Calculate bricks coordinates with some magic numbers
        // Add result to bricks array
        bricks[i] = new Brick(20 + i * 45 - 45 * bricksInRow * math.floor(i / bricksInRow),
            15 + math.floor(i / bricksInRow) * 35, i);
        activeBricksCounter++;
      } else {
        bricks[i] = 0;
      }
    }

    this.draw = function() {
      var i;

      for(i=0; i<bLayerLen; i++) {
        if(bricksLayer[i] !== 0) {
          bricks[i].draw();
        }
      }
    };

    this.remove = function() {
      bricks[this] = 0;
    };
  };

  // Handle all collisions in the game
  CollisionManager = function() {
    var colObjects = [];

    return {
      add: function(obj) {

        // Add new property to objects
        // globalIndex shows obj position in collisionManger's inner obj
        obj.globalIndex = colObjects.push(obj) - 1;
      },

      update: function(obj) {
        colObjects[obj.globalIndex] = obj;
      },

      // Mordor.
      // Collisions checker.
      // TODO: Improve the detection of collisions. 
      check: function(obj) {
        var i, currentObj;

        for(i = 0; i < colObjects.length; i++) {
          currentObj = colObjects[i];

          // Ignore null objects
          if(currentObj !== null ) {

            // Left side
            if(obj.vx < 0 &&
               obj.x === (currentObj.x + currentObj.width) &&
               obj.y + obj.radius >= currentObj.y &&
               obj.y + obj.radius <= currentObj.y + currentObj.height) {
            
              if(currentObj.hasOwnProperty('collision')) {
                currentObj.collision();
                colObjects[i] = null;
              }
              obj.vx *= -bounceFactor;
              break;
            }
            
            // Right side
            if(obj.vx > 0 &&
               obj.x === currentObj.x &&
               obj.y + obj.radius >= currentObj.y &&
               obj.y + obj.radius <= currentObj.y + currentObj.height) {

              if(currentObj.hasOwnProperty('collision')) {
                currentObj.collision();
                colObjects[i] = null;
              }
              obj.vx *= -bounceFactor;
              break;
            }

            // Top side
            if(obj.vy > 0 &&
               obj.y === currentObj.y &&
               obj.x + obj.radius >= currentObj.x &&
               obj.x + obj.radius <= currentObj.x + currentObj.width) {

              if(currentObj.hasOwnProperty('collision')) {
                currentObj.collision();
                colObjects[i] = null;
              }
              obj.vy *= -bounceFactor;
              break;
            }

            // Down side
            if(obj.vy < 0 &&
               obj.y === (currentObj.y + currentObj.height) &&
               obj.x + obj.radius >= currentObj.x &&
               obj.x + obj.radius <= currentObj.x + currentObj.width) {
              if(currentObj.hasOwnProperty('collision')) {
                currentObj.collision();
                colObjects[i] = null;
              }
              obj.vy *= -bounceFactor;
              break;
            }

            // Game over
            if(obj.x < 0 ||
               obj.y < 0 ||
               obj.x > canvasW ||
               obj.y > canvasH) {
              gameover = true;
              showMessage("GAME OVER",
                          "Press <spacebar> to start the game");
              break;
            }
          }
        }
      }
    };
  };

  // Iterate through all objects in processList
  processor = function() {
    var i,
        processList = [arkBall, arkDesk, arkBricksLayout],
        len = processList.length;

    if(!pause) {
      for(i = 0; i < len; i++) {
        processList[i].draw();

        // Move the object if we can
        if(processList[i].hasOwnProperty('move')) {
          processList[i].move();
        }
      }
    }
  };

  // Clear the whole canvas
  // TODO: clean the modified space only.
  clearCanvas = function() {
    ctx.clearRect(0, 0, canvasW, canvasH);
  };

  // Checks for the game state and run animation
  animate = function() {
    if(!gameover) {
      if(!pause && gameInProgress) {
        requestAnimFrame(animate);
        clearCanvas();
        processor();

        // TODO: propably we don't need to save each frame to localStorage
        saveGameState();

      } else if(pause) {
        showMessage("PAUSE", "");
        
      } else if(!gameInProgress) {
        if(!!localStorage["arkanoidGameState"]) {
          showMessage("Arkanoid",
                      "Press <spacebar> to continue saved game");

          restoreSavedGame();
        } else {
          showMessage("Arkanoid",
                      "Press <spacebar> to start the game");
        }
      }
    } else {

      // Clean localStorage when gave is over
      localStorage.removeItem("arkanoidGameState");
    }
  };

  // Shows different messages
  // TODO: Use another canvas or HTML element to display messages
  showMessage = function(textHeader, textMessage) {
    ctx.font = "bold 30px sans-serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(textHeader, canvasW / 2, canvasH / 2 - 20);
    if(textMessage !== "") {
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(textMessage, canvasW / 2, canvasH / 2 + 20);
    }
  };
  
  init = function() {
    activeBricksCounter = 0;
    arkCollisionManager = new CollisionManager();

    // Add canvas borders to collisionManager
    // TOP
    arkCollisionManager.add({'x': 0, 'y': 0, 'width': canvasW, 'height': 0});
    // LEFT
    arkCollisionManager.add({'x': 0, 'y': 0, 'width': 0, 'height': canvasH});
    // RIGHT
    arkCollisionManager.add({'x': canvasW, 'y': 0, 'width': 0, 'height': canvasH});
    
    arkBall = new Ball(canvasW - 50 , canvasH - 20, 5, -5);
    arkDesk = new Desk(canvasW / 2 - 30, canvasH - 20);

    // Generate new layout if we don't have any saved data
    if(!gameInProgress && !localStorage["arkanoidGameState"]) {
      getRandomLayout();
      arkBricksLayout = new BricksLayout();
    }

    animate();
  };

  // Run the game
  init();
})();