/**
 * Mining System, Block Cracking Stages, Destruction Particles & 3D Dropped Items
 * Authentic Minecraft Java Edition hardness calculation, crack overlays,
 * textured voxel debris bursts, and magnetizing floating dropped item entities.
 */

class MiningSystem {
  constructor(world, scene, textureManager, soundManager) {
    this.world = world;
    this.scene = scene;
    this.textureManager = textureManager;
    this.soundManager = soundManager;

    this.currentBlock = null; // { x, y, z, blockId }
    this.breakProgress = 0.0; // 0.0 to 1.0
    this.isMining = false;
    this.equippedItem = null;

    // Active world entities managed by mining & physics
    this.droppedItems = [];
    this.particles = [];
    this.fallingBlocks = [];
    this.arrows = [];
    this.tnts = [];
    this.itemTextureCache = {};

    this.initCrackMesh();
  }

  initCrackMesh() {
    const geo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
    this.crackMaterial = new THREE.MeshBasicMaterial({
      map: this.textureManager.atlasTexture,
      transparent: true,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.crackMesh = new THREE.Mesh(geo, this.crackMaterial);
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);
  }

  // Calculate break time in seconds based on block hardness, equipped tool, and tier
  getBreakTime(blockId, equippedItem) {
    const def = BLOCK_DEFS[blockId];
    if (!def || def.indestructible || def.hardness === undefined) return Infinity;
    if (def.hardness === 0) return 0.05; // Instantaneous blocks like torches

    let speedMultiplier = 1.0;
    const canHarvest = (!def.requiredTier) || (equippedItem && equippedItem.tier && equippedItem.tier.level >= def.requiredTier);

    if (equippedItem && equippedItem.type === def.bestTool) {
      speedMultiplier = equippedItem.tier.multiplier;
    }

    const baseTime = canHarvest ? (def.hardness * 1.5) : (def.hardness * 5.0);
    return Math.max(0.08, baseTime / speedMultiplier);
  }

  // Update crack stage texture on the overlay mesh
  updateCrackStage(stage) {
    if (stage < 0 || stage > 9) {
      this.crackMesh.visible = false;
      return;
    }

    const tileIdx = TILES.CRACK_0 + stage;
    const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileIdx);

    const uvs = this.crackMesh.geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i += 4) {
      uvs.setXY(i, uMin, vMin);
      uvs.setXY(i + 1, uMax, vMin);
      uvs.setXY(i + 2, uMax, vMax);
      uvs.setXY(i + 3, uMin, vMax);
    }
    uvs.needsUpdate = true;
    this.crackMesh.visible = true;
  }

  // Start or continue mining
  startMining(targetBlock, equippedItem) {
    if (!targetBlock) {
      this.stopMining();
      return;
    }

    const def = BLOCK_DEFS[targetBlock.blockId];
    if (!def || def.indestructible) {
      this.stopMining();
      return;
    }

    // Switched to a different block
    if (!this.currentBlock || this.currentBlock.x !== targetBlock.x ||
        this.currentBlock.y !== targetBlock.y || this.currentBlock.z !== targetBlock.z) {
      this.currentBlock = { ...targetBlock };
      this.breakProgress = 0.0;
      this.crackMesh.position.set(targetBlock.x + 0.5, targetBlock.y + 0.5, targetBlock.z + 0.5);
    }

    this.isMining = true;
    this.equippedItem = equippedItem;
  }

  stopMining() {
    this.isMining = false;
    this.breakProgress = 0.0;
    this.currentBlock = null;
    this.crackMesh.visible = false;
  }

  // Spawn textured debris particle burst
  spawnBlockParticles(x, y, z, blockId) {
    const tileIdx = this.textureManager.getBlockTileIndex(blockId, 'side');
    const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileIdx);

    const particleCount = 14;
    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({
        map: this.textureManager.atlasTexture,
        transparent: true,
      });

      const pU = uMin + Math.random() * (uMax - uMin);
      const pV = vMin + Math.random() * (vMax - vMin);
      const uvs = geo.attributes.uv;
      for (let j = 0; j < uvs.count; j++) {
        uvs.setXY(j, pU, pV);
      }
      uvs.needsUpdate = true;

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        x + 0.5 + (Math.random() - 0.5) * 0.6,
        y + 0.5 + (Math.random() - 0.5) * 0.6,
        z + 0.5 + (Math.random() - 0.5) * 0.6
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.0,
          Math.random() * 3.5 + 1.5,
          (Math.random() - 0.5) * 4.0
        ),
        rotSpeed: new THREE.Vector3(
          Math.random() * 8, Math.random() * 8, Math.random() * 8
        ),
        life: 0.55,
      });
    }
  }

  // Spawn critical hit sparkle particles
  spawnCritParticles(x, y, z) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95 });
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.4,
        y + 0.4 + (Math.random() - 0.5) * 0.4,
        z + (Math.random() - 0.5) * 0.4
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          Math.random() * 2.5 + 1.0,
          (Math.random() - 0.5) * 3.5
        ),
        rotSpeed: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        life: 0.45,
      });
    }
  }

  // Spawn explosion fiery cloud and debris particles
  spawnExplosionParticles(x, y, z) {
    const colors = [0xff4500, 0xffa500, 0x555555, 0x888888, 0xffffff];
    for (let i = 0; i < 35; i++) {
      const geo = new THREE.BoxGeometry(0.25 + Math.random() * 0.2, 0.25 + Math.random() * 0.2, 0.25 + Math.random() * 0.2);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, z + (Math.random() - 0.5) * 0.8);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 12.0,
          Math.random() * 8.0 + 3.0,
          (Math.random() - 0.5) * 12.0
        ),
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0.6 + Math.random() * 0.4,
      });
    }
  }

  // Spawn floating 3D rotating dropped item entity
  spawnDroppedItem(x, y, z, itemType, itemId, count = 1) {
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    let mat;

    if (itemType === 'block') {
      // BoxGeometry face order: +X (0), -X (1), +Y (2), -Y (3), +Z (4), -Z (5)
      const faceTypes = ['side', 'side', 'top', 'bottom', 'front', 'side'];
      const uvs = geo.attributes.uv;
      for (let face = 0; face < 6; face++) {
        const tileIdx = this.textureManager.getBlockTileIndex(itemId, faceTypes[face]);
        const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileIdx);
        const base = face * 4;
        uvs.setXY(base, uMin, vMax);
        uvs.setXY(base + 1, uMax, vMax);
        uvs.setXY(base + 2, uMin, vMin);
        uvs.setXY(base + 3, uMax, vMin);
      }
      uvs.needsUpdate = true;
      mat = new THREE.MeshLambertMaterial({
        map: this.textureManager.atlasTexture,
      });
    } else {
      let itemTex = this.itemTextureCache[itemId];
      if (!itemTex) {
        const dataUrl = this.textureManager.getIconDataURL(itemId, true);
        if (dataUrl) {
          itemTex = new THREE.TextureLoader().load(dataUrl);
          itemTex.magFilter = THREE.NearestFilter;
          itemTex.minFilter = THREE.NearestFilter;
          this.itemTextureCache[itemId] = itemTex;
        }
      }
      mat = new THREE.MeshLambertMaterial({
        map: itemTex || this.textureManager.atlasTexture,
        transparent: Boolean(itemTex),
        alphaTest: 0.1,
      });
    }

    const spawnPos = new THREE.Vector3(x + 0.5, y + 0.4, z + 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    this.droppedItems.push({
      mesh,
      itemType,
      itemId,
      count,
      pos: spawnPos.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        2.0,
        (Math.random() - 0.5) * 1.2
      ),
      ownsMaterial: true,
      bobTime: Math.random() * Math.PI * 2,
      pickupDelay: 0.35,
    });
  }

  // Spawn dropped item from authoritative multiplayer packet
  spawnDroppedItemFromNetwork(drop) {
    if (!drop) return;
    this.spawnDroppedItem(drop.x - 0.5, drop.y - 0.4, drop.z - 0.5, drop.itemType, drop.itemId, drop.count || 1);
  }

  // Spawn network synchronized primed TNT entity
  spawnPrimedTNTMesh(tntData) {
    if (!tntData) return null;
    return this.spawnPrimedTnt(tntData.x, tntData.y, tntData.z, tntData.fuse || 3.5, false);
  }

  // Spawn network synchronized flying arrow entity
  spawnArrowFromNetwork(arrowData) {
    if (!arrowData) return null;
    const origin = new THREE.Vector3(arrowData.x, arrowData.y, arrowData.z);
    const dir = new THREE.Vector3(arrowData.vx || 0, arrowData.vy || 0, arrowData.vz || 0);
    const speed = dir.length();
    if (speed > 0.001) dir.normalize();
    else dir.set(0, 0, 1);
    const power = Math.max(0.2, Math.min(1.0, speed / 25.0));
    return this.shootArrow(origin, dir, power, false);
  }

  // Sand and Gravel Gravity Physics: check unsupported column above broken block
  checkSandGravelFall(x, y, z) {
    let checkY = y + 1;
    while (checkY < 128) {
      const bAbove = this.world.getBlock(x, checkY, z);
      if (bAbove === BLOCK.SAND || bAbove === BLOCK.GRAVEL) {
        // Remove from world and spawn falling block entity
        this.world.setBlock(x, checkY, z, BLOCK.AIR);
        this.spawnFallingBlock(x, checkY, z, bAbove);
        checkY++;
      } else {
        break;
      }
    }
  }

  // Spawn falling block entity (Sand / Gravel)
  spawnFallingBlock(x, y, z, blockId) {
    const geo = new THREE.BoxGeometry(0.99, 0.99, 0.99);
    const tileIdx = this.textureManager.getBlockTileIndex(blockId, 'side');
    const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileIdx);
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i += 4) {
      uvs.setXY(i, uMin, vMin);
      uvs.setXY(i + 1, uMax, vMin);
      uvs.setXY(i + 2, uMax, vMax);
      uvs.setXY(i + 3, uMin, vMax);
    }
    uvs.needsUpdate = true;

    const mat = new THREE.MeshLambertMaterial({ map: this.textureManager.atlasTexture });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    this.fallingBlocks.push({
      mesh,
      blockId,
      gridX: x,
      gridZ: z,
      velocity: new THREE.Vector3(0, -2.0, 0),
    });
  }

  // 3D Arrow Ballistics: shoot arrow from position in direction with power
  shootArrow(origin, direction, power = 1.0, isPlayer = true) {
    const group = new THREE.Group();

    // Wooden shaft
    const shaftGeo = new THREE.BoxGeometry(0.04, 0.04, 0.55);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.z = 0.1;
    group.add(shaft);

    // Stone tip
    const tipGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
    const tipMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.38;
    group.add(tip);

    // White fletching feathers
    const featherGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const featherMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.position.z = -0.18;
    group.add(feather);

    group.position.copy(origin);
    const dirNorm = direction.clone().normalize();
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirNorm);
    this.scene.add(group);

    const speed = Math.max(12.0, power * 36.0);
    const arrow = {
      mesh: group,
      velocity: dirNorm.multiplyScalar(speed),
      power,
      isPlayer,
      stuck: false,
      stuckPos: null,
      life: 20.0, // Despawns after 20s if stuck
    };
    this.arrows.push(arrow);

    if (this.soundManager) {
      this.soundManager.playBowTwang(power);
    }

    // Multiplayer broadcast
    if (isPlayer && window.game && window.game.multiplayer) {
      window.game.multiplayer.sendShootArrow(origin, direction, power);
    }

    return arrow;
  }

  // Primed TNT: spawn active ticking explosive
  spawnPrimedTnt(x, y, z, fuse = 3.5, broadcast = true) {
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);

    // Materials: normal TNT texture vs white flashing material
    const matNormal = new THREE.MeshLambertMaterial({ map: this.textureManager.atlasTexture });
    const matFlash = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Apply TNT UVs
    const tileSide = TILES.TNT_SIDE;
    const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileSide);
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i += 4) {
      uvs.setXY(i, uMin, vMin);
      uvs.setXY(i + 1, uMax, vMin);
      uvs.setXY(i + 2, uMax, vMax);
      uvs.setXY(i + 3, uMin, vMax);
    }
    uvs.needsUpdate = true;

    const mesh = new THREE.Mesh(geo, matNormal);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.scene.add(mesh);

    if (this.soundManager) {
      this.soundManager.playFuse();
    }

    const tnt = {
      mesh,
      matNormal,
      matFlash,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 3.5, (Math.random() - 0.5) * 1.5),
      fuse,
      initialFuse: fuse,
    };
    this.tnts.push(tnt);

    if (broadcast && window.game && window.game.multiplayer) {
      window.game.multiplayer.sendTntSpawn(x, y, z, fuse);
    }

    return tnt;
  }

  // Raycast voxel explosion for TNT and Creepers
  explode(x, y, z, radius = 3.8, broadcast = true) {
    if (this.soundManager) {
      this.soundManager.playExplosion();
    }
    this.spawnExplosionParticles(x, y, z);

    const rCeil = Math.ceil(radius);
    const destroyedBlocks = [];

    // Voxel crater destruction
    for (let dx = -rCeil; dx <= rCeil; dx++) {
      for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dz = -rCeil; dz <= rCeil; dz++) {
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= radius * radius + (Math.random() - 0.5) * 3.0) {
            const bx = Math.floor(x + dx);
            const by = Math.floor(y + dy);
            const bz = Math.floor(z + dz);
            const bId = this.world.getBlock(bx, by, bz);

            if (bId !== BLOCK.AIR && bId !== BLOCK.BEDROCK && bId !== BLOCK.OBSIDIAN) {
              this.world.setBlock(bx, by, bz, BLOCK.AIR);
              destroyedBlocks.push({ x: bx, y: by, z: bz });

              // If another TNT is caught in blast, chain-ignite it!
              if (bId === BLOCK.TNT) {
                this.spawnPrimedTnt(bx, by, bz, 0.4 + Math.random() * 0.4, false);
              } else if (Math.random() < 0.3) {
                const def = BLOCK_DEFS[bId];
                if (def && def.dropItem) {
                  this.spawnDroppedItem(bx, by, bz, def.dropItem.type, def.dropItem.id, 1);
                }
              }

              // Check if blocks above need to fall
              this.checkSandGravelFall(bx, by, bz);
            }
          }
        }
      }
    }

    // Damage player if in blast radius
    if (window.game && window.game.player && window.game.survival) {
      const pPos = window.game.player.position;
      const pDist = pPos.distanceTo(new THREE.Vector3(x, y, z));
      const maxBlastDist = radius * 2.2;
      if (pDist < maxBlastDist) {
        const falloff = 1.0 - (pDist / maxBlastDist);
        const damage = Math.round(falloff * 24.0);
        window.game.survival.takeDamage(damage, true, false);

        // Explosion impulse knockback
        const impulse = new THREE.Vector3().subVectors(pPos, new THREE.Vector3(x, y, z)).normalize().multiplyScalar(falloff * 16.0);
        impulse.y = Math.max(5.0, impulse.y);
        window.game.player.velocity.add(impulse);
      }
    }

    // Damage mobs in blast radius
    const mobMgr = (window.game && (window.game.mobs || window.game.mobManager));
    if (mobMgr && mobMgr.mobs) {
      for (let mIdx = mobMgr.mobs.length - 1; mIdx >= 0; mIdx--) {
        const mob = mobMgr.mobs[mIdx];
        if (!mob || mob.health <= 0 || !mob.root) continue;
        const mPos = mob.root.position;
        const mDist = mPos.distanceTo(new THREE.Vector3(x, y, z));
        if (mDist < radius * 2.2) {
          const falloff = 1.0 - (mDist / (radius * 2.2));
          const dmg = Math.round(falloff * 28.0);
          const push = new THREE.Vector3().subVectors(mPos, new THREE.Vector3(x, y, z)).normalize();
          if (push.lengthSq() < 0.001) push.set(0, 1, 0);
          mobMgr.hitMob(mob, dmg, push, true);
        }
      }
    }

    // Multiplayer broadcast
    if (broadcast && window.game && window.game.multiplayer) {
      window.game.multiplayer.sendExplosion(x, y, z, radius);
    }
  }

  // Update loop: mining progression, particle physics, dropped items, falling blocks, arrows, TNT
  update(dt, player, inventory) {
    // 1. Process Mining
    if (this.isMining && this.currentBlock) {
      const { x, y, z, blockId } = this.currentBlock;
      const breakTime = this.getBreakTime(blockId, this.equippedItem);

      this.breakProgress += dt / breakTime;
      const stage = Math.min(9, Math.floor(this.breakProgress * 10));
      this.updateCrackStage(stage);

      // Play cracking sound at intervals
      if (Math.random() < 0.15) {
        const def = BLOCK_DEFS[blockId];
        this.soundManager.playStep(def && def.sound ? def.sound : 'stone');
      }

      // Block is fully broken!
      if (this.breakProgress >= 1.0) {
        const def = BLOCK_DEFS[blockId];
        this.world.setBlock(x, y, z, BLOCK.AIR);
        if (window.game && window.game.multiplayer) {
          window.game.multiplayer.sendBlockDelta(x, y, z, BLOCK.AIR);
        }
        this.soundManager.playBreak(def && def.sound ? def.sound : 'stone');
        this.spawnBlockParticles(x, y, z, blockId);

        // Spawn dropped item
        if (def && def.dropItem) {
          if (!def.dropItem.chance || Math.random() < def.dropItem.chance) {
            this.spawnDroppedItem(x, y, z, def.dropItem.type, def.dropItem.id, def.dropItem.count);
          }
        }

        // Grant Experience points
        if (window.game && window.game.survival) {
          if (blockId === BLOCK.DIAMOND_ORE) window.game.survival.addExp(5);
          else if (blockId === BLOCK.COAL_ORE) window.game.survival.addExp(2);
          else if (blockId === BLOCK.IRON_ORE || blockId === BLOCK.GOLD_ORE) window.game.survival.addExp(2);
          else window.game.survival.addExp(1);
          window.game.renderSurvivalHUD();
        }

        // Check if Sand or Gravel blocks above need to fall
        this.checkSandGravelFall(x, y, z);

        // Damage equipped tool durability if applicable
        if (inventory && this.equippedItem && this.equippedItem.durability !== undefined) {
          inventory.damageEquippedTool(1);
          if (window.game && window.game.renderHotbar) {
            window.game.renderHotbar();
          }
        }

        this.stopMining();
      }
    } else {
      this.crackMesh.visible = false;
    }

    // 2. Update Destruction Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 14.0 * dt; // Gravity
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;
      p.mesh.rotation.z += p.rotSpeed.z * dt;
      p.mesh.scale.setScalar(Math.max(0.01, p.life / 0.55));
    }

    // 3. Update Dropped Items (Gravity, Voxel Landing, Float/Rotate & Magnetize towards Player Body)
    const playerPos = player.position;
    const isSolidAt = (wx, wy, wz) => {
      const b = this.world.getBlock(Math.floor(wx), Math.floor(wy), Math.floor(wz));
      return Boolean(BLOCK_DEFS[b] && BLOCK_DEFS[b].solid);
    };

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const it = this.droppedItems[i];
      it.bobTime += dt * 3.0;
      it.mesh.rotation.y += dt * 2.0;
      it.pickupDelay = Math.max(0, it.pickupDelay - dt);

      // Measure distance to the closest point along the player's vertical torso/legs [y+0.2, y+1.55]
      const clampedPlayerY = Math.max(playerPos.y + 0.2, Math.min(playerPos.y + 1.55, it.pos.y));
      const dxBody = it.pos.x - playerPos.x;
      const dyBody = it.pos.y - clampedPlayerY;
      const dzBody = it.pos.z - playerPos.z;
      const distToBody = Math.hypot(dxBody, dyBody, dzBody);

      if (distToBody < 2.75 && it.pickupDelay === 0) {
        const pullTarget = new THREE.Vector3(playerPos.x, playerPos.y + 0.9, playerPos.z);
        const pullDir = new THREE.Vector3().subVectors(pullTarget, it.pos);
        const pullDist = pullDir.length();
        if (pullDist > 0.001) {
          pullDir.divideScalar(pullDist);
          const pullSpeed = Math.max(5.0, (2.75 - distToBody) * 9.0);
          it.pos.addScaledVector(pullDir, Math.min(pullDist, pullSpeed * dt));
        }
        it.velocity.set(0, 0, 0);
        it.mesh.position.copy(it.pos);

        const postClampedY = Math.max(playerPos.y + 0.2, Math.min(playerPos.y + 1.55, it.pos.y));
        const pickupDist = Math.hypot(
          it.pos.x - playerPos.x,
          it.pos.y - postClampedY,
          it.pos.z - playerPos.z
        );

        if (pickupDist < 0.75) {
          const added = inventory.addItem(it.itemType, it.itemId, it.count);
          if (added) {
            this.soundManager.playPlace('grass'); // Pickup pop sound
            this.scene.remove(it.mesh);
            it.mesh.geometry.dispose();
            it.mesh.material.dispose();
            this.droppedItems.splice(i, 1);
            if (window.game) {
              if (window.game.renderHotbar) window.game.renderHotbar();
              if (window.game.inventory && window.game.inventory.activeScreen && window.game.renderWorkstationUI) {
                window.game.renderWorkstationUI();
              }
              if (window.game.hand) {
                window.game.hand.updateEquippedItem(inventory.getEquippedItem());
              }
            }
            continue;
          }
        }
      } else {
        // Gravity & air/ground drag so elevated blocks (like tree logs & apples) fall to the ground
        it.velocity.y = Math.max(-28.0, it.velocity.y - 20.0 * dt);
        const drag = Math.pow(0.15, dt);
        it.velocity.x *= drag;
        it.velocity.z *= drag;

        const nextX = it.pos.x + it.velocity.x * dt;
        if (!isSolidAt(nextX + (it.velocity.x >= 0 ? 0.16 : -0.16), it.pos.y, it.pos.z)) {
          it.pos.x = nextX;
        } else {
          it.velocity.x = 0;
        }

        const nextZ = it.pos.z + it.velocity.z * dt;
        if (!isSolidAt(it.pos.x, it.pos.y, nextZ + (it.velocity.z >= 0 ? 0.16 : -0.16))) {
          it.pos.z = nextZ;
        } else {
          it.velocity.z = 0;
        }

        const nextY = it.pos.y + it.velocity.y * dt;
        if (it.velocity.y > 0) {
          if (!isSolidAt(it.pos.x, nextY + 0.18, it.pos.z)) {
            it.pos.y = nextY;
          } else {
            it.velocity.y = 0;
          }
        } else {
          const startFloorY = Math.floor(it.pos.y - 0.25);
          const endFloorY = Math.floor(nextY - 0.25);
          let landed = false;
          for (let checkY = startFloorY; checkY >= endFloorY; checkY--) {
            if (isSolidAt(it.pos.x, checkY, it.pos.z)) {
              it.pos.y = checkY + 1.25;
              it.velocity.y = 0;
              it.velocity.x *= 0.7;
              it.velocity.z *= 0.7;
              landed = true;
              break;
            }
          }
          if (!landed) {
            it.pos.y = nextY;
          }
        }

        it.mesh.position.set(
          it.pos.x,
          it.pos.y + Math.sin(it.bobTime) * 0.07,
          it.pos.z
        );
      }
    }

    // 4. Update Falling Blocks (Sand & Gravel)
    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      const fb = this.fallingBlocks[i];
      fb.velocity.y -= 22.0 * dt;
      fb.mesh.position.addScaledVector(fb.velocity, dt);

      const targetX = Math.floor(fb.mesh.position.x);
      const targetY = Math.floor(fb.mesh.position.y);
      const targetZ = Math.floor(fb.mesh.position.z);

      // Check block below
      const blockBelow = this.world.getBlock(targetX, targetY, targetZ);
      if (blockBelow !== BLOCK.AIR && blockBelow !== BLOCK.WATER) {
        // Landed! Set block at y + 1
        const placeY = targetY + 1;
        this.world.setBlock(targetX, placeY, targetZ, fb.blockId);
        this.soundManager.playStep(fb.blockId === BLOCK.SAND ? 'sand' : 'gravel');

        this.scene.remove(fb.mesh);
        fb.mesh.geometry.dispose();
        fb.mesh.material.dispose();
        this.fallingBlocks.splice(i, 1);
      }
    }

    // 5. Update 3D Ballistic Arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arr = this.arrows[i];
      if (arr.stuck) {
        arr.life -= dt;
        if (arr.life <= 0) {
          this.scene.remove(arr.mesh);
          this.arrows.splice(i, 1);
        }
        continue;
      }

      // Gravity arc
      arr.velocity.y -= 18.0 * dt;
      const stepVec = arr.velocity.clone().multiplyScalar(dt);
      const nextPos = arr.mesh.position.clone().add(stepVec);

      // Orient arrow towards velocity vector
      const speed = arr.velocity.length();
      if (speed > 0.1) {
        arr.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), arr.velocity.clone().normalize());
      }

      // Check block collision (raycast forward)
      const testX = Math.floor(nextPos.x);
      const testY = Math.floor(nextPos.y);
      const testZ = Math.floor(nextPos.z);
      const bHit = this.world.getBlock(testX, testY, testZ);

      if (bHit !== BLOCK.AIR && bHit !== BLOCK.WATER) {
        // Arrow stuck in solid block!
        arr.stuck = true;
        arr.mesh.position.copy(nextPos);
        if (this.soundManager) {
          this.soundManager.playArrowHit();
        }
        continue;
      }

      // Check mob collisions (accurate 3D cylinder / swept collision)
      let hitEntity = false;
      const mobMgr = (window.game && (window.game.mobs || window.game.mobManager));
      if (mobMgr && mobMgr.mobs) {
        for (let mIdx = mobMgr.mobs.length - 1; mIdx >= 0; mIdx--) {
          const mob = mobMgr.mobs[mIdx];
          if (!mob || mob.health <= 0 || !mob.root) continue;

          const mobPos = mob.root.position;
          const isSpider = (mob.type === 'spider');
          const mobHeight = isSpider ? 0.85 : 1.95;
          const mobRadius = isSpider ? 0.75 : 0.55;

          // Check XZ horizontal distance
          const dx = nextPos.x - mobPos.x;
          const dz = nextPos.z - mobPos.z;
          const horizDistSq = dx * dx + dz * dz;

          // Check Y vertical range (including swept path from current to next)
          const yMin = mobPos.y - 0.15;
          const yMax = mobPos.y + mobHeight + 0.25;
          const inYRange = (nextPos.y >= yMin && nextPos.y <= yMax) ||
                           (arr.mesh.position.y >= yMin && arr.mesh.position.y <= yMax);
          const inRadius = horizDistSq <= (mobRadius * 1.35) * (mobRadius * 1.35);

          if (inYRange && inRadius) {
            const damage = Math.round(arr.power * 9.0) + 2;
            const knockbackDir = arr.velocity.clone().setY(0).normalize();
            if (knockbackDir.lengthSq() < 0.001) knockbackDir.set(0, 0, 1);

            mobMgr.hitMob(mob, damage, knockbackDir, arr.power > 0.8);

            this.scene.remove(arr.mesh);
            this.arrows.splice(i, 1);
            hitEntity = true;
            break;
          }
        }
      }

      // If shot by skeleton, check collision with player
      if (!hitEntity && !arr.isPlayer && window.game && window.game.player && window.game.survival) {
        const pDist = arr.mesh.position.distanceTo(window.game.player.position);
        if (pDist < 0.9) {
          const dmg = Math.round(arr.power * 4.0) + 2;
          window.game.survival.takeDamage(dmg, true, false);

          const push = arr.velocity.clone().normalize().multiplyScalar(6.0);
          push.y = 3.0;
          window.game.player.velocity.add(push);

          this.scene.remove(arr.mesh);
          this.arrows.splice(i, 1);
          hitEntity = true;
        }
      }

      if (!hitEntity) {
        arr.mesh.position.copy(nextPos);
      }
    }

    // 6. Update Primed TNT Entities
    for (let i = this.tnts.length - 1; i >= 0; i--) {
      const t = this.tnts[i];
      t.fuse -= dt;

      // Gravity & hops
      t.velocity.y -= 18.0 * dt;
      t.mesh.position.addScaledVector(t.velocity, dt);

      // Floor check
      const groundY = Math.floor(t.mesh.position.y);
      const bBelow = this.world.getBlock(Math.floor(t.mesh.position.x), groundY, Math.floor(t.mesh.position.z));
      if (bBelow !== BLOCK.AIR && bBelow !== BLOCK.WATER && t.mesh.position.y <= groundY + 1.0) {
        t.mesh.position.y = groundY + 0.99;
        t.velocity.y = 0;
        t.velocity.x *= 0.8;
        t.velocity.z *= 0.8;
      }

      // Flashing white animation
      const flashFrequency = Math.max(4.0, (1.0 - t.fuse / t.initialFuse) * 20.0);
      const isWhite = Math.sin(t.fuse * flashFrequency * Math.PI) > 0;
      t.mesh.material = isWhite ? t.matFlash : t.matNormal;

      // Boom!
      if (t.fuse <= 0) {
        const expX = t.mesh.position.x;
        const expY = t.mesh.position.y;
        const expZ = t.mesh.position.z;

        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.matNormal.dispose();
        t.matFlash.dispose();
        this.tnts.splice(i, 1);

        this.explode(expX, expY, expZ, 3.8, true);
      }
    }
  }
}

