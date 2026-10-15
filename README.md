# An Icy Cuisine — Fish Bones

A small arcade game in plain HTML, CSS and JavaScript. Swim up and down to catch fish, dodge bones, glaciers and predators.

Open `https://fish-bones.vercel.app/` in a browser to play — no build step needed.

## Controls
- **Desktop:** ↑ / ↓ to swim, ← / → to dash, Esc or P to pause, M to mute
- **Mobile:** joystick on the left, dash buttons on the right (play in landscape)

## Project layout
```
index.html        page structure (all screens)
css/
  base.css        colours, screens, buttons
  menus.css       title sign, selection cards, game-over
  game.css        game screen, HUD, touch controls
js/               loaded in this order:
  data.js         characters, difficulty tuning, player setup, high score
  audio.js        sound effects + generated music (Web Audio)
  sprites.js      canvas drawings of every character and item (animated)
  scenery.js      underwater backdrop: day/night water, light rays, ice, seabed
  screens.js      screen switching, viewport helpers
  input.js        keyboard + touch joystick
  game.js         game loop: spawning, collisions, drawing
  menus.js        menu flow and buttons
  snow.js         menu snowfall + animated character cards
  main.js         boot
```

© Ammara Badat 2026
