// Recipe Book catalog with authentic MultiCraft & Minetest recipes
const RECIPE_BOOK_LIST = [
  { name: 'Oak Planks (x4)', result: { type: 'block', id: BLOCK.PLANKS, count: 4 }, ingredients: [{ type: 'block', id: BLOCK.WOOD, count: 1 }], grid: [{ r: 0, c: 0, type: 'block', id: BLOCK.WOOD }] },
  { name: 'Jungle Planks (x4)', result: { type: 'block', id: BLOCK.JUNGLE_PLANKS, count: 4 }, ingredients: [{ type: 'block', id: BLOCK.JUNGLE_WOOD, count: 1 }], grid: [{ r: 0, c: 0, type: 'block', id: BLOCK.JUNGLE_WOOD }] },
  { name: 'Sticks (x4)', result: { type: 'item', id: ITEM.STICK, count: 4 }, ingredients: [{ type: 'block', id: BLOCK.PLANKS, count: 2 }], grid: [{ r: 0, c: 0, type: 'block', id: BLOCK.PLANKS }, { r: 1, c: 0, type: 'block', id: BLOCK.PLANKS }] },
  { name: 'Torches (x4)', result: { type: 'block', id: BLOCK.TORCH, count: 4 }, ingredients: [{ type: 'item', id: ITEM.COAL, count: 1 }, { type: 'item', id: ITEM.STICK, count: 1 }], grid: [{ r: 0, c: 0, type: 'item', id: ITEM.COAL }, { r: 1, c: 0, type: 'item', id: ITEM.STICK }] },
  { name: 'Crafting Table', result: { type: 'block', id: BLOCK.CRAFTING_TABLE, count: 1 }, ingredients: [{ type: 'block', id: BLOCK.PLANKS, count: 4 }], grid: [{ r: 0, c: 0, type: 'block', id: BLOCK.PLANKS }, { r: 0, c: 1, type: 'block', id: BLOCK.PLANKS }, { r: 1, c: 0, type: 'block', id: BLOCK.PLANKS }, { r: 1, c: 1, type: 'block', id: BLOCK.PLANKS }] },
  { name: 'Furnace', result: { type: 'block', id: BLOCK.FURNACE, count: 1 }, ingredients: [{ type: 'block', id: BLOCK.COBBLESTONE, count: 8 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.COBBLESTONE }, { r:0, c:1, type: 'block', id: BLOCK.COBBLESTONE }, { r:0, c:2, type: 'block', id: BLOCK.COBBLESTONE }, { r:1, c:0, type: 'block', id: BLOCK.COBBLESTONE }, { r:1, c:2, type: 'block', id: BLOCK.COBBLESTONE }, { r:2, c:0, type: 'block', id: BLOCK.COBBLESTONE }, { r:2, c:1, type: 'block', id: BLOCK.COBBLESTONE }, { r:2, c:2, type: 'block', id: BLOCK.COBBLESTONE }] },
  { name: 'Chest', result: { type: 'block', id: BLOCK.CHEST, count: 1 }, ingredients: [{ type: 'block', id: BLOCK.PLANKS, count: 8 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.PLANKS }, { r:0, c:1, type: 'block', id: BLOCK.PLANKS }, { r:0, c:2, type: 'block', id: BLOCK.PLANKS }, { r:1, c:0, type: 'block', id: BLOCK.PLANKS }, { r:1, c:2, type: 'block', id: BLOCK.PLANKS }, { r:2, c:0, type: 'block', id: BLOCK.PLANKS }, { r:2, c:1, type: 'block', id: BLOCK.PLANKS }, { r:2, c:2, type: 'block', id: BLOCK.PLANKS }] },
  { name: 'Sandstone', result: { type: 'block', id: BLOCK.SANDSTONE, count: 1 }, ingredients: [{ type: 'block', id: BLOCK.SAND, count: 4 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.SAND }, { r:0, c:1, type: 'block', id: BLOCK.SAND }, { r:1, c:0, type: 'block', id: BLOCK.SAND }, { r:1, c:1, type: 'block', id: BLOCK.SAND }] },
  { name: 'Sandstone Brick (x4)', result: { type: 'block', id: BLOCK.SANDSTONE_BRICK, count: 4 }, ingredients: [{ type: 'block', id: BLOCK.SANDSTONE, count: 4 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.SANDSTONE }, { r:0, c:1, type: 'block', id: BLOCK.SANDSTONE }, { r:1, c:0, type: 'block', id: BLOCK.SANDSTONE }, { r:1, c:1, type: 'block', id: BLOCK.SANDSTONE }] },
  { name: 'Mese Block', result: { type: 'block', id: BLOCK.MESE_BLOCK, count: 1 }, ingredients: [{ type: 'item', id: ITEM.MESE_CRYSTAL, count: 9 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:0, c:1, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:0, c:2, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:1, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:1, c:1, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:1, c:2, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:2, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:2, c:1, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:2, c:2, type: 'item', id: ITEM.MESE_CRYSTAL }] },
  { name: 'Steel Block', result: { type: 'block', id: BLOCK.STEEL_BLOCK, count: 1 }, ingredients: [{ type: 'item', id: ITEM.IRON_INGOT, count: 9 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:0, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:0, c:2, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:2, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:2, type: 'item', id: ITEM.IRON_INGOT }] },
  { name: 'Mese Pickaxe', result: { type: 'item', id: ITEM.MESE_PICKAXE, count: 1 }, ingredients: [{ type: 'item', id: ITEM.MESE_CRYSTAL, count: 3 }, { type: 'item', id: ITEM.STICK, count: 2 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:0, c:1, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:0, c:2, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:1, c:1, type: 'item', id: ITEM.STICK }, { r:2, c:1, type: 'item', id: ITEM.STICK }] },
  { name: 'Mese Sword', result: { type: 'item', id: ITEM.MESE_SWORD, count: 1 }, ingredients: [{ type: 'item', id: ITEM.MESE_CRYSTAL, count: 2 }, { type: 'item', id: ITEM.STICK, count: 1 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:1, c:0, type: 'item', id: ITEM.MESE_CRYSTAL }, { r:2, c:0, type: 'item', id: ITEM.STICK }] },
  { name: 'Steel Pickaxe', result: { type: 'item', id: ITEM.IRON_PICKAXE, count: 1 }, ingredients: [{ type: 'item', id: ITEM.IRON_INGOT, count: 3 }, { type: 'item', id: ITEM.STICK, count: 2 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:0, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:0, c:2, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:1, type: 'item', id: ITEM.STICK }, { r:2, c:1, type: 'item', id: ITEM.STICK }] },
  { name: 'Steel Sword', result: { type: 'item', id: ITEM.IRON_SWORD, count: 1 }, ingredients: [{ type: 'item', id: ITEM.IRON_INGOT, count: 2 }, { type: 'item', id: ITEM.STICK, count: 1 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:0, type: 'item', id: ITEM.STICK }] },
  { name: 'Paper (x3)', result: { type: 'item', id: ITEM.PAPER, count: 3 }, ingredients: [{ type: 'item', id: ITEM.PAPER, count: 3 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.PAPYRUS }, { r:0, c:1, type: 'block', id: BLOCK.PAPYRUS }, { r:0, c:2, type: 'block', id: BLOCK.PAPYRUS }] },
  { name: 'Bookshelf', result: { type: 'block', id: BLOCK.BOOKSHELF, count: 1 }, ingredients: [{ type: 'block', id: BLOCK.PLANKS, count: 6 }, { type: 'item', id: ITEM.BOOK, count: 3 }], grid: [{ r:0, c:0, type: 'block', id: BLOCK.PLANKS }, { r:0, c:1, type: 'block', id: BLOCK.PLANKS }, { r:0, c:2, type: 'block', id: BLOCK.PLANKS }, { r:1, c:0, type: 'item', id: ITEM.BOOK }, { r:1, c:1, type: 'item', id: ITEM.BOOK }, { r:1, c:2, type: 'item', id: ITEM.BOOK }, { r:2, c:0, type: 'block', id: BLOCK.PLANKS }, { r:2, c:1, type: 'block', id: BLOCK.PLANKS }, { r:2, c:2, type: 'block', id: BLOCK.PLANKS }] },
  { name: 'Steel Chestplate', result: { type: 'item', id: ITEM.IRON_CHESTPLATE, count: 1 }, ingredients: [{ type: 'item', id: ITEM.IRON_INGOT, count: 8 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:0, c:2, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:1, c:2, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:0, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:1, type: 'item', id: ITEM.IRON_INGOT }, { r:2, c:2, type: 'item', id: ITEM.IRON_INGOT }] },
  { name: 'Diamond Sword', result: { type: 'item', id: ITEM.DIAMOND_SWORD, count: 1 }, ingredients: [{ type: 'item', id: ITEM.DIAMOND, count: 2 }, { type: 'item', id: ITEM.STICK, count: 1 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.DIAMOND }, { r:1, c:0, type: 'item', id: ITEM.DIAMOND }, { r:2, c:0, type: 'item', id: ITEM.STICK }] },
  { name: 'Diamond Pickaxe', result: { type: 'item', id: ITEM.DIAMOND_PICKAXE, count: 1 }, ingredients: [{ type: 'item', id: ITEM.DIAMOND, count: 3 }, { type: 'item', id: ITEM.STICK, count: 2 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.DIAMOND }, { r:0, c:1, type: 'item', id: ITEM.DIAMOND }, { r:0, c:2, type: 'item', id: ITEM.DIAMOND }, { r:1, c:1, type: 'item', id: ITEM.STICK }, { r:2, c:1, type: 'item', id: ITEM.STICK }] },
  { name: 'Diamond Chestplate', result: { type: 'item', id: ITEM.DIAMOND_CHESTPLATE, count: 1 }, ingredients: [{ type: 'item', id: ITEM.DIAMOND, count: 8 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.DIAMOND }, { r:0, c:2, type: 'item', id: ITEM.DIAMOND }, { r:1, c:0, type: 'item', id: ITEM.DIAMOND }, { r:1, c:1, type: 'item', id: ITEM.DIAMOND }, { r:1, c:2, type: 'item', id: ITEM.DIAMOND }, { r:2, c:0, type: 'item', id: ITEM.DIAMOND }, { r:2, c:1, type: 'item', id: ITEM.DIAMOND }, { r:2, c:2, type: 'item', id: ITEM.DIAMOND }] },
  { name: 'Bow', result: { type: 'item', id: ITEM.BOW, count: 1 }, ingredients: [{ type: 'item', id: ITEM.STICK, count: 3 }, { type: 'item', id: ITEM.STRING, count: 3 }], grid: [{ r:0, c:1, type: 'item', id: ITEM.STICK }, { r:0, c:2, type: 'item', id: ITEM.STRING }, { r:1, c:0, type: 'item', id: ITEM.STICK }, { r:1, c:2, type: 'item', id: ITEM.STRING }, { r:2, c:1, type: 'item', id: ITEM.STICK }, { r:2, c:2, type: 'item', id: ITEM.STRING }] },
  { name: 'Arrows (x4)', result: { type: 'item', id: ITEM.ARROW, count: 4 }, ingredients: [{ type: 'item', id: ITEM.FLINT, count: 1 }, { type: 'item', id: ITEM.STICK, count: 1 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.FLINT }, { r:1, c:0, type: 'item', id: ITEM.STICK }] },
  { name: 'TNT', result: { type: 'block', id: BLOCK.TNT, count: 1 }, ingredients: [{ type: 'item', id: ITEM.GUNPOWDER, count: 5 }, { type: 'block', id: BLOCK.SAND, count: 4 }], grid: [{ r:0, c:0, type: 'item', id: ITEM.GUNPOWDER }, { r:0, c:1, type: 'block', id: BLOCK.SAND }, { r:0, c:2, type: 'item', id: ITEM.GUNPOWDER }, { r:1, c:0, type: 'block', id: BLOCK.SAND }, { r:1, c:1, type: 'item', id: ITEM.GUNPOWDER }, { r:1, c:2, type: 'block', id: BLOCK.SAND }, { r:2, c:0, type: 'item', id: ITEM.GUNPOWDER }, { r:2, c:1, type: 'block', id: BLOCK.SAND }, { r:2, c:2, type: 'item', id: ITEM.GUNPOWDER }] },
  { name: 'Flint and Steel', result: { type: 'item', id: ITEM.FLINT_AND_STEEL, count: 1 }, ingredients: [{ type: 'item', id: ITEM.IRON_INGOT, count: 1 }, { type: 'item', id: ITEM.FLINT, count: 1 }], grid: [{ r: 0, c: 0, type: 'item', id: ITEM.IRON_INGOT }, { r: 0, c: 1, type: 'item', id: ITEM.FLINT }] },
];

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.debugOverlay = document.getElementById('debug-overlay');
    this.blockLabel = document.getElementById('block-label');
    this.blockLabelTimer = null;

    // UI Elements
    this.armorContainer = document.getElementById('armor-container');
    this.heartsContainer = document.getElementById('hearts-container');
    this.hungerContainer = document.getElementById('hunger-container');
    this.oxygenContainer = document.getElementById('oxygen-container');
    this.inventoryModal = document.getElementById('inventory-modal');
    this.recipeBookPanel = document.getElementById('recipe-book-panel');
    this.tooltipEl = document.getElementById('minecraft-tooltip');
    this.workstationTitle = document.getElementById('workstation-title');
    this.craftingGridContainer = document.getElementById('crafting-grid-container');
    this.backpackGrid = document.getElementById('backpack-grid');
    this.hotbarModalGrid = document.getElementById('hotbar-modal-grid');
    this.cursorFloatingItem = document.getElementById('cursor-floating-item');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.underwaterOverlay = document.getElementById('underwater-overlay');
    this.expLevelEl = document.getElementById('exp-level');
    this.expBarFillEl = document.getElementById('exp-bar-fill');

    // Day/Night Cycle (Minecraft Authentic: 20 minutes = 1200 seconds)
    this.dayTime = 0.05; // 0.05 = crisp morning sunlight
    this.dayDuration = 1200;
    this.isDayNightPaused = false;

    // Weather: 'clear' | 'rain' | 'snow'
    this.weather = 'clear';

    // FPS
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;

    this.initThree();
    this.initAtmosphere();
    this.initWeather();
    this.initComponents();
    this.initUI();
    this.initEvents();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 260);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0x78a7ff, 35, 75);
  }

  initAtmosphere() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x78a7ff, 0x4a3c28, 0.45);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    const shadowD = 35;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Sun & Moon Meshes
    const sunGeo = new THREE.PlaneGeometry(12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0, side: THREE.DoubleSide, depthWrite: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    const moonGeo = new THREE.PlaneGeometry(9, 9);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xecf0f1, side: THREE.DoubleSide, depthWrite: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Starfield
    const starCount = 500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 10;
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeo, this.starMaterial);
    this.scene.add(this.stars);
  }

  initWeather() {
    const pCount = 750;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 36;
      pPos[i * 3 + 1] = Math.random() * 24;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.weatherMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.28,
      transparent: true,
      opacity: 0,
    });
    this.weatherParticles = new THREE.Points(pGeo, this.weatherMaterial);
    this.scene.add(this.weatherParticles);
  }

  initComponents() {
    this.soundManager = new SoundManager();
    this.textureManager = new TextureManager();
    this.world = new World(this.scene, this.textureManager);

    // Synchronously generate and mesh spawn chunks (radius 3) so surface voxels exist
    const spawnTargetX = 8.5;
    const spawnTargetZ = 8.5;
    this.world.preloadSpawn(spawnTargetX, spawnTargetZ, 3);

    this.player = new Player(this.world, this.camera, this.soundManager);
    // Explicitly place player on top of preloaded surface terrain
    this.player.findSpawnPosition(spawnTargetX, spawnTargetZ);

    this.mining = new MiningSystem(this.world, this.scene, this.textureManager, this.soundManager);
    this.inventory = new InventoryManager(this.textureManager, this.soundManager);
    this.survival = new SurvivalSystem(this.soundManager);
    this.mobs = new MobManager(this.world, this.scene, this.textureManager, this.soundManager, this.mining);
    this.hand = new HandRenderer(this.camera, this.scene, this.textureManager);
    this.multiplayer = new MultiplayerClient(this.world, this.scene, this.textureManager);

    this.controls = new Controls(
      this.player,
      this.world,
      this.scene,
      this.soundManager,
      this.mining,
      this.inventory,
      this.survival,
      this.mobs,
      this.multiplayer,
      this.renderer.domElement
    );
  }

  initUI() {
    this.hotbarContainer = document.getElementById('hotbar');
    this.startOverlay = document.getElementById('start-overlay');
    this.playBtn = document.getElementById('play-btn');

    this.renderHotbar();
    this.renderSurvivalHUD();

    this.controls.onSlotChange = (newIndex) => {
      this.renderHotbar();
      const equipped = this.inventory.getEquippedItem();
      this.hand.updateEquippedItem(equipped);
      if (equipped) this.showBlockLabel(equipped.name);
    };

    this.controls.onLockChange = (isLocked) => {
      if (isLocked) {
        this.startOverlay.classList.add('hidden');
      } else if (!this.inventory.activeScreen && (!this.multiplayer || !this.multiplayer.isChatOpen)) {
        this.startOverlay.classList.remove('hidden');
      }
    };

    this.controls.onToggleDebug = (show) => {
      this.debugOverlay.style.display = show ? 'block' : 'none';
    };

    this.playBtn.addEventListener('click', () => {
      this.soundManager.playButtonClick();
      this.controls.requestLock();
      this.soundManager.ensureContext();
    });

    this.startOverlay.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.controls.requestLock();
        this.soundManager.ensureContext();
      }
    });

    // Mouse tracking for floating cursor item in inventory
    window.addEventListener('mousemove', (e) => {
      if (this.inventory.activeScreen && this.cursorFloatingItem) {
        this.cursorFloatingItem.style.left = `${e.clientX}px`;
        this.cursorFloatingItem.style.top = `${e.clientY}px`;
      }
    });

    // Disable browser right-click context menu when inventory is open
    window.addEventListener('contextmenu', (e) => {
      if (this.inventory.activeScreen) e.preventDefault();
    });

    const equipped = this.inventory.getEquippedItem();
    this.hand.updateEquippedItem(equipped);
    if (equipped) this.showBlockLabel(equipped.name);
  }

  showTooltip(item, clientX, clientY) {
    if (!this.tooltipEl || !item) return;

    let title = item.name || '';
    let category = '';
    let attr = '';
    let durText = '';
    let isRare = false;

    if (item.type === 'block') {
      const def = BLOCK_DEFS[item.id];
      if (def) title = def.name;
    } else if (item.type === 'item') {
      const def = ITEM_DEFS[item.id];
      if (def) {
        title = def.name;
        if (def.damage) attr = `+${def.damage} Attack Damage`;
        if (def.armor) attr = `+${def.armor} Armor Defense`;
        if (def.food) attr = `Restores +${def.food / 2} Drumsticks`;
        if (title.includes('Diamond')) isRare = true;
      }
    }

    if (item.durability !== undefined && item.maxDurability) {
      durText = `Durability: ${item.durability} / ${item.maxDurability}`;
    }

    this.tooltipEl.innerHTML = `
      <div class="tooltip-title ${isRare ? 'rare' : ''}">${title}</div>
      ${attr ? `<div class="tooltip-attr">${attr}</div>` : ''}
      ${durText ? `<div class="tooltip-durability">${durText}</div>` : ''}
    `;

    this.tooltipEl.classList.remove('hidden');
    this.updateTooltipPosition(clientX, clientY);
  }

  updateTooltipPosition(clientX, clientY) {
    if (!this.tooltipEl) return;
    this.tooltipEl.style.left = `${clientX + 14}px`;
    this.tooltipEl.style.top = `${clientY + 14}px`;
  }

  hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.add('hidden');
    }
  }

  renderHotbar() {
    this.hotbarContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const item = this.inventory.slots[i];
      const slot = document.createElement('div');
      slot.className = `hotbar-slot ${i === this.inventory.selectedHotbarIndex ? 'active' : ''}`;
      slot.dataset.index = i;

      const numKey = document.createElement('span');
      numKey.className = 'slot-key';
      numKey.textContent = i + 1;
      slot.appendChild(numKey);

      if (item) {
        const iconImg = document.createElement('img');
        iconImg.className = 'slot-icon';
        iconImg.src = this.textureManager.getIconDataURL(item.id, item.type === 'item');
        slot.appendChild(iconImg);

        if (item.count > 1) {
          const countBadge = document.createElement('span');
          countBadge.className = 'slot-count';
          countBadge.textContent = item.count;
          slot.appendChild(countBadge);
        }

        // Durability bar on hotbar
        if (item.durability !== undefined && item.maxDurability) {
          const bar = document.createElement('div');
          bar.className = 'durability-bar';
          const fill = document.createElement('div');
          fill.className = 'durability-fill';
          const pct = Math.max(0, item.durability / item.maxDurability);
          fill.style.width = `${pct * 100}%`;
          fill.style.background = `hsl(${pct * 120}, 90%, 45%)`;
          bar.appendChild(fill);
          slot.appendChild(bar);
        }
      }

      slot.addEventListener('mouseenter', (e) => {
        if (item) this.showTooltip(item, e.clientX, e.clientY);
      });
      slot.addEventListener('mousemove', (e) => {
        this.updateTooltipPosition(e.clientX, e.clientY);
      });
      slot.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      slot.addEventListener('click', () => {
        this.soundManager.playButtonClick();
        this.controls.setSelectedSlot(i);
      });

      this.hotbarContainer.appendChild(slot);
    }
  }

  renderSurvivalHUD() {
    // 1. Armor Rating Bar (0 - 20 points, 10 shields)
    if (this.armorContainer) {
      const defensePoints = this.inventory ? this.inventory.getTotalArmorDefense() : 0;
      if (defensePoints <= 0) {
        this.armorContainer.style.display = 'none';
      } else {
        this.armorContainer.style.display = 'flex';
        this.armorContainer.innerHTML = '';
        const fullShields = Math.floor(defensePoints / 2);
        const halfShield = (defensePoints % 2 === 1);
        for (let i = 0; i < 10; i++) {
          const s = document.createElement('div');
          s.className = `armor-shield ${i < fullShields ? 'full' : (i === fullShields && halfShield ? 'half' : 'empty')}`;
          this.armorContainer.appendChild(s);
        }
      }
    }

    // 2. 10 Hearts (20 Health)
    this.heartsContainer.innerHTML = '';
    const fullHearts = Math.floor(this.survival.health / 2);
    const halfHeart = (this.survival.health % 2 === 1);
    for (let i = 0; i < 10; i++) {
      const h = document.createElement('div');
      h.className = `heart ${i < fullHearts ? 'full' : (i === fullHearts && halfHeart ? 'half' : 'empty')}`;
      this.heartsContainer.appendChild(h);
    }

    // 3. 10 Drumsticks (20 Hunger)
    this.hungerContainer.innerHTML = '';
    const fullHunger = Math.floor(this.survival.hunger / 2);
    const halfHunger = (this.survival.hunger % 2 === 1);
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('div');
      d.className = `drumstick ${i < fullHunger ? 'full' : (i === fullHunger && halfHunger ? 'half' : 'empty')}`;
      this.hungerContainer.appendChild(d);
    }

    // 4. Oxygen bubbles when submerged
    if (this.player.isInWater) {
      this.oxygenContainer.style.display = 'flex';
      this.oxygenContainer.innerHTML = '';
      const bubbles = Math.ceil(this.survival.oxygen / 2);
      for (let i = 0; i < 10; i++) {
        const b = document.createElement('div');
        b.className = `bubble ${i < bubbles ? 'full' : 'empty'}`;
        this.oxygenContainer.appendChild(b);
      }
    } else {
      this.oxygenContainer.style.display = 'none';
    }

    // 5. Red Damage Flash
    if (this.survival.damageFlashTime > 0) {
      this.damageOverlay.style.opacity = Math.min(0.6, this.survival.damageFlashTime * 1.8);
    } else {
      this.damageOverlay.style.opacity = 0;
    }

    // 6. Authentic Experience Bar & Level
    if (this.expLevelEl && this.expBarFillEl) {
      this.expLevelEl.textContent = this.survival.level > 0 ? this.survival.level : '';
      const pct = (this.survival.getExpProgress() * 100).toFixed(1);
      this.expBarFillEl.style.width = `${pct}%`;
    }
  }

  // Toggle Full Inventory Screen (<kbd>E</kbd>)
  toggleInventory() {
    if (this.inventory.activeScreen) {
      this.closeWorkstation();
    } else {
      this.openWorkstation('inventory');
    }
  }

  toggleRecipeBook() {
    if (!this.recipeBookPanel) return;
    this.soundManager.playButtonClick();
    const isHidden = this.recipeBookPanel.classList.toggle('hidden');
    if (!isHidden) {
      this.renderRecipeBook();
    }
  }

  renderRecipeBook() {
    const listEl = document.getElementById('recipe-book-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (const rec of RECIPE_BOOK_LIST) {
      const card = document.createElement('div');
      card.className = 'recipe-card';

      const img = document.createElement('img');
      img.src = this.textureManager.getIconDataURL(rec.result.id, rec.result.type === 'item');
      card.appendChild(img);

      const info = document.createElement('div');
      info.className = 'recipe-card-info';

      const name = document.createElement('span');
      name.className = 'recipe-card-name';
      name.textContent = rec.name;
      info.appendChild(name);

      const cost = document.createElement('span');
      cost.className = 'recipe-card-cost';
      cost.textContent = rec.ingredients.map(ing => {
        const n = ing.type === 'block' ? BLOCK_DEFS[ing.id].name : ITEM_DEFS[ing.id].name;
        return `${ing.count}x ${n}`;
      }).join(', ');
      info.appendChild(cost);

      card.appendChild(info);

      card.addEventListener('click', () => {
        this.soundManager.playButtonClick();
        this.autoFillRecipe(rec);
      });

      listEl.appendChild(card);
    }
  }

  autoFillRecipe(rec) {
    // Check if player has all ingredients
    for (const ing of rec.ingredients) {
      if (!this.inventory.hasItem(ing.type, ing.id, ing.count)) {
        this.showBlockLabel(`Missing ${ing.type === 'block' ? BLOCK_DEFS[ing.id].name : ITEM_DEFS[ing.id].name}!`);
        return;
      }
    }

    // Clear current crafting grid back into inventory
    const is3x3 = (this.inventory.activeScreen === 'crafting');
    const grid = is3x3 ? this.inventory.craft3x3 : this.inventory.craft2x2;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) {
        this.inventory.addItem(grid[i].type, grid[i].id, grid[i].count, grid[i].durability);
        grid[i] = null;
      }
    }

    // Deduct from backpack and place in grid
    for (const cell of rec.grid) {
      const size = is3x3 ? 3 : 2;
      if (cell.r < size && cell.c < size) {
        if (this.inventory.removeItem(cell.type, cell.id, 1)) {
          grid[cell.r * size + cell.c] = { type: cell.type, id: cell.id, count: 1 };
        }
      }
    }

    this.soundManager.playPlace('grass');
    this.renderWorkstationUI();
    this.renderHotbar();
  }

  openWorkstation(type) {
    this.inventory.activeScreen = type;
    if (document.pointerLockElement) document.exitPointerLock();
    this.inventoryModal.classList.remove('hidden');
    this.workstationTitle.textContent = type === 'crafting' ? 'Crafting Table (3x3)' :
      (type === 'furnace' ? 'Furnace' : (type === 'chest' ? 'Chest' : 'Inventory & Crafting (2x2)'));

    this.renderWorkstationUI();
  }

  closeWorkstation() {
    this.soundManager.playButtonClick();
    this.inventory.clearCraftingAndCursor();
    this.inventory.activeScreen = null;
    this.inventoryModal.classList.add('hidden');
    if (this.recipeBookPanel) this.recipeBookPanel.classList.add('hidden');
    if (this.cursorFloatingItem) this.cursorFloatingItem.classList.add('hidden');
    this.hideTooltip();
    this.controls.requestLock();
    this.renderHotbar();
    const equipped = this.inventory.getEquippedItem();
    this.hand.updateEquippedItem(equipped);
  }

  createSlotElement(targetArray, index, isActive = false) {
    const item = targetArray[index];
    const slotEl = document.createElement('div');
    slotEl.className = `inv-slot ${isActive ? 'active-hotbar' : ''}`;

    if (item) {
      const img = document.createElement('img');
      img.src = this.textureManager.getIconDataURL(item.id, item.type === 'item');
      slotEl.appendChild(img);
      if (item.count > 1) {
        const c = document.createElement('span');
        c.className = 'slot-count';
        c.textContent = item.count;
        slotEl.appendChild(c);
      }

      // Durability indicator bar
      if (item.durability !== undefined && item.maxDurability) {
        const bar = document.createElement('div');
        bar.className = 'durability-bar';
        const fill = document.createElement('div');
        fill.className = 'durability-fill';
        const pct = Math.max(0, item.durability / item.maxDurability);
        fill.style.width = `${pct * 100}%`;
        fill.style.background = `hsl(${pct * 120}, 90%, 45%)`;
        bar.appendChild(fill);
        slotEl.appendChild(bar);
      }
    }

    slotEl.addEventListener('mouseenter', (e) => {
      if (item) this.showTooltip(item, e.clientX, e.clientY);
    });
    slotEl.addEventListener('mousemove', (e) => {
      this.updateTooltipPosition(e.clientX, e.clientY);
    });
    slotEl.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    slotEl.addEventListener('contextmenu', (e) => e.preventDefault());
    slotEl.addEventListener('mousedown', (e) => {
      const isRight = (e.button === 2);
      const isShift = e.shiftKey;
      this.soundManager.playButtonClick();
      this.inventory.handleSlotClick(targetArray, index, isRight, isShift);
      this.renderWorkstationUI();
      this.renderHotbar();
      const equipped = this.inventory.getEquippedItem();
      this.hand.updateEquippedItem(equipped);
    });

    return slotEl;
  }

  updateCursorFloatingItem() {
    if (!this.cursorFloatingItem) return;
    const stack = this.inventory.cursorStack;
    if (stack) {
      this.cursorFloatingItem.classList.remove('hidden');
      this.cursorFloatingItem.innerHTML = '';
      const img = document.createElement('img');
      img.src = this.textureManager.getIconDataURL(stack.id, stack.type === 'item');
      this.cursorFloatingItem.appendChild(img);
      if (stack.count > 1) {
        const c = document.createElement('span');
        c.className = 'slot-count';
        c.textContent = stack.count;
        this.cursorFloatingItem.appendChild(c);
      }
    } else {
      this.cursorFloatingItem.classList.add('hidden');
      this.cursorFloatingItem.innerHTML = '';
    }
  }

  renderWorkstationUI() {
    const screen = this.inventory.activeScreen;
    this.craftingGridContainer.innerHTML = '';

    // Render 4 Armor Slots (Helmet, Chestplate, Leggings, Boots)
    for (const key of ['helmet', 'chestplate', 'leggings', 'boots']) {
      const slotEl = document.getElementById(`armor-slot-${key}`);
      if (!slotEl) continue;
      slotEl.innerHTML = '';
      const piece = this.inventory.armorSlots[key];

      if (piece) {
        const img = document.createElement('img');
        img.src = this.textureManager.getIconDataURL(piece.id, true);
        slotEl.appendChild(img);

        if (piece.durability !== undefined && piece.maxDurability) {
          const bar = document.createElement('div');
          bar.className = 'durability-bar';
          const fill = document.createElement('div');
          fill.className = 'durability-fill';
          const pct = Math.max(0, piece.durability / piece.maxDurability);
          fill.style.width = `${pct * 100}%`;
          fill.style.background = `hsl(${pct * 120}, 90%, 45%)`;
          bar.appendChild(fill);
          slotEl.appendChild(bar);
        }
      }

      slotEl.onmouseenter = (e) => {
        if (piece) this.showTooltip(piece, e.clientX, e.clientY);
      };
      slotEl.onmousemove = (e) => {
        this.updateTooltipPosition(e.clientX, e.clientY);
      };
      slotEl.onmouseleave = () => {
        this.hideTooltip();
      };

      slotEl.onmousedown = (e) => {
        const cur = this.inventory.cursorStack;
        if (cur && cur.type === 'item' && ITEM_DEFS[cur.id] && ITEM_DEFS[cur.id].armorSlot === key) {
          const oldPiece = this.inventory.armorSlots[key];
          this.inventory.armorSlots[key] = { ...cur };
          this.inventory.cursorStack = oldPiece;
          this.soundManager.playStep('stone');
        } else if (!cur && piece) {
          this.inventory.cursorStack = { ...piece };
          this.inventory.armorSlots[key] = null;
          this.soundManager.playStep('stone');
        }
        this.renderWorkstationUI();
        this.renderSurvivalHUD();
      };
    }

    if (screen === 'inventory' || screen === 'crafting') {
      const is3x3 = (screen === 'crafting');
      const grid = is3x3 ? this.inventory.craft3x3 : this.inventory.craft2x2;

      const gridEl = document.createElement('div');
      gridEl.className = `craft-grid ${is3x3 ? 'grid-3x3' : 'grid-2x2'}`;

      grid.forEach((item, idx) => {
        const slot = this.createSlotElement(grid, idx);
        gridEl.appendChild(slot);
      });

      // Arrow + Result Slot
      const resultContainer = document.createElement('div');
      resultContainer.className = 'craft-result-container';
      const arrow = document.createElement('div');
      arrow.className = 'craft-arrow';
      arrow.textContent = '➔';

      const resultSlot = document.createElement('div');
      resultSlot.className = 'craft-result-slot';

      const recipeResult = this.inventory.checkCraftingRecipes(grid, is3x3);
      if (recipeResult) {
        const img = document.createElement('img');
        img.src = this.textureManager.getIconDataURL(recipeResult.id, recipeResult.type === 'item');
        resultSlot.appendChild(img);
        if (recipeResult.count > 1) {
          const c = document.createElement('span');
          c.className = 'slot-count';
          c.textContent = recipeResult.count;
          resultSlot.appendChild(c);
        }

        resultSlot.addEventListener('mousedown', (e) => {
          const cur = this.inventory.cursorStack;
          const maxStack = (recipeResult.type === 'item' && ITEM_DEFS[recipeResult.id] && ITEM_DEFS[recipeResult.id].maxStack) ? ITEM_DEFS[recipeResult.id].maxStack : 64;

          if (!cur) {
            this.inventory.cursorStack = { ...recipeResult };
          } else if (cur.type === recipeResult.type && cur.id === recipeResult.id && cur.count + recipeResult.count <= maxStack) {
            cur.count += recipeResult.count;
          } else {
            return;
          }

          this.soundManager.playButtonClick();

          for (let i = 0; i < grid.length; i++) {
            if (grid[i]) {
              grid[i].count--;
              if (grid[i].count <= 0) grid[i] = null;
            }
          }

          this.renderWorkstationUI();
          this.renderHotbar();
        });
      }

      resultContainer.appendChild(arrow);
      resultContainer.appendChild(resultSlot);

      this.craftingGridContainer.appendChild(gridEl);
      this.craftingGridContainer.appendChild(resultContainer);

    } else if (screen === 'furnace') {
      const furnaceContainer = document.createElement('div');
      furnaceContainer.className = 'furnace-container';

      const leftCol = document.createElement('div');
      leftCol.className = 'furnace-column';

      const f = this.inventory.furnaceState;
      const inputWrap = [f.input];
      const inputSlot = this.createSlotElement(inputWrap, 0);
      inputSlot.title = 'Smeltable Input';
      inputSlot.addEventListener('mouseup', () => { f.input = inputWrap[0]; });

      const flame = document.createElement('div');
      flame.className = `furnace-flame ${f.burnTimeRemaining > 0 ? 'burning' : ''}`;
      flame.textContent = '🔥';

      const fuelWrap = [f.fuel];
      const fuelSlot = this.createSlotElement(fuelWrap, 0);
      fuelSlot.title = 'Fuel (Coal)';
      fuelSlot.addEventListener('mouseup', () => { f.fuel = fuelWrap[0]; });

      leftCol.appendChild(inputSlot);
      leftCol.appendChild(flame);
      leftCol.appendChild(fuelSlot);

      const arrow = document.createElement('div');
      arrow.className = 'craft-arrow';
      arrow.textContent = '➔';

      const outputWrap = [f.output];
      const outputSlot = this.createSlotElement(outputWrap, 0);
      outputSlot.title = 'Output';
      outputSlot.addEventListener('mouseup', () => { f.output = outputWrap[0]; });

      furnaceContainer.appendChild(leftCol);
      furnaceContainer.appendChild(arrow);
      furnaceContainer.appendChild(outputSlot);

      this.craftingGridContainer.appendChild(furnaceContainer);

    } else if (screen === 'chest') {
      const chestGrid = document.createElement('div');
      chestGrid.className = 'inv-grid grid-9x3';
      for (let i = 0; i < 27; i++) {
        const slot = this.createSlotElement(this.inventory.chestSlots, i);
        chestGrid.appendChild(slot);
      }
      this.craftingGridContainer.appendChild(chestGrid);
    }

    // Render Lower Section: 27-Slot Backpack
    if (this.backpackGrid) {
      this.backpackGrid.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        const slotEl = this.createSlotElement(this.inventory.slots, i);
        this.backpackGrid.appendChild(slotEl);
      }
    }

    // Render Lower Section: 9-Slot Hotbar
    if (this.hotbarModalGrid) {
      this.hotbarModalGrid.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const isActive = (i === this.inventory.selectedHotbarIndex);
        const slotEl = this.createSlotElement(this.inventory.slots, i, isActive);
        this.hotbarModalGrid.appendChild(slotEl);
      }
    }

    this.updateCursorFloatingItem();
  }

  showBlockLabel(text) {
    if (!this.blockLabel) return;
    this.blockLabel.textContent = text;
    this.blockLabel.style.opacity = '1';
    clearTimeout(this.blockLabelTimer);
    this.blockLabelTimer = setTimeout(() => {
      this.blockLabel.style.opacity = '0';
    }, 1800);
  }

  setGameMode(mode) {
    this.survival.setGameMode(mode);
    this.renderSurvivalHUD();
    this.showBlockLabel(`Gamemode set to ${mode.toUpperCase()}`);
  }

  setWeather(type) {
    this.weather = type.toLowerCase();
    this.showBlockLabel(`Weather set to ${this.weather.toUpperCase()}`);
  }

  handleExplosion(x, y, z, radius = 3.5, destroyedBlocks = null) {
    if (this.mining) {
      this.mining.explode(x, y, z, radius, false);
    }
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateAtmosphere(dt) {
    if (!this.isDayNightPaused) {
      this.dayTime += dt / this.dayDuration;
      if (this.dayTime > 1.0) this.dayTime -= 1.0;
    }

    const angle = this.dayTime * Math.PI * 2;
    const pPos = this.player.position;

    const sunDist = 95;
    const sunX = pPos.x + Math.sin(angle) * sunDist;
    const sunY = pPos.y + Math.cos(angle) * sunDist;
    const sunZ = pPos.z + 20;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunMesh.lookAt(pPos);

    this.moonMesh.position.set(pPos.x - Math.sin(angle) * sunDist, pPos.y - Math.cos(angle) * sunDist, pPos.z - 20);
    this.moonMesh.lookAt(pPos);

    this.stars.position.copy(pPos);
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(pPos);

    const sunHeight = Math.cos(angle);
    let skyColor, fogColor, lightIntensity, ambientIntensity, starOpacity;

    if (sunHeight > 0.2) {
      skyColor = new THREE.Color(0x78a7ff);
      fogColor = new THREE.Color(0x78a7ff);
      this.sunLight.color.setHex(0xfff5e6);
      lightIntensity = 1.2 * (sunHeight / 1.0);
      ambientIntensity = 0.65;
      if (this.hemiLight) this.hemiLight.intensity = 0.45;
      starOpacity = 0;
    } else if (sunHeight > -0.15) {
      const t = (sunHeight - (-0.15)) / 0.35;
      skyColor = new THREE.Color(0xdf6e44).lerp(new THREE.Color(0x78a7ff), t);
      fogColor = skyColor.clone();
      this.sunLight.color.setHex(0xff7a36);
      lightIntensity = 0.6 * t + 0.3;
      ambientIntensity = 0.40 + 0.25 * t;
      if (this.hemiLight) this.hemiLight.intensity = 0.38;
      starOpacity = (1.0 - t) * 0.7;
    } else {
      skyColor = new THREE.Color(0x11162b);
      fogColor = new THREE.Color(0x11162b);
      this.sunLight.color.setHex(0x6080b5); // Clean pale moonlight
      lightIntensity = 0.38;
      ambientIntensity = 0.42;
      if (this.hemiLight) {
        this.hemiLight.intensity = 0.32;
        this.hemiLight.color.setHex(0x4a5a80);
        this.hemiLight.groundColor.setHex(0x282622);
      }
      starOpacity = 0.95;
    }

    // Weather Effects
    if (this.weather === 'rain') {
      skyColor.lerp(new THREE.Color(0x3b4252), 0.75);
      fogColor.lerp(new THREE.Color(0x3b4252), 0.75);
      lightIntensity *= 0.5;
      ambientIntensity *= 0.6;
      this.weatherMaterial.color.setHex(0x93c5fd);
      this.weatherMaterial.size = 0.3;
      this.weatherMaterial.opacity = 0.85;

      const pos = this.weatherParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= 32.0 * dt;
        if (pos[i] < -2.0) pos[i] = 22.0;
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
      this.weatherParticles.position.copy(pPos);

    } else if (this.weather === 'snow') {
      skyColor.lerp(new THREE.Color(0x6b7280), 0.6);
      fogColor.lerp(new THREE.Color(0x6b7280), 0.6);
      this.weatherMaterial.color.setHex(0xffffff);
      this.weatherMaterial.size = 0.48;
      this.weatherMaterial.opacity = 0.9;

      const pos = this.weatherParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= 6.0 * dt;
        if (pos[i] < -2.0) pos[i] = 22.0;
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
      this.weatherParticles.position.copy(pPos);

    } else {
      this.weatherMaterial.opacity = 0;
    }

    // Check if player eyes are submerged in water
    const eyeX = Math.floor(pPos.x);
    const eyeY = Math.floor(pPos.y + this.player.eyeHeight);
    const eyeZ = Math.floor(pPos.z);
    const eyeBlock = this.world.getBlock(eyeX, eyeY, eyeZ);
    const isSubmerged = (eyeBlock === BLOCK.WATER);

    if (isSubmerged) {
      this.scene.background = new THREE.Color(0x0a3c5a);
      this.scene.fog.color.setHex(0x0a3c5a);
      this.scene.fog.near = 1.0;
      this.scene.fog.far = 16.0;
      if (this.underwaterOverlay) this.underwaterOverlay.style.opacity = '1';
    } else {
      this.scene.background = skyColor;
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.near = 45;
      this.scene.fog.far = 95;
      if (this.underwaterOverlay) this.underwaterOverlay.style.opacity = '0';
    }

    this.sunLight.intensity = Math.max(0.15, lightIntensity);
    this.ambientLight.intensity = ambientIntensity;
    this.starMaterial.opacity = starOpacity;

    this.world.sunLightIntensity = Math.max(0.12, sunHeight);
  }

  updateDebugOverlay() {
    if (!this.controls.showDebug) return;

    const p = this.player.position;
    const cx = Math.floor(p.x / CHUNK_SIZE_X);
    const cz = Math.floor(p.z / CHUNK_SIZE_Z);
    const biome = this.world.getBiome(Math.floor(p.x), Math.floor(p.z));
    const biomeNames = ['Plains', 'Forest', 'Desert', 'Snow Tundra', 'Mountains'];

    let targetInfo = 'None';
    if (this.controls.targetBlock) {
      const tb = this.controls.targetBlock;
      targetInfo = `${BLOCK_DEFS[tb.blockId].name} (${tb.x}, ${tb.y}, ${tb.z})`;
    } else if (this.controls.targetMob) {
      targetInfo = `${this.controls.targetMob.type.toUpperCase()} (HP: ${this.controls.targetMob.health})`;
    }

    this.debugOverlay.innerHTML = `
      <div class="dbg-title">MULTICRAFT SANDBOX v2.1.0 (Minetest Engine)</div>
      <div class="dbg-line"><strong>FPS:</strong> ${this.fps}</div>
      <div class="dbg-line"><strong>XYZ:</strong> ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}</div>
      <div class="dbg-line"><strong>Physics:</strong> Gravity 9.81 m/s², Jump 6.5 m/s, Walk 4.0 m/s</div>
      <div class="dbg-line"><strong>Biome:</strong> ${biomeNames[biome] || 'Plains'}</div>
      <div class="dbg-line"><strong>Weather:</strong> ${this.weather.toUpperCase()}</div>
      <div class="dbg-line"><strong>Chunk:</strong> ${cx}, ${cz} (Loaded: ${this.world.chunks.size})</div>
      <div class="dbg-line"><strong>Mode:</strong> ${this.survival.gameMode.toUpperCase()} ${this.player.isFlying ? '(FLYING)' : ''}</div>
      <div class="dbg-line"><strong>Armor:</strong> ${this.inventory.getTotalArmorDefense()} / 20</div>
      <div class="dbg-line"><strong>Health:</strong> ${this.survival.health} / 20 | <strong>Hunger:</strong> ${this.survival.hunger} / 20</div>
      <div class="dbg-line"><strong>Target:</strong> ${targetInfo}</div>
      <div class="dbg-line"><strong>Multiplayer:</strong> ${this.multiplayer.isConnected ? '<span style="color:#22c55e">ONLINE (' + this.multiplayer.remotePlayers.size + ' others)</span>' : '<span style="color:#ef4444">OFFLINE</span>'}</div>
    `;
  }

  animate(currentTime) {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.frameCount++;
    if (currentTime - this.lastTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // 1. Update Player Physics & Collisions
    this.player.update(dt, this.controls.input);

    // 2. Update Controls & Raycast
    this.controls.update(dt);

    // 3. Update Mining Progress, Particles & Dropped Items
    this.mining.update(dt, this.player, this.inventory);

    // 4. Update Survival Vitals (Health, Hunger, Drowning)
    this.survival.update(dt, this.player);
    this.renderSurvivalHUD();

    // 5. Update Mobs AI & Combat
    this.mobs.update(dt, this.player, this.survival);

    // 6. Update 3D Hand / Held Item & F5 Camera
    this.hand.update(dt, this.player);

    // 7. Update Atmosphere & Sun Lighting
    this.updateAtmosphere(dt);

    // 8. Update World Chunks around Player
    this.world.update(this.player.position);

    // 9. Update Multiplayer Netcode & Remote Avatars
    this.multiplayer.update(dt, this.player, this.camera);

    // 10. Update Furnace Smelting
    this.inventory.updateFurnace(dt);

    // 11. Update Debug Overlay
    this.updateDebugOverlay();

    // 12. Render
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
