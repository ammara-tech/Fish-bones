# An Icy Cuisine — Fish Bones

A small arcade game in plain HTML, CSS and JavaScript. Swim up and down to catch fish, dodge bones, glaciers and predators.

Open `https://fish-bones.vercel.app/` in a browser to play — no build step needed.

## Controls
- **Keyboard:** ↑ / ↓ (or W / S) to swim, ← / → (or A / D) to dash, Esc or P to pause, M to mute
- **Two players (one keyboard):** Player 1 uses the arrow keys, Player 2 uses W A S D
- **Mobile:** joystick on the left, dash buttons on the right (play in landscape)

## Features
- 4 prey and 4 predators, each with their own strengths, and 5 levels including a Boss Level
- Waves every 30 seconds, combos, golden fish, pufferfish and close-call bonuses
- 6 power-ups: Shield, Magnet, Slow-mo, Double, Speed and Freeze
- Animated characters, a day-to-night underwater cycle and snowy menus
- 14 achievements that unlock new characters, plus a Daily Challenge with streaks and a share button
- Two-player mode on one keyboard
- Settings for music and sound volume and "reduce motion"; best score saved for each level

## Project layout
```
index.html        page structure (all screens)
css/
  base.css        colours, screens, buttons
  menus.css       title sign, selection cards, game-over
  game.css        game screen, HUD, touch controls
js/               loaded in this order:
  data.js         characters, difficulty, waves/combos tuning, player setup, high scores
  settings.js     volume and reduce-motion preferences
  audio.js        sound effects + generated music (Web Audio)
  sprites.js      canvas drawings of every character and item (animated)
  scenery.js      underwater backdrop: day/night water, light rays, ice, seabed
  progress.js     achievements, unlockable characters, daily challenge
  screens.js      screen switching, viewport helpers, pop-up toasts
  input.js        keyboard + touch joystick
  game.js         game loop for 1 or 2 players: spawning, collisions, drawing
  menus.js        menu flow and buttons
  snow.js         menu snowfall + animated character cards
  main.js         boot
```

© Ammara Badat 2026
