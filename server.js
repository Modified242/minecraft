/**
 * Authoritative WebSocket Multiplayer Server & Static Web Server
 * Runs a 20 TPS tick loop, synchronizes shared chunk deltas, player avatars,
 * mobs (Pig, Zombie, Creeper, Skeleton, Spider), PvP/PvE combat, workstations,
 * dropped items, time/weather, disk persistence, and admin commands.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8088;
const PUBLIC_DIR = path.resolve(__dirname);
const SAVE_FILE = path.join(PUBLIC_DIR, 'world-save.json');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 1. Static HTTP Server with Security & Path Traversal Prevention
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Security: path traversal prevention
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden: Access Denied');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 2. WebSocket Server
const wss = new WebSocket.Server({ server });

// Shared Server World State
const state = {
  worldSeed: 87654321,
  worldTime: 0.0, // 0.0 = bright midday/morning daylight
  weather: 'clear', // 'clear' | 'rain'
  chunkDeltas: {}, // "cx,cz" -> { [localIdx]: blockId }
  chests: {}, // "x,y,z" -> array of 27 slots
  furnaces: {}, // "x,y,z" -> furnace state object
  players: new Map(), // ws -> playerData
  mobs: new Map(), // mobId -> mobData
  droppedItems: new Map(), // dropId -> dropData
  primedTNTs: new Map(), // tntId -> tntData
  arrows: new Map(), // arrowId -> arrowData
  nextPlayerId: 1,
  nextEntityId: 1,
};

// --- Disk Persistence ---
function loadWorldState() {
  if (fs.existsSync(SAVE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      if (data.worldSeed !== undefined) state.worldSeed = data.worldSeed;
      if (data.worldTime !== undefined) {
        state.worldTime = data.worldTime;
        // If loaded time is in the night (0.42 to 0.85), reset to crisp morning daylight
        if (state.worldTime >= 0.42 && state.worldTime <= 0.85) {
          state.worldTime = 0.05;
        }
      }
      if (data.weather !== undefined) state.weather = data.weather;
      if (data.chunkDeltas) state.chunkDeltas = data.chunkDeltas;
      if (data.chests) state.chests = data.chests;
      if (data.furnaces) state.furnaces = data.furnaces;
      console.log(`[Persistence] Loaded saved world: ${Object.keys(state.chunkDeltas).length} modified chunks, time ${state.worldTime.toFixed(2)}, weather ${state.weather}`);
    } catch (e) {
      console.warn('[Persistence] Error loading world-save.json:', e);
    }
  } else {
    console.log('[Persistence] No existing world-save.json found. Initializing fresh world.');
  }
}

let saveTimeout = null;
function saveWorldState(sync = false) {
  const payload = {
    worldSeed: state.worldSeed,
    worldTime: state.worldTime,
    weather: state.weather,
    chunkDeltas: state.chunkDeltas,
    chests: state.chests,
    furnaces: state.furnaces,
    savedAt: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  if (sync) {
    try {
      fs.writeFileSync(SAVE_FILE, jsonStr, 'utf8');
      console.log('[Persistence] World state saved synchronously to disk.');
    } catch (e) {
      console.error('[Persistence] Failed synchronous save:', e);
    }
  } else {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      fs.writeFile(SAVE_FILE, jsonStr, 'utf8', (err) => {
        if (err) console.error('[Persistence] Failed to write world-save.json:', err);
        else console.log(`[Persistence] Autosaved world state to ${SAVE_FILE}`);
      });
    }, 2000);
  }
}

// Periodic auto-save every 30 seconds
setInterval(() => {
  saveWorldState(false);
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received. Saving world state before exit...');
  saveWorldState(true);
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received. Saving world state before exit...');
  saveWorldState(true);
  process.exit(0);
});

loadWorldState();

// Broadcast helper
function broadcast(msgObj, excludeWs = null) {
  const json = JSON.stringify(msgObj);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// Heartbeat every 30 seconds to terminate dead sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[Multiplayer] Terminating unresponsive client socket');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// --- Server-Authoritative Mobs Initialization ---
function initInitialMobs() {
  const mobTypes = ['pig', 'cow', 'zombie', 'creeper', 'skeleton', 'spider'];
  for (let i = 0; i < 10; i++) {
    const type = mobTypes[Math.floor(Math.random() * mobTypes.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 20;
    const x = 8.5 + Math.cos(angle) * dist;
    const z = 8.5 + Math.sin(angle) * dist;
    const y = 30; // Will settle via physics
    spawnMob(type, x, y, z);
  }
}

function spawnMob(type, x, y, z) {
  const id = `mob_${state.nextEntityId++}`;
  let health = 10;
  let isHostile = false;

  if (type === 'zombie' || type === 'skeleton' || type === 'creeper') {
    health = 20;
    isHostile = true;
  } else if (type === 'spider') {
    health = 16;
    isHostile = (state.worldTime >= 0.45 && state.worldTime <= 0.85); // Hostile by night
  }

  const mobData = {
    id,
    type,
    x, y, z,
    yaw: Math.random() * Math.PI * 2,
    pitch: 0,
    vx: 0, vy: 0, vz: 0,
    health,
    maxHealth: health,
    isHostile,
    fuse: 0, // For Creeper
    shootCooldown: 1.0 + Math.random() * 2.0, // For Skeleton
    hurtTime: 0,
    stateTimer: Math.random() * 3.0,
  };

  state.mobs.set(id, mobData);
  broadcast({
    type: 'ENTITY_SPAWN',
    entity: mobData,
  });
  return mobData;
}

initInitialMobs();

// --- WebSocket Connection Handling ---
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const playerId = `player_${state.nextPlayerId++}`;
  const playerName = `Steve_${Math.floor(100 + Math.random() * 900)}`;

  const playerData = {
    id: playerId,
    name: playerName,
    position: { x: 8.5, y: 32, z: 8.5 },
    yaw: 0,
    pitch: 0,
    heldItem: null,
    isSwinging: false,
    isSneaking: false,
    isSprinting: false,
    health: 20,
    gamemode: 'survival', // 'survival' | 'creative'
    dirty: true,
  };

  state.players.set(ws, playerData);
  console.log(`[Multiplayer] Player joined: ${playerName} (${playerId})`);

  // If first player joining or time is in dark night, ensure morning daylight
  if (state.players.size === 1 && (state.worldTime >= 0.42 && state.worldTime <= 0.85)) {
    state.worldTime = 0.05;
    console.log('[Multiplayer] Resetting world time to morning daylight (0.05) on first player join.');
  }

  // Send INIT payload with complete authoritative world state
  const otherPlayers = [];
  state.players.forEach((p, client) => {
    if (client !== ws) otherPlayers.push(p);
  });

  const currentMobs = [];
  state.mobs.forEach(m => currentMobs.push(m));

  const currentDrops = [];
  state.droppedItems.forEach(d => currentDrops.push(d));

  ws.send(JSON.stringify({
    type: 'INIT',
    playerId,
    playerName,
    seed: state.worldSeed,
    time: state.worldTime,
    weather: state.weather,
    chunkDeltas: state.chunkDeltas,
    chests: state.chests,
    furnaces: state.furnaces,
    players: otherPlayers,
    mobs: currentMobs,
    drops: currentDrops,
  }));

  // Announce new player
  broadcast({
    type: 'PLAYER_JOIN',
    player: playerData,
  }, ws);

  // Incoming client packets
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'PLAYER_MOVE') {
        // Buffer move data in memory for 20 TPS tick batching
        if (msg.position && Number.isFinite(msg.position.x) && Number.isFinite(msg.position.y) && Number.isFinite(msg.position.z)) {
          playerData.position = { x: msg.position.x, y: msg.position.y, z: msg.position.z };
        }
        if (Number.isFinite(msg.yaw)) playerData.yaw = msg.yaw;
        if (Number.isFinite(msg.pitch)) playerData.pitch = msg.pitch;
        playerData.heldItem = msg.heldItem || null;
        playerData.isSneaking = Boolean(msg.isSneaking);
        playerData.isSprinting = Boolean(msg.isSprinting);
        playerData.dirty = true;
      } else if (msg.type === 'PLAYER_SWING') {
        playerData.isSwinging = true;
        playerData.dirty = true;
      } else if (msg.type === 'BLOCK_DELTA') {
        const { x, y, z, blockId } = msg;
        const cx = Math.floor(x / 16);
        const cz = Math.floor(z / 16);
        const lx = ((x % 16) + 16) % 16;
        const lz = ((z % 16) + 16) % 16;
        const key = `${cx},${cz}`;
        const localIdx = lx + lz * 16 + y * 256;

        if (!state.chunkDeltas[key]) state.chunkDeltas[key] = {};
        state.chunkDeltas[key][localIdx] = blockId;

        // Trigger debounced disk save
        saveWorldState(false);

        broadcast({
          type: 'BLOCK_DELTA',
          x, y, z, blockId,
        });
      } else if (msg.type === 'WORKSTATION_UPDATE') {
        const { key, workstationType, slots, furnaceState } = msg;
        if (workstationType === 'chest') {
          state.chests[key] = slots;
        } else if (workstationType === 'furnace') {
          state.furnaces[key] = furnaceState;
        }
        saveWorldState(false);
        broadcast({
          type: 'WORKSTATION_UPDATE',
          key,
          workstationType,
          slots,
          furnaceState,
        }, ws);
      } else if (msg.type === 'PLAYER_ATTACK') {
        handlePlayerAttack(ws, playerData, msg);
      } else if (msg.type === 'SHOOT_ARROW') {
        spawnArrow(msg.x, msg.y, msg.z, msg.vx, msg.vy, msg.vz, playerId);
      } else if (msg.type === 'IGNITE_TNT') {
        spawnPrimedTNT(msg.x, msg.y, msg.z);
      } else if (msg.type === 'CHAT') {
        const text = (msg.text || '').trim();
        if (text.startsWith('/')) {
          handleCommand(ws, playerData, text);
        } else if (text.length > 0) {
          broadcast({
            type: 'CHAT',
            sender: playerData.name,
            text,
          });
        }
      }
    } catch (e) {
      console.warn('Packet processing error:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[Multiplayer] Player left: ${playerData.name}`);
    state.players.delete(ws);
    broadcast({
      type: 'PLAYER_LEAVE',
      id: playerId,
    });
  });
});

// --- Combat: PvP & PvE Attacks ---
function handlePlayerAttack(ws, attacker, msg) {
  const { targetType, targetId, damage, isCritical } = msg;
  const dmg = Math.max(1, Math.min(20, damage || 1));

  if (targetType === 'mob') {
    const mob = state.mobs.get(targetId);
    if (!mob) return;

    mob.health -= dmg;
    mob.hurtTime = 0.35;

    // Apply knockback
    const dx = mob.x - attacker.position.x;
    const dz = mob.z - attacker.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const kb = (attacker.isSprinting ? 12.0 : 6.0);
    mob.vx += (dx / dist) * kb;
    mob.vy = 4.0;
    mob.vz += (dz / dist) * kb;

    broadcast({
      type: 'ENTITY_DAMAGE',
      id: targetId,
      damage: dmg,
      health: mob.health,
      isCritical: Boolean(isCritical),
    });

    if (mob.health <= 0) {
      killMob(targetId);
    }
  } else if (targetType === 'player') {
    // PvP Damage!
    let targetWs = null;
    let targetPlayer = null;
    state.players.forEach((p, client) => {
      if (p.id === targetId) {
        targetPlayer = p;
        targetWs = client;
      }
    });

    if (targetPlayer && targetPlayer.gamemode !== 'creative') {
      targetPlayer.health = Math.max(0, targetPlayer.health - dmg);
      const dx = targetPlayer.position.x - attacker.position.x;
      const dz = targetPlayer.position.z - attacker.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const kb = (attacker.isSprinting ? 10.0 : 5.0);

      broadcast({
        type: 'PLAYER_DAMAGE',
        id: targetId,
        damage: dmg,
        health: targetPlayer.health,
        knockback: { x: (dx / dist) * kb, y: 3.5, z: (dz / dist) * kb },
        attackerName: attacker.name,
      });

      if (targetPlayer.health <= 0) {
        broadcast({
          type: 'CHAT',
          sender: 'Server',
          text: `${targetPlayer.name} was slain by ${attacker.name}!`,
          color: '#ef4444',
        });
        targetPlayer.health = 20;
      }
    }
  }
}

function killMob(mobId) {
  const mob = state.mobs.get(mobId);
  if (!mob) return;

  // Authoritative item drops
  let dropItem = null;
  if (mob.type === 'pig') dropItem = { type: 'item', id: 206, count: 2 }; // RAW_PORKCHOP
  else if (mob.type === 'zombie') dropItem = { type: 'item', id: 209, count: 1 }; // ROTTEN_FLESH
  else if (mob.type === 'creeper') dropItem = { type: 'item', id: 202, count: 2 }; // Gunpowder/Coal
  else if (mob.type === 'skeleton') dropItem = { type: 'item', id: 211, count: 2 }; // Arrows
  else if (mob.type === 'spider') dropItem = { type: 'item', id: 212, count: 2 }; // String

  if (dropItem) {
    spawnDroppedItem(mob.x, mob.y + 0.5, mob.z, dropItem.type, dropItem.id, dropItem.count);
  }

  state.mobs.delete(mobId);
  broadcast({
    type: 'ENTITY_DEATH',
    id: mobId,
  });
}

function spawnDroppedItem(x, y, z, itemType, itemId, count) {
  const id = `drop_${state.nextEntityId++}`;
  const dropData = { id, itemType, itemId, count, x, y, z };
  state.droppedItems.set(id, dropData);
  broadcast({
    type: 'ITEM_DROP',
    drop: dropData,
  });
}

function spawnArrow(x, y, z, vx, vy, vz, shooterId) {
  const id = `arrow_${state.nextEntityId++}`;
  const arrow = { id, x, y, z, vx, vy, vz, shooterId, life: 6.0 };
  state.arrows.set(id, arrow);
  broadcast({
    type: 'ARROW_SPAWN',
    arrow,
  });
}

function spawnPrimedTNT(x, y, z) {
  const id = `tnt_${state.nextEntityId++}`;
  const tnt = { id, x, y, z, vx: (Math.random() - 0.5) * 1.5, vy: 3.0, vz: (Math.random() - 0.5) * 1.5, fuse: 3.5 };
  state.primedTNTs.set(id, tnt);
  broadcast({
    type: 'TNT_SPAWN',
    tnt,
  });
}

// Explode TNT & Raycast destroy voxels
function explodeTNT(tnt) {
  const radius = 3.5;
  const radiusSq = radius * radius;
  const destroyedBlocks = [];

  const minX = Math.floor(tnt.x - radius);
  const maxX = Math.ceil(tnt.x + radius);
  const minY = Math.max(1, Math.floor(tnt.y - radius));
  const maxY = Math.min(63, Math.ceil(tnt.y + radius));
  const minZ = Math.floor(tnt.z - radius);
  const maxZ = Math.ceil(tnt.z + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - tnt.x;
        const dy = y + 0.5 - tnt.y;
        const dz = z + 0.5 - tnt.z;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq <= radiusSq) {
          const cx = Math.floor(x / 16);
          const cz = Math.floor(z / 16);
          const lx = ((x % 16) + 16) % 16;
          const lz = ((z % 16) + 16) % 16;
          const key = `${cx},${cz}`;
          const localIdx = lx + lz * 16 + y * 256;

          // Never destroy bedrock (13) or obsidian (29)
          const currentB = (state.chunkDeltas[key] && state.chunkDeltas[key][localIdx] !== undefined)
            ? state.chunkDeltas[key][localIdx] : null;

          if (currentB !== 13 && currentB !== 29) {
            if (!state.chunkDeltas[key]) state.chunkDeltas[key] = {};
            state.chunkDeltas[key][localIdx] = 0; // AIR
            destroyedBlocks.push({ x, y, z });
          }
        }
      }
    }
  }

  saveWorldState(false);

  // Inflict damage on nearby players & mobs
  state.players.forEach((p, client) => {
    const d = Math.hypot(p.position.x - tnt.x, p.position.y - tnt.y, p.position.z - tnt.z);
    if (d < 7.0 && p.gamemode !== 'creative') {
      const dmg = Math.round((1.0 - d / 7.0) * 18);
      p.health = Math.max(0, p.health - dmg);
      broadcast({
        type: 'PLAYER_DAMAGE',
        id: p.id,
        damage: dmg,
        health: p.health,
        knockback: { x: (p.position.x - tnt.x) * 2, y: 5.0, z: (p.position.z - tnt.z) * 2 },
      });
    }
  });

  state.mobs.forEach((m, mId) => {
    const d = Math.hypot(m.x - tnt.x, m.y - tnt.y, m.z - tnt.z);
    if (d < 7.0) {
      m.health -= Math.round((1.0 - d / 7.0) * 25);
      if (m.health <= 0) killMob(mId);
    }
  });

  broadcast({
    type: 'EXPLOSION',
    x: tnt.x,
    y: tnt.y,
    z: tnt.z,
    radius,
    destroyedBlocks,
  });
}

// --- Admin In-Game Chat Commands ---
function handleCommand(ws, player, cmdStr) {
  const parts = cmdStr.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  if (cmd === '/time') {
    if (parts[1] === 'set') {
      if (parts[2] === 'day') state.worldTime = 0.0;
      else if (parts[2] === 'night') state.worldTime = 0.5;
      else {
        const val = parseFloat(parts[2]);
        if (!isNaN(val)) state.worldTime = Math.max(0, Math.min(1.0, val));
      }
      broadcast({ type: 'TIME_SYNC', time: state.worldTime });
      broadcast({ type: 'CHAT', sender: 'Server', text: `Time set to ${parts[2]} (${state.worldTime.toFixed(2)})` });
      saveWorldState(false);
    }
  } else if (cmd === '/tp') {
    // Usage: /tp <x> <y> <z>
    if (parts.length >= 4) {
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        player.position = { x, y, z };
        ws.send(JSON.stringify({
          type: 'TELEPORT',
          position: player.position,
        }));
        broadcast({ type: 'CHAT', sender: 'Server', text: `Teleported ${player.name} to ${x}, ${y}, ${z}` });
      }
    } else {
      ws.send(JSON.stringify({ type: 'CHAT', sender: 'Server', text: 'Usage: /tp <x> <y> <z>' }));
    }
  } else if (cmd === '/gamemode') {
    const mode = (parts[1] || '').toLowerCase();
    if (mode === 'creative' || mode === 'survival') {
      player.gamemode = mode;
      ws.send(JSON.stringify({
        type: 'GAMEMODE_CHANGE',
        gamemode: mode,
      }));
      broadcast({ type: 'CHAT', sender: 'Server', text: `Set ${player.name}'s game mode to ${mode}` });
    } else {
      ws.send(JSON.stringify({ type: 'CHAT', sender: 'Server', text: 'Usage: /gamemode <survival|creative>' }));
    }
  } else if (cmd === '/give') {
    // Usage: /give <itemIdOrBlockId> [count]
    const itemArg = (parts[1] || '').toLowerCase();
    const count = parseInt(parts[2] || '1', 10) || 1;
    ws.send(JSON.stringify({
      type: 'GIVE_ITEM',
      itemArg,
      count,
    }));
    broadcast({ type: 'CHAT', sender: 'Server', text: `Gave ${count} [${itemArg}] to ${player.name}` });
  } else if (cmd === '/seed') {
    ws.send(JSON.stringify({
      type: 'CHAT',
      sender: 'Server',
      text: `World Seed: [${state.worldSeed}]`,
      color: '#38bdf8',
    }));
  } else if (cmd === '/clear') {
    ws.send(JSON.stringify({ type: 'CLEAR_INVENTORY' }));
    broadcast({ type: 'CHAT', sender: 'Server', text: `Cleared ${player.name}'s inventory.` });
  } else if (cmd === '/weather') {
    const w = (parts[1] || '').toLowerCase();
    if (w === 'clear' || w === 'rain') {
      state.weather = w;
      broadcast({ type: 'WEATHER_SYNC', weather: w });
      broadcast({ type: 'CHAT', sender: 'Server', text: `Weather set to ${w}` });
      saveWorldState(false);
    } else {
      ws.send(JSON.stringify({ type: 'CHAT', sender: 'Server', text: 'Usage: /weather <clear|rain>' }));
    }
  } else if (cmd === '/help') {
    ws.send(JSON.stringify({
      type: 'CHAT',
      sender: 'Server',
      text: 'Commands: /time set <day|night>, /weather <clear|rain>, /tp <x> <y> <z>, /gamemode <survival|creative>, /give <item> [count], /seed, /clear',
      color: '#facc15',
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'CHAT',
      sender: 'Server',
      text: `Unknown command: ${cmd}. Type /help for command list.`,
      color: '#f87171',
    }));
  }
}

// --- 20 TPS World Tick Loop (50ms interval) ---
setInterval(() => {
  const dt = 0.05;

  // 1. World Time Progression (1 day = 24000 ticks = 20 mins)
  // Only advance world time when players are actively online to prevent idling into pitch black night
  if (state.players.size > 0) {
    state.worldTime += 1 / 24000;
    if (state.worldTime > 1.0) state.worldTime -= 1.0;
  }

  // 2. Authoritative Mobs Physics & AI
  const mobSnapshots = [];
  state.mobs.forEach((mob, id) => {
    // Gravity & Velocity
    mob.vy -= 18.0 * dt;
    mob.x += mob.vx * dt;
    mob.y += mob.vy * dt;
    mob.z += mob.vz * dt;
    mob.vx *= 0.85;
    mob.vz *= 0.85;

    // Simple ground floor at y = 20..35
    if (mob.y < 20) {
      mob.y = 20;
      mob.vy = 0;
    }

    if (mob.hurtTime > 0) mob.hurtTime -= dt;

    // AI targeting closest player
    let closestPlayer = null;
    let closestDist = 20;
    state.players.forEach((p) => {
      const d = Math.hypot(p.position.x - mob.x, p.position.z - mob.z);
      if (d < closestDist) {
        closestDist = d;
        closestPlayer = p;
      }
    });

    if (mob.isHostile && closestPlayer) {
      const dx = closestPlayer.position.x - mob.x;
      const dz = closestPlayer.position.z - mob.z;
      const angle = Math.atan2(dx, dz);
      mob.yaw = angle;

      if (mob.type === 'creeper') {
        if (closestDist < 3.2) {
          mob.fuse += dt;
          if (mob.fuse >= 1.6) {
            explodeTNT({ x: mob.x, y: mob.y + 0.5, z: mob.z });
            killMob(id);
            return;
          }
        } else {
          mob.fuse = Math.max(0, mob.fuse - dt);
          mob.vx += Math.sin(angle) * 1.8 * dt;
          mob.vz += Math.cos(angle) * 1.8 * dt;
        }
      } else if (mob.type === 'skeleton') {
        // Skeleton keeps distance and shoots arrows
        if (closestDist > 8.0) {
          mob.vx += Math.sin(angle) * 1.6 * dt;
          mob.vz += Math.cos(angle) * 1.6 * dt;
        } else if (closestDist < 5.0) {
          mob.vx -= Math.sin(angle) * 1.6 * dt;
          mob.vz -= Math.cos(angle) * 1.6 * dt;
        }
        mob.shootCooldown -= dt;
        if (mob.shootCooldown <= 0) {
          mob.shootCooldown = 2.5 + Math.random() * 1.5;
          const speed = 18.0;
          const arrowDirX = Math.sin(angle) * speed;
          const arrowDirZ = Math.cos(angle) * speed;
          spawnArrow(mob.x, mob.y + 1.2, mob.z, arrowDirX, 2.0, arrowDirZ, id);
        }
      } else {
        // Zombie or Spider
        mob.vx += Math.sin(angle) * 2.2 * dt;
        mob.vz += Math.cos(angle) * 2.2 * dt;
      }
    } else {
      // Idle wander
      mob.stateTimer -= dt;
      if (mob.stateTimer <= 0) {
        mob.stateTimer = 3.0 + Math.random() * 4.0;
        mob.yaw = Math.random() * Math.PI * 2;
        mob.vx = Math.sin(mob.yaw) * 1.0;
        mob.vz = Math.cos(mob.yaw) * 1.0;
      }
    }

    mobSnapshots.push({
      id: mob.id,
      type: mob.type,
      x: parseFloat(mob.x.toFixed(3)),
      y: parseFloat(mob.y.toFixed(3)),
      z: parseFloat(mob.z.toFixed(3)),
      yaw: parseFloat(mob.yaw.toFixed(3)),
      health: mob.health,
      fuse: parseFloat(mob.fuse.toFixed(2)),
      hurt: mob.hurtTime > 0,
    });
  });

  // 3. Primed TNT ticking
  state.primedTNTs.forEach((tnt, id) => {
    tnt.vy -= 18.0 * dt;
    tnt.x += tnt.vx * dt;
    tnt.y += tnt.vy * dt;
    tnt.z += tnt.vz * dt;
    tnt.fuse -= dt;
    if (tnt.fuse <= 0) {
      explodeTNT(tnt);
      state.primedTNTs.delete(id);
    }
  });

  // 4. Arrows simulation
  state.arrows.forEach((arr, id) => {
    arr.vy -= 16.0 * dt;
    arr.x += arr.vx * dt;
    arr.y += arr.vy * dt;
    arr.z += arr.vz * dt;
    arr.life -= dt;
    if (arr.life <= 0 || arr.y < 0) {
      state.arrows.delete(id);
    }
  });

  // 5. Gather dirty player snapshots
  const playerSnapshots = [];
  state.players.forEach((p) => {
    const px = Number.isFinite(p.position?.x) ? p.position.x : 8.5;
    const py = Number.isFinite(p.position?.y) ? p.position.y : 32;
    const pz = Number.isFinite(p.position?.z) ? p.position.z : 8.5;
    const pyaw = Number.isFinite(p.yaw) ? p.yaw : 0;
    const ppitch = Number.isFinite(p.pitch) ? p.pitch : 0;

    playerSnapshots.push({
      id: p.id,
      name: p.name,
      pos: {
        x: parseFloat(px.toFixed(3)),
        y: parseFloat(py.toFixed(3)),
        z: parseFloat(pz.toFixed(3)),
      },
      yaw: parseFloat(pyaw.toFixed(3)),
      pitch: parseFloat(ppitch.toFixed(3)),
      heldItem: p.heldItem,
      swing: p.isSwinging,
      sneak: p.isSneaking,
      sprint: p.isSprinting,
      health: p.health,
    });
    // Reset transient swing trigger after broadcast
    p.isSwinging = false;
    p.dirty = false;
  });

  // 6. Broadcast 20 TPS Batched WORLD_SNAPSHOT Packet
  if (wss.clients.size > 0) {
    const snapshotMsg = JSON.stringify({
      type: 'WORLD_SNAPSHOT',
      time: parseFloat(state.worldTime.toFixed(4)),
      weather: state.weather,
      players: playerSnapshots,
      mobs: mobSnapshots,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(snapshotMsg);
      }
    });
  }
}, 50);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` VOXEL SANDBOX MULTIPLAYER SERVER LISTENING ON :${PORT} `);
  console.log(` Web & WebSocket ready at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
