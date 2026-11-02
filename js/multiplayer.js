/**
 * Client Multiplayer Netcode & Remote Entities
 * Synchronizes:
 * - 20 TPS Batched `WORLD_SNAPSHOT` packets
 * - Remote player avatars with smooth lerp interpolation, head pitch/yaw, articulated limb walks, nametags
 * - Authoritative Server Mobs (Pig, Cow, Zombie, Creeper, Skeleton, Spider)
 * - PvP & PvE Combat packets (`PLAYER_ATTACK`, `PLAYER_DAMAGE`, `ENTITY_DAMAGE`, `ENTITY_DEATH`)
 * - 3D Dropped items (`ITEM_DROP`, `ITEM_PICKUP`)
 * - Workstations (Chests & Furnaces) real-time state sharing
 * - Weather, Time sync, Commands & Chat
 */

class MultiplayerClient {
  constructor(world, scene, textureManager) {
    this.world = world;
    this.scene = scene;
    this.textureManager = textureManager;

    this.socket = null;
    this.isConnected = false;
    this.localPlayerId = null;
    this.localPlayerName = 'Steve';

    this.remotePlayers = new Map(); // id -> RemotePlayer
    this.sendTimer = 0;

    // Chat UI elements
    this.chatContainer = document.getElementById('chat-container');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.isChatOpen = false;

    this.initWebSocket();
    this.initChatEvents();
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8088';
    const wsUrl = `${protocol}//${host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('[Multiplayer] Connected to WebSocket server');
        this.addChatMessage('System', 'Connected to multiplayer server!', '#38bdf8');
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handlePacket(msg);
        } catch (e) {
          console.warn('Packet parse error:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        console.log('[Multiplayer] Disconnected from server');
        this.addChatMessage('System', 'Disconnected from multiplayer server', '#f87171');
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }
  }

  handlePacket(msg) {
    if (msg.type === 'INIT') {
      this.localPlayerId = msg.playerId;
      this.localPlayerName = msg.playerName;

      // If by any chance the local player was added as remote, remove it
      if (this.remotePlayers.has(this.localPlayerId)) {
        this.removeRemotePlayer(this.localPlayerId);
      }

      if (msg.time !== undefined && window.game) {
        window.game.dayTime = msg.time;
      }
      if (msg.weather !== undefined && window.game) {
        window.game.setWeather(msg.weather);
      }

      // Apply initial chunk deltas from server
      if (msg.chunkDeltas) {
        for (const [key, deltas] of Object.entries(msg.chunkDeltas)) {
          const [cxStr, czStr] = key.split(',');
          const cx = parseInt(cxStr, 10);
          const cz = parseInt(czStr, 10);
          const chunk = this.world.getOrCreateChunk(cx, cz);
          for (const [idxStr, blockId] of Object.entries(deltas)) {
            const idx = parseInt(idxStr, 10);
            chunk.voxels[idx] = blockId;
            chunk.deltas[idx] = blockId;
          }
          chunk.isDirty = true;
        }
      }

      // Restore workstations
      if (msg.chests && window.game && window.game.inventory) {
        window.game.inventory.serverChests = msg.chests;
      }
      if (msg.furnaces && window.game && window.game.inventory) {
        window.game.inventory.serverFurnaces = msg.furnaces;
      }

      // Spawn existing players
      if (msg.players) {
        msg.players.forEach(p => this.addRemotePlayer(p));
      }

      // Spawn authoritative mobs from server
      if (msg.mobs && window.game && window.game.mobs) {
        window.game.mobs.syncServerMobs(msg.mobs);
      }
    } else if (msg.type === 'WORLD_SNAPSHOT') {
      if (!this.localPlayerId) return; // Wait until local player initialized
      // 20 TPS Batched Snapshot from Server
      if (msg.time !== undefined && window.game) {
        // Soft sync time to avoid jarring jumps
        const diff = msg.time - window.game.dayTime;
        if (Math.abs(diff) > 0.05) window.game.dayTime = msg.time;
        else window.game.dayTime += diff * 0.1;
      }
      if (msg.weather !== undefined && window.game && window.game.weather !== msg.weather) {
        window.game.setWeather(msg.weather);
      }

      // Sync Remote Players
      if (msg.players) {
        const activeIds = new Set();
        msg.players.forEach((p) => {
          if (p.id === this.localPlayerId) return; // Ignore local player
          activeIds.add(p.id);

          let rp = this.remotePlayers.get(p.id);
          if (!rp) {
            this.addRemotePlayer(p);
            rp = this.remotePlayers.get(p.id);
          }

          if (rp) {
            rp.targetPos.set(p.pos.x, p.pos.y, p.pos.z);
            rp.targetYaw = p.yaw;
            rp.targetPitch = p.pitch;
            rp.heldItem = p.heldItem;
            rp.isSneaking = p.sneak;
            rp.isSprinting = p.sprint;
            if (p.swing) rp.triggerSwing();
          }
        });

        // Remove any disconnected players not in snapshot
        this.remotePlayers.forEach((rp, id) => {
          if (!activeIds.has(id)) {
            this.removeRemotePlayer(id);
          }
        });
      }

      // Sync Authoritative Server Mobs
      if (msg.mobs && window.game && window.game.mobs) {
        window.game.mobs.syncServerMobs(msg.mobs);
      }
    } else if (msg.type === 'PLAYER_JOIN') {
      this.addRemotePlayer(msg.player);
      this.addChatMessage('Server', `${msg.player.name} joined the game`, '#facc15');
    } else if (msg.type === 'PLAYER_LEAVE') {
      this.removeRemotePlayer(msg.id);
    } else if (msg.type === 'BLOCK_DELTA') {
      this.world.setBlock(msg.x, msg.y, msg.z, msg.blockId, false);
    } else if (msg.type === 'PLAYER_DAMAGE') {
      if (msg.id === this.localPlayerId && window.game && window.game.survival) {
        window.game.survival.takeDamage(msg.damage);
        if (msg.knockback && window.game.player) {
          window.game.player.velocity.x += msg.knockback.x;
          window.game.player.velocity.y = Math.max(window.game.player.velocity.y, msg.knockback.y);
          window.game.player.velocity.z += msg.knockback.z;
        }
      } else {
        if (window.game && window.game.soundManager) {
          window.game.soundManager.playHurt();
        }
      }
    } else if (msg.type === 'ENTITY_DAMAGE') {
      if (window.game && window.game.mobs) {
        window.game.mobs.handleEntityDamage(msg.id, msg.damage, msg.isCritical);
      }
    } else if (msg.type === 'ENTITY_DEATH') {
      if (window.game && window.game.mobs) {
        window.game.mobs.removeMob(msg.id);
      }
    } else if (msg.type === 'ITEM_DROP') {
      if (window.game && window.game.mining) {
        window.game.mining.spawnDroppedItemFromNetwork(msg.drop);
      }
    } else if (msg.type === 'TNT_SPAWN') {
      if (window.game && window.game.mining) {
        window.game.mining.spawnPrimedTNTMesh(msg.tnt);
      }
    } else if (msg.type === 'EXPLOSION') {
      if (window.game) {
        window.game.handleExplosion(msg.x, msg.y, msg.z, msg.radius, msg.destroyedBlocks);
      }
    } else if (msg.type === 'ARROW_SPAWN') {
      if (window.game && window.game.mining) {
        window.game.mining.spawnArrowFromNetwork(msg.arrow);
      }
    } else if (msg.type === 'WORKSTATION_UPDATE') {
      if (window.game && window.game.inventory) {
        window.game.inventory.applyWorkstationUpdate(msg);
      }
    } else if (msg.type === 'TELEPORT') {
      if (window.game && window.game.player) {
        window.game.player.position.set(msg.position.x, msg.position.y, msg.position.z);
        window.game.player.velocity.set(0, 0, 0);
      }
    } else if (msg.type === 'GAMEMODE_CHANGE') {
      if (window.game && window.game.player) {
        window.game.setGamemode(msg.gamemode);
      }
    } else if (msg.type === 'GIVE_ITEM') {
      if (window.game && window.game.inventory) {
        window.game.inventory.giveItemCommand(msg.itemArg, msg.count);
      }
    } else if (msg.type === 'CLEAR_INVENTORY') {
      if (window.game && window.game.inventory) {
        window.game.inventory.slots.fill(null);
        window.game.renderHotbar();
      }
    } else if (msg.type === 'WEATHER_SYNC') {
      if (window.game) {
        window.game.setWeather(msg.weather);
      }
    } else if (msg.type === 'TIME_SYNC') {
      if (window.game) {
        window.game.dayTime = msg.time;
      }
    } else if (msg.type === 'CHAT') {
      this.addChatMessage(msg.sender, msg.text, msg.color || '#ffffff');
    }
  }

  // Create 3D Remote Player Avatar with Nametag & Articulated Limbs
  addRemotePlayer(data) {
    if (!data || !data.id) return;
    if (this.localPlayerId && data.id === this.localPlayerId) return;
    if (this.remotePlayers.has(data.id)) return;

    const group = new THREE.Group();

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xc48c66 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    group.add(head);

    // Torso (Cyan shirt)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x009999 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.85;
    group.add(torso);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xc48c66 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 0.85, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.35, 0.85, 0);
    group.add(leftArm);
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x223388 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.13, 0.35, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.13, 0.35, 0);
    group.add(leftLeg);
    group.add(rightLeg);

    // Floating Nametag Billboard
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 256;
    tagCanvas.height = 64;
    const tctx = tagCanvas.getContext('2d');
    tctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    tctx.fillRect(0, 0, 256, 64);
    tctx.font = 'bold 30px "VT323", monospace';
    tctx.fillStyle = '#ffffff';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText(data.name || 'Player', 128, 32);

    const tagTex = new THREE.CanvasTexture(tagCanvas);
    tagTex.magFilter = THREE.NearestFilter;
    const tagGeo = new THREE.PlaneGeometry(1.2, 0.3);
    const tagMat = new THREE.MeshBasicMaterial({ map: tagTex, transparent: true, depthTest: false });
    const nametag = new THREE.Mesh(tagGeo, tagMat);
    nametag.position.y = 2.05;
    group.add(nametag);

    const initX = Number.isFinite(data.position?.x) ? data.position.x : (Number.isFinite(data.pos?.x) ? data.pos.x : 0);
    const initY = Number.isFinite(data.position?.y) ? data.position.y : (Number.isFinite(data.pos?.y) ? data.pos.y : 20);
    const initZ = Number.isFinite(data.position?.z) ? data.position.z : (Number.isFinite(data.pos?.z) ? data.pos.z : 0);
    group.position.set(initX, initY, initZ);
    this.scene.add(group);

    this.remotePlayers.set(data.id, {
      id: data.id,
      name: data.name || 'Player',
      root: group,
      mesh: group,
      head,
      nametag,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      targetPos: new THREE.Vector3(initX, initY, initZ),
      targetYaw: data.yaw || 0,
      targetPitch: data.pitch || 0,
      walkPhase: 0,
      isSwinging: false,
      swingProgress: 0,
      triggerSwing: function() { this.isSwinging = true; this.swingProgress = 0; },
    });
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      this.scene.remove(rp.root);
      rp.root.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
      this.remotePlayers.delete(id);
      this.addChatMessage('Server', `${rp.name} left the game`, '#94a3b8');
    }
  }

  // Send local block modification
  sendBlockDelta(x, y, z, blockId) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'BLOCK_DELTA',
        x, y, z, blockId,
      }));
    }
  }

  // Send local swing action
  sendSwing() {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'PLAYER_SWING' }));
    }
  }

  // Send attack action to server (PvP or mob)
  sendAttack(targetType, targetId, damage, isCritical = false) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'PLAYER_ATTACK',
        targetType,
        targetId,
        damage,
        isCritical,
      }));
    }
  }

  // Convenience helper for PvP player attacks
  sendPlayerAttack(targetId, damage, isCritical = false) {
    this.sendAttack('player', targetId, damage, isCritical);
  }

  // Send arrow shoot (accepts either (origin, direction, power) or (x, y, z, vx, vy, vz))
  sendShootArrow(arg1, arg2, arg3, vy, vz) {
    if (typeof arg1 === 'object' && arg1 !== null && Number.isFinite(arg1.x)) {
      const origin = arg1;
      const dir = arg2;
      const power = Number.isFinite(arg3) ? arg3 : 1.0;
      const speed = 25.0 * power;
      this.sendShootArrowCoords(origin.x, origin.y, origin.z, dir.x * speed, dir.y * speed, dir.z * speed);
    } else {
      this.sendShootArrowCoords(arg1, arg2, arg3, vy, vz);
    }
  }

  sendShootArrowCoords(x, y, z, vx, vy, vz) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'SHOOT_ARROW',
        x, y, z, vx, vy, vz,
      }));
    }
  }

  // Send TNT ignition
  sendIgniteTNT(x, y, z) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'IGNITE_TNT',
        x, y, z,
      }));
    }
  }

  sendTntSpawn(x, y, z, fuse = 3.5) {
    this.sendIgniteTNT(x, y, z);
  }

  // Send workstation sync
  sendWorkstationUpdate(key, workstationType, slots, furnaceState = null) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'WORKSTATION_UPDATE',
        key,
        workstationType,
        slots,
        furnaceState,
      }));
    }
  }

  // Send chat message
  sendChatMessage(text) {
    if (!text.trim()) return;
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'CHAT',
        text,
      }));
    }
  }

  initChatEvents() {
    if (!this.chatInput) return;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT' && !this.isChatOpen && (!window.game || !window.game.inventory.activeScreen)) {
        e.preventDefault();
        this.openChat();
      } else if (e.code === 'Slash' && !this.isChatOpen && (!window.game || !window.game.inventory.activeScreen)) {
        e.preventDefault();
        this.openChat('/');
      } else if (e.code === 'Escape' && this.isChatOpen) {
        this.closeChat();
      } else if (e.code === 'Enter' && this.isChatOpen) {
        this.sendChatMessage(this.chatInput.value);
        this.closeChat();
      }
    });
  }

  openChat(initialChar = '') {
    this.isChatOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this.chatContainer.style.display = 'flex';
    this.chatInput.value = initialChar;
    this.chatInput.focus();
  }

  closeChat() {
    this.isChatOpen = false;
    this.chatContainer.style.display = 'none';
    this.chatInput.value = '';
    if (window.game && window.game.controls) {
      window.game.controls.requestLock();
    }
  }

  addChatMessage(sender, text, color = '#ffffff') {
    if (!this.chatMessages) return;
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message';
    msgEl.innerHTML = `<strong style="color: ${color}">${sender}:</strong> <span>${text}</span>`;
    this.chatMessages.appendChild(msgEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    setTimeout(() => {
      msgEl.style.opacity = '0.6';
    }, 8000);
  }

  // 20 TPS client position broadcast & Remote Player Interpolation
  update(dt, localPlayer, camera) {
    // 1. Send Local Movement Packet (20 Hz)
    this.sendTimer += dt;
    if (this.sendTimer >= 0.05 && this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendTimer = 0;
      const equipped = window.game && window.game.inventory ? window.game.inventory.getEquippedItem() : null;
      this.socket.send(JSON.stringify({
        type: 'PLAYER_MOVE',
        position: { x: localPlayer.position.x, y: localPlayer.position.y, z: localPlayer.position.z },
        yaw: localPlayer.yaw,
        pitch: localPlayer.pitch,
        heldItem: equipped ? { id: equipped.id, type: equipped.type } : null,
        isSneaking: localPlayer.isSneaking,
        isSprinting: localPlayer.isSprinting,
      }));
    }

    // 2. Smooth Interpolation (`lerp`) of Remote Players
    this.remotePlayers.forEach((rp) => {
      rp.root.position.lerp(rp.targetPos, Math.min(1.0, 15.0 * dt));
      rp.root.rotation.y = rp.targetYaw;
      rp.head.rotation.x = rp.targetPitch;

      // Billboard nametag towards camera
      rp.nametag.lookAt(camera.position);

      // Swing animation
      if (rp.isSwinging) {
        rp.swingProgress += dt * 6.0;
        if (rp.swingProgress >= 1.0) rp.isSwinging = false;
        rp.rightArm.rotation.x = -Math.sin(rp.swingProgress * Math.PI) * 1.5;
      }

      // Leg swing while walking
      const speed = rp.root.position.distanceTo(rp.targetPos);
      if (speed > 0.02) {
        rp.walkPhase += dt * 8.0;
        const legAngle = Math.sin(rp.walkPhase) * 0.6;
        rp.leftLeg.rotation.x = -legAngle;
        rp.rightLeg.rotation.x = legAngle;
        if (!rp.isSwinging) {
          rp.leftArm.rotation.x = legAngle;
          rp.rightArm.rotation.x = -legAngle;
        }
      }
    });
  }
}
