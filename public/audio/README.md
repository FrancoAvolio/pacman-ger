# Custom audio

The game currently uses tiny Web Audio synthesizer cues, so missing files never
break the build. To use custom sounds, place them in this folder and map their
public URLs (for example `/audio/pellet.mp3`) in `src/game/audio.ts` under
`CUSTOM_AUDIO`.

Supported cues: `pellet`, `power`, `ghostEaten`, `death`, `ticketSpawn`,
`ticketCollect`, `levelComplete`, and `gameComplete`.
