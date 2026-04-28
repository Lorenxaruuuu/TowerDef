export interface Point {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: 'normal' | 'fast' | 'tank' | 'boss';
  health: number;
  maxHealth: number;
  speed: number;
  originalSpeed: number;
  slowTimer: number; // Time remaining for slow effect
  distance: number; // Distance traveled along the path
  x: number;
  y: number;
  value: number;
}

export interface Tower {
  id: string;
  type: 'archer' | 'frost' | 'cannon' | 'laser' | 'sniper' | 'chain';
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number; // Shots per second
  lastFireTime: number;
  cost: number;
  level: number;
  upgradeCost: number;
  targetIds?: string[]; // For multi-target towers like upgraded laser
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  slowEffect?: boolean;
  bouncesRemaining?: number;
  hitEnemyIds?: string[];
}

export interface GameState {
  money: number;
  lives: number;
  round: number;
  isRoundActive: boolean;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  enemiesSpawned: number;
  enemiesToSpawn: number;
  lastSpawnTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mapId: string;
  gameStatus: 'menu' | 'playing' | 'gameover';
}
