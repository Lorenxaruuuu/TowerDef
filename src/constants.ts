import { Point } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const GRID_SIZE = 50;

export interface MapData {
  id: string;
  name: string;
  path: Point[];
  thumbnail: string;
}

export const MAPS: MapData[] = [
  {
    id: 'classic',
    name: 'Classic Valley',
    path: [
      { x: 0, y: 120 },
      { x: 250, y: 120 },
      { x: 250, y: 375 },
      { x: 625, y: 375 },
      { x: 625, y: 180 },
      { x: 875, y: 180 },
      { x: 875, y: 625 },
      { x: 125, y: 625 },
      { x: 125, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/valley/200/150',
  },
  {
    id: 'serpentine',
    name: 'The Abyss S',
    path: [
      { x: 0, y: 125 },
      { x: 750, y: 125 },
      { x: 750, y: 310 },
      { x: 125, y: 310 },
      { x: 125, y: 500 },
      { x: 875, y: 500 },
      { x: 875, y: 680 },
      { x: 440, y: 680 },
      { x: 440, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/abyss/200/150',
  },
  {
    id: 'spiral',
    name: 'Fracture Point',
    path: [
      { x: 500, y: 0 },
      { x: 500, y: 180 },
      { x: 125, y: 180 },
      { x: 125, y: 560 },
      { x: 875, y: 560 },
      { x: 875, y: 180 },
      { x: 680, y: 180 },
      { x: 680, y: 375 },
      { x: 310, y: 375 },
      { x: 310, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/fracture/200/150',
  },
  {
    id: 'zigzag',
    name: 'Neon Zigzag',
    path: [
      { x: 0, y: 60 },
      { x: 930, y: 60 },
      { x: 60, y: 180 },
      { x: 930, y: 310 },
      { x: 60, y: 430 },
      { x: 930, y: 560 },
      { x: 500, y: 560 },
      { x: 500, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/zigzag/200/150',
  },
  {
    id: 'omega',
    name: 'Omega Loop',
    path: [
      { x: 0, y: 375 },
      { x: 180, y: 375 },
      { x: 180, y: 125 },
      { x: 810, y: 125 },
      { x: 810, y: 625 },
      { x: 180, y: 625 },
      { x: 180, y: 430 },
      { x: 500, y: 430 },
      { x: 500, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/omega/200/150',
  },
  {
    id: 'cross',
    name: 'Iron Cross',
    path: [
      { x: 0, y: 0 },
      { x: 1000, y: 750 },
      { x: 1000, y: 0 },
      { x: 0, y: 750 },
      { x: 500, y: 375 },
      { x: 500, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/cross/200/150',
  },
  {
    id: 'labyrinth',
    name: 'The Labyrinth',
    path: [
      { x: 0, y: 60 },
      { x: 125, y: 60 },
      { x: 125, y: 680 },
      { x: 250, y: 680 },
      { x: 250, y: 60 },
      { x: 375, y: 60 },
      { x: 375, y: 680 },
      { x: 500, y: 680 },
      { x: 500, y: 60 },
      { x: 625, y: 60 },
      { x: 625, y: 680 },
      { x: 750, y: 680 },
      { x: 750, y: 60 },
      { x: 875, y: 60 },
      { x: 875, y: 680 },
      { x: 935, y: 680 },
      { x: 935, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/labyrinth/200/150',
  },
  {
    id: 'double_back',
    name: 'Double Back',
    path: [
      { x: 0, y: 125 },
      { x: 875, y: 125 },
      { x: 875, y: 250 },
      { x: 125, y: 250 },
      { x: 125, y: 375 },
      { x: 875, y: 375 },
      { x: 875, y: 500 },
      { x: 125, y: 500 },
      { x: 125, y: 625 },
      { x: 875, y: 625 },
      { x: 500, y: 625 },
      { x: 500, y: 730 },
    ],
    thumbnail: 'https://picsum.photos/seed/doubleback/200/150',
  }
];

export const DIFFICULTIES = {
  easy: {
    multiplier: 0.8,
    startingMoney: 300,
    startingLives: 30,
    description: "More starting money and lives. Enemies are weaker and spawn slower. Perfect for beginners.",
  },
  medium: {
    multiplier: 1.0,
    startingMoney: 200,
    startingLives: 20,
    description: "Standard balance of resources and enemy strength. The intended experience.",
  },
  hard: {
    multiplier: 1.5,
    startingMoney: 150,
    startingLives: 10,
    description: "Limited resources and fewer lives. Enemies are tougher and spawn in larger groups. For veterans only.",
  },
};

export const TOWER_TYPES = {
  archer: {
    name: 'Archer',
    cost: 50,
    range: 150,
    damage: 10,
    fireRate: 1.5,
    color: '#4ade80',
    description: 'Fast firing, short range.',
  },
  frost: {
    name: 'Frost',
    cost: 100,
    range: 130,
    damage: 5,
    fireRate: 1.2,
    color: '#60a5fa',
    description: 'Slows enemies down significantly.',
  },
  cannon: {
    name: 'Cannon',
    cost: 150,
    range: 100,
    damage: 50,
    fireRate: 0.5,
    color: '#f87171',
    description: 'Massive damage, very slow.',
  },
  laser: {
    name: 'Laser',
    cost: 250,
    range: 140,
    damage: 5, // Damage per tick
    fireRate: 10, // Ticks per second
    color: '#c084fc',
    description: 'Continuous beam of energy.',
  },
  sniper: {
    name: 'Sniper',
    cost: 200,
    range: 300,
    damage: 80,
    fireRate: 0.3,
    color: '#94a3b8',
    description: 'Extreme range, one-shot potential.',
  },
  chain: {
    name: 'Tesla',
    cost: 175,
    range: 160,
    damage: 15,
    fireRate: 1.0,
    color: '#fbbf24',
    description: 'Lightning that bounces between enemies.',
  },
};

export const ENEMY_TYPES = {
  normal: {
    health: 50,
    speed: 1.5,
    value: 10,
    color: '#fbbf24',
  },
  fast: {
    health: 30,
    speed: 3,
    value: 15,
    color: '#f472b6',
  },
  tank: {
    health: 150,
    speed: 0.8,
    value: 30,
    color: '#94a3b8',
  },
  boss: {
    health: 1000,
    speed: 0.5,
    value: 200,
    color: '#ef4444',
  }
};
