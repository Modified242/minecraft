/**
 * Controls, Interaction & Input Handler
 * Features:
 * - Left-click holding for hardness-based progressive mining & cracking
 * - Left-click mob melee attack with knockback
 * - Right-click block placement, workstation opening (Crafting Table, Furnace, Chest), and food eating
 * - <kbd>E</kbd> Full Inventory toggle, <kbd>F5</kbd> Camera Mode toggle, <kbd>F3</kbd> Debug toggle
 * - <kbd>Shift</kbd> Sneak & <kbd>Ctrl</kbd> Sprint controls
 */

class Controls {
  constructor(player, world, scene, soundManager, miningSystem, inventory, survival, mobManager, multiplayer, domElement) {
    this.player = player;
    this.world = world;
    this.scene = scene;
    this.soundManager = soundManager;
    this.miningSystem = miningSystem;
    this.inventory = inventory;
    this.survival = survival;
    this.mobManager = mobManager;
    this.multiplayer = multiplayer;
    this.domElement = domElement;

    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sneak: false,
      sprint: false,
    };

    this.isLocked = false;
    this.mouseSensitivity = 0.0022;
    this.reachDistance = 5.0;

    this.targetBlock = null;
    this.targetMob = null;
    this.targetPlayer = null;
    this.isLeftMouseDown = false;
    this.isChargingBow = false;
    this.bowChargeTime = 0.0;

    this.showDebug = false;

    this.initSelectionBox();
    this.bindEvents();
  }

  initSelectionBox() {
    const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geo);
    this.selectionBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2, depthTest: true })
    );
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);
  }

  getSelectedSlotItem() {
    return this.inventory.slots[this.inventory.selectedHotbarIndex];
  }

  setSelectedSlot(index) {
    if (index >= 0 && index < 9) {
      this.inventory.selectedHotbarIndex = index;
      if (this.onSlotChange) this.onSlotChange(index);
    }
  }

  bindEvents() {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
      if (this.onLockChange) this.onLockChange(this.isLocked);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.player.yaw -= (e.movementX || 0) * this.mouseSensitivity;
      this.player.pitch -= (e.movementY || 0) * this.mouseSensitivity;
      const maxPitch = (Math.PI / 2) - 0.02;
      this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.isLocked) {
        if (!this.inventory.activeScreen) {
          this.requestLock();
        }
        return;
      }

      this.soundManager.ensureContext();

      if (e.button === 0) {
        // Left click: Mine, Attack Mob, or PvP Attack
        this.isLeftMouseDown = true;
        if (window.game && window.game.hand) window.game.hand.triggerSwing();
        if (this.multiplayer) this.multiplayer.sendSwing();

        const equipped = this.inventory.getEquippedItem();
        const baseDamage = (equipped && equipped.damage) ? equipped.damage : 1;

        // Authentic Minecraft Critical Hit: falling downward while airborne
        const isCritical = (!this.player.onGround && this.player.velocity.y < -0.2 && !this.player.isInWater && !this.player.isFlying);
        const finalDamage = isCritical ? Math.max(2, Math.round(baseDamage * 1.5)) : baseDamage;

        const lookDir = new THREE.Vector3();
        this.player.camera.getWorldDirection(lookDir);
        lookDir.y = 0; lookDir.normalize();

        // 2.5x Sprint-knockback
        const kbMult = this.player.isSprinting ? 2.5 : 1.0;

        if (this.targetMob) {
          this.mobManager.hitMob(this.targetMob, finalDamage, lookDir.clone().multiplyScalar(kbMult), isCritical);
          this.soundManager.playAttack(isCritical);

          // Deduct weapon durability
          if (equipped && equipped.durability !== undefined) {
            equipped.durability--;
            if (equipped.durability <= 0) {
              this.inventory.slots[this.inventory.selectedHotbarIndex] = null;
              this.soundManager.playBreak('stone');
            }
            if (window.game && window.game.renderHotbar) window.game.renderHotbar();
          }
        } else if (this.targetPlayer) {
          // PvP Attack
          if (this.multiplayer) {
            if (typeof this.multiplayer.sendPlayerAttack === 'function') {
              this.multiplayer.sendPlayerAttack(this.targetPlayer.id, finalDamage, isCritical);
            } else if (typeof this.multiplayer.sendAttack === 'function') {
              this.multiplayer.sendAttack('player', this.targetPlayer.id, finalDamage, isCritical);
            }
          }
          this.soundManager.playAttack(isCritical);
          if (isCritical) {
            const targetObj = this.targetPlayer.mesh || this.targetPlayer.root;
            if (targetObj && targetObj.position) {
              this.miningSystem.spawnCritParticles(targetObj.position.x, targetObj.position.y + 1.0, targetObj.position.z);
            }
          }
        } else if (this.targetBlock) {
          this.miningSystem.startMining(this.targetBlock, equipped);
        }
      } else if (e.button === 2) {
        // Right click: check Bow charge first
        const equipped = this.getSelectedSlotItem();
        if (equipped && equipped.type === 'item' && equipped.id === ITEM.BOW) {
          this.isChargingBow = true;
          this.bowChargeTime = 0.0;
        } else {
          this.handleRightClick();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isLeftMouseDown = false;
        this.miningSystem.stopMining();
      } else if (e.button === 2) {
        if (this.isChargingBow) {
          this.releaseBow();
        }
      }
    });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('wheel', (e) => {
      if (!this.isLocked) return;
      if (e.deltaY > 0) {
        this.setSelectedSlot((this.inventory.selectedHotbarIndex + 1) % 9);
      } else if (e.deltaY < 0) {
        this.setSelectedSlot((this.inventory.selectedHotbarIndex - 1 + 9) % 9);
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  releaseBow() {
    if (!this.isChargingBow) return;
    const power = Math.min(1.0, this.bowChargeTime / 1.0);
    this.isChargingBow = false;
    this.bowChargeTime = 0;
    if (window.game && window.game.hand) {
      window.game.hand.bowCharge = 0;
    }

    if (power < 0.15) return; // Released too early

    const isCreative = (this.survival && this.survival.gameMode === 'creative');
    const hasArrow = isCreative || (this.inventory && this.inventory.hasItem('item', ITEM.ARROW));

    if (!hasArrow) {
      console.log('No arrows in inventory!');
      return;
    }

    if (!isCreative) {
      this.inventory.removeItem('item', ITEM.ARROW, 1);
    }

    // Deduct bow durability
    const equipped = this.getSelectedSlotItem();
    if (equipped && equipped.durability !== undefined) {
      equipped.durability--;
      if (equipped.durability <= 0) {
        this.inventory.slots[this.inventory.selectedHotbarIndex] = null;
        this.soundManager.playBreak('wood');
      }
      if (window.game && window.game.renderHotbar) {
        window.game.renderHotbar();
      }
    }

    const origin = this.player.getEyePosition();
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    origin.addScaledVector(dir, 0.4);

    this.miningSystem.shootArrow(origin, dir, power, true);
    if (window.game && window.game.hand) {
      window.game.hand.triggerSwing();
    }
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  handleKeyDown(e) {
    if (this.multiplayer && this.multiplayer.isChatOpen) return;

    switch (e.code) {
      case 'KeyW': this.input.forward = true; break;
      case 'KeyS': this.input.backward = true; break;
      case 'KeyA': this.input.left = true; break;
      case 'KeyD': this.input.right = true; break;
      case 'Space': this.input.jump = true; break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.sneak = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.input.sprint = true;
        break;
      case 'KeyE':
        // Toggle Inventory
        e.preventDefault();
        if (window.game) window.game.toggleInventory();
        break;
      case 'KeyF':
        this.player.isFlying = !this.player.isFlying;
        this.player.velocity.set(0, 0, 0);
        break;
      case 'F5':
        e.preventDefault();
        if (window.game && window.game.hand) window.game.hand.toggleCameraMode();
        break;
      case 'F3':
        e.preventDefault();
        this.showDebug = !this.showDebug;
        if (this.onToggleDebug) this.onToggleDebug(this.showDebug);
        break;
      default:
        if (e.code.startsWith('Digit')) {
          const num = parseInt(e.code.replace('Digit', ''), 10);
          if (num >= 1 && num <= 9) this.setSelectedSlot(num - 1);
        }
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.input.forward = false; break;
      case 'KeyS': this.input.backward = false; break;
      case 'KeyA': this.input.left = false; break;
      case 'KeyD': this.input.right = false; break;
      case 'Space': this.input.jump = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.input.sneak = false; break;
      case 'ControlLeft':
      case 'ControlRight': this.input.sprint = false; break;
    }
  }

  handleRightClick() {
    const equipped = this.getSelectedSlotItem();

    // 1. Check if holding food to eat
    if (equipped && equipped.type === 'item') {
      const itemDef = ITEM_DEFS[equipped.id];
      if (itemDef && itemDef.food) {
        const ate = this.survival.eatFood(itemDef);
        if (ate) {
          this.inventory.consumeEquippedItem(1);
          if (window.game && window.game.hand) window.game.hand.triggerSwing();
          return;
        }
      }
    }

    if (!this.targetBlock) return;

    // 2. Check TNT ignition with Flint & Steel
    if (equipped && equipped.type === 'item' && equipped.id === ITEM.FLINT_AND_STEEL && this.targetBlock.blockId === BLOCK.TNT) {
      const { x, y, z } = this.targetBlock;
      this.world.setBlock(x, y, z, BLOCK.AIR);
      this.miningSystem.spawnPrimedTnt(x, y, z, 3.5, true);
      if (this.multiplayer) {
        this.multiplayer.sendBlockDelta(x, y, z, BLOCK.AIR);
      }
      this.soundManager.playStep('stone');

      if (equipped.durability !== undefined) {
        equipped.durability--;
        if (equipped.durability <= 0) {
          this.inventory.slots[this.inventory.selectedHotbarIndex] = null;
          this.soundManager.playBreak('stone');
        }
        if (window.game && window.game.renderHotbar) window.game.renderHotbar();
      }
      if (window.game && window.game.hand) window.game.hand.triggerSwing();
      return;
    }

    // 3. Check if right-clicking a Workstation Block
    const targetDef = BLOCK_DEFS[this.targetBlock.blockId];
    if (targetDef && targetDef.isWorkstation && !this.input.sneak) {
      if (window.game) {
        window.game.openWorkstation(targetDef.isWorkstation);
      }
      return;
    }

    // 4. Otherwise, place block
    if (!equipped || equipped.type !== 'block') return;

    const { x, y, z, nx, ny, nz } = this.targetBlock;
    const placeX = x + nx;
    const placeY = y + ny;
    const placeZ = z + nz;

    const blockAABB = {
      minX: placeX, maxX: placeX + 1,
      minY: placeY, maxY: placeY + 1,
      minZ: placeZ, maxZ: placeZ + 1,
    };
    const playerBox = this.player.getAABB();

    // Prevent placing block inside player
    if (blockAABB.maxX > playerBox.minX && blockAABB.minX < playerBox.maxX &&
        blockAABB.maxY > playerBox.minY && blockAABB.minY < playerBox.maxY &&
        blockAABB.maxZ > playerBox.minZ && blockAABB.minZ < playerBox.maxZ) {
      return;
    }

    const blockToPlace = equipped.id;
    this.world.setBlock(placeX, placeY, placeZ, blockToPlace);
    this.soundManager.playPlace(BLOCK_DEFS[blockToPlace].sound || 'stone');
    this.inventory.consumeEquippedItem(1);

    if (window.game && window.game.hand) window.game.hand.triggerSwing();
    if (this.multiplayer) {
      this.multiplayer.sendBlockDelta(placeX, placeY, placeZ, blockToPlace);
      this.multiplayer.sendSwing();
    }

    this.targetBlock = this.raycast();
    this.updateSelectionBox();
  }

  // 3D DDA Raycaster for Blocks, Mobs and Remote Players (PvP)
  raycast() {
    const origin = this.player.getEyePosition();
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);

    // 1. Raycast against Mobs
    this.targetMob = null;
    let closestDist = this.reachDistance;
    for (const mob of this.mobManager.mobs) {
      if (!mob || mob.health <= 0 || !mob.root) continue;
      const mobBox = new THREE.Box3().setFromObject(mob.root);
      const ray = new THREE.Ray(origin, dir);
      const hitPoint = ray.intersectBox(mobBox, new THREE.Vector3());
      if (hitPoint) {
        const d = origin.distanceTo(hitPoint);
        if (d < closestDist) {
          closestDist = d;
          this.targetMob = mob;
        }
      }
    }

    if (this.targetMob) {
      this.targetPlayer = null;
      return null;
    }

    // 2. Raycast against Remote Players (PvP)
    this.targetPlayer = null;
    if (this.multiplayer && this.multiplayer.remotePlayers) {
      for (const [id, rPlayer] of this.multiplayer.remotePlayers) {
        const obj = rPlayer.root || rPlayer.mesh;
        if (!obj) continue;
        const pPos = obj.position;
        // Bounding box for player avatar (0.7m width/depth x 1.9m height)
        const pBox = new THREE.Box3(
          new THREE.Vector3(pPos.x - 0.35, pPos.y, pPos.z - 0.35),
          new THREE.Vector3(pPos.x + 0.35, pPos.y + 1.9, pPos.z + 0.35)
        );
        const ray = new THREE.Ray(origin, dir);
        const hitPoint = ray.intersectBox(pBox, new THREE.Vector3());
        if (hitPoint) {
          const d = origin.distanceTo(hitPoint);
          if (d < closestDist) {
            closestDist = d;
            this.targetPlayer = { id, mesh: obj, root: obj };
          }
        }
      }
    }

    if (this.targetPlayer) {
      return null;
    }

    // 3. Voxel DDA traversal
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = dir.x > 0 ? 1 : -1;
    const stepY = dir.y > 0 ? 1 : -1;
    const stepZ = dir.z > 0 ? 1 : -1;

    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;

    let tMaxX = dir.x > 0 ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
    let tMaxY = dir.y > 0 ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
    let tMaxZ = dir.z > 0 ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;

    let normalX = 0, normalY = 0, normalZ = 0;
    let distance = 0;

    while (distance < this.reachDistance) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX; distance = tMaxX; tMaxX += tDeltaX;
          normalX = -stepX; normalY = 0; normalZ = 0;
        } else {
          z += stepZ; distance = tMaxZ; tMaxZ += tDeltaZ;
          normalX = 0; normalY = 0; normalZ = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY; distance = tMaxY; tMaxY += tDeltaY;
          normalX = 0; normalY = -stepY; normalZ = 0;
        } else {
          z += stepZ; distance = tMaxZ; tMaxZ += tDeltaZ;
          normalX = 0; normalY = 0; normalZ = -stepZ;
        }
      }

      if (distance > this.reachDistance) break;

      const block = this.world.getBlock(x, y, z);
      if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
        return { x, y, z, nx: normalX, ny: normalY, nz: normalZ, blockId: block, distance };
      }
    }

    return null;
  }

  updateSelectionBox() {
    if (this.targetBlock && this.isLocked) {
      this.selectionBox.position.set(this.targetBlock.x + 0.5, this.targetBlock.y + 0.5, this.targetBlock.z + 0.5);
      this.selectionBox.visible = true;
    } else {
      this.selectionBox.visible = false;
    }
  }

  update(dt = 0.016) {
    // Bow charging tension update
    if (this.isChargingBow) {
      this.bowChargeTime = Math.min(1.2, this.bowChargeTime + dt);
      if (window.game && window.game.hand) {
        window.game.hand.bowCharge = Math.min(1.0, this.bowChargeTime / 1.0);
      }
    }

    this.targetBlock = this.raycast();
    this.updateSelectionBox();

    // Maintain mining while left mouse is held down
    if (this.isLeftMouseDown && this.targetBlock) {
      const equipped = this.inventory.getEquippedItem();
      this.miningSystem.startMining(this.targetBlock, equipped);
    }
  }
}
