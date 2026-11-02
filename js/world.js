/**
 * Advanced Procedural 3D Voxel World & Chunk Management System
 * Features:
 * - 16x64x16 Chunks with face culling & ambient occlusion
 * - Web Worker Chunk & Lighting Pipeline with Transferable typed arrays for zero-stutter
 * - Two-Pass Opaque & Transparent Mesh Rendering with animated water ripples
 * - Authentic 3D Slender Torch Post & Flame Model
 * - Cellular Automata for Water and Lava (Obsidian & Cobblestone generation on collision)
 * - Sand and Gravel gravity physics
 * - Multi-noise Biomes & 3D Cave Carvers
 */

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 64;
const CHUNK_SIZE_Z = 16;
const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;
const SEA_LEVEL = 18;

// Biome IDs
const BIOME = {
  PLAINS: 0,
  FOREST: 1,
  DESERT: 2,
  SNOW: 3,
  MOUNTAINS: 4,
};

// Face definitions
const FACES = [
  // 0: +Y (Top)
  {
    dir: [0, 1, 0],
    type: 'top',
    light: 1.0,
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  // 1: -Y (Bottom)
  {
    dir: [0, -1, 0],
    type: 'bottom',
    light: 0.55,
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  // 2: +X (East)
  {
    dir: [1, 0, 0],
    type: 'side',
    light: 0.75,
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  // 3: -X (West)
  {
    dir: [-1, 0, 0],
    type: 'side',
    light: 0.75,
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  // 4: +Z (South)
  {
    dir: [0, 0, 1],
    type: 'front',
    light: 0.85,
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  // 5: -Z (North)
  {
    dir: [0, 0, -1],
    type: 'side',
    light: 0.85,
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
];

class Chunk {
  constructor(cx, cz, world) {
    this.cx = cx;
    this.cz = cz;
    this.world = world;
    this.voxels = new Uint8Array(CHUNK_VOLUME);
    // 4 high bits = Sky Light (0-15), 4 low bits = Block Light (0-15)
    this.light = new Uint8Array(CHUNK_VOLUME);
    this.deltas = {}; // Modified blocks: { [localIndex]: blockId }

    this.opaqueMesh = null;
    this.translucentMesh = null;
    this.isDirty = true;
    this.isGenerated = false;
    this.isBuilding = false;

    this.worldX = cx * CHUNK_SIZE_X;
    this.worldZ = cz * CHUNK_SIZE_Z;
  }

  getIndex(lx, ly, lz) {
    return lx + lz * CHUNK_SIZE_X + ly * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
  }

  getBlock(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return this.world.getBlock(this.worldX + lx, ly, this.worldZ + lz);
    }
    return this.voxels[this.getIndex(lx, ly, lz)];
  }

  setBlock(lx, ly, lz, blockId) {
    if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
      const idx = this.getIndex(lx, ly, lz);
      this.voxels[idx] = blockId;
      this.deltas[idx] = blockId;
      this.isDirty = true;
    }
  }

  getSkyLight(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return this.world.getSkyLight(this.worldX + lx, ly, this.worldZ + lz);
    }
    return (this.light[this.getIndex(lx, ly, lz)] >> 4) & 0x0f;
  }

  setSkyLight(lx, ly, lz, level) {
    if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
      const idx = this.getIndex(lx, ly, lz);
      const current = this.light[idx];
      this.light[idx] = ((level & 0x0f) << 4) | (current & 0x0f);
    }
  }

  getBlockLight(lx, ly, lz) {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return this.world.getBlockLight(this.worldX + lx, ly, this.worldZ + lz);
    }
    return this.light[this.getIndex(lx, ly, lz)] & 0x0f;
  }

  setBlockLight(lx, ly, lz, level) {
    if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
      const idx = this.getIndex(lx, ly, lz);
      const current = this.light[idx];
      this.light[idx] = (current & 0xf0) | (level & 0x0f);
    }
  }

  // Ambient Occlusion for vertex corners
  getAO(lx, ly, lz, faceIndex, cornerIndex) {
    const face = FACES[faceIndex];
    const nx = lx + face.dir[0];
    const ny = ly + face.dir[1];
    const nz = lz + face.dir[2];

    let s1, s2, c;
    const isSolid = (x, y, z) => {
      const b = this.getBlock(x, y, z);
      const def = BLOCK_DEFS[b];
      return Boolean(def && def.solid && !def.transparent);
    };

    if (faceIndex === 0) { // Top (+Y)
      if (cornerIndex === 0) { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx - 1, ny, nz + 1); }
      else if (cornerIndex === 1) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx + 1, ny, nz + 1); }
      else if (cornerIndex === 2) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx + 1, ny, nz - 1); }
      else { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx - 1, ny, nz - 1); }
    } else if (faceIndex === 1) { // Bottom (-Y)
      if (cornerIndex === 0) { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx - 1, ny, nz - 1); }
      else if (cornerIndex === 1) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx + 1, ny, nz - 1); }
      else if (cornerIndex === 2) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx + 1, ny, nz + 1); }
      else { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx - 1, ny, nz + 1); }
    } else if (faceIndex === 2) { // East (+X)
      if (cornerIndex === 0) { s1 = isSolid(nx, ny - 1, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx, ny - 1, nz + 1); }
      else if (cornerIndex === 1) { s1 = isSolid(nx, ny - 1, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx, ny - 1, nz - 1); }
      else if (cornerIndex === 2) { s1 = isSolid(nx, ny + 1, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx, ny + 1, nz - 1); }
      else { s1 = isSolid(nx, ny + 1, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx, ny + 1, nz + 1); }
    } else if (faceIndex === 3) { // West (-X)
      if (cornerIndex === 0) { s1 = isSolid(nx, ny - 1, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx, ny - 1, nz - 1); }
      else if (cornerIndex === 1) { s1 = isSolid(nx, ny - 1, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx, ny - 1, nz + 1); }
      else if (cornerIndex === 2) { s1 = isSolid(nx, ny + 1, nz); s2 = isSolid(nx, ny, nz + 1); c = isSolid(nx, ny + 1, nz + 1); }
      else { s1 = isSolid(nx, ny + 1, nz); s2 = isSolid(nx, ny, nz - 1); c = isSolid(nx, ny + 1, nz - 1); }
    } else if (faceIndex === 4) { // South (+Z)
      if (cornerIndex === 0) { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny - 1, nz); c = isSolid(nx - 1, ny - 1, nz); }
      else if (cornerIndex === 1) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny - 1, nz); c = isSolid(nx + 1, ny - 1, nz); }
      else if (cornerIndex === 2) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny + 1, nz); c = isSolid(nx + 1, ny + 1, nz); }
      else { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny + 1, nz); c = isSolid(nx - 1, ny + 1, nz); }
    } else { // North (-Z)
      if (cornerIndex === 0) { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny - 1, nz); c = isSolid(nx + 1, ny - 1, nz); }
      else if (cornerIndex === 1) { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny - 1, nz); c = isSolid(nx - 1, ny - 1, nz); }
      else if (cornerIndex === 2) { s1 = isSolid(nx - 1, ny, nz); s2 = isSolid(nx, ny + 1, nz); c = isSolid(nx - 1, ny + 1, nz); }
      else { s1 = isSolid(nx + 1, ny, nz); s2 = isSolid(nx, ny + 1, nz); c = isSolid(nx + 1, ny + 1, nz); }
    }

    if (s1 && s2) return 0.25;
    return 1.0 - ((s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0)) * 0.22;
  }

  // Apply geometry buffers from Web Worker
  applyWorkerBuffers(data, scene, opaqueMaterial, translucentMaterial) {
    if (this.opaqueMesh) {
      scene.remove(this.opaqueMesh);
      if (this.opaqueMesh.geometry) this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.translucentMesh) {
      scene.remove(this.translucentMesh);
      if (this.translucentMesh.geometry) this.translucentMesh.geometry.dispose();
      this.translucentMesh = null;
    }

    if (data.opPositions && data.opPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(data.opPositions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(data.opNormals, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(data.opUvs, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(data.opColors, 3));
      geo.setIndex(new THREE.BufferAttribute(data.opIndices, 1));

      this.opaqueMesh = new THREE.Mesh(geo, opaqueMaterial);
      this.opaqueMesh.castShadow = true;
      this.opaqueMesh.receiveShadow = true;
      scene.add(this.opaqueMesh);
    }

    if (data.trPositions && data.trPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(data.trPositions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(data.trNormals, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(data.trUvs, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(data.trColors, 3));
      geo.setIndex(new THREE.BufferAttribute(data.trIndices, 1));

      this.translucentMesh = new THREE.Mesh(geo, translucentMaterial);
      scene.add(this.translucentMesh);
    }

    this.isDirty = false;
    this.isBuilding = false;
  }

  // Main-thread synchronous mesh builder (with authentic 3D Torch model)
  buildMesh(textureManager, scene, opaqueMaterial, translucentMaterial) {
    this.isDirty = false;

    if (this.opaqueMesh) {
      scene.remove(this.opaqueMesh);
      if (this.opaqueMesh.geometry) this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.translucentMesh) {
      scene.remove(this.translucentMesh);
      if (this.translucentMesh.geometry) this.translucentMesh.geometry.dispose();
      this.translucentMesh = null;
    }

    const opPositions = [], opNormals = [], opUvs = [], opColors = [], opIndices = [];
    let opVertCount = 0;

    const trPositions = [], trNormals = [], trUvs = [], trColors = [], trIndices = [];
    let trVertCount = 0;

    const sunIntensity = this.world.sunLightIntensity || 1.0;

    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const blockId = this.voxels[this.getIndex(lx, ly, lz)];
          if (blockId === BLOCK.AIR) continue;

          const blockDef = BLOCK_DEFS[blockId];
          const isTranslucent = (
            blockId === BLOCK.WATER || blockId === BLOCK.GLASS ||
            blockId === BLOCK.LEAVES || blockId === BLOCK.BIRCH_LEAVES ||
            blockId === BLOCK.JUNGLE_LEAVES || blockId === BLOCK.PAPYRUS ||
            blockId === BLOCK.TORCH
          );

          const positions = isTranslucent ? trPositions : opPositions;
          const normals = isTranslucent ? trNormals : opNormals;
          const uvs = isTranslucent ? trUvs : opUvs;
          const colors = isTranslucent ? trColors : opColors;
          const indices = isTranslucent ? trIndices : opIndices;

          const wx = this.worldX + lx;
          const wy = ly;
          const wz = this.worldZ + lz;

          // -------------------------------------------------------------
          // 3D TORCH MODEL (Slender 3D wooden post with glowing flame top)
          // -------------------------------------------------------------
          if (blockId === BLOCK.TORCH) {
            const tileIdx = TILES.TORCH;
            const { uMin, vMin, uMax, vMax } = textureManager.getTileUVs(tileIdx);
            const skyLight = this.getSkyLight(lx, ly, lz);
            const blockLight = Math.max(14, this.getBlockLight(lx, ly, lz));
            const brightness = Math.max(0.6, (skyLight * sunIntensity + blockLight) / 15.0);

            // Centered post: width 0.125, depth 0.125, height 0.625
            const x0 = wx + 0.4375, x1 = wx + 0.5625;
            const z0 = wz + 0.4375, z1 = wz + 0.5625;
            const y0 = wy + 0.0, y1 = wy + 0.625;

            // North
            let base = trVertCount;
            trPositions.push(x1, y0, z0,  x0, y0, z0,  x0, y1, z0,  x1, y1, z0);
            trNormals.push(0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1);
            trUvs.push(uMax, vMin,  uMin, vMin,  uMin, vMax,  uMax, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // South
            base = trVertCount;
            trPositions.push(x0, y0, z1,  x1, y0, z1,  x1, y1, z1,  x0, y1, z1);
            trNormals.push(0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // West
            base = trVertCount;
            trPositions.push(x0, y0, z0,  x0, y0, z1,  x0, y1, z1,  x0, y1, z0);
            trNormals.push(-1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // East
            base = trVertCount;
            trPositions.push(x1, y0, z1,  x1, y0, z0,  x1, y1, z0,  x1, y1, z1);
            trNormals.push(1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0);
            trUvs.push(uMin, vMin,  uMax, vMin,  uMax, vMax,  uMin, vMax);
            for (let k = 0; k < 4; k++) trColors.push(brightness, brightness * 0.9, brightness * 0.6);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            // Top Flame
            base = trVertCount;
            trPositions.push(x0, y1, z1,  x1, y1, z1,  x1, y1, z0,  x0, y1, z0);
            trNormals.push(0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0);
            trUvs.push(uMin, vMax,  uMax, vMax,  uMax, vMin,  uMin, vMin);
            for (let k = 0; k < 4; k++) trColors.push(1.0, 0.95, 0.7);
            trIndices.push(base, base+1, base+2, base, base+2, base+3);
            trVertCount += 4;

            continue;
          }

          // Check 6 standard cube faces
          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const nx = lx + face.dir[0];
            const ny = ly + face.dir[1];
            const nz = lz + face.dir[2];

            const neighborBlock = this.getBlock(nx, ny, nz);
            const neighborDef = BLOCK_DEFS[neighborBlock];

            let shouldRenderFace = false;
            if (blockId === BLOCK.WATER) {
              shouldRenderFace = (neighborBlock === BLOCK.AIR || neighborBlock === BLOCK.GLASS);
            } else if (blockId === BLOCK.GLASS || blockId === BLOCK.LEAVES || blockId === BLOCK.BIRCH_LEAVES || blockId === BLOCK.JUNGLE_LEAVES || blockId === BLOCK.PAPYRUS) {
              shouldRenderFace = (neighborBlock !== blockId && (!neighborDef.solid || neighborDef.transparent));
            } else {
              shouldRenderFace = (!neighborDef || !neighborDef.solid || neighborDef.transparent);
            }

            if (!shouldRenderFace) continue;

            const tileIdx = textureManager.getBlockTileIndex(blockId, face.type);
            const { uMin, vMin, uMax, vMax } = textureManager.getTileUVs(tileIdx);

            const uvCorners = [
              [uMin, vMin],
              [uMax, vMin],
              [uMax, vMax],
              [uMin, vMax],
            ];

            const baseVert = isTranslucent ? trVertCount : opVertCount;

            // Sample voxel light level from neighbor space
            const skyLight = this.getSkyLight(nx, ny, nz);
            const blockLight = this.getBlockLight(nx, ny, nz);
            const voxelBrightness = Math.max(0.08, (skyLight * sunIntensity + blockLight) / 15.0);

            for (let v = 0; v < 4; v++) {
              const c = face.corners[v];
              positions.push(wx + c[0], wy + c[1], wz + c[2]);
              normals.push(face.dir[0], face.dir[1], face.dir[2]);

              const uv = uvCorners[v];
              uvs.push(uv[0], uv[1]);

              let ao = 1.0;
              if (!isTranslucent) {
                ao = this.getAO(lx, ly, lz, f, v);
              }

              // Combined vertex color: directional light * AO * voxel light
              const finalR = face.light * ao * voxelBrightness;
              const blockLightRatio = blockLight / 15.0;
              const r = Math.min(1.0, finalR + blockLightRatio * 0.15);
              const g = Math.min(1.0, finalR + blockLightRatio * 0.08);
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

    if (opPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(opPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(opNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(opUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(opColors, 3));
      geo.setIndex(opIndices);

      this.opaqueMesh = new THREE.Mesh(geo, opaqueMaterial);
      this.opaqueMesh.castShadow = true;
      this.opaqueMesh.receiveShadow = true;
      scene.add(this.opaqueMesh);
    }

    if (trPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(trPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(trNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(trUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(trColors, 3));
      geo.setIndex(trIndices);

      this.translucentMesh = new THREE.Mesh(geo, translucentMaterial);
      scene.add(this.translucentMesh);
    }
  }

  dispose(scene) {
    if (this.opaqueMesh) {
      scene.remove(this.opaqueMesh);
      if (this.opaqueMesh.geometry) this.opaqueMesh.geometry.dispose();
      this.opaqueMesh = null;
    }
    if (this.translucentMesh) {
      scene.remove(this.translucentMesh);
      if (this.translucentMesh.geometry) this.translucentMesh.geometry.dispose();
      this.translucentMesh = null;
    }
  }
}

class World {
  constructor(scene, textureManager) {
    this.scene = scene;
    this.textureManager = textureManager;
    this.storage = new WorldStorage();

    // Deterministic World Seed
    this.seed = 87654321;
    this.noise = new SimplexNoise(this.seed);
    this.tempNoise = new SimplexNoise(this.seed + 101);
    this.moistNoise = new SimplexNoise(this.seed + 202);
    this.caveNoise = new SimplexNoise(this.seed + 303);
    this.treeNoise = new SimplexNoise(this.seed + 404);

    this.chunks = new Map();
    this.renderDistance = 4;
    this.sunLightIntensity = 1.0;

    // Cellular Automata & Physics Timers
    this.fluidTickTimer = 0;
    this.gravityTickTimer = 0;

    this.initMaterials();
    this.initWorkers();
  }

  initMaterials() {
    this.opaqueMaterial = new THREE.MeshLambertMaterial({
      map: this.textureManager.atlasTexture,
      vertexColors: true,
      alphaTest: 0.1,
    });

    this.translucentMaterial = new THREE.MeshLambertMaterial({
      map: this.textureManager.atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      alphaTest: 0.1,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    // Animated undulating water shader wave hook
    this.translucentMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      this.waterShaderUniforms = shader.uniforms;
      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        if (normal.y > 0.8) {
          transformed.y += sin(uTime * 3.0 + transformed.x * 2.0 + transformed.z * 2.0) * 0.04;
        }
        `
      );
    };
  }

  initWorkers() {
    this.workers = [];
    this.workerQueue = [];
    this.workerBusy = [];

    const numWorkers = (window.navigator && window.navigator.hardwareConcurrency)
      ? Math.min(3, Math.max(1, window.navigator.hardwareConcurrency - 1)) : 2;

    for (let i = 0; i < numWorkers; i++) {
      try {
        const w = new Worker('js/chunk-worker.js');
        const workerIdx = i;
        this.workerBusy[workerIdx] = false;

        w.onmessage = (e) => {
          const msg = e.data;
          if (msg.type === 'CHUNK_BUILT') {
            const key = this.getChunkKey(msg.cx, msg.cz);
            const chunk = this.chunks.get(key);
            if (chunk) {
              chunk.voxels = msg.voxels;
              chunk.isGenerated = true;
              chunk.applyWorkerBuffers(msg, this.scene, this.opaqueMaterial, this.translucentMaterial);
            }
          }
          this.workerBusy[workerIdx] = false;
          this.processWorkerQueue();
        };

        w.onerror = (err) => {
          console.warn('Chunk Worker error, falling back to sync:', err);
          this.workerBusy[workerIdx] = false;
        };

        this.workers.push(w);
      } catch (e) {
        console.warn('Worker initialization failed, using sync fallback:', e);
      }
    }
  }

  processWorkerQueue() {
    if (this.workerQueue.length === 0) return;

    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.workerQueue.length > 0) {
        const task = this.workerQueue.shift();
        const chunk = this.chunks.get(this.getChunkKey(task.cx, task.cz));
        if (chunk) {
          this.workerBusy[i] = true;
          this.workers[i].postMessage({
            type: 'BUILD_CHUNK',
            cx: task.cx,
            cz: task.cz,
            seed: this.seed,
            deltas: chunk.deltas,
            sunIntensity: this.sunLightIntensity,
          });
        }
      }
    }
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(this.getChunkKey(cx, cz)) || null;
  }

  getOrCreateChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz, this);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return BLOCK.AIR;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BLOCK.AIR;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.voxels[chunk.getIndex(lx, wy, lz)];
  }

  getSkyLight(wx, wy, wz) {
    if (wy < 0) return 0;
    if (wy >= CHUNK_SIZE_Y) return 15;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 15;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getSkyLight(lx, wy, lz);
  }

  getBlockLight(wx, wy, wz) {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return 0;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getBlockLight(lx, wy, lz);
  }

  setBlock(wx, wy, wz, blockId, saveToStorage = true) {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return false;
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getOrCreateChunk(cx, cz);

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    chunk.setBlock(lx, wy, lz, blockId);

    if (saveToStorage) {
      this.storage.saveChunkDelta(cx, cz, chunk.deltas);
    }

    this.updateLightingAt(wx, wy, wz);

    // Edge neighbor dirtying
    if (lx === 0) { const c = this.getChunk(cx - 1, cz); if (c) c.isDirty = true; }
    if (lx === CHUNK_SIZE_X - 1) { const c = this.getChunk(cx + 1, cz); if (c) c.isDirty = true; }
    if (lz === 0) { const c = this.getChunk(cx, cz - 1); if (c) c.isDirty = true; }
    if (lz === CHUNK_SIZE_Z - 1) { const c = this.getChunk(cx, cz + 1); if (c) c.isDirty = true; }

    chunk.buildMesh(this.textureManager, this.scene, this.opaqueMaterial, this.translucentMaterial);
    [-1, 1].forEach(dx => {
      const c = this.getChunk(cx + dx, cz);
      if (c && c.isDirty) c.buildMesh(this.textureManager, this.scene, this.opaqueMaterial, this.translucentMaterial);
    });
    [-1, 1].forEach(dz => {
      const c = this.getChunk(cx, cz + dz);
      if (c && c.isDirty) c.buildMesh(this.textureManager, this.scene, this.opaqueMaterial, this.translucentMaterial);
    });

    return true;
  }

  getBiome(wx, wz) {
    const temp = this.tempNoise.fbm2D(wx * 0.003, wz * 0.003, 2);
    const moist = this.moistNoise.fbm2D(wx * 0.003, wz * 0.003, 2);

    if (temp < -0.2) return BIOME.SNOW;
    if (temp > 0.3 && moist < -0.1) return BIOME.DESERT;
    if (moist > 0.2) return BIOME.FOREST;
    const continental = this.noise.fbm2D(wx * 0.004, wz * 0.004, 3);
    if (continental > 0.45) return BIOME.MOUNTAINS;
    return BIOME.PLAINS;
  }

  getTerrainHeight(wx, wz) {
    const biome = this.getBiome(wx, wz);
    const continental = this.noise.fbm2D(wx * 0.006, wz * 0.006, 3, 2.0, 0.5);
    const detail = this.noise.fbm2D(wx * 0.025, wz * 0.025, 3, 2.0, 0.5);

    let baseHeight = 22;
    let amplitude = 10;

    if (biome === BIOME.MOUNTAINS) {
      baseHeight = 26;
      amplitude = 22;
    } else if (biome === BIOME.DESERT) {
      baseHeight = 20;
      amplitude = 6;
    } else if (biome === BIOME.PLAINS) {
      baseHeight = 22;
      amplitude = 8;
    }

    let height = baseHeight + continental * amplitude + detail * 5;
    return Math.floor(Math.max(2, Math.min(CHUNK_SIZE_Y - 8, height)));
  }

  calculateChunkLighting(chunk) {
    const lightQueue = [];

    // Sky Light
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        let currentSkyLight = 15;
        for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
          const b = chunk.getBlock(lx, y, lz);
          const def = BLOCK_DEFS[b];

          if (def && (!def.lightPasses || def.solid)) {
            currentSkyLight = 0;
          }

          chunk.setSkyLight(lx, y, lz, currentSkyLight);

          if (def && def.lightEmission > 0) {
            chunk.setBlockLight(lx, y, lz, def.lightEmission);
            lightQueue.push({ lx, y, lz, light: def.lightEmission });
          } else {
            chunk.setBlockLight(lx, y, lz, 0);
          }
        }
      }
    }

    // BFS Block Light
    const neighbors = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];

    while (lightQueue.length > 0) {
      const { lx, y, lz, light } = lightQueue.shift();
      if (light <= 1) continue;

      for (const [dx, dy, dz] of neighbors) {
        const nx = lx + dx;
        const ny = y + dy;
        const nz = lz + dz;

        if (nx >= 0 && nx < CHUNK_SIZE_X && ny >= 0 && ny < CHUNK_SIZE_Y && nz >= 0 && nz < CHUNK_SIZE_Z) {
          const neighborBlock = chunk.getBlock(nx, ny, nz);
          const neighborDef = BLOCK_DEFS[neighborBlock];

          if (neighborDef && neighborDef.lightPasses) {
            const currentLight = chunk.getBlockLight(nx, ny, nz);
            if (currentLight < light - 1) {
              chunk.setBlockLight(nx, ny, nz, light - 1);
              lightQueue.push({ lx: nx, y: ny, lz: nz, light: light - 1 });
            }
          }
        }
      }
    }
  }

  updateLightingAt(wx, wy, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      this.calculateChunkLighting(chunk);
    }
  }

  growVegetation(chunk, rootX, rootY, rootZ, biome) {
    if (biome === BIOME.DESERT) {
      const cactusHeight = 2 + Math.floor(Math.random() * 2);
      for (let dy = 0; dy < cactusHeight; dy++) {
        if (rootY + dy < CHUNK_SIZE_Y) {
          chunk.setBlock(rootX, rootY + dy, rootZ, BLOCK.CACTUS);
        }
      }
      return;
    }

    const isJungle = (biome === BIOME.FOREST && Math.random() < 0.33);
    const isBirch = (!isJungle && biome === BIOME.FOREST && Math.random() > 0.5);
    const trunkBlock = isJungle ? BLOCK.JUNGLE_WOOD : (isBirch ? BLOCK.BIRCH_WOOD : BLOCK.WOOD);
    const leafBlock = isJungle ? BLOCK.JUNGLE_LEAVES : (isBirch ? BLOCK.BIRCH_LEAVES : BLOCK.LEAVES);

    const trunkHeight = 4 + Math.floor(Math.random() * 2);
    for (let dy = 0; dy < trunkHeight; dy++) {
      if (rootY + dy < CHUNK_SIZE_Y) {
        chunk.setBlock(rootX, rootY + dy, rootZ, trunkBlock);
      }
    }

    // Leaves
    const leafRadius = 2;
    for (let ox = -leafRadius; ox <= leafRadius; ox++) {
      for (let oz = -leafRadius; oz <= leafRadius; oz++) {
        for (let oy = trunkHeight - 2; oy <= trunkHeight + 1; oy++) {
          if (Math.abs(ox) === leafRadius && Math.abs(oz) === leafRadius && oy > trunkHeight - 1) continue;
          const lx = rootX + ox;
          const ly = rootY + oy;
          const lz = rootZ + oz;
          if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z && ly < CHUNK_SIZE_Y) {
            if (chunk.getBlock(lx, ly, lz) === BLOCK.AIR) {
              chunk.setBlock(lx, ly, lz, leafBlock);
            }
          }
        }
      }
    }
  }

  async generateChunkData(chunk) {
    if (chunk.isGenerated) return;

    // Use Worker if available
    if (this.workers.length > 0 && !chunk.isBuilding) {
      chunk.isBuilding = true;
      const savedDeltas = await this.storage.loadChunkDelta(chunk.cx, chunk.cz);
      if (savedDeltas) {
        for (const [idxStr, blockId] of Object.entries(savedDeltas)) {
          chunk.deltas[parseInt(idxStr, 10)] = blockId;
        }
      }
      this.workerQueue.push({ cx: chunk.cx, cz: chunk.cz });
      this.processWorkerQueue();
      return;
    }

    // Synchronous fallback
    const treesToGrow = [];
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = chunk.worldX + lx;
        const wz = chunk.worldZ + lz;

        const biome = this.getBiome(wx, wz);
        const height = this.getTerrainHeight(wx, wz);

        for (let y = 0; y < CHUNK_SIZE_Y; y++) {
          if (y === 0) {
            chunk.setBlock(lx, y, lz, BLOCK.BEDROCK);
            continue;
          }

          if (y > height) {
            if (y <= SEA_LEVEL) {
              chunk.setBlock(lx, y, lz, BLOCK.WATER);
            } else {
              chunk.setBlock(lx, y, lz, BLOCK.AIR);
            }
            continue;
          }

          let isCave = false;
          if (y < height - 3 && y > 3) {
            const caveVal = this.caveNoise.fbm3D(wx * 0.045, y * 0.05, wz * 0.045, 2);
            if (caveVal > 0.44 && (y > SEA_LEVEL || height > SEA_LEVEL + 4)) {
              isCave = true;
            }
          }

          if (isCave) {
            chunk.setBlock(lx, y, lz, BLOCK.AIR);
            continue;
          }

          if (y < height - 3) {
            let blockToPlace = BLOCK.STONE;
            const oreRand = ((wx * 37 + y * 73 + wz * 109) % 1000) / 1000;
            if (y <= 16 && oreRand < 0.012) blockToPlace = BLOCK.DIAMOND_ORE;
            else if (y <= 24 && oreRand < 0.02) blockToPlace = BLOCK.GOLD_ORE;
            else if (y <= 28 && oreRand < 0.025) blockToPlace = BLOCK.MESE_ORE; // MultiCraft Mese
            else if (y <= 42 && oreRand < 0.035) blockToPlace = BLOCK.IRON_ORE;
            else if (y <= 58 && oreRand < 0.05) blockToPlace = BLOCK.COAL_ORE;
            chunk.setBlock(lx, y, lz, blockToPlace);
          } else if (y < height) {
            chunk.setBlock(lx, y, lz, biome === BIOME.DESERT ? (y === height - 3 ? BLOCK.SANDSTONE : BLOCK.SAND) : BLOCK.DIRT);
          } else {
            if (height <= SEA_LEVEL + 1 || biome === BIOME.DESERT) {
              chunk.setBlock(lx, y, lz, BLOCK.SAND);
            } else if (biome === BIOME.SNOW) {
              chunk.setBlock(lx, y, lz, BLOCK.SNOW_GRASS);
              chunk.setBlock(lx, height + 1, lz, BLOCK.SNOW);
            } else {
              chunk.setBlock(lx, y, lz, BLOCK.GRASS);
              if (lx >= 2 && lx <= CHUNK_SIZE_X - 3 && lz >= 2 && lz <= CHUNK_SIZE_Z - 3) {
                const treeChance = biome === BIOME.FOREST ? 0.06 : 0.015;
                if (Math.random() < treeChance) {
                  treesToGrow.push({ x: lx, y: height + 1, z: lz, biome });
                }
              }
            }
          }
        }

        if (height < SEA_LEVEL) {
          for (let y = height + 1; y <= SEA_LEVEL; y++) {
            chunk.setBlock(lx, y, lz, BLOCK.WATER);
          }
        }
      }
    }

    treesToGrow.forEach(t => {
      this.growVegetation(chunk, t.x, t.y, t.z, t.biome);
    });

    const savedDeltas = await this.storage.loadChunkDelta(chunk.cx, chunk.cz);
    if (savedDeltas) {
      for (const [idxStr, blockId] of Object.entries(savedDeltas)) {
        const idx = parseInt(idxStr, 10);
        chunk.voxels[idx] = blockId;
        chunk.deltas[idx] = blockId;
      }
    }

    // Preserve in-memory network chunk deltas received from server
    if (chunk.deltas) {
      for (const [idxStr, blockId] of Object.entries(chunk.deltas)) {
        const idx = parseInt(idxStr, 10);
        chunk.voxels[idx] = blockId;
      }
    }

    this.calculateChunkLighting(chunk);
    chunk.isGenerated = true;
    chunk.isDirty = true;
  }

  // Fluid Cellular Automata (Water & Lava Spreading & Obsidian/Cobblestone generation)
  updateFluids(dt) {
    this.fluidTickTimer += dt;
    if (this.fluidTickTimer < 0.25) return; // 4 Hz fluid tick
    this.fluidTickTimer = 0;

    // Check active fluid blocks across chunks near player
    const neighborDirs = [
      [0, -1, 0], // Down first
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
    ];

    const fluidChanges = [];

    this.chunks.forEach((chunk) => {
      if (!chunk.isGenerated) return;

      for (let ly = 1; ly < CHUNK_SIZE_Y - 1; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz += 2) {
          for (let lx = 0; lx < CHUNK_SIZE_X; lx += 2) {
            const b = chunk.getBlock(lx, ly, lz);
            if (b === BLOCK.WATER || b === BLOCK.LAVA) {
              const wx = chunk.worldX + lx;
              const wy = ly;
              const wz = chunk.worldZ + lz;

              for (const [dx, dy, dz] of neighborDirs) {
                const nx = wx + dx;
                const ny = wy + dy;
                const nz = wz + dz;
                const nb = this.getBlock(nx, ny, nz);

                // Collision: Water meets Lava
                if (b === BLOCK.WATER && nb === BLOCK.LAVA) {
                  // Turn lava into Obsidian!
                  fluidChanges.push({ x: nx, y: ny, z: nz, block: BLOCK.OBSIDIAN });
                } else if (b === BLOCK.LAVA && nb === BLOCK.WATER) {
                  // Turn water into Cobblestone!
                  fluidChanges.push({ x: nx, y: ny, z: nz, block: BLOCK.COBBLESTONE });
                } else if (nb === BLOCK.AIR && dy === -1) {
                  // Fluid flow downwards
                  fluidChanges.push({ x: nx, y: ny, z: nz, block: b });
                  break;
                }
              }
            }
          }
        }
      }
    });

    fluidChanges.slice(0, 3).forEach(ch => {
      this.setBlock(ch.x, ch.y, ch.z, ch.block);
    });
  }

  update(playerPos) {
    // 1. Update Water rippling shader time
    if (this.waterShaderUniforms) {
      this.waterShaderUniforms.uTime.value = performance.now() * 0.001;
    }

    // 2. Fluid cellular automata
    this.updateFluids(0.016);

    const pChunkX = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const pChunkZ = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    const radius = this.renderDistance;
    const requiredKeys = new Set();
    const chunksToGenerate = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz <= (radius + 0.5) * (radius + 0.5)) {
          const cx = pChunkX + dx;
          const cz = pChunkZ + dz;
          const key = this.getChunkKey(cx, cz);
          requiredKeys.add(key);

          let chunk = this.chunks.get(key);
          if (!chunk) {
            chunk = new Chunk(cx, cz, this);
            this.chunks.set(key, chunk);
          }
          if (!chunk.isGenerated && !chunk.isBuilding) {
            chunksToGenerate.push(chunk);
          }
        }
      }
    }

    chunksToGenerate.sort((a, b) => {
      const da = (a.cx - pChunkX) ** 2 + (a.cz - pChunkZ) ** 2;
      const db = (b.cx - pChunkX) ** 2 + (b.cz - pChunkZ) ** 2;
      return da - db;
    });

    let generatedCount = 0;
    for (const chunk of chunksToGenerate) {
      this.generateChunkData(chunk);
      generatedCount++;
      if (generatedCount >= 3) break;
    }

    let remeshedCount = 0;
    for (const key of requiredKeys) {
      const chunk = this.chunks.get(key);
      if (chunk && chunk.isGenerated && chunk.isDirty) {
        chunk.buildMesh(this.textureManager, this.scene, this.opaqueMaterial, this.translucentMaterial);
        remeshedCount++;
        if (remeshedCount >= 2) break;
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!requiredKeys.has(key)) {
        chunk.dispose(this.scene);
        this.chunks.delete(key);
      }
    }
  }

  preloadSpawn(spawnX, spawnZ, radius = 2) {
    const pChunkX = Math.floor(spawnX / CHUNK_SIZE_X);
    const pChunkZ = Math.floor(spawnZ / CHUNK_SIZE_Z);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = pChunkX + dx;
        const cz = pChunkZ + dz;
        const chunk = this.getOrCreateChunk(cx, cz);
        this.generateChunkData(chunk);
      }
    }

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = pChunkX + dx;
        const cz = pChunkZ + dz;
        const chunk = this.getChunk(cx, cz);
        if (chunk) {
          chunk.buildMesh(this.textureManager, this.scene, this.opaqueMaterial, this.translucentMaterial);
        }
      }
    }
  }
}
