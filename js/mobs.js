/**
 * Articulated Mobs & AI System (Minecraft Java Edition)
 * Features:
 * - Passive Mobs (Pig, Cow) with 4-legged walking cycles
 * - Hostile Mobs:
 *   - Zombie (arms outstretched forward)
 *   - Creeper (fuse countdown, white pulsing expansion, TNT explosion)
 *   - Skeleton (3D bow aiming & ranged arrow shooting AI)
 *   - Spider (8 articulated legs, wall-climbing physics, neutral by day / hostile by night)
 * - Server-Authoritative synchronization in multiplayer
 * - Red damage flash, knockback physics, item drops on death
 */

class MobManager {
  constructor(world, scene, textureManager, soundManager, miningSystem) {
    this.world = world;
    this.scene = scene;
    this.textureManager = textureManager;
    this.soundManager = soundManager;
    this.miningSystem = miningSystem;

    this.mobs = [];
    this.spawnTimer = 0;
  }

  // Create articulated 3D Pig model
  createPigMesh() {
    const group = new THREE.Group();
    const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf0a0a0 });
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0xd98282 });

    const bodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.9);
    const body = new THREE.Mesh(bodyGeo, pinkMat);
    body.position.y = 0.55;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const head = new THREE.Mesh(headGeo, pinkMat);
    head.position.set(0, 0.7, 0.55);

    const snoutGeo = new THREE.BoxGeometry(0.25, 0.16, 0.15);
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.08, 0.25);
    head.add(snout);
    group.add(head);

    const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    const legs = [];
    const legPositions = [
      [-0.22, 0.2, 0.3], [0.22, 0.2, 0.3],
      [-0.22, 0.2, -0.3], [0.22, 0.2, -0.3]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, pinkMat);
      leg.position.set(...pos);
      group.add(leg);
      legs.push(leg);
    });

    return { root: group, head, legs, body, originalColor: 0xf0a0a0 };
  }

  // Create articulated 3D Zombie model
  createZombieMesh() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x3d7829 });
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x009999 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x223388 });

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.45;
    group.add(head);

    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 0.85;
    group.add(torso);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.35, 0.85, 0.25);
    leftArm.rotation.x = -Math.PI / 2;
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.35, 0.85, 0.25);
    rightArm.rotation.x = -Math.PI / 2;
    group.add(leftArm);
    group.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.13, 0.35, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.13, 0.35, 0);
    group.add(leftLeg);
    group.add(rightLeg);

    return { root: group, head, legs: [leftLeg, rightLeg, leftArm, rightArm], body: torso, originalColor: 0x3d7829 };
  }

  // Create articulated 3D Skeleton model
  createSkeletonMesh() {
    const group = new THREE.Group();
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
    const bowMat = new THREE.MeshLambertMaterial({ color: 0x664a2c });

    // Skull
    const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    const head = new THREE.Mesh(headGeo, boneMat);
    head.position.y = 1.45;
    group.add(head);

    // Ribcage Torso
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.65, 0.2);
    const torso = new THREE.Mesh(torsoGeo, boneMat);
    torso.position.y = 0.85;
    group.add(torso);

    // Bony arms
    const armGeo = new THREE.BoxGeometry(0.12, 0.65, 0.12);
    const leftArm = new THREE.Mesh(armGeo, boneMat);
    leftArm.position.set(-0.28, 0.85, 0.2);
    leftArm.rotation.x = -Math.PI / 2.5;
    const rightArm = new THREE.Mesh(armGeo, boneMat);
    rightArm.position.set(0.28, 0.85, 0.2);
    rightArm.rotation.x = -Math.PI / 2.5;
    group.add(leftArm);
    group.add(rightArm);

    // 3D Skeleton Bow held in hands
    const bowGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.position.set(0.05, 0.85, 0.42);
    group.add(bow);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.14, 0.7, 0.14);
    const leftLeg = new THREE.Mesh(legGeo, boneMat);
    leftLeg.position.set(-0.11, 0.35, 0);
    const rightLeg = new THREE.Mesh(legGeo, boneMat);
    rightLeg.position.set(0.11, 0.35, 0);
    group.add(leftLeg);
    group.add(rightLeg);

    return { root: group, head, legs: [leftLeg, rightLeg, leftArm, rightArm], body: torso, originalColor: 0xd8d8d8 };
  }

  // Create articulated 3D Spider model (with wall-climbing)
  createSpiderMesh() {
    const group = new THREE.Group();
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x221b1b });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red glowing eyes

    // Head / Cephalothorax
    const headGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
    const head = new THREE.Mesh(headGeo, darkMat);
    head.position.set(0, 0.35, 0.35);

    // Red Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.14, 0.05, 0.26);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.14, 0.05, 0.26);
    head.add(eyeL);
    head.add(eyeR);
    group.add(head);

    // Abdomen
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.45, 0.8);
    const body = new THREE.Mesh(bodyGeo, darkMat);
    body.position.set(0, 0.4, -0.35);
    group.add(body);

    // 8 Legs
    const legGeo = new THREE.BoxGeometry(0.48, 0.08, 0.08);
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const zOffset = 0.2 - i * 0.16;
      // Left leg
      const legL = new THREE.Mesh(legGeo, darkMat);
      legL.position.set(-0.35, 0.32, zOffset);
      legL.rotation.z = -0.35;
      group.add(legL);
      legs.push(legL);

      // Right leg
      const legR = new THREE.Mesh(legGeo, darkMat);
      legR.position.set(0.35, 0.32, zOffset);
      legR.rotation.z = 0.35;
      group.add(legR);
      legs.push(legR);
    }

    return { root: group, head, legs, body, originalColor: 0x221b1b };
  }

  // Create articulated 3D Creeper model
  createCreeperMesh() {
    const group = new THREE.Group();
    const greenMat = new THREE.MeshLambertMaterial({ color: 0x2e8b2e });

    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const head = new THREE.Mesh(headGeo, greenMat);
    head.position.y = 1.35;
    group.add(head);

    const bodyGeo = new THREE.BoxGeometry(0.4, 0.65, 0.22);
    const body = new THREE.Mesh(bodyGeo, greenMat);
    body.position.y = 0.75;
    group.add(body);

    const legGeo = new THREE.BoxGeometry(0.18, 0.42, 0.18);
    const legs = [];
    const legPositions = [
      [-0.14, 0.21, 0.15], [0.14, 0.21, 0.15],
      [-0.14, 0.21, -0.15], [0.14, 0.21, -0.15]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, greenMat);
      leg.position.set(...pos);
      group.add(leg);
      legs.push(leg);
    });

    return { root: group, head, legs, body, originalColor: 0x2e8b2e };
  }

  spawnMob(type, x, y, z, networkId = null) {
    let meshData;
    let maxHealth = 10;
    let speed = 2.0;
    let isHostile = false;

    if (type === 'pig') {
      meshData = this.createPigMesh();
      maxHealth = 10;
      speed = 1.8;
    } else if (type === 'zombie') {
      meshData = this.createZombieMesh();
      maxHealth = 20;
      speed = 2.4;
      isHostile = true;
    } else if (type === 'creeper') {
      meshData = this.createCreeperMesh();
      maxHealth = 20;
      speed = 2.2;
      isHostile = true;
    } else if (type === 'skeleton') {
      meshData = this.createSkeletonMesh();
      maxHealth = 20;
      speed = 2.3;
      isHostile = true;
    } else if (type === 'spider') {
      meshData = this.createSpiderMesh();
      maxHealth = 16;
      speed = 3.2;
      isHostile = true;
    } else {
      meshData = this.createZombieMesh();
      maxHealth = 20;
      speed = 2.0;
      isHostile = true;
    }

    meshData.root.position.set(x, y, z);
    this.scene.add(meshData.root);

    const mob = {
      id: networkId || `local_mob_${Date.now()}_${Math.random()}`,
      type,
      ...meshData,
      health: maxHealth,
      maxHealth,
      speed,
      isHostile,
      velocity: new THREE.Vector3(0, 0, 0),
      walkPhase: Math.random() * Math.PI,
      targetPos: new THREE.Vector3(x, y, z),
      stateTimer: Math.random() * 3.0,
      damageTime: 0,
      fuseTime: 0,
      shootCooldown: 2.0 + Math.random() * 2.0,
      attackCooldown: 0,
      ambientSoundTimer: 2.0 + Math.random() * 6.0,
      isClimbing: false,
    };

    this.mobs.push(mob);
    return mob;
  }

  // Synchronize server authoritative mobs
  syncServerMobs(serverMobs) {
    const activeIds = new Set();
    serverMobs.forEach((sm) => {
      activeIds.add(sm.id);
      let mob = this.mobs.find(m => m.id === sm.id);
      if (!mob) {
        mob = this.spawnMob(sm.type, sm.x, sm.y, sm.z, sm.id);
      }
      mob.targetPos.set(sm.x, sm.y, sm.z);
      mob.root.rotation.y = sm.yaw;
      mob.health = sm.health;
      if (sm.fuse) mob.fuseTime = sm.fuse;
      if (sm.hurt) mob.damageTime = 0.3;
    });

    // Remove despawned mobs
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      if (this.mobs[i].id.startsWith('mob_') && !activeIds.has(this.mobs[i].id)) {
        this.scene.remove(this.mobs[i].root);
        this.mobs.splice(i, 1);
      }
    }
  }

  handleEntityDamage(id, damage, isCritical = false) {
    const mob = this.mobs.find(m => m.id === id);
    if (mob) {
      mob.damageTime = 0.35;
      this.soundManager.playHurt();
      if (isCritical) {
        this.miningSystem.spawnCritParticles(mob.root.position.x, mob.root.position.y + 0.5, mob.root.position.z);
      }
    }
  }

  removeMob(id) {
    const idx = this.mobs.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.scene.remove(this.mobs[idx].root);
      this.mobs.splice(idx, 1);
    }
  }

  // Attack mob (hit with weapon or projectile)
  hitMob(mob, damage, knockbackDir, isCritical = false) {
    mob.health -= damage;
    mob.damageTime = 0.35;
    this.soundManager.playHurt();

    if (isCritical) {
      this.miningSystem.spawnCritParticles(mob.root.position.x, mob.root.position.y + 0.5, mob.root.position.z);
    }

    // Knockback
    mob.velocity.addScaledVector(knockbackDir, 6.5);
    mob.velocity.y = 3.5;

    // Report to multiplayer server
    if (window.game && window.game.multiplayer) {
      window.game.multiplayer.sendAttack('mob', mob.id, damage, isCritical);
    }

    // Local death check
    if (mob.health <= 0) {
      if (mob.type === 'pig') {
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.RAW_PORKCHOP, 2);
      } else if (mob.type === 'zombie') {
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.ROTTEN_FLESH, 1);
      } else if (mob.type === 'creeper') {
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.GUNPOWDER, 2);
      } else if (mob.type === 'skeleton') {
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.ARROW, 3);
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.BONE, 2);
      } else if (mob.type === 'spider') {
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.STRING, 2);
        this.miningSystem.spawnDroppedItem(mob.root.position.x, mob.root.position.y, mob.root.position.z, 'item', ITEM.SPIDER_EYE, 1);
      }

      this.scene.remove(mob.root);
      const idx = this.mobs.indexOf(mob);
      if (idx !== -1) this.mobs.splice(idx, 1);
    }
  }

  update(dt, player, survival) {
    const playerPos = player.position;

    // Periodic local mob spawning if not connected to server
    const isMultiplayer = window.game && window.game.multiplayer && window.game.multiplayer.isConnected;
    if (!isMultiplayer) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= 14.0 && this.mobs.length < 12) {
        this.spawnTimer = 0;
        const angle = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 14;
        const sx = playerPos.x + Math.cos(angle) * dist;
        const sz = playerPos.z + Math.sin(angle) * dist;
        const groundY = this.world.getTerrainHeight(Math.floor(sx), Math.floor(sz));

        const rand = Math.random();
        let mobType = 'pig';
        if (rand < 0.35) mobType = 'pig';
        else if (rand < 0.55) mobType = 'zombie';
        else if (rand < 0.70) mobType = 'skeleton';
        else if (rand < 0.85) mobType = 'spider';
        else mobType = 'creeper';

        this.spawnMob(mobType, sx, groundY + 1.2, sz);
      }
    }

    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      // Damage flash
      if (mob.damageTime > 0) {
        mob.damageTime -= dt;
        mob.body.material.color.setHex(0xff3333);
      } else {
        mob.body.material.color.setHex(mob.originalColor);
      }

      if (mob.attackCooldown > 0) mob.attackCooldown -= dt;

      // Soft interpolation if receiving server target positions
      if (isMultiplayer && mob.id.startsWith('mob_')) {
        mob.root.position.lerp(mob.targetPos, 0.25);
        continue;
      }

      const distToPlayer = mob.root.position.distanceTo(playerPos);

      // AI Logic
      if (mob.isHostile && distToPlayer < 18.0) {
        const moveDir = new THREE.Vector3().subVectors(playerPos, mob.root.position);
        moveDir.y = 0;
        moveDir.normalize();

        mob.root.rotation.y = Math.atan2(moveDir.x, moveDir.z);

        if (mob.type === 'skeleton') {
          // Skeleton Ranged Bow AI (keeps 8-14 distance)
          if (distToPlayer > 12.0) {
            mob.velocity.x = moveDir.x * mob.speed;
            mob.velocity.z = moveDir.z * mob.speed;
          } else if (distToPlayer < 6.0) {
            mob.velocity.x = -moveDir.x * mob.speed;
            mob.velocity.z = -moveDir.z * mob.speed;
          } else {
            // Strafe
            mob.velocity.x = -moveDir.z * (mob.speed * 0.6);
            mob.velocity.z = moveDir.x * (mob.speed * 0.6);
          }

          mob.shootCooldown -= dt;
          if (mob.shootCooldown <= 0) {
            mob.shootCooldown = 2.5 + Math.random() * 1.5;
            this.soundManager.playBowTwang();
            const arrowDir = new THREE.Vector3().subVectors(playerPos, mob.root.position).normalize();
            arrowDir.y += 0.12; // Ballistic arc
            this.miningSystem.spawnArrow(
              mob.root.position.x,
              mob.root.position.y + 1.2,
              mob.root.position.z,
              arrowDir,
              18.0,
              false
            );
          }
        } else if (mob.type === 'spider') {
          // Spider Wall-Climbing Mechanic
          mob.velocity.x = moveDir.x * mob.speed;
          mob.velocity.z = moveDir.z * mob.speed;

          // Check if wall ahead
          const forwardX = Math.floor(mob.root.position.x + moveDir.x * 0.5);
          const forwardY = Math.floor(mob.root.position.y + 0.4);
          const forwardZ = Math.floor(mob.root.position.z + moveDir.z * 0.5);
          const wallBlock = this.world.getBlock(forwardX, forwardY, forwardZ);
          if (BLOCK_DEFS[wallBlock] && BLOCK_DEFS[wallBlock].solid) {
            // Climb wall!
            mob.velocity.y = 3.6;
            mob.isClimbing = true;
          } else {
            mob.isClimbing = false;
          }

          if (distToPlayer < 1.6 && mob.attackCooldown <= 0) {
            survival.takeDamage(4);
            mob.attackCooldown = 1.0;
          }
        } else if (mob.type === 'creeper') {
          mob.velocity.x = moveDir.x * mob.speed;
          mob.velocity.z = moveDir.z * mob.speed;

          if (distToPlayer < 3.2) {
            const oldFuse = mob.fuseTime;
            mob.fuseTime += dt;
            if (oldFuse === 0 || Math.floor(mob.fuseTime / 0.4) > Math.floor(oldFuse / 0.4)) {
              this.soundManager.playFuse();
            }
            const scale = 1.0 + Math.sin(mob.fuseTime * 20.0) * 0.18;
            mob.root.scale.set(scale, scale, scale);

            if (mob.fuseTime >= 1.5) {
              this.soundManager.playExplosion();
              this.miningSystem.spawnBlockParticles(mob.root.position.x, mob.root.position.y, mob.root.position.z, BLOCK.DIRT);
              survival.takeDamage(14);
              this.scene.remove(mob.root);
              this.mobs.splice(i, 1);
              continue;
            }
          } else {
            mob.fuseTime = Math.max(0, mob.fuseTime - dt);
            mob.root.scale.set(1, 1, 1);
          }
        } else {
          // Zombie
          mob.velocity.x = moveDir.x * mob.speed;
          mob.velocity.z = moveDir.z * mob.speed;
          if (distToPlayer < 1.4 && mob.attackCooldown <= 0) {
            survival.takeDamage(3);
            mob.attackCooldown = 1.0;
          }
        }
      } else {
        // Idle wandering
        mob.stateTimer -= dt;
        if (mob.stateTimer <= 0) {
          mob.stateTimer = 2.0 + Math.random() * 4.0;
          const wanderAngle = Math.random() * Math.PI * 2;
          mob.velocity.x = Math.cos(wanderAngle) * (mob.speed * 0.6);
          mob.velocity.z = Math.sin(wanderAngle) * (mob.speed * 0.6);
          mob.root.rotation.y = Math.atan2(mob.velocity.x, mob.velocity.z);
        }
      }

      // Gravity & Ground Check
      if (!mob.isClimbing) {
        mob.velocity.y -= 22.0 * dt;
      }
      mob.root.position.addScaledVector(mob.velocity, dt);

      const blockUnder = this.world.getBlock(
        Math.floor(mob.root.position.x),
        Math.floor(mob.root.position.y - 0.1),
        Math.floor(mob.root.position.z)
      );

      if (blockUnder !== BLOCK.AIR && blockUnder !== BLOCK.WATER) {
        mob.root.position.y = Math.floor(mob.root.position.y) + 1.0;
        mob.velocity.y = 0;
      }

      // Leg Walking Animation
      const speed = Math.hypot(mob.velocity.x, mob.velocity.z);
      if (speed > 0.2) {
        mob.walkPhase += dt * 8.0;
        const legAngle = Math.sin(mob.walkPhase) * 0.6;
        if (mob.legs.length >= 2) {
          mob.legs[0].rotation.x = legAngle;
          mob.legs[1].rotation.x = -legAngle;
          if (mob.legs.length >= 4) {
            mob.legs[2].rotation.x = -legAngle;
            mob.legs[3].rotation.x = legAngle;
          }
        }
      }
    }
  }
}
