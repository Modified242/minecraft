/**
 * 3D First-Person Hand & Third-Person Camera Rig
 * Features:
 * - Authentic 3D First-Person Arm holding 3D Miniature Blocks, 3D Tools (Sword, Pickaxe, Axe, Shovel),
 *   3D Bow with charge tension, 3D Glowing Torch, and 3D Flat-Voxel Items.
 * - Walking bobbing, idle breathing, and authentic Minecraft tool-swing animation
 * - F5 Multi-view camera toggle (First-Person, Chase Third-Person, Front Selfie)
 * - Articulated local player avatar with animated limbs and held item in 3rd person
 */

class HandRenderer {
  constructor(camera, scene, textureManager) {
    this.camera = camera;
    this.scene = scene;
    this.textureManager = textureManager;

    // Camera Mode: 0 = First Person, 1 = Third Person Back, 2 = Third Person Front
    this.cameraMode = 0;

    // Swing animation state
    this.swingProgress = 0.0;
    this.isSwinging = false;
    this.bobPhase = 0;

    // Bow charging state (0.0 to 1.0)
    this.bowCharge = 0.0;
    this.isBowCharging = false;

    this.currentEquipped = null;

    this.initHandMesh();
    this.initPlayerAvatar();
  }

  initHandMesh() {
    this.handPivot = new THREE.Group();
    this.camera.add(this.handPivot);

    // Player Forearm (Classic Steve cyan sleeve + skin hand)
    const armGeo = new THREE.BoxGeometry(0.13, 0.45, 0.13);
    const armMat = new THREE.MeshLambertMaterial({
      color: 0xc48c66, // Classic skin tone
    });
    this.armMesh = new THREE.Mesh(armGeo, armMat);
    this.armMesh.position.set(0, -0.15, 0);
    this.armMesh.rotation.set(-Math.PI / 4, 0.2, -0.2);

    // Held Item Mesh Container (anchored near wrist/hand)
    this.itemContainer = new THREE.Group();
    this.itemContainer.position.set(0.04, 0.04, -0.16);

    this.handPivot.add(this.armMesh);
    this.handPivot.add(this.itemContainer);

    // Default resting transform at bottom-right of viewport
    this.handRestPos = new THREE.Vector3(0.36, -0.32, -0.52);
    this.handPivot.position.copy(this.handRestPos);
  }

  initPlayerAvatar() {
    this.avatar = new THREE.Group();

    // 1. Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xc48c66 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.45;
    this.avatar.add(this.head);

    // 2. Torso (Cyan shirt)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x009999 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 0.85;
    this.avatar.add(this.torso);

    // 3. Left & Right Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xc48c66 });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.38, 0.85, 0);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.38, 0.85, 0);
    this.avatar.add(this.leftArm);
    this.avatar.add(this.rightArm);

    // 4. Left & Right Legs (Blue pants)
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x223388 });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.13, 0.38, 0);
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.13, 0.38, 0);
    this.avatar.add(this.leftLeg);
    this.avatar.add(this.rightLeg);

    this.avatar.visible = false;
    this.scene.add(this.avatar);
  }

  // Toggle F5 camera view
  toggleCameraMode() {
    this.cameraMode = (this.cameraMode + 1) % 3;
    const isFirstPerson = (this.cameraMode === 0);
    this.handPivot.visible = isFirstPerson;
    this.avatar.visible = !isFirstPerson;
  }

  // Trigger mining/placement swing animation
  triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0.0;
  }

  setBowCharging(isCharging, charge = 0) {
    this.isBowCharging = isCharging;
    this.bowCharge = charge;
  }

  // Helper to build 3D Tools
  createToolMesh(toolType, tierLevel) {
    const group = new THREE.Group();

    // Material colors based on tier
    let headColor = 0xa17849; // Wood
    if (tierLevel === 2) headColor = 0x888888; // Stone
    else if (tierLevel === 3) headColor = 0xd0d8df; // Steel (MultiCraft)
    else if (tierLevel === 4) headColor = 0x5ce8e8; // Diamond
    else if (tierLevel >= 5) headColor = 0xffe033; // Mese (MultiCraft)

    const handleMat = new THREE.MeshLambertMaterial({ color: 0x664a2c });
    const headMat = new THREE.MeshLambertMaterial({ color: headColor });

    // Wooden handle shaft
    const handleGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0.1, 0);
    group.add(handle);

    if (toolType === 'sword') {
      // Crossguard
      const guardGeo = new THREE.BoxGeometry(0.16, 0.035, 0.05);
      const guard = new THREE.Mesh(guardGeo, new THREE.MeshLambertMaterial({ color: 0xc5a777 }));
      guard.position.set(0, 0.22, 0);
      group.add(guard);

      // Blade
      const bladeGeo = new THREE.BoxGeometry(0.065, 0.44, 0.025);
      const blade = new THREE.Mesh(bladeGeo, headMat);
      blade.position.set(0, 0.45, 0);
      group.add(blade);
    } else if (toolType === 'pickaxe') {
      // Pickaxe Head curved bar
      const barGeo = new THREE.BoxGeometry(0.26, 0.06, 0.05);
      const bar = new THREE.Mesh(barGeo, headMat);
      bar.position.set(0, 0.31, 0);
      group.add(bar);

      // Pointy tips
      const tipGeo = new THREE.BoxGeometry(0.05, 0.06, 0.05);
      const tipL = new THREE.Mesh(tipGeo, headMat);
      tipL.position.set(-0.14, 0.27, 0);
      const tipR = new THREE.Mesh(tipGeo, headMat);
      tipR.position.set(0.14, 0.27, 0);
      group.add(tipL);
      group.add(tipR);
    } else if (toolType === 'axe') {
      // Axe Blade Head
      const axeGeo = new THREE.BoxGeometry(0.14, 0.16, 0.05);
      const axeBlade = new THREE.Mesh(axeGeo, headMat);
      axeBlade.position.set(0.06, 0.27, 0);
      group.add(axeBlade);
    } else if (toolType === 'shovel') {
      // Shovel Blade Head
      const shovelGeo = new THREE.BoxGeometry(0.11, 0.15, 0.03);
      const shovelBlade = new THREE.Mesh(shovelGeo, headMat);
      shovelBlade.position.set(0, 0.32, 0);
      group.add(shovelBlade);
    }

    // Classic 45-degree forward tool grip angle
    group.rotation.set(-0.4, 0.2, -0.6);
    group.scale.set(1.2, 1.2, 1.2);
    return group;
  }

  createBowMesh() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x664a2c });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    // Curved wooden bow arms
    const armGeo = new THREE.BoxGeometry(0.035, 0.24, 0.035);
    const topArm = new THREE.Mesh(armGeo, woodMat);
    topArm.position.set(0.05, 0.16, 0);
    topArm.rotation.z = -0.3;
    const botArm = new THREE.Mesh(armGeo, woodMat);
    botArm.position.set(0.05, -0.16, 0);
    botArm.rotation.z = 0.3;

    const midGeo = new THREE.BoxGeometry(0.045, 0.12, 0.045);
    const mid = new THREE.Mesh(midGeo, woodMat);
    group.add(topArm);
    group.add(botArm);
    group.add(mid);

    // Bowstring
    const strGeo = new THREE.BoxGeometry(0.01, 0.44, 0.01);
    const strMesh = new THREE.Mesh(strGeo, stringMat);
    strMesh.position.set(-0.03, 0, 0);
    group.add(strMesh);

    group.rotation.set(-0.2, 0.4, -0.2);
    group.scale.set(1.1, 1.1, 1.1);
    return group;
  }

  createTorchMesh() {
    const group = new THREE.Group();
    // Wooden post
    const postGeo = new THREE.BoxGeometry(0.05, 0.32, 0.05);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x664a2c });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, 0.1, 0);
    group.add(post);

    // Glowing flame tip
    const flameGeo = new THREE.BoxGeometry(0.07, 0.08, 0.07);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.28, 0);
    group.add(flame);

    const innerFlame = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.05, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xffffee })
    );
    innerFlame.position.set(0, 0.29, 0);
    group.add(innerFlame);

    group.rotation.set(-0.2, 0.2, -0.3);
    return group;
  }

  createItemPlaneMesh(iconURL) {
    const group = new THREE.Group();
    const loader = new THREE.TextureLoader();
    loader.load(iconURL, (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      const geo = new THREE.PlaneGeometry(0.28, 0.28);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geo, mat);
      group.add(plane);
    });
    group.rotation.set(-0.3, 0.4, -0.2);
    return group;
  }

  // Update equipped item 3D representation
  updateEquippedItem(equippedItem) {
    this.currentEquipped = equippedItem;

    // Clear previous item meshes
    while (this.itemContainer.children.length > 0) {
      const child = this.itemContainer.children[0];
      this.itemContainer.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    // Always keep player's arm visible holding the item/tool
    this.armMesh.visible = true;

    if (!equippedItem) {
      // Empty hand: reset arm rotation to classic resting punch pose
      this.armMesh.rotation.set(-Math.PI / 4, 0.2, -0.2);
      this.armMesh.position.set(0, -0.15, 0);
      return;
    }

    if (equippedItem.type === 'block') {
      if (equippedItem.id === BLOCK.TORCH) {
        // 3D Torch in hand!
        const torch = this.createTorchMesh();
        this.itemContainer.add(torch);
      } else {
        // 3D Miniature Block held in hand with texture atlas mapping
        const blockGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        const mat = new THREE.MeshLambertMaterial({ map: this.textureManager.atlasTexture });

        // Map UVs for each of the 6 box faces
        const uvs = blockGeo.attributes.uv;
        const faces = ['top', 'bottom', 'side', 'side', 'front', 'side'];
        for (let f = 0; f < 6; f++) {
          const tileIdx = this.textureManager.getBlockTileIndex(equippedItem.id, faces[f]);
          const { uMin, vMin, uMax, vMax } = this.textureManager.getTileUVs(tileIdx);
          const i = f * 4;
          uvs.setXY(i, uMin, vMin);
          uvs.setXY(i + 1, uMax, vMin);
          uvs.setXY(i + 2, uMax, vMax);
          uvs.setXY(i + 3, uMin, vMax);
        }
        uvs.needsUpdate = true;

        const blockMesh = new THREE.Mesh(blockGeo, mat);
        blockMesh.rotation.set(0.3, 0.6, 0.2);
        blockMesh.position.set(0, 0.05, 0);
        this.itemContainer.add(blockMesh);
      }
    } else {
      // Tools, Weapons, Armor, Items
      const itemDef = ITEM_DEFS[equippedItem.id];
      const tierLevel = (itemDef && itemDef.tier) ? itemDef.tier.level : 1;

      if (itemDef && (itemDef.type === 'sword' || itemDef.type === 'pickaxe' || itemDef.type === 'axe' || itemDef.type === 'shovel')) {
        const toolMesh = this.createToolMesh(itemDef.type, tierLevel);
        this.itemContainer.add(toolMesh);
      } else if (itemDef && itemDef.type === 'bow') {
        const bowMesh = this.createBowMesh();
        this.itemContainer.add(bowMesh);
      } else if (itemDef && itemDef.type === 'flint_and_steel') {
        const lighterGeo = new THREE.BoxGeometry(0.08, 0.12, 0.05);
        const lighterMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const lighter = new THREE.Mesh(lighterGeo, lighterMat);
        lighter.rotation.set(-0.3, 0.2, -0.4);
        this.itemContainer.add(lighter);
      } else {
        // Flat voxel item (Apple, Ingot, Diamond, Coal, Armor, etc.)
        const iconURL = this.textureManager.getIconDataURL(equippedItem.id, true);
        if (iconURL) {
          const itemMesh = this.createItemPlaneMesh(iconURL);
          this.itemContainer.add(itemMesh);
        }
      }
    }
  }

  update(dt, player) {
    const isMoving = Math.hypot(player.velocity.x, player.velocity.z) > 0.5 && player.onGround;

    // 1. Process Swing Animation
    if (this.isSwinging) {
      this.swingProgress += dt * 6.5; // ~0.15s swing
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0.0;
      }
    }

    const swingAngle = Math.sin(this.swingProgress * Math.PI);

    // 2. Process View & Hand Bobbing
    if (isMoving && !player.isFlying) {
      this.bobPhase += dt * (player.isSprinting ? 14.0 : 9.0);
    } else {
      this.bobPhase += dt * 1.5; // Idle breathing
    }

    const bobX = Math.cos(this.bobPhase * 0.5) * (isMoving ? 0.025 : 0.005);
    const bobY = Math.sin(this.bobPhase) * (isMoving ? 0.035 : 0.006);

    // 3. Bow pullback tension
    let bowPullX = 0, bowPullY = 0, bowPullZ = 0;
    if (this.isBowCharging) {
      bowPullX = -0.15 * this.bowCharge;
      bowPullY = 0.08 * this.bowCharge;
      bowPullZ = 0.15 * this.bowCharge;
    }

    // Apply transforms to hand pivot
    if (this.cameraMode === 0) {
      this.handPivot.position.set(
        this.handRestPos.x + bobX - swingAngle * 0.15 + bowPullX,
        this.handRestPos.y + bobY + swingAngle * 0.12 + bowPullY,
        this.handRestPos.z - swingAngle * 0.22 + bowPullZ
      );
      this.handPivot.rotation.set(
        swingAngle * 0.6 + (this.isBowCharging ? 0.2 : 0),
        -swingAngle * 0.8,
        swingAngle * 0.5
      );
    } else {
      // Third-Person Camera Mode (F5)
      const eyePos = player.getEyePosition();
      const yaw = player.yaw;
      const pitch = player.pitch;

      const chaseDist = 3.6;
      let camOffsetX = 0, camOffsetY = 0, camOffsetZ = 0;

      if (this.cameraMode === 1) {
        // Behind
        camOffsetX = Math.sin(yaw) * Math.cos(pitch) * chaseDist;
        camOffsetY = Math.sin(pitch) * chaseDist + 0.3;
        camOffsetZ = Math.cos(yaw) * Math.cos(pitch) * chaseDist;
      } else if (this.cameraMode === 2) {
        // Front selfie
        camOffsetX = -Math.sin(yaw) * Math.cos(pitch) * chaseDist;
        camOffsetY = -Math.sin(pitch) * chaseDist + 0.3;
        camOffsetZ = -Math.cos(yaw) * Math.cos(pitch) * chaseDist;
      }

      this.camera.position.set(
        eyePos.x + camOffsetX,
        eyePos.y + camOffsetY,
        eyePos.z + camOffsetZ
      );
      this.camera.lookAt(eyePos);

      // Animate Avatar limbs
      this.avatar.position.copy(player.position);
      this.avatar.rotation.y = yaw;
      this.head.rotation.x = pitch;

      const walkAngle = Math.sin(this.bobPhase) * (isMoving ? 0.6 : 0);
      this.leftLeg.rotation.x = -walkAngle;
      this.rightLeg.rotation.x = walkAngle;
      this.leftArm.rotation.x = walkAngle;
      this.rightArm.rotation.x = -walkAngle - swingAngle * 1.5;
    }
  }
}
