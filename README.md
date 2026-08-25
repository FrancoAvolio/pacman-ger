# Ready, Geral?

A small three-level 3D maze-chase campaign made as a personal gift. It runs
entirely in the browser with React, TypeScript, Three.js, React Three Fiber,
Drei, and Zustand.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use arrow keys or WASD to move, `P`/`Esc`
to pause, `M` to mute, and `R` to start a new campaign. On touch devices,
swipe directly over the game to queue turns.

Score and remaining lives carry across all three levels. Every maze includes a
bidirectional side tunnel and offers one timed 1000-point train ticket after
roughly 60% of its pellets have been collected.

## Validate it

```bash
npm run check
npm run test:coverage
npm run smoke
# or run the full test suite plus browser smoke test:
npm run test:all
```

The main check validates all three maze topologies, tunnel connectivity,
collectible reachability, and spawn counts; then it runs ESLint, the unit/UI
suite, and the TypeScript production build. Coverage has enforced minimums for
game logic, store, controls, and HTML UI. The smoke test opens an installed
Chrome/Edge in desktop and mobile viewports, verifies keyboard and swipe
movement, pause, restart, mute, responsive layout, and WebGL rendering. Set
`CHROME_PATH` if the browser is installed in a non-standard location.

## Audio

The default sounds are synthesized in the browser. See `public/audio/README.md`
to replace individual cues with custom files without changing the game loop.
