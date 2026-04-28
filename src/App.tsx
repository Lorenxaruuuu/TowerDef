/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Coins, 
  Heart, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight,
  Crosshair,
  Zap,
  Bomb,
  Info,
  Snowflake,
  Move
} from 'lucide-react';
import { 
  Point, 
  Enemy, 
  Tower, 
  Projectile, 
  GameState 
} from './types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  MAPS,
  DIFFICULTIES,
  TOWER_TYPES, 
  ENEMY_TYPES 
} from './constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    money: 200,
    lives: 20,
    round: 0,
    isRoundActive: false,
    enemies: [],
    towers: [],
    projectiles: [],
    enemiesSpawned: 0,
    enemiesToSpawn: 0,
    lastSpawnTime: 0,
    difficulty: 'medium',
    mapId: 'classic',
    gameStatus: 'menu',
  });

  const [selectedTowerType, setSelectedTowerType] = useState<keyof typeof TOWER_TYPES | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showRoundCleared, setShowRoundCleared] = useState(false);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const currentMap = MAPS.find(m => m.id === gameState.mapId) || MAPS[0];
  const PATH = currentMap.path;

  // Helper to calculate position along path
  const getPositionOnPath = useCallback((distance: number): Point => {
    let currentDist = 0;
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i + 1];
      const segmentDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      
      if (currentDist + segmentDist >= distance) {
        const ratio = (distance - currentDist) / segmentDist;
        return {
          x: p1.x + (p2.x - p1.x) * ratio,
          y: p1.y + (p2.y - p1.y) * ratio,
        };
      }
      currentDist += segmentDist;
    }
    return PATH[PATH.length - 1];
  }, [PATH]);

  const getPathLength = useCallback(() => {
    let length = 0;
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i + 1];
      length += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    return length;
  }, [PATH]);

  const PATH_LENGTH = useMemo(() => getPathLength(), [getPathLength]);

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(null);

  const startGame = (mapId: string, difficulty: keyof typeof DIFFICULTIES) => {
    const config = DIFFICULTIES[difficulty];
    setGameState({
      money: config.startingMoney,
      lives: config.startingLives,
      round: 0,
      isRoundActive: false,
      enemies: [],
      towers: [],
      projectiles: [],
      enemiesSpawned: 0,
      enemiesToSpawn: 0,
      lastSpawnTime: 0,
      difficulty,
      mapId,
      gameStatus: 'playing',
    });
  };

  const startRound = () => {
    const nextRound = gameState.round + 1;
    const diffConfig = DIFFICULTIES[gameState.difficulty];
    setGameState(prev => ({
      ...prev,
      round: nextRound,
      isRoundActive: true,
      enemiesSpawned: 0,
      enemiesToSpawn: Math.floor((5 + nextRound * 2) * diffConfig.multiplier),
      lastSpawnTime: Date.now(),
    }));
    setShowRoundCleared(false);
    setNextRoundCountdown(null);
  };

  const update = useCallback((time: number) => {
    if (isPaused) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    const current = gameStateRef.current;

    // 1. Handle Spawning
    let newEnemiesSpawned = current.enemiesSpawned;
    let newLastSpawnTime = current.lastSpawnTime;
    const enemiesToSpawnThisFrame: Enemy[] = [];

    if (current.isRoundActive && current.enemiesSpawned < current.enemiesToSpawn) {
      const spawnInterval = Math.max(400, 2000 - current.round * 100);
      if (Date.now() - current.lastSpawnTime > spawnInterval) {
        const types: (keyof typeof ENEMY_TYPES)[] = ['normal'];
        if (current.round > 2) types.push('fast');
        if (current.round > 5) types.push('tank');
        if (current.round % 10 === 0) types.push('boss');

        const type = types[Math.floor(Math.random() * types.length)];
        const baseStats = ENEMY_TYPES[type];
        let healthMultiplier = (1 + (current.round - 1) * 0.2) * (current.difficulty === 'hard' ? 1.5 : current.difficulty === 'easy' ? 0.8 : 1);
        
        // Extra scaling for bosses
        if (type === 'boss') {
          healthMultiplier *= (1 + Math.floor(current.round / 10) * 0.5);
        }
        
        const newEnemy: Enemy = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          health: baseStats.health * healthMultiplier,
          maxHealth: baseStats.health * healthMultiplier,
          speed: baseStats.speed,
          originalSpeed: baseStats.speed,
          slowTimer: 0,
          distance: 0,
          x: currentMap.path[0].x,
          y: currentMap.path[0].y,
          value: baseStats.value,
        };
        
        enemiesToSpawnThisFrame.push(newEnemy);
        newEnemiesSpawned += 1;
        newLastSpawnTime = Date.now();
      }
    }

    // 2. Update Enemies
    const updatedEnemies: Enemy[] = [...current.enemies, ...enemiesToSpawnThisFrame];
    const remainingEnemies: Enemy[] = [];
    let livesLost = 0;
    
    updatedEnemies.forEach(enemy => {
      // Handle slow effect decay
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= deltaTime;
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.originalSpeed;
          enemy.slowTimer = 0;
        }
      }

      const newDistance = enemy.distance + enemy.speed * 60 * deltaTime;
      if (newDistance >= PATH_LENGTH) {
        livesLost += 1;
      } else {
        const pos = getPositionOnPath(newDistance);
        remainingEnemies.push({
          ...enemy,
          distance: newDistance,
          x: pos.x,
          y: pos.y,
        });
      }
    });

    // 3. Update Towers & Fire
    const newProjectiles: Projectile[] = [];
    let moneyGained = 0;
    const updatedTowers = current.towers.map(tower => {
      let lastFire = tower.lastFireTime;
      let targetIds: string[] = [];
      const fireInterval = 1000 / tower.fireRate;
      
      if (tower.type === 'laser') {
        // Multi-target logic: 1 target base, +1 every 3 levels
        const maxTargets = 1 + Math.floor((tower.level - 1) / 3);
        
        const targets = remainingEnemies
          .filter(e => {
            const dist = Math.sqrt(Math.pow(e.x - tower.x, 2) + Math.pow(e.y - tower.y, 2));
            return dist <= tower.range;
          })
          .sort((a, b) => b.distance - a.distance)
          .slice(0, maxTargets);
        
        targetIds = targets.map(t => t.id);
        
        targets.forEach(target => {
          target.health -= tower.damage * deltaTime * 10; // Continuous damage
          if (target.health <= 0) {
            const index = remainingEnemies.indexOf(target);
            if (index > -1) {
              moneyGained += target.value;
              remainingEnemies.splice(index, 1);
            }
          }
        });
      } else {
        if (Date.now() - lastFire > fireInterval) {
          // Find target (closest to end of path)
          const target = remainingEnemies
            .filter(e => {
              const dist = Math.sqrt(Math.pow(e.x - tower.x, 2) + Math.pow(e.y - tower.y, 2));
              return dist <= tower.range;
            })
            .sort((a, b) => b.distance - a.distance)[0];

          if (target) {
            newProjectiles.push({
              id: Math.random().toString(36).substr(2, 9),
              x: tower.x,
              y: tower.y,
              targetId: target.id,
              damage: tower.damage,
              speed: tower.type === 'sniper' ? 1200 : 600,
              slowEffect: tower.type === 'frost',
              bouncesRemaining: tower.type === 'chain' ? 4 : 0,
              hitEnemyIds: tower.type === 'chain' ? [target.id] : [],
            });
            lastFire = Date.now();
          }
        }
      }
      return { ...tower, lastFireTime: lastFire, targetIds };
    });

    // 4. Update Projectiles
    const currentProjectiles = [...current.projectiles, ...newProjectiles];
    const remainingProjectiles: Projectile[] = [];
    
    currentProjectiles.forEach(proj => {
      const target = remainingEnemies.find(e => e.id === proj.targetId);
      if (!target) return;

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = proj.speed * deltaTime;

      if (dist <= moveDist) {
        target.health -= proj.damage;
        
        // Apply slow effect
        if (proj.slowEffect) {
          target.speed = target.originalSpeed * 0.4; // 60% slow
          target.slowTimer = 2.0; // 2 seconds
        }

        // Handle Bouncing
        if (proj.bouncesRemaining && proj.bouncesRemaining > 0) {
          const nextTarget = remainingEnemies
            .filter(e => e.id !== target.id && !proj.hitEnemyIds?.includes(e.id))
            .map(e => ({
              enemy: e,
              dist: Math.sqrt(Math.pow(e.x - target.x, 2) + Math.pow(e.y - target.y, 2))
            }))
            .filter(e => e.dist < 150) // Bounce range
            .sort((a, b) => a.dist - b.dist)[0];

          if (nextTarget) {
            remainingProjectiles.push({
              ...proj,
              x: target.x,
              y: target.y,
              targetId: nextTarget.enemy.id,
              bouncesRemaining: proj.bouncesRemaining - 1,
              hitEnemyIds: [...(proj.hitEnemyIds || []), nextTarget.enemy.id],
            });
          }
        }

        if (target.health <= 0) {
          const index = remainingEnemies.indexOf(target);
          if (index > -1) {
            moneyGained += target.value;
            remainingEnemies.splice(index, 1);
          }
        }
      } else {
        remainingProjectiles.push({
          ...proj,
          x: proj.x + (dx / dist) * moveDist,
          y: proj.y + (dy / dist) * moveDist,
        });
      }
    });

    // Check round clear
    let roundActive = current.isRoundActive;
    let showClear = showRoundCleared;
    if (roundActive && newEnemiesSpawned >= current.enemiesToSpawn && remainingEnemies.length === 0) {
      roundActive = false;
      showClear = true;
      setNextRoundCountdown(10);
    }

    setGameState(prev => ({
      ...prev,
      money: prev.money + moneyGained,
      lives: Math.max(0, prev.lives - livesLost),
      enemies: remainingEnemies,
      towers: updatedTowers,
      projectiles: remainingProjectiles,
      isRoundActive: roundActive,
      enemiesSpawned: newEnemiesSpawned,
      lastSpawnTime: newLastSpawnTime,
    }));

    if (showClear && !showRoundCleared) {
      setShowRoundCleared(true);
    }

    requestRef.current = requestAnimationFrame(update);
  }, [isPaused, showRoundCleared, PATH_LENGTH, getPositionOnPath]);


  useEffect(() => {
    if (nextRoundCountdown === null || isPaused || !showRoundCleared) return;

    if (nextRoundCountdown <= 0) {
      startRound();
      return;
    }

    const timer = setInterval(() => {
      setNextRoundCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [nextRoundCountdown, isPaused, showRoundCleared]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Space Background (Stars)
    ctx.save();
    const seed = gameState.mapId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 150; i++) {
      const x = ((Math.abs(Math.sin(i * 12345.67 + seed))) * 1000) % CANVAS_WIDTH;
      const y = ((Math.abs(Math.cos(i * 54321.09 + seed))) * 1000) % CANVAS_HEIGHT;
      const size = (i % 3) + 1;
      const opacity = 0.1 + (Math.abs(Math.sin(Date.now() / 1000 + i)) * 0.4);
      ctx.fillStyle = i % 10 === 0 ? '#60a5fa' : i % 15 === 0 ? '#f87171' : '#ffffff';
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw Grid (Subtle)
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw Path
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 50;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    PATH.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 44;
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 38;
    ctx.stroke();

    // Draw Map Landmarks (Spawn and Nexus)
    const startNode = PATH[0];
    const endNode = PATH[PATH.length - 1];

    // Spawn Portal
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#3b82f6';
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(startNode.x, startNode.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Spinning ring
    ctx.beginPath();
    ctx.setLineDash([10, 5]);
    ctx.arc(startNode.x, startNode.y, 32 + Math.sin(Date.now() / 200) * 3, (Date.now() / 500), (Date.now() / 500) + Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Nexus
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const nexusSize = 30 + Math.sin(Date.now() / 300) * 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = endNode.x + nexusSize * Math.cos(angle);
      const y = endNode.y + nexusSize * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Core glow
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(endNode.x, endNode.y, 10 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Laser Beams
    gameState.towers.forEach(tower => {
      if (tower.type === 'laser' && tower.targetIds && tower.targetIds.length > 0) {
        tower.targetIds.forEach(id => {
          const target = gameState.enemies.find(e => e.id === id);
          if (target) {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 3 + Math.sin(Date.now() / 50) * 2;
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            
            // Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#c084fc';
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        });
      }
    });

    // Draw Nexus (Base)
    const lastPoint = PATH[PATH.length - 1];
    ctx.save();
    ctx.translate(lastPoint.x, lastPoint.y);
    
    // Outer Glow
    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();

    // Hexagon Core
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * 25;
      const y = Math.sin(angle) * 25;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Inner Detail
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = Math.cos(angle) * 15;
      const y = Math.sin(angle) * 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
    ctx.shadowBlur = 0;

    // Draw Towers
    gameState.towers.forEach(tower => {
      const stats = TOWER_TYPES[tower.type];
      
      // Range circle on hover or selection
      if (mousePos && Math.sqrt(Math.pow(mousePos.x - tower.x, 2) + Math.pow(mousePos.y - tower.y, 2)) < 20) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = stats.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
      ctx.fill();
      
      // Tower detail
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Weapon
      ctx.strokeStyle = stats.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y);
      const angle = Date.now() / 1000; // Just rotate for visual
      ctx.lineTo(tower.x + Math.cos(angle) * 12, tower.y + Math.sin(angle) * 12);
      ctx.stroke();

      // Upgrade Indicator (Rank)
      if (tower.level > 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('★'.repeat(Math.min(3, tower.level - 1)), tower.x, tower.y + 30);
        
        // Glow for high level
        if (tower.level > 3) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, 22, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    });

    // Draw Enemies
    gameState.enemies.forEach(enemy => {
      const stats = ENEMY_TYPES[enemy.type];
      
      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = stats.color;
      
      ctx.fillStyle = stats.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Boss Horns
      if (enemy.type === 'boss') {
        ctx.fillStyle = '#ef4444';
        // Left Horn
        ctx.beginPath();
        ctx.moveTo(enemy.x - 8, enemy.y - 8);
        ctx.lineTo(enemy.x - 15, enemy.y - 20);
        ctx.lineTo(enemy.x - 2, enemy.y - 12);
        ctx.fill();
        // Right Horn
        ctx.beginPath();
        ctx.moveTo(enemy.x + 8, enemy.y - 8);
        ctx.lineTo(enemy.x + 15, enemy.y - 20);
        ctx.lineTo(enemy.x + 2, enemy.y - 12);
        ctx.fill();
      }
      
      ctx.shadowBlur = 0;

      // Health bar
      const barWidth = 24;
      const healthPercent = enemy.health / enemy.maxHealth;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 20, barWidth, 4);
      ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.2 ? '#eab308' : '#ef4444';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 20, barWidth * healthPercent, 4);

      // Health Number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(enemy.health).toString(), enemy.x, enemy.y - 25);
    });

    // Draw Projectiles
    gameState.projectiles.forEach(proj => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Trail
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Placement Ghost
    if (selectedTowerType && mousePos) {
      const stats = TOWER_TYPES[selectedTowerType];
      
      // Check if too close to path
      const isNearPath = PATH.some((p, i) => {
        if (i === PATH.length - 1) return false;
        const p1 = p;
        const p2 = PATH[i + 1];
        const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(mousePos.x - p1.x, 2) + Math.pow(mousePos.y - p1.y, 2)) < 30;
        let t = ((mousePos.x - p1.x) * (p2.x - p1.x) + (mousePos.y - p1.y) * (p2.y - p1.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const dist = Math.sqrt(Math.pow(mousePos.x - (p1.x + t * (p2.x - p1.x)), 2) + Math.pow(mousePos.y - (p1.y + t * (p2.y - p1.y)), 2));
        return dist < 35;
      });

      const isNearTower = gameState.towers.some(t => {
        return Math.sqrt(Math.pow(mousePos.x - t.x, 2) + Math.pow(mousePos.y - t.y, 2)) < 30;
      });

      const canPlace = gameState.money >= stats.cost && !isNearPath && !isNearTower;
      
      // Draw placement shadow and range
      ctx.save();
      ctx.fillStyle = canPlace ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.strokeStyle = canPlace ? '#4ade80' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, stats.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw tower footprint helper
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = stats.color;
      ctx.globalAlpha = canPlace ? 0.6 : 0.2;
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

  }, [gameState, mousePos, selectedTowerType, selectedTowerId]);

  const sellTower = (towerId: string) => {
    setGameState(prev => {
      const tower = prev.towers.find(t => t.id === towerId);
      if (!tower) return prev;
      
      const refund = Math.floor(tower.cost * 0.5);
      
      return {
        ...prev,
        money: prev.money + refund,
        towers: prev.towers.filter(t => t.id !== towerId),
      };
    });
    setSelectedTowerId(null);
  };

  const upgradeTower = (towerId: string) => {
    setGameState(prev => {
      const towerIndex = prev.towers.findIndex(t => t.id === towerId);
      if (towerIndex === -1) return prev;
      
      const tower = prev.towers[towerIndex];
      if (prev.money < tower.upgradeCost) return prev;

      const updatedTowers = [...prev.towers];
      updatedTowers[towerIndex] = {
        ...tower,
        level: tower.level + 1,
        damage: tower.damage * 1.5,
        range: tower.range * 1.1,
        fireRate: tower.fireRate * 1.1,
        upgradeCost: Math.floor(tower.upgradeCost * 1.8),
      };

      return {
        ...prev,
        money: prev.money - tower.upgradeCost,
        towers: updatedTowers,
      };
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mousePos) return;

    // Check if clicking an existing tower
    const clickedTower = gameState.towers.find(t => {
      return Math.sqrt(Math.pow(mousePos.x - t.x, 2) + Math.pow(mousePos.y - t.y, 2)) < 20;
    });

    if (clickedTower) {
      setSelectedTowerId(clickedTower.id);
      setSelectedTowerType(null);
      return;
    }

    if (!selectedTowerType) {
      setSelectedTowerId(null);
      return;
    }
    
    const stats = TOWER_TYPES[selectedTowerType];
    if (gameState.money < stats.cost) return;

    // Check if too close to path
    const isNearPath = PATH.some((p, i) => {
      if (i === PATH.length - 1) return false;
      const p1 = p;
      const p2 = PATH[i + 1];
      
      // Distance from point to line segment
      const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
      if (l2 === 0) return Math.sqrt(Math.pow(mousePos.x - p1.x, 2) + Math.pow(mousePos.y - p1.y, 2)) < 30;
      let t = ((mousePos.x - p1.x) * (p2.x - p1.x) + (mousePos.y - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const dist = Math.sqrt(Math.pow(mousePos.x - (p1.x + t * (p2.x - p1.x)), 2) + Math.pow(mousePos.y - (p1.y + t * (p2.y - p1.y)), 2));
      return dist < 35;
    });

    if (isNearPath) return;

    // Check if too close to other towers
    const isNearTower = gameState.towers.some(t => {
      return Math.sqrt(Math.pow(mousePos.x - t.x, 2) + Math.pow(mousePos.y - t.y, 2)) < 30;
    });

    if (isNearTower) return;
    
    const newTower: Tower = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedTowerType,
      x: mousePos.x,
      y: mousePos.y,
      range: stats.range,
      damage: stats.damage,
      fireRate: stats.fireRate,
      lastFireTime: 0,
      cost: stats.cost,
      level: 1,
      upgradeCost: Math.floor(stats.cost * 1.5),
      targetIds: [],
    };

    setGameState(prev => ({
      ...prev,
      money: prev.money - stats.cost,
      towers: [...prev.towers, newTower],
    }));
    
    if (!e.shiftKey) setSelectedTowerType(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Calculate scale factors in case the canvas is CSS-scaled
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    setMousePos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    });
  };

  const resetGame = () => {
    setGameState(prev => ({
      money: 200,
      lives: 20,
      round: 0,
      isRoundActive: false,
      enemies: [],
      towers: [],
      projectiles: [],
      enemiesSpawned: 0,
      enemiesToSpawn: 0,
      lastSpawnTime: 0,
      difficulty: prev.difficulty,
      mapId: prev.mapId,
      gameStatus: 'menu',
    }));
    setShowRoundCleared(false);
    setIsPaused(false);
    setSelectedTowerId(null);
    setSelectedTowerType(null);
  };

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30 overflow-auto flex">
      <AnimatePresence>
        {gameState.gameStatus === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-8"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="flex flex-col justify-center">
                <h1 className="text-7xl font-black text-white mb-4 tracking-tighter leading-none italic uppercase">VOID<br/><span className="text-blue-500">BREACH</span></h1>
                <p className="text-slate-400 text-lg mb-8 max-w-md border-l-4 border-blue-600 pl-4">The void is leaking. Strategize, build, and upgrade your defenses to protect the Nexus from total annihilation.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-3 block">Select Difficulty</label>
                    <div className="flex gap-3 mb-4">
                      {(Object.keys(DIFFICULTIES) as Array<keyof typeof DIFFICULTIES>).map(d => (
                        <button
                          key={d}
                          onClick={() => setGameState(prev => ({ ...prev, difficulty: d }))}
                          className={`px-6 py-3 rounded-xl font-bold transition-all border-2 ${gameState.difficulty === d ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          {d.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <motion.p 
                      key={gameState.difficulty}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-slate-400 italic bg-slate-900/50 p-3 rounded-lg border border-slate-800"
                    >
                      {DIFFICULTIES[gameState.difficulty].description}
                    </motion.p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl flex flex-col h-[500px]">
                <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 block">Select Map</label>
                <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                  {MAPS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => startGame(m.id, gameState.difficulty)}
                      className="group relative h-32 min-h-[128px] rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-blue-500 transition-all shrink-0"
                    >
                      <img src={m.thumbnail} alt={m.name} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-white group-hover:scale-110 transition-transform">{m.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Shop */}
      <div className="w-80 h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight italic">NEXUS</h2>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-black font-mono">{gameState.money}</span>
            </div>
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-2xl font-black font-mono">{gameState.lives}</span>
            </div>
          </div>
        </div>

        {/* Selected Tower Upgrade - Relocated to top for visibility */}
        <AnimatePresence>
          {selectedTowerId && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-5 bg-blue-600/10 rounded-3xl border border-blue-500/30">
                {(() => {
                  const tower = gameState.towers.find(t => t.id === selectedTowerId);
                  if (!tower) return null;
                  const stats = TOWER_TYPES[tower.type];
                  const canAfford = gameState.money >= tower.upgradeCost;

                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-lg uppercase tracking-tight">{stats.name} <span className="text-blue-500">LVL {tower.level}</span></h3>
                        <button onClick={() => setSelectedTowerId(null)} className="text-slate-500 hover:text-white transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Damage</span>
                          <span className="text-white font-black">{Math.round(tower.damage)}</span>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Range</span>
                          <span className="text-white font-black">{Math.round(tower.range)}</span>
                        </div>
                        {tower.type === 'laser' && (
                          <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800 col-span-2">
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Targets</span>
                            <span className="text-white font-black">{1 + Math.floor((tower.level - 1) / 3)}</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                          onClick={() => upgradeTower(tower.id)}
                          disabled={!canAfford}
                          className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${canAfford ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                          UPGRADE
                          <span className="flex items-center gap-1 text-amber-500">
                            <Coins className="w-3 h-3" />
                            {tower.upgradeCost}
                          </span>
                        </button>
                        <button
                          onClick={() => sellTower(tower.id)}
                          className="py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30"
                        >
                          <RotateCcw className="w-4 h-4" />
                          SELL
                          <span className="flex items-center gap-1 text-amber-500">
                            <Coins className="w-3 h-3" />
                            {Math.floor(tower.cost * 0.5)}
                          </span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 block">Tower Shop</label>
          <div className="grid grid-cols-1 gap-3">
            {(Object.entries(TOWER_TYPES) as [keyof typeof TOWER_TYPES, any][]).map(([type, stats]) => {
              const Icon = type === 'archer' ? Crosshair : type === 'frost' ? Snowflake : type === 'cannon' ? Bomb : type === 'laser' ? Zap : type === 'chain' ? Zap : Crosshair;
              const isSelected = selectedTowerType === type;
              const canAfford = gameState.money >= stats.cost;

              return (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedTowerType(isSelected ? null : type);
                    setSelectedTowerId(null);
                  }}
                  disabled={!canAfford && !isSelected}
                  className={`
                    relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left
                    ${isSelected 
                      ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'}
                    ${!canAfford && !isSelected ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{stats.name}</span>
                      <span className="text-amber-500 font-bold text-sm flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {stats.cost}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-slate-400 leading-tight flex-1">{stats.description}</p>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="px-2 py-0.5 bg-slate-900/50 rounded text-[10px] font-bold text-blue-400 border border-slate-800">
                          DMG: {stats.damage}
                        </div>
                        <div className="px-2 py-0.5 bg-slate-900/50 rounded text-[10px] font-bold text-emerald-400 border border-slate-800">
                          RNG: {stats.range}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button 
            onClick={() => setGameState(prev => ({ ...prev, gameStatus: 'menu' }))}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>

      {/* Game Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-40">
          <div className="px-5 py-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Round</span>
              <span className="text-xl font-black text-white">{gameState.round}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Map</span>
              <span className="text-sm font-bold text-slate-300">{currentMap.name}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="w-10 h-10 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white" />}
            </button>
            <button 
              onClick={resetGame}
              className="w-10 h-10 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="relative w-full h-full flex items-center justify-center px-4 pt-16 pb-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
            onMouseLeave={() => setMousePos(null)}
            className="max-w-full max-h-full object-contain bg-[#0f172a] rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-8 border-slate-900 cursor-crosshair"
          />

          <AnimatePresence>
            {gameState.lives <= 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-[2rem] z-50"
              >
                <h2 className="text-7xl font-black text-white mb-2 tracking-tighter">BREACHED</h2>
                <p className="text-slate-400 text-lg mb-12">The Nexus has fallen at round {gameState.round}</p>
                <button 
                  onClick={resetGame}
                  className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-500/40 transition-all active:scale-95 flex items-center gap-3"
                >
                  <RotateCcw className="w-6 h-6" />
                  TRY AGAIN
                </button>
              </motion.div>
            )}

            {showRoundCleared && !gameState.isRoundActive && gameState.lives > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
              >
                <div className="bg-slate-900/90 backdrop-blur-2xl p-12 rounded-[3rem] border border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] pointer-events-auto flex flex-col items-center">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <Shield className="w-12 h-12 text-green-500" />
                  </div>
                  <h2 className="text-5xl font-black text-white mb-2 tracking-tight italic">WAVE REPELLED</h2>
                  <p className="text-slate-400 text-lg mb-10">Nexus integrity holding. Prepare for the next breach.</p>
                  <button 
                    onClick={startRound}
                    className="px-12 py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xl flex flex-col items-center gap-1 transition-all active:scale-95 shadow-2xl shadow-green-500/40"
                  >
                    <div className="flex items-center gap-3">
                      DEPLOY NEXT WAVE
                      <ChevronRight className="w-6 h-6" />
                    </div>
                    {nextRoundCountdown !== null && (
                      <span className="text-xs text-green-200 font-bold uppercase tracking-widest">
                        Auto-deploying in {nextRoundCountdown}s
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {!gameState.isRoundActive && gameState.round === 0 && gameState.gameStatus === 'playing' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[2px] rounded-[2rem] z-30 pointer-events-none"
              >
                <button 
                  onClick={startRound}
                  className="px-16 py-8 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-3xl shadow-[0_0_50px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center gap-4 pointer-events-auto"
                >
                  <Play className="w-10 h-10 fill-current" />
                  BEGIN DEFENSE
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

