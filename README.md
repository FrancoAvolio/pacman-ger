# Ready, Geral?

A small 3D maze-chase game made as a personal gift. It runs entirely in the
browser with React, TypeScript, Three.js, React Three Fiber, Drei, and Zustand.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use arrow keys or WASD to move, `P`/`Esc`
to pause, and `R` to restart the current game.

## Validate it

```bash
npm run check
npm run test:coverage
npm run smoke
# or run the full test suite plus browser smoke test:
npm run test:all
```

The main check validates maze topology and spawn counts, runs the unit/UI suite,
ESLint, and the TypeScript production build. Coverage has enforced minimums for
game logic, store, controls, and HTML UI. The smoke test opens an installed
Chrome/Edge, moves the player, collects pellets, pauses, resumes, restarts, and
confirms that the WebGL canvas rendered. Set `CHROME_PATH` if the browser is
installed in a non-standard location.

## Audio

The default sounds are synthesized in the browser. See `public/audio/README.md`
to replace individual cues with custom files without changing the game loop.
