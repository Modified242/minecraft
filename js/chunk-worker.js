/**
 * Dedicated Web Worker for Chunk Generation, 3D Lighting & Voxel Geometry
 * Offloads 3D Simplex noise terrain, cave carving, ore distribution,
 * BFS Sky/Block light propagation, and greedy/culled face buffer generation.
 * Transfers Float32Array & Uint32Array buffers back with zero-copy Transferables.
 */

// Import SimplexNoise script into worker
try {
  importScripts('noise.js');
} catch (e) {
  console.warn('Worker importScripts failed, fallback in place');
}

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 64;
const CHUNK_SIZE_Z = 16;
const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;
const SEA_LEVEL = 18;

const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  SAND: 6, WATER: 7, GLASS: 8, PLANKS: 9, COBBLESTONE: 10,
  BRICK: 11, GLOWSTONE: 12, BEDROCK: 13, COAL_ORE: 14,
  IRON_ORE: 15, GOLD_ORE: 16, DIAMOND_ORE: 17, SNOW_GRASS: 18,
  SNOW: 19, CACTUS: 20, BIRCH_WOOD: 21, BIRCH_LEAVES: 22,
  CRAFTING_TABLE: 23, FURNACE: 24, FURNACE_LIT: 25, CHEST: 26,
  TORCH: 27, LAVA: 28, OBSIDIAN: 29, TNT: 30, GRAVEL: 31,
  // MultiCraft Signature Nodes
  MESE_ORE: 32, MESE_BLOCK: 33, JUNGLE_WOOD: 34, JUNGLE_PLANKS: 35,
  JUNGLE_LEAVES: 36, SANDSTONE: 37, SANDSTONE_BRICK: 38,
  PAPYRUS: 39, BOOKSHELF: 40, STEEL_BLOCK: 41
};

const BIOME = { PLAINS: 0, FOREST: 1, DESERT: 2, SNOW: 3, MOUNTAINS: 4 };

const TILES = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, WOOD_TOP: 4, WOOD_SIDE: 5,
  LEAVES: 6, SAND: 7, WATER: 8, GLASS: 9, PLANKS: 10, COBBLESTONE: 11,
  BRICK: 12, GLOWSTONE: 13, BEDROCK: 14, COAL_ORE: 15, IRON_ORE: 16,
  GOLD_ORE: 17, DIAMOND_ORE: 18, SNOW_TOP: 19, SNOW_SIDE: 20, SNOW_BLOCK: 21,
  CACTUS_TOP: 22, CACTUS_SIDE: 23, BIRCH_TOP: 24, BIRCH_SIDE: 25, BIRCH_LEAVES: 26,
  CRAFT_TOP: 27, CRAFT_SIDE1: 28, CRAFT_SIDE2: 29, FURNACE_FRONT: 30,
  FURNACE_LIT: 31, FURNACE_SIDE: 32, FURNACE_TOP: 33, CHEST_TOP: 34,
  CHEST_SIDE: 35, CHEST_FRONT: 36, TORCH: 37, LAVA: 38, OBSIDIAN: 39,
  TNT_TOP: 40, TNT_SIDE: 41, TNT_BOTTOM: 42, GRAVEL: 43,
  // MultiCraft Signature Tiles
  MESE_ORE: 60, MESE_BLOCK: 61, JUNGLE_WOOD_TOP: 62, JUNGLE_WOOD_SIDE: 63,
  JUNGLE_PLANKS: 64, JUNGLE_LEAVES: 65, SANDSTONE_TOP: 66, SANDSTONE_SIDE: 67,
  SANDSTONE_BOTTOM: 68, SANDSTONE_BRICK: 69, PAPYRUS: 70, BOOKSHELF: 71,
  STEEL_BLOCK: 72
};

const ATLAS_TILES_PER_ROW = 16;

function getTileUVs(tileIndex) {
  const col = tileIndex % ATLAS_TILES_PER_ROW;
  const row = Math.floor(tileIndex / ATLAS_TILES_PER_ROW);
  return {
    uMin: col / ATLAS_TILES_PER_ROW,
    uMax: (col + 1) / ATLAS_TILES_PER_ROW,
    vMax: 1.0 - (row / ATLAS_TILES_PER_ROW),
    vMin: 1.0 - ((row + 1) / ATLAS_TILES_PER_ROW),
  };
}

const BLOCK_PROPS = {
  [BLOCK.AIR]: { solid: false, transparent: true, lightPasses: true, lightEmission: 0 },
  [BLOCK.GRASS]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.GRASS_TOP, bottom: TILES.DIRT, side: TILES.GRASS_SIDE } },
  [BLOCK.DIRT]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.DIRT } },
  [BLOCK.STONE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.STONE } },
  [BLOCK.WOOD]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.WOOD_TOP, bottom: TILES.WOOD_TOP, side: TILES.WOOD_SIDE } },
  [BLOCK.LEAVES]: { solid: true, transparent: true, lightPasses: false, tiles: { all: TILES.LEAVES } },
  [BLOCK.SAND]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.SAND } },
  [BLOCK.WATER]: { solid: false, transparent: true, lightPasses: true, tiles: { all: TILES.WATER } },
  [BLOCK.GLASS]: { solid: true, transparent: true, lightPasses: true, tiles: { all: TILES.GLASS } },
  [BLOCK.PLANKS]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.PLANKS } },
  [BLOCK.COBBLESTONE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.COBBLESTONE } },
  [BLOCK.BRICK]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.BRICK } },
  [BLOCK.GLOWSTONE]: { solid: true, transparent: false, lightPasses: false, lightEmission: 15, tiles: { all: TILES.GLOWSTONE } },
  [BLOCK.BEDROCK]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.BEDROCK } },
  [BLOCK.COAL_ORE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.COAL_ORE } },
  [BLOCK.IRON_ORE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.IRON_ORE } },
  [BLOCK.GOLD_ORE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.GOLD_ORE } },
  [BLOCK.DIAMOND_ORE]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.DIAMOND_ORE } },
  [BLOCK.SNOW_GRASS]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.SNOW_TOP, bottom: TILES.DIRT, side: TILES.SNOW_SIDE } },
  [BLOCK.SNOW]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.SNOW_BLOCK } },
  [BLOCK.CACTUS]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.CACTUS_TOP, bottom: TILES.CACTUS_TOP, side: TILES.CACTUS_SIDE } },
  [BLOCK.BIRCH_WOOD]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.BIRCH_TOP, bottom: TILES.BIRCH_TOP, side: TILES.BIRCH_SIDE } },
  [BLOCK.BIRCH_LEAVES]: { solid: true, transparent: true, lightPasses: false, tiles: { all: TILES.BIRCH_LEAVES } },
  [BLOCK.CRAFTING_TABLE]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.CRAFT_TOP, bottom: TILES.PLANKS, side: TILES.CRAFT_SIDE1, front: TILES.CRAFT_SIDE2 } },
  [BLOCK.FURNACE]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.FURNACE_TOP, bottom: TILES.FURNACE_TOP, side: TILES.FURNACE_SIDE, front: TILES.FURNACE_FRONT } },
  [BLOCK.FURNACE_LIT]: { solid: true, transparent: false, lightPasses: false, lightEmission: 13, tiles: { top: TILES.FURNACE_TOP, bottom: TILES.FURNACE_TOP, side: TILES.FURNACE_SIDE, front: TILES.FURNACE_LIT } },
  [BLOCK.CHEST]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.CHEST_TOP, bottom: TILES.CHEST_TOP, side: TILES.CHEST_SIDE, front: TILES.CHEST_FRONT } },
  [BLOCK.TORCH]: { solid: false, transparent: true, lightPasses: true, lightEmission: 14, tiles: { all: TILES.TORCH } },
  [BLOCK.LAVA]: { solid: false, transparent: false, lightPasses: false, lightEmission: 15, tiles: { all: TILES.LAVA } },
  [BLOCK.OBSIDIAN]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.OBSIDIAN } },
  [BLOCK.TNT]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.TNT_TOP, bottom: TILES.TNT_BOTTOM, side: TILES.TNT_SIDE } },
  [BLOCK.GRAVEL]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.GRAVEL } },
  // MultiCraft Signature Nodes
  [BLOCK.MESE_ORE]: { solid: true, transparent: false, lightPasses: false, lightEmission: 3, tiles: { all: TILES.MESE_ORE } },
  [BLOCK.MESE_BLOCK]: { solid: true, transparent: false, lightPasses: false, lightEmission: 9, tiles: { all: TILES.MESE_BLOCK } },
  [BLOCK.JUNGLE_WOOD]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.JUNGLE_WOOD_TOP, bottom: TILES.JUNGLE_WOOD_TOP, side: TILES.JUNGLE_WOOD_SIDE } },
  [BLOCK.JUNGLE_PLANKS]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.JUNGLE_PLANKS } },
  [BLOCK.JUNGLE_LEAVES]: { solid: true, transparent: true, lightPasses: false, tiles: { all: TILES.JUNGLE_LEAVES } },
  [BLOCK.SANDSTONE]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.SANDSTONE_TOP, bottom: TILES.SANDSTONE_BOTTOM, side: TILES.SANDSTONE_SIDE } },
  [BLOCK.SANDSTONE_BRICK]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.SANDSTONE_BRICK } },
  [BLOCK.PAPYRUS]: { solid: false, transparent: true, lightPasses: true, tiles: { all: TILES.PAPYRUS } },
  [BLOCK.BOOKSHELF]: { solid: true, transparent: false, lightPasses: false, tiles: { top: TILES.PLANKS, bottom: TILES.PLANKS, side: TILES.BOOKSHELF } },
  [BLOCK.STEEL_BLOCK]: { solid: true, transparent: false, lightPasses: false, tiles: { all: TILES.STEEL_BLOCK } },
};

function getBlockTileIdx(blockId, face) {
  const p = BLOCK_PROPS[blockId];
  if (!p || !p.tiles) return 0;
  if (p.tiles.all !== undefined) return p.tiles.all;
  if (face === 'top') return p.tiles.top !== undefined ? p.tiles.top : p.tiles.side;
  if (face === 'bottom') return p.tiles.bottom !== undefined ? p.tiles.bottom : p.tiles.side;
  if (face === 'front') return p.tiles.front !== undefined ? p.tiles.front : p.tiles.side;
  return p.tiles.side !== undefined ? p.tiles.side : 0;
}

const FACES = [
  // 0: +Y (Top)
  { dir: [0, 1, 0], type: 'top', light: 1.0, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  // 1: -Y (Bottom)
  { dir: [0, -1, 0], type: 'bottom', light: 0.55, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  // 2: +X (East)
  { dir: [1, 0, 0], type: 'side', light: 0.75, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  // 3: -X (West)
  { dir: [-1, 0, 0], type: 'side', light: 0.75, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  // 4: +Z (South)
  { dir: [0, 0, 1], type: 'front', light: 0.85, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  // 5: -Z (North)
  { dir: [0, 0, -1], type: 'side', light: 0.85, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

let globalSimplex = null;
let globalCaveNoise = null;
let globalTempNoise = null;
let globalMoistNoise = null;

function initNoises(seed) {
  if (!globalSimplex) {
    globalSimplex = new SimplexNoise(seed);
    globalCaveNoise = new SimplexNoise(seed + 999);
    globalTempNoise = new SimplexNoise(seed + 2021);
    globalMoistNoise = new SimplexNoise(seed + 4042);
  }
}

self.onmessage = function (e) {
  const data = e.data;
  if (data.type === 'BUILD_CHUNK') {
    const { cx, cz, seed, deltas, sunIntensity } = data;
    initNoises(seed);

    // 1. Generate voxels
    const voxels = new Uint8Array(CHUNK_VOLUME);
    const light = new Uint8Array(CHUNK_VOLUME); // 4 high bits = Sky, 4 low bits = Block

    const worldX = cx * CHUNK_SIZE_X;
    const worldZ = cz * CHUNK_SIZE_Z;

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = worldX + lx;
        const wz = worldZ + lz;

        // Biome
        const temp = globalTempNoise.fbm2D(wx * 0.003, wz * 0.003, 2);
        const moist = globalMoistNoise.fbm2D(wx * 0.003, wz * 0.003, 2);
        let biome = BIOME.PLAINS;
        if (temp < -0.2) biome = BIOME.SNOW;
        else if (temp > 0.3 && moist < -0.1) biome = BIOME.DESERT;
        else if (moist > 0.2) biome = BIOME.FOREST;
        else if (globalSimplex.fbm2D(wx * 0.004, wz * 0.004, 3) > 0.45) biome = BIOME.MOUNTAINS;

        // Height
        let baseHeight = 22, amplitude = 10;
        if (biome === BIOME.MOUNTAINS) { baseHeight = 26; amplitude = 22; }
        else if (biome === BIOME.DESERT) { baseHeight = 20; amplitude = 6; }
        const continental = globalSimplex.fbm2D(wx * 0.006, wz * 0.006, 3, 2.0, 0.5);
        const detail = globalSimplex.fbm2D(wx * 0.025, wz * 0.025, 3, 2.0, 0.5);
        const surfaceHeight = Math.floor(Math.max(2, Math.min(CHUNK_SIZE_Y - 8, baseHeight + continental * amplitude + detail * 5)));

        for (let y = 0; y < CHUNK_SIZE_Y; y++) {
          const idx = lx + lz * CHUNK_SIZE_X + y * 256;

          if (y === 0) {
            voxels[idx] = BLOCK.BEDROCK;
            continue;
          }

          if (y <= surfaceHeight) {
            // 3D Cave Carver
            const caveVal = globalCaveNoise.fbm3D(wx * 0.035, y * 0.045, wz * 0.035, 2);
            if (caveVal > 0.58 && y < surfaceHeight - 2) {
              voxels[idx] = BLOCK.AIR;
              continue;
            }

            if (y === surfaceHeight) {
              if (surfaceHeight < SEA_LEVEL + 1) voxels[idx] = BLOCK.SAND;
              else if (biome === BIOME.DESERT) voxels[idx] = BLOCK.SAND;
              else if (biome === BIOME.SNOW) voxels[idx] = BLOCK.SNOW_GRASS;
              else voxels[idx] = BLOCK.GRASS;
            } else if (y >= surfaceHeight - 3) {
              voxels[idx] = (biome === BIOME.DESERT) ? (y === surfaceHeight - 3 ? BLOCK.SANDSTONE : BLOCK.SAND) : BLOCK.DIRT;
            } else {
              // Depth-stratified ores (including MultiCraft Mese)
              const oreRand = Math.random();
              if (y < 12 && oreRand < 0.015) voxels[idx] = BLOCK.DIAMOND_ORE;
              else if (y < 24 && oreRand < 0.02) voxels[idx] = BLOCK.GOLD_ORE;
              else if (y < 28 && oreRand < 0.025) voxels[idx] = BLOCK.MESE_ORE;
              else if (y < 42 && oreRand < 0.035) voxels[idx] = BLOCK.IRON_ORE;
              else if (oreRand < 0.05) voxels[idx] = BLOCK.COAL_ORE;
              else voxels[idx] = BLOCK.STONE;
            }
          } else if (y <= SEA_LEVEL) {
            voxels[idx] = BLOCK.WATER;
          } else {
            voxels[idx] = BLOCK.AIR;
          }
        }

        // Shore Papyrus
        if (surfaceHeight === SEA_LEVEL + 1 && (Math.abs(wx * 5 + wz * 11) % 17 === 0)) {
          const py = surfaceHeight + 1;
          if (py < CHUNK_SIZE_Y) voxels[lx + lz * CHUNK_SIZE_X + py * 256] = BLOCK.PAPYRUS;
        }

        // Trees & Jungle Flora
        if (surfaceHeight >= SEA_LEVEL + 1 && biome !== BIOME.DESERT) {
          if ((Math.abs(wx * 7 + wz * 13) % 47) === 0) {
            const isJungle = (biome === BIOME.FOREST && (Math.abs(wx * 11 + wz * 17) % 3 === 0));
            const isBirch = (!isJungle && biome === BIOME.FOREST && (wx % 2 === 0));
            const logBlock = isJungle ? BLOCK.JUNGLE_WOOD : (isBirch ? BLOCK.BIRCH_WOOD : BLOCK.WOOD);
            const leafBlock = isJungle ? BLOCK.JUNGLE_LEAVES : (isBirch ? BLOCK.BIRCH_LEAVES : BLOCK.LEAVES);
            for (let dy = 1; dy <= 4; dy++) {
              const y = surfaceHeight + dy;
              if (y < CHUNK_SIZE_Y) voxels[lx + lz * CHUNK_SIZE_X + y * 256] = logBlock;
            }
            // Canopy
            for (let ox = -2; ox <= 2; ox++) {
              for (let oz = -2; oz <= 2; oz++) {
                for (let oy = 3; oy <= 5; oy++) {
                  if (Math.abs(ox) === 2 && Math.abs(oz) === 2 && oy === 5) continue;
                  const tx = lx + ox, tz = lz + oz, ty = surfaceHeight + oy;
                  if (tx >= 0 && tx < CHUNK_SIZE_X && tz >= 0 && tz < CHUNK_SIZE_Z && ty < CHUNK_SIZE_Y) {
                    const tidx = tx + tz * CHUNK_SIZE_X + ty * 256;
                    if (voxels[tidx] === BLOCK.AIR) voxels[tidx] = leafBlock;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Apply Deltas
    if (deltas) {
      for (const [idxStr, bId] of Object.entries(deltas)) {
        voxels[parseInt(idxStr, 10)] = bId;
      }
    }

    // 2. BFS Sky Light & Block Light
    const lightQueue = [];
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        let sky = 15;
        for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
          const idx = lx + lz * CHUNK_SIZE_X + y * 256;
          const b = voxels[idx];
          const def = BLOCK_PROPS[b];

          if (def && (!def.lightPasses || def.solid)) {
            sky = 0;
          }
          let blockL = 0;
          if (def && def.lightEmission > 0) {
            blockL = def.lightEmission;
            lightQueue.push({ lx, y, lz, light: blockL });
          }
          light[idx] = (sky << 4) | (blockL & 0x0f);
        }
      }
    }

    // BFS Block Light propagation
    const nbrs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while (lightQueue.length > 0) {
      const { lx, y, lz, light: curLight } = lightQueue.shift();
      if (curLight <= 1) continue;

      for (const [dx, dy, dz] of nbrs) {
        const nx = lx + dx, ny = y + dy, nz = lz + dz;
        if (nx >= 0 && nx < CHUNK_SIZE_X && ny >= 0 && ny < CHUNK_SIZE_Y && nz >= 0 && nz < CHUNK_SIZE_Z) {
          const nidx = nx + nz * CHUNK_SIZE_X + ny * 256;
          const nb = voxels[nidx];
          const ndef = BLOCK_PROPS[nb];
          if (ndef && ndef.lightPasses) {
            const oldBL = light[nidx] & 0x0f;
            if (oldBL < curLight - 1) {
              const oldSky = (light[nidx] >> 4) & 0x0f;
              light[nidx] = (oldSky << 4) | ((curLight - 1) & 0x0f);
              lightQueue.push({ lx: nx, y: ny, lz: nz, light: curLight - 1 });
            }
          }
        }
      }
    }

    // 3. Mesh Buffers Generation
    const opPositions = [];
    const opNormals = [];
    const opUvs = [];
    const opColors = [];
    const opIndices = [];
    let opVertCount = 0;

    const trPositions = [];
    const trNormals = [];
    const trUvs = [];
    const trColors = [];
    const trIndices = [];
    let trVertCount = 0;

    const sunInt = sunIntensity || 1.0;

    const getBlockVal = (x, y, z) => {
      if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
        return BLOCK.AIR;
      }
      return voxels[x + z * CHUNK_SIZE_X + y * 256];
    };

    const getLightVals = (x, y, z) => {
      if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
        return { sky: 15, block: 0 };
      }
      const val = light[x + z * CHUNK_SIZE_X + y * 256];
      return { sky: (val >> 4) & 0x0f, block: val & 0x0f };
    };

    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const idx = lx + lz * CHUNK_SIZE_X + ly * 256;
          const blockId = voxels[idx];
          if (blockId === BLOCK.AIR) continue;

          const def = BLOCK_PROPS[blockId];
          const isTranslucent = (blockId === BLOCK.WATER || blockId === BLOCK.GLASS || blockId === BLOCK.LEAVES || blockId === BLOCK.BIRCH_LEAVES || blockId === BLOCK.JUNGLE_LEAVES || blockId === BLOCK.PAPYRUS || blockId === BLOCK.TORCH);

          const positions = isTranslucent ? trPositions : opPositions;
          const normals = isTranslucent ? trNormals : opNormals;
          const uvs = isTranslucent ? trUvs : opUvs;
          const colors = isTranslucent ? trColors : opColors;
          const indices = isTranslucent ? trIndices : opIndices;

          const wx = worldX + lx;
          const wy = ly;
          const wz = worldZ + lz;

          // -----------------------------------------------------------------
          // 3D TORCH MODEL (Slender 3D wooden post with glowing flame top)
          // -----------------------------------------------------------------
          if (blockId === BLOCK.TORCH) {
            const tileIdx = TILES.TORCH;
            const { uMin, vMin, uMax, vMax } = getTileUVs(tileIdx);
            const { sky, block } = getLightVals(lx, ly, lz);
            const brightness = Math.max(0.5, (sky * sunInt + Math.max(14, block)) / 15.0);

            // 4 Side faces of slender torch post (width 0.125, depth 0.125, height 0.625)
            const x0 = wx + 0.4375, x1 = wx + 0.5625;
            const z0 = wz + 0.4375, z1 = wz + 0.5625;
            const y0 = wy + 0.0, y1 = wy + 0.625;

            // North Face
            let base = trVertCount;
            trPositions.push(x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0);
            trNormals.push(0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1);
            trUvs.push(uMax, vMin,  uMin, vMin,  uMin, vMax,  uMax, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // South Face
            base = trVertCount;
            trPositions.push(x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1);
            trNormals.push(0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // West Face
            base = trVertCount;
            trPositions.push(x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0);
            trNormals.push(-1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // East Face
            base = trVertCount;
            trPositions.push(x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1);
            trNormals.push(1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // Top Flame Face
            base = trVertCount;
            trPositions.push(x0, y1, z1,  x1, y1, z1,  x1, y1, z0,  x0, y1, z0);
            trNormals.push(0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0);
            trUvs.push(uMin, vMax,  uMax, vMax,  uMax, vMin,  uMin, vMin);
            for (let k = 0; k < 4; k++) trColors.push(1.0, 0.95, 0.7); // Bright flame
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            continue;
          }

          // -----------------------------------------------------------------
          // Standard Cubes with Face Culling & Vertex AO
          // -----------------------------------------------------------------
          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const nx = lx + face.dir[0];
            const ny = ly + face.dir[1];
            const nz = lz + face.dir[2];

            const nBlock = getBlockVal(nx, ny, nz);
            const nDef = BLOCK_PROPS[nBlock];

            let shouldRender = false;
            if (blockId === BLOCK.WATER) {
              shouldRender = (nBlock === BLOCK.AIR || nBlock === BLOCK.GLASS);
            } else if (blockId === BLOCK.GLASS || blockId === BLOCK.LEAVES || blockId === BLOCK.BIRCH_LEAVES || blockId === BLOCK.JUNGLE_LEAVES || blockId === BLOCK.PAPYRUS) {
              shouldRender = (nBlock !== blockId && (!nDef || !nDef.solid || nDef.transparent));
            } else {
              shouldRender = (!nDef || !nDef.solid || nDef.transparent);
            }

            if (!shouldRender) continue;

            const tileIdx = getBlockTileIdx(blockId, face.type);
            const { uMin, vMin, uMax, vMax } = getTileUVs(tileIdx);
            const uvCorners = [
              [uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax]
            ];

            const baseVert = isTranslucent ? trVertCount : opVertCount;
            const { sky, block } = getLightVals(nx, ny, nz);
            const voxelBrightness = Math.max(0.08, (sky * sunInt + block) / 15.0);

            for (let v = 0; v < 4; v++) {
              const c = face.corners[v];
              positions.push(wx + c[0], wy + c[1], wz + c[2]);
              normals.push(face.dir[0], face.dir[1], face.dir[2]);

              const uv = uvCorners[v];
              uvs.push(uv[0], uv[1]);

              // Light & tint
              const finalR = face.light * voxelBrightness;
              const bRatio = block / 15.0;
              const r = Math.min(1.0, finalR + bRatio * 0.15);
              const g = Math.min(1.0, finalR + bRatio * 0.08);
              const b = Math.min(1.0, finalR);

              colors.push(r, g, b);
            }

            indices.push(
              baseVert, baseVert + 1, baseVert + 2,
              baseVert, baseVert + 2, baseVert + 3
            );

            if (isTranslucent) trVertCount += 4;
            else opVertCount += 4;
          }
        }
      }
    }

    // Convert to typed arrays for zero-copy Transferable transfer
    const opPositionsArr = new Float32Array(opPositions);
    const opNormalsArr = new Float32Array(opNormals);
    const opUvsArr = new Float32Array(opUvs);
    const opColorsArr = new Float32Array(opColors);
    const opIndicesArr = new Uint32Array(opIndices);

    const trPositionsArr = new Float32Array(trPositions);
    const trNormalsArr = new Float32Array(trNormals);
    const trUvsArr = new Float32Array(trUvs);
    const trColorsArr = new Float32Array(trColors);
    const trIndicesArr = new Uint32Array(trIndices);

    self.postMessage({
      type: 'CHUNK_BUILT',
      cx, cz,
      voxels,
      opPositions: opPositionsArr,
      opNormals: opNormalsArr,
      opUvs: opUvsArr,
      opColors: opColorsArr,
      opIndices: opIndicesArr,
      trPositions: trPositionsArr,
      trNormals: trNormalsArr,
      trUvs: trUvsArr,
      trColors: trColorsArr,
      trIndices: trIndicesArr,
    }, [
      voxels.buffer,
      opPositionsArr.buffer, opNormalsArr.buffer, opUvsArr.buffer, opColorsArr.buffer, opIndicesArr.buffer,
      trPositionsArr.buffer, trNormalsArr.buffer, trUvsArr.buffer, trColorsArr.buffer, trIndicesArr.buffer
    ]);
  }
};
