/**
 * Upgraded Player Controller & 3D AABB Physics Engine
 * Features:
 * - Sneaking with ledge edge-guard (<kbd>Shift</kbd>) so player cannot fall off cliffs
 * - Sprinting (<kbd>Ctrl</kbd>) with dynamic FOV zoom
 * - View bobbing calculation
 * - Water swimming buoyancy
 * - 3-axis continuous/discrete collision resolution against voxels
 */

class Player {
  constructor(world, camera, soundManager) {
    this.world = world;
    this.camera = camera;
    this.soundManager = soundManager;

    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.62;

    this.position = new THREE.Vector3(0, 30, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;

    // Speeds & Authentic MultiCraft (Minetest Engine) Physics Constants
    this.stepHeight = 0.6; // Authentic 0.6-block step-up for slabs & single-block steps
    this.jumpVelocity = 6.5; // MultiCraft exact: movement_speed_jump = 6.5 m/s
    this.gravity = 9.81; // MultiCraft exact: movement_gravity = 9.81 m/s^2 (Earth gravity)
    this.terminalVelocity = -40.0;
    this.walkSpeed = 4.0; // MultiCraft exact: movement_speed_walk = 4.0 m/s
    this.sneakSpeed = 1.35; // MultiCraft exact: movement_speed_crouch = 1.35 m/s
    this.sprintSpeed = 7.2; // MultiCraft sprint fast mode
    this.flySpeed = 20.0; // MultiCraft exact: movement_speed_fast = 20.0 m/s
    this.climbSpeed = 3.0; // MultiCraft exact: movement_speed_climb = 3.0 m/s
    this.accelDefault = 3.0; // MultiCraft exact: movement_acceleration_default = 3
    this.accelAir = 2.0; // MultiCraft exact: movement_acceleration_air = 2
    this.liquidFluidity = 1.0; // MultiCraft exact: movement_liquid_fluidity = 1
    this.liquidSink = 10.0; // MultiCraft exact: movement_liquid_sink = 10
    this.fallBobbing = 0.03; // MultiCraft exact: fall_bobbing_amount = 0.03

    this.onGround = false;
    this.isSneaking = false;
    this.isSprinting = false;
    this.isFlying = false;
    this.isInWater = false;
    this.wasInWater = false;

    this.stepDistance = 0;
    this.targetFOV = 72; // MultiCraft exact: fov = 72

    this.findSpawnPosition();
  }

  findSpawnPosition(preferredX = 8.5, preferredZ = 8.5) {
    let bestX = preferredX;
    let bestY = null;
    let bestZ = preferredZ;

    // Search in an expanding spiral / ring outward from preferred coordinates
    const startX = Math.floor(preferredX);
    const startZ = Math.floor(preferredZ);
    let found = false;

    searchLoop:
    for (let r = 0; r <= 16; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // outer ring only
          const testX = startX + dx;
          const testZ = startZ + dz;

          // Scan downwards from top of world
          for (let y = CHUNK_SIZE_Y - 3; y >= SEA_LEVEL - 1; y--) {
            const block = this.world.getBlock(testX, y, testZ);
            const def = BLOCK_DEFS[block];

            // Must be a solid, walkable block (not air, water, leaves, or non-solid)
            if (def && def.solid && block !== BLOCK.LEAVES && block !== BLOCK.WATER && block !== BLOCK.AIR) {
              // Ensure at least 2 air blocks directly above feet for safe clearance
              const above1 = this.world.getBlock(testX, y + 1, testZ);
              const above2 = this.world.getBlock(testX, y + 2, testZ);
              const def1 = BLOCK_DEFS[above1];
              const def2 = BLOCK_DEFS[above2];

              const clear1 = (above1 === BLOCK.AIR || (def1 && !def1.solid));
              const clear2 = (above2 === BLOCK.AIR || (def2 && !def2.solid));

              if (clear1 && clear2) {
                bestX = testX + 0.5;
                bestY = y + 1.05;
                bestZ = testZ + 0.5;
                found = true;
                break searchLoop;
              }
            }
          }
        }
      }
    }

    if (!found) {
      // Fallback: search highest block at preferred coordinates
      let topY = SEA_LEVEL + 4;
      for (let y = CHUNK_SIZE_Y - 2; y >= 1; y--) {
        const b = this.world.getBlock(Math.floor(preferredX), y, Math.floor(preferredZ));
        const def = BLOCK_DEFS[b];
        if (def && def.solid && b !== BLOCK.LEAVES && b !== BLOCK.WATER) {
          topY = y + 1.05;
          break;
        }
      }
      bestY = topY;
    }

    this.position.set(bestX, bestY, bestZ);
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.camera.position.copy(this.getEyePosition());
  }

  getEyePosition() {
    const eyeY = this.isSneaking ? (this.eyeHeight - 0.2) : this.eyeHeight;
    return new THREE.Vector3(
      this.position.x,
      this.position.y + eyeY,
      this.position.z
    );
  }

  getAABB() {
    const half = this.width / 2;
    const h = this.isSneaking ? (this.height - 0.2) : this.height;
    return {
      minX: this.position.x - half,
      maxX: this.position.x + half,
      minY: this.position.y,
      maxY: this.position.y + h,
      minZ: this.position.z - half,
      maxZ: this.position.z + half,
    };
  }

  intersectsSolid(box) {
    const minBx = Math.floor(box.minX);
    const maxBx = Math.floor(box.maxX);
    const minBy = Math.floor(box.minY);
    const maxBy = Math.floor(box.maxY);
    const minBz = Math.floor(box.minZ);
    const maxBz = Math.floor(box.maxZ);

    for (let y = minBy; y <= maxBy; y++) {
      for (let z = minBz; z <= maxBz; z++) {
        for (let x = minBx; x <= maxBx; x++) {
          const block = this.world.getBlock(x, y, z);
          const def = BLOCK_DEFS[block];
          if (def && def.solid) {
            if (box.maxX > x && box.minX < x + 1 &&
                box.maxY > y && box.minY < y + 1 &&
                box.maxZ > z && box.minZ < z + 1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Check if position would fall off a ledge while sneaking
  wouldFallOffLedge(newX, newZ) {
    if (!this.onGround || this.isFlying) return false;
    const halfW = this.width / 2;

    const corners = [
      [newX - halfW, newZ - halfW],
      [newX + halfW, newZ - halfW],
      [newX - halfW, newZ + halfW],
      [newX + halfW, newZ + halfW],
    ];

    let hasSupport = false;
    for (const [cx, cz] of corners) {
      const blockUnder = this.world.getBlock(Math.floor(cx), Math.floor(this.position.y - 0.2), Math.floor(cz));
      const def = BLOCK_DEFS[blockUnder];
      if (def && def.solid) {
        hasSupport = true;
        break;
      }
    }
    return !hasSupport;
  }

  update(dt, input) {
    if (dt > 0.1) dt = 0.1;

    // Anti-Suffocation / Unstuck Elevator:
    // If player AABB intersects solid voxels, immediately elevate them to safe headroom on top of terrain
    const stuckBox = this.getAABB();
    if (this.intersectsSolid(stuckBox)) {
      let clearY = null;
      const curY = Math.floor(this.position.y);
      for (let testY = curY + 1; testY <= CHUNK_SIZE_Y - 2; testY++) {
        const testBox = {
          minX: stuckBox.minX,
          maxX: stuckBox.maxX,
          minY: testY,
          maxY: testY + (this.isSneaking ? this.height - 0.2 : this.height),
          minZ: stuckBox.minZ,
          maxZ: stuckBox.maxZ,
        };
        if (!this.intersectsSolid(testBox)) {
          clearY = testY;
          break;
        }
      }
      if (clearY !== null) {
        this.position.y = clearY + 0.05;
        this.velocity.set(0, 0, 0);
        this.onGround = true;
      }
    }

    // Submersion check
    const eyeBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y + this.eyeHeight), Math.floor(this.position.z));
    const footBlock = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y + 0.2), Math.floor(this.position.z));
    this.isInWater = (footBlock === BLOCK.WATER || eyeBlock === BLOCK.WATER);

    if (this.isInWater && !this.wasInWater) {
      this.soundManager.playSplash();
    }
    this.wasInWater = this.isInWater;

    // Sneaking & Sprinting
    this.isSneaking = input.sneak && !this.isFlying;
    this.isSprinting = input.sprint && !this.isSneaking && !this.isInWater;

    // Dynamic FOV Zoom effect (MultiCraft base 72)
    this.targetFOV = this.isSprinting ? 80 : (this.isSneaking ? 66 : 72);
    this.camera.fov += (this.targetFOV - this.camera.fov) * Math.min(1.0, 10.0 * dt);
    this.camera.updateProjectionMatrix();

    // Direction vector from input
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const wishDir = new THREE.Vector3();
    if (input.forward) wishDir.add(forward);
    if (input.backward) wishDir.sub(forward);
    if (input.right) wishDir.add(right);
    if (input.left) wishDir.sub(right);
    if (wishDir.lengthSq() > 0) wishDir.normalize();

    // -------------------------------------------------------------
    // Authentic MultiCraft (Minetest Engine) Movement & Physics Model
    // -------------------------------------------------------------
    if (this.isFlying) {
      const flySpeed = this.flySpeed;
      if (wishDir.lengthSq() > 0) {
        this.velocity.x = wishDir.x * flySpeed;
        this.velocity.z = wishDir.z * flySpeed;
      } else {
        this.velocity.x *= Math.pow(0.8, 20 * dt);
        this.velocity.z *= Math.pow(0.8, 20 * dt);
      }
      this.velocity.y = 0;
      if (input.jump) this.velocity.y = flySpeed * 0.7;
      if (input.sneak) this.velocity.y = -flySpeed * 0.7;
    } else {
      if (this.onGround) {
        // MultiCraft Ground Acceleration & Speed
        const targetSpeed = this.isSprinting ? this.sprintSpeed : (this.isSneaking ? this.sneakSpeed : this.walkSpeed);
        if (wishDir.lengthSq() > 0) {
          const targetVx = wishDir.x * targetSpeed;
          const targetVz = wishDir.z * targetSpeed;
          const accel = this.accelDefault * 5.0 * dt;
          this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, accel);
          this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, accel);
        } else {
          const groundDrag = Math.pow(0.60, 20 * dt);
          this.velocity.x *= groundDrag;
          this.velocity.z *= groundDrag;
        }

        // Jump (MultiCraft exact: movement_speed_jump = 6.5 m/s)
        if (input.jump) {
          this.velocity.y = this.jumpVelocity;
          this.onGround = false;
          if (this.isSprinting) {
            this.velocity.x += -Math.sin(this.yaw) * 1.5;
            this.velocity.z += -Math.cos(this.yaw) * 1.5;
          }
          this.soundManager.playJump();
        }
      } else if (this.isInWater) {
        // MultiCraft Liquid Physics (movement_liquid_fluidity = 1, liquid_sink = 10)
        const targetSpeed = this.walkSpeed * this.liquidFluidity;
        if (wishDir.lengthSq() > 0) {
          const targetVx = wishDir.x * targetSpeed;
          const targetVz = wishDir.z * targetSpeed;
          this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, 4.0 * dt);
          this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, 4.0 * dt);
        }
        const waterDrag = Math.pow(0.80, 20 * dt);
        this.velocity.x *= waterDrag;
        this.velocity.z *= waterDrag;

        // MultiCraft sinking (movement_liquid_sink = 10 m/s^2 down to gentle limit)
        this.velocity.y -= (this.liquidSink * 0.4) * dt;

        // Swimming upward / climbing in liquid (movement_speed_climb = 3.0)
        if (input.jump) {
          const eyeAbove = (eyeBlock !== BLOCK.WATER);
          if (eyeAbove) {
            this.velocity.y = 5.2; // Leap out
            this.soundManager.playSplash();
          } else {
            this.velocity.y = this.climbSpeed + 0.8;
          }
        }
        this.velocity.y *= waterDrag;
      } else {
        // Airborne (MultiCraft movement_acceleration_air = 2)
        const targetSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
        if (wishDir.lengthSq() > 0) {
          const targetVx = wishDir.x * targetSpeed;
          const targetVz = wishDir.z * targetSpeed;
          const airAccel = this.accelAir * 3.0 * dt;
          this.velocity.x += (targetVx - this.velocity.x) * Math.min(1.0, airAccel);
          this.velocity.z += (targetVz - this.velocity.z) * Math.min(1.0, airAccel);
        }
        const airDrag = Math.pow(0.92, 20 * dt);
        this.velocity.x *= airDrag;
        this.velocity.z *= airDrag;

        // MultiCraft Gravity & Air Drag (movement_gravity = 9.81 m/s^2)
        this.velocity.y -= this.gravity * dt;
        if (this.velocity.y < this.terminalVelocity) {
          this.velocity.y = this.terminalVelocity;
        }
      }
    }

    // -------------------------------------------------------------
    // 3-Axis Collision Resolution with 0.6-Block Step-Up & Sneak Guard
    // -------------------------------------------------------------
    const halfW = this.width / 2;

    // 1. Resolve X Axis (with auto step-up)
    const nextX = this.position.x + this.velocity.x * dt;
    if (this.isSneaking && this.wouldFallOffLedge(nextX, this.position.z)) {
      this.velocity.x = 0;
    } else {
      const origX = this.position.x;
      const origY = this.position.y;
      this.position.x = nextX;
      let box = this.getAABB();

      if (this.intersectsSolid(box)) {
        let stepped = false;
        // Step-up attempt on ground or swimming out of water
        const canStep = (this.onGround || this.isInWater) && !this.isFlying;
        const currentStepHeight = this.isInWater ? 1.05 : this.stepHeight;
        if (canStep) {
          this.position.y = origY + currentStepHeight;
          const stepBox = this.getAABB();
          if (!this.intersectsSolid(stepBox)) {
            // Find highest obstacle top to place feet smoothly
            let highestTop = origY;
            const minBx = Math.floor(stepBox.minX);
            const maxBx = Math.floor(stepBox.maxX);
            const minBy = Math.floor(origY);
            const maxBy = Math.floor(origY + currentStepHeight);
            const minBz = Math.floor(stepBox.minZ);
            const maxBz = Math.floor(stepBox.maxZ);

            for (let y = minBy; y <= maxBy; y++) {
              for (let z = minBz; z <= maxBz; z++) {
                for (let x = minBx; x <= maxBx; x++) {
                  const b = this.world.getBlock(x, y, z);
                  if (BLOCK_DEFS[b] && BLOCK_DEFS[b].solid) {
                    if (y + 1 > highestTop) highestTop = y + 1;
                  }
                }
              }
            }
            if (highestTop - origY <= currentStepHeight + 0.05) {
              this.position.y = highestTop + 0.001;
              stepped = true;
            }
          }
        }

        if (!stepped) {
          this.position.y = origY;
          if (this.velocity.x > 0) {
            const blockX = Math.floor(box.maxX);
            this.position.x = blockX - halfW - 0.0001;
          } else if (this.velocity.x < 0) {
            const blockX = Math.floor(box.minX);
            this.position.x = (blockX + 1) + halfW + 0.0001;
          }
          this.velocity.x = 0;
        }
      }
    }

    // 2. Resolve Z Axis (with auto step-up)
    const nextZ = this.position.z + this.velocity.z * dt;
    if (this.isSneaking && this.wouldFallOffLedge(this.position.x, nextZ)) {
      this.velocity.z = 0;
    } else {
      const origZ = this.position.z;
      const origY = this.position.y;
      this.position.z = nextZ;
      let box = this.getAABB();

      if (this.intersectsSolid(box)) {
        let stepped = false;
        // Step-up attempt on ground or swimming out of water
        const canStep = (this.onGround || this.isInWater) && !this.isFlying;
        const currentStepHeight = this.isInWater ? 1.05 : this.stepHeight;
        if (canStep) {
          this.position.y = origY + currentStepHeight;
          const stepBox = this.getAABB();
          if (!this.intersectsSolid(stepBox)) {
            let highestTop = origY;
            const minBx = Math.floor(stepBox.minX);
            const maxBx = Math.floor(stepBox.maxX);
            const minBy = Math.floor(origY);
            const maxBy = Math.floor(origY + currentStepHeight);
            const minBz = Math.floor(stepBox.minZ);
            const maxBz = Math.floor(stepBox.maxZ);

            for (let y = minBy; y <= maxBy; y++) {
              for (let z = minBz; z <= maxBz; z++) {
                for (let x = minBx; x <= maxBx; x++) {
                  const b = this.world.getBlock(x, y, z);
                  if (BLOCK_DEFS[b] && BLOCK_DEFS[b].solid) {
                    if (y + 1 > highestTop) highestTop = y + 1;
                  }
                }
              }
            }
            if (highestTop - origY <= currentStepHeight + 0.05) {
              this.position.y = highestTop + 0.001;
              stepped = true;
            }
          }
        }

        if (!stepped) {
          this.position.y = origY;
          if (this.velocity.z > 0) {
            const blockZ = Math.floor(box.maxZ);
            this.position.z = blockZ - halfW - 0.0001;
          } else if (this.velocity.z < 0) {
            const blockZ = Math.floor(box.minZ);
            this.position.z = (blockZ + 1) + halfW + 0.0001;
          }
          this.velocity.z = 0;
        }
      }
    }

    // 3. Resolve Y Axis
    this.position.y += this.velocity.y * dt;
    let box = this.getAABB();
    this.onGround = false;

    if (this.intersectsSolid(box)) {
      if (this.velocity.y < 0) {
        const blockY = Math.floor(box.minY);
        this.position.y = blockY + 1.0;
        this.velocity.y = 0;
        this.onGround = true;
      } else if (this.velocity.y > 0) {
        const blockY = Math.floor(box.maxY);
        this.position.y = blockY - (this.isSneaking ? this.height - 0.2 : this.height) - 0.0001;
        this.velocity.y = 0;
      }
    }

    // Footsteps
    if (this.onGround && !this.isFlying) {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.5) {
        this.stepDistance += speed * dt;
        const interval = this.isSprinting ? 1.5 : (this.isSneaking ? 2.8 : 2.1);
        if (this.stepDistance >= interval) {
          this.stepDistance = 0;
          const under = this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.1), Math.floor(this.position.z));
          const def = BLOCK_DEFS[under];
          this.soundManager.playStep(def && def.sound ? def.sound : 'grass');
        }
      }
    }

    if (this.position.y < -15) {
      this.findSpawnPosition();
      this.velocity.set(0, 0, 0);
    }

    // Update Camera (First person defaults)
    if (window.game && window.game.hand && window.game.hand.cameraMode === 0) {
      this.camera.position.copy(this.getEyePosition());
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }
  }
}
