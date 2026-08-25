export type GridPosition = {
  row: number
  col: number
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'

export type MazeCell = '#' | '.' | 'o' | 'P' | 'G' | ' '

export type GameStatus =
  | 'ready'
  | 'playing'
  | 'paused'
  | 'dying'
  | 'game-over'
  | 'level-complete'
  | 'level-ready'
  | 'campaign-complete'

export type GhostState = 'CHASE' | 'SCATTER' | 'FRIGHTENED' | 'EATEN'

export type GhostPersonality = 'RED' | 'PINK' | 'CYAN' | 'ORANGE'
