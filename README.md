Arkanoid game
===
Early beta version

[Play the demo](http://evgenysyrkashev.com/arkanoid)

Known issues
---
* Collision detection doesn't work when the ball hit a corner of a brick.
* If you have saved game state and then have changed canvas size, game reloads with old coordinates.

TODO list
---
* Split main.js to modules and load them with Require.js
* Add the score system
* Make the game run in fullscreen and change the scales of  the game elements
* Improve collisionManager's check method. Make a grid system and check for collisions in the grid cells which are around the ball only.
