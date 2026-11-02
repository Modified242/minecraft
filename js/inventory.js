/**
 * Full Inventory System, Tool Durabilities, Armor System, and Interactive Recipe Book
 * Supports:
 * - 9 Hotbar slots + 27 Backpack slots
 * - 4 Armor slots (Helmet, Chestplate, Leggings, Boots) with defense rating calculation
 * - Tool durability tracking with green-to-red durability bars
 * - 2x2 player crafting, 3x3 Crafting Table, Smelting Furnaces, and persistent Chests
 * - Interactive Recipe Book that auto-fills recipes from backpack
 * - Real-time Workstation multiplayer synchronization
 */

class InventoryManager {
  constructor(textureManager, soundManager) {
    this.textureManager = textureManager;
    this.soundManager = soundManager;

    // Hotbar (0-8) + Backpack (9-35)
    this.slots = new Array(36).fill(null);
    this.selectedHotbarIndex = 0;

    // 4 Armor Slots: helmet, chestplate, leggings, boots
    this.armorSlots = {
      helmet: null,
      chestplate: null,
      leggings: null,
      boots: null,
    };

    // 2x2 Crafting Grid (4 input + 1 result)
    this.craft2x2 = new Array(4).fill(null);
    this.craft2x2Result = null;

    // 3x3 Crafting Table Grid (9 input + 1 result)
    this.craft3x3 = new Array(9).fill(null);
    this.craft3x3Result = null;

    // Active UI screen: null, 'inventory', 'crafting', 'furnace', 'chest'
    this.activeScreen = null;
    this.activeWorkstationKey = null; // "x,y,z"

    // Authentic mouse cursor holding item stack
    this.cursorStack = null; // { type, id, count, durability }

    // Workstation states
    this.furnaceState = {
      input: null,
      fuel: null,
      output: null,
      burnTimeRemaining: 0,
      burnDuration: 0,
      cookProgress: 0,
    };

    this.chestSlots = new Array(27).fill(null);

    // Multi-workstation cache
    this.serverChests = {};
    this.serverFurnaces = {};

    // Recipe Book active tab and open/close state
    this.isRecipeBookOpen = false;

    // Initial Starter Kit
    this.initStarterKit();
  }

  initStarterKit() {
    this.slots[0] = { type: 'item', id: ITEM.MESE_SWORD, count: 1, durability: 2048, maxDurability: 2048 };
    this.slots[1] = { type: 'item', id: ITEM.MESE_PICKAXE, count: 1, durability: 2048, maxDurability: 2048 };
    this.slots[2] = { type: 'item', id: ITEM.BOW, count: 1, durability: 384, maxDurability: 384 };
    this.slots[3] = { type: 'item', id: ITEM.ARROW, count: 64 };
    this.slots[4] = { type: 'block', id: BLOCK.TORCH, count: 32 };
    this.slots[5] = { type: 'block', id: BLOCK.JUNGLE_WOOD, count: 16 };
    this.slots[6] = { type: 'block', id: BLOCK.MESE_BLOCK, count: 8 };
    this.slots[7] = { type: 'block', id: BLOCK.BOOKSHELF, count: 8 };
    this.slots[8] = { type: 'item', id: ITEM.COOKED_PORKCHOP, count: 16 };

    // Initial MultiCraft Steel Armor
    this.armorSlots.chestplate = { type: 'item', id: ITEM.IRON_CHESTPLATE, count: 1, durability: 240, maxDurability: 240 };
    this.armorSlots.boots = { type: 'item', id: ITEM.IRON_BOOTS, count: 1, durability: 195, maxDurability: 195 };
  }

  getEquippedItem() {
    const slot = this.slots[this.selectedHotbarIndex];
    if (!slot) return null;
    if (slot.type === 'item') {
      return { ...ITEM_DEFS[slot.id], id: slot.id, type: slot.type, count: slot.count, durability: slot.durability, maxDurability: slot.maxDurability };
    }
    return { ...BLOCK_DEFS[slot.id], id: slot.id, type: slot.type, count: slot.count };
  }

  // Calculate total equipped armor defense points (0 to 20)
  getTotalArmorDefense() {
    let total = 0;
    for (const key of ['helmet', 'chestplate', 'leggings', 'boots']) {
      const piece = this.armorSlots[key];
      if (piece && piece.id) {
        const def = ITEM_DEFS[piece.id];
        if (def && def.armor) total += def.armor;
      }
    }
    return Math.min(20, total);
  }

  // Damage equipped tool and play break sound on destruction
  damageEquippedTool(amount = 1) {
    const slot = this.slots[this.selectedHotbarIndex];
    if (!slot || slot.durability === undefined) return;

    slot.durability -= amount;
    if (slot.durability <= 0) {
      this.slots[this.selectedHotbarIndex] = null;
      this.soundManager.playBreak('stone');
      if (window.game && window.game.hand) window.game.hand.updateEquippedItem(null);
    }
  }

  // Damage equipped armor piece on taking damage
  damageArmor(amount = 1) {
    for (const key of ['helmet', 'chestplate', 'leggings', 'boots']) {
      const piece = this.armorSlots[key];
      if (piece && piece.durability !== undefined) {
        piece.durability -= amount;
        if (piece.durability <= 0) {
          this.armorSlots[key] = null;
          this.soundManager.playBreak('stone');
        }
      }
    }
  }

  // Add item stack to inventory
  addItem(type, id, count = 1, durability = null) {
    const maxStack = (type === 'item' && ITEM_DEFS[id] && ITEM_DEFS[id].maxStack) ? ITEM_DEFS[id].maxStack : 64;

    // Stackable non-tool items
    if (maxStack > 1) {
      for (let i = 0; i < 36; i++) {
        const s = this.slots[i];
        if (s && s.type === type && s.id === id && s.count < maxStack) {
          const canAdd = Math.min(count, maxStack - s.count);
          s.count += canAdd;
          count -= canAdd;
          if (count <= 0) return true;
        }
      }
    }

    // Unstacked or remaining
    while (count > 0) {
      const emptyIdx = this.slots.findIndex(s => s === null);
      if (emptyIdx === -1) return false; // Inventory full

      const stackCount = Math.min(count, maxStack);
      const itemDef = (type === 'item') ? ITEM_DEFS[id] : null;
      const maxDur = (itemDef && itemDef.maxDurability) ? itemDef.maxDurability : undefined;
      const curDur = (durability !== null) ? durability : maxDur;

      this.slots[emptyIdx] = {
        type,
        id,
        count: stackCount,
        durability: curDur,
        maxDurability: maxDur,
      };
      count -= stackCount;
    }
    return true;
  }

  consumeEquippedItem(count = 1) {
    const slot = this.slots[this.selectedHotbarIndex];
    if (!slot) return false;
    slot.count -= count;
    if (slot.count <= 0) {
      this.slots[this.selectedHotbarIndex] = null;
    }
    return true;
  }

  hasItem(type, id, count = 1) {
    let found = 0;
    for (let i = 0; i < 36; i++) {
      const s = this.slots[i];
      if (s && s.type === type && s.id === id) {
        found += s.count;
        if (found >= count) return true;
      }
    }
    return false;
  }

  removeItem(type, id, count = 1) {
    let rem = count;
    for (let i = 0; i < 36; i++) {
      const s = this.slots[i];
      if (s && s.type === type && s.id === id) {
        const take = Math.min(rem, s.count);
        s.count -= take;
        rem -= take;
        if (s.count <= 0) {
          this.slots[i] = null;
        }
        if (rem <= 0) return true;
      }
    }
    return rem <= 0;
  }

  // Handle slot interaction
  handleSlotClick(targetArray, index, isRightClick = false, isShiftClick = false) {
    const slot = targetArray[index];

    // Shift-click: instant move
    if (isShiftClick && slot) {
      if (targetArray === this.slots) {
        if (index < 9) {
          this.transferItem(slot, this.slots, 9, 36);
        } else {
          this.transferItem(slot, this.slots, 0, 9);
        }
      } else {
        this.transferItem(slot, this.slots, 0, 36);
      }
      if (slot.count <= 0) targetArray[index] = null;
      return true;
    }

    // Right-click: pick half or place 1
    if (isRightClick) {
      if (!this.cursorStack) {
        if (slot) {
          const half = Math.ceil(slot.count / 2);
          this.cursorStack = { ...slot, count: half };
          slot.count -= half;
          if (slot.count <= 0) targetArray[index] = null;
        }
      } else {
        const maxStack = (this.cursorStack.type === 'item' && ITEM_DEFS[this.cursorStack.id] && ITEM_DEFS[this.cursorStack.id].maxStack)
          ? ITEM_DEFS[this.cursorStack.id].maxStack : 64;

        if (!slot) {
          targetArray[index] = { ...this.cursorStack, count: 1 };
          this.cursorStack.count--;
          if (this.cursorStack.count <= 0) this.cursorStack = null;
        } else if (slot.type === this.cursorStack.type && slot.id === this.cursorStack.id && slot.count < maxStack) {
          slot.count++;
          this.cursorStack.count--;
          if (this.cursorStack.count <= 0) this.cursorStack = null;
        }
      }
      return true;
    }

    // Left-click: pick all / place all / swap
    if (!this.cursorStack) {
      if (slot) {
        this.cursorStack = slot;
        targetArray[index] = null;
      }
    } else {
      if (!slot) {
        targetArray[index] = this.cursorStack;
        this.cursorStack = null;
      } else if (slot.type === this.cursorStack.type && slot.id === this.cursorStack.id) {
        const maxStack = (slot.type === 'item' && ITEM_DEFS[slot.id] && ITEM_DEFS[slot.id].maxStack)
          ? ITEM_DEFS[slot.id].maxStack : 64;
        const canAdd = Math.min(this.cursorStack.count, maxStack - slot.count);
        slot.count += canAdd;
        this.cursorStack.count -= canAdd;
        if (this.cursorStack.count <= 0) this.cursorStack = null;
      } else {
        const temp = slot;
        targetArray[index] = this.cursorStack;
        this.cursorStack = temp;
      }
    }
    return true;
  }

  // Handle clicking on 4 dedicated armor slots
  handleArmorSlotClick(armorSlotKey) {
    const cur = this.cursorStack;
    const existing = this.armorSlots[armorSlotKey];

    if (!cur) {
      if (existing) {
        this.cursorStack = existing;
        this.armorSlots[armorSlotKey] = null;
      }
    } else if (cur.type === 'item' && ITEM_DEFS[cur.id] && ITEM_DEFS[cur.id].armorSlot === armorSlotKey) {
      // Valid armor match
      this.armorSlots[armorSlotKey] = cur;
      this.cursorStack = existing;
    }
  }

  transferItem(sourceStack, destArray, startIdx, endIdx) {
    const maxStack = (sourceStack.type === 'item' && ITEM_DEFS[sourceStack.id] && ITEM_DEFS[sourceStack.id].maxStack)
      ? ITEM_DEFS[sourceStack.id].maxStack : 64;

    for (let i = startIdx; i < endIdx; i++) {
      const s = destArray[i];
      if (s && s.type === sourceStack.type && s.id === sourceStack.id && s.count < maxStack) {
        const canAdd = Math.min(sourceStack.count, maxStack - s.count);
        s.count += canAdd;
        sourceStack.count -= canAdd;
        if (sourceStack.count <= 0) return;
      }
    }
    for (let i = startIdx; i < endIdx; i++) {
      if (!destArray[i]) {
        destArray[i] = { ...sourceStack };
        sourceStack.count = 0;
        return;
      }
    }
  }

  clearCraftingAndCursor() {
    if (this.cursorStack) {
      this.addItem(this.cursorStack.type, this.cursorStack.id, this.cursorStack.count, this.cursorStack.durability);
      this.cursorStack = null;
    }
    for (let i = 0; i < this.craft2x2.length; i++) {
      if (this.craft2x2[i]) {
        this.addItem(this.craft2x2[i].type, this.craft2x2[i].id, this.craft2x2[i].count, this.craft2x2[i].durability);
        this.craft2x2[i] = null;
      }
    }
    for (let i = 0; i < this.craft3x3.length; i++) {
      if (this.craft3x3[i]) {
        this.addItem(this.craft3x3[i].type, this.craft3x3[i].id, this.craft3x3[i].count, this.craft3x3[i].durability);
        this.craft3x3[i] = null;
      }
    }
  }

  // --- AUTHENTIC MINECRAFT 2D BOUNDING-BOX RECIPE MATCHER ---
  checkCraftingRecipes(grid, is3x3 = false) {
    const size = is3x3 ? 3 : 2;
    let minR = -1, maxR = -1, minC = -1, maxC = -1;
    let itemCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const item = grid[r * size + c];
        if (item) {
          itemCount++;
          if (minR === -1 || r < minR) minR = r;
          if (maxR === -1 || r > maxR) maxR = r;
          if (minC === -1 || c < minC) minC = c;
          if (maxC === -1 || c > maxC) maxC = c;
        }
      }
    }

    if (itemCount === 0) return null;

    const h = maxR - minR + 1;
    const w = maxC - minC + 1;

    const getB = (r, c) => {
      const globalR = minR + r;
      const globalC = minC + c;
      return grid[globalR * size + globalC] || null;
    };

    const isBlock = (item, id) => Boolean(item && item.type === 'block' && item.id === id);
    const isItem = (item, id) => Boolean(item && item.type === 'item' && item.id === id);

    // 1x1: Wood Log -> 4 Planks
    if (w === 1 && h === 1 && itemCount === 1) {
      const it = getB(0, 0);
      if (isBlock(it, BLOCK.WOOD) || isBlock(it, BLOCK.BIRCH_WOOD)) {
        return { type: 'block', id: BLOCK.PLANKS, count: 4 };
      }
    }

    // 1x2: 2 Planks -> 4 Sticks; Coal over Stick -> 4 Torches
    if (w === 1 && h === 2 && itemCount === 2) {
      const top = getB(0, 0);
      const bottom = getB(1, 0);
      if (isBlock(top, BLOCK.PLANKS) && isBlock(bottom, BLOCK.PLANKS)) {
        return { type: 'item', id: ITEM.STICK, count: 4 };
      }
      if (isItem(top, ITEM.COAL) && isItem(bottom, ITEM.STICK)) {
        return { type: 'block', id: BLOCK.TORCH, count: 4 };
      }
    }

    // 2x1: Iron + Flint -> Flint & Steel
    if (w === 2 && h === 1 && itemCount === 2) {
      const it1 = getB(0, 0), it2 = getB(0, 1);
      if ((isItem(it1, ITEM.IRON_INGOT) && isItem(it2, ITEM.FLINT)) ||
          (isItem(it2, ITEM.IRON_INGOT) && isItem(it1, ITEM.FLINT))) {
        return { type: 'item', id: ITEM.FLINT_AND_STEEL, count: 1, durability: 64, maxDurability: 64 };
      }
    }

    // 2x2: 4 Planks -> Crafting Table
    if (w === 2 && h === 2 && itemCount === 4) {
      if (isBlock(getB(0, 0), BLOCK.PLANKS) && isBlock(getB(0, 1), BLOCK.PLANKS) &&
          isBlock(getB(1, 0), BLOCK.PLANKS) && isBlock(getB(1, 1), BLOCK.PLANKS)) {
        return { type: 'block', id: BLOCK.CRAFTING_TABLE, count: 1 };
      }
      // 4 Iron -> Boots
      if (isItem(getB(0, 0), ITEM.IRON_INGOT) && isItem(getB(0, 1), ITEM.IRON_INGOT) &&
          isItem(getB(1, 0), ITEM.IRON_INGOT) && isItem(getB(1, 1), ITEM.IRON_INGOT)) {
        return { type: 'item', id: ITEM.IRON_BOOTS, count: 1, durability: 195, maxDurability: 195 };
      }
    }

    // 1x3: Swords & Shovels
    if (w === 1 && h === 3) {
      const top = getB(0, 0);
      const mid = getB(1, 0);
      const bot = getB(2, 0);

      // Swords
      if (itemCount === 3 && isItem(bot, ITEM.STICK) && top && mid && top.id === mid.id && top.type === mid.type) {
        if (isBlock(top, BLOCK.PLANKS)) return { type: 'item', id: ITEM.WOODEN_SWORD, count: 1, durability: 59, maxDurability: 59 };
        if (isBlock(top, BLOCK.COBBLESTONE)) return { type: 'item', id: ITEM.STONE_SWORD, count: 1, durability: 131, maxDurability: 131 };
        if (isItem(top, ITEM.IRON_INGOT)) return { type: 'item', id: ITEM.IRON_SWORD, count: 1, durability: 250, maxDurability: 250 };
        if (isItem(top, ITEM.DIAMOND)) return { type: 'item', id: ITEM.DIAMOND_SWORD, count: 1, durability: 1561, maxDurability: 1561 };
      }

      // Shovels
      if (itemCount === 3 && isItem(mid, ITEM.STICK) && isItem(bot, ITEM.STICK)) {
        if (isBlock(top, BLOCK.PLANKS)) return { type: 'item', id: ITEM.WOODEN_SHOVEL, count: 1, durability: 59, maxDurability: 59 };
        if (isBlock(top, BLOCK.COBBLESTONE)) return { type: 'item', id: ITEM.STONE_SHOVEL, count: 1, durability: 131, maxDurability: 131 };
        if (isItem(top, ITEM.IRON_INGOT)) return { type: 'item', id: ITEM.IRON_SHOVEL, count: 1, durability: 250, maxDurability: 250 };
        if (isItem(top, ITEM.DIAMOND)) return { type: 'item', id: ITEM.DIAMOND_SHOVEL, count: 1, durability: 1561, maxDurability: 1561 };
      }

      // Arrows: Flint over Stick
      if (itemCount === 2 && isItem(top, ITEM.FLINT) && isItem(mid, ITEM.STICK)) {
        return { type: 'item', id: ITEM.ARROW, count: 4 };
      }
    }

    // 2x3: Axes & Bow
    if (w === 2 && h === 3) {
      // Bow: 3 sticks and 3 strings
      if (itemCount === 6) {
        const isBow = (
          isItem(getB(0, 1), ITEM.STICK) && isItem(getB(1, 0), ITEM.STICK) && isItem(getB(2, 1), ITEM.STICK) &&
          isItem(getB(0, 0), ITEM.STRING) && isItem(getB(1, 1), ITEM.STRING) && isItem(getB(2, 0), ITEM.STRING)
        );
        if (isBow) return { type: 'item', id: ITEM.BOW, count: 1, durability: 384, maxDurability: 384 };
      }

      // Axes (itemCount 5)
      if (itemCount === 5) {
        const checkAxeMat = (matCheck) => (
          (matCheck(getB(0, 0)) && matCheck(getB(0, 1)) && matCheck(getB(1, 0)) && isItem(getB(1, 1), ITEM.STICK) && isItem(getB(2, 1), ITEM.STICK)) ||
          (matCheck(getB(0, 0)) && matCheck(getB(0, 1)) && matCheck(getB(1, 1)) && isItem(getB(1, 0), ITEM.STICK) && isItem(getB(2, 0), ITEM.STICK))
        );

        if (checkAxeMat(it => isBlock(it, BLOCK.PLANKS))) return { type: 'item', id: ITEM.WOODEN_AXE, count: 1, durability: 59, maxDurability: 59 };
        if (checkAxeMat(it => isBlock(it, BLOCK.COBBLESTONE))) return { type: 'item', id: ITEM.STONE_AXE, count: 1, durability: 131, maxDurability: 131 };
        if (checkAxeMat(it => isItem(it, ITEM.IRON_INGOT))) return { type: 'item', id: ITEM.IRON_AXE, count: 1, durability: 250, maxDurability: 250 };
        if (checkAxeMat(it => isItem(it, ITEM.DIAMOND))) return { type: 'item', id: ITEM.DIAMOND_AXE, count: 1, durability: 1561, maxDurability: 1561 };
      }
    }

    // 3x3 Recipes
    if (w === 3 && h === 3) {
      // Pickaxes (3 top + 2 sticks)
      if (itemCount === 5 && !getB(1, 0) && isItem(getB(1, 1), ITEM.STICK) && !getB(1, 2) &&
          !getB(2, 0) && isItem(getB(2, 1), ITEM.STICK) && !getB(2, 2)) {
        const topRow = [getB(0, 0), getB(0, 1), getB(0, 2)];
        if (topRow.every(it => isBlock(it, BLOCK.PLANKS))) return { type: 'item', id: ITEM.WOODEN_PICKAXE, count: 1, durability: 59, maxDurability: 59 };
        if (topRow.every(it => isBlock(it, BLOCK.COBBLESTONE))) return { type: 'item', id: ITEM.STONE_PICKAXE, count: 1, durability: 131, maxDurability: 131 };
        if (topRow.every(it => isItem(it, ITEM.IRON_INGOT))) return { type: 'item', id: ITEM.IRON_PICKAXE, count: 1, durability: 250, maxDurability: 250 };
        if (topRow.every(it => isItem(it, ITEM.DIAMOND))) return { type: 'item', id: ITEM.DIAMOND_PICKAXE, count: 1, durability: 1561, maxDurability: 1561 };
      }

      // TNT: 5 Gunpowder + 4 Sand
      if (itemCount === 9) {
        if (isItem(getB(0, 0), ITEM.GUNPOWDER) && isBlock(getB(0, 1), BLOCK.SAND) && isItem(getB(0, 2), ITEM.GUNPOWDER) &&
            isBlock(getB(1, 0), BLOCK.SAND) && isItem(getB(1, 1), ITEM.GUNPOWDER) && isBlock(getB(1, 2), BLOCK.SAND) &&
            isItem(getB(2, 0), ITEM.GUNPOWDER) && isBlock(getB(2, 1), BLOCK.SAND) && isItem(getB(2, 2), ITEM.GUNPOWDER)) {
          return { type: 'block', id: BLOCK.TNT, count: 1 };
        }
      }

      // Furnace (8 Cobblestone)
      if (itemCount === 8 && !getB(1, 1)) {
        const ring = [getB(0,0), getB(0,1), getB(0,2), getB(1,0), getB(1,2), getB(2,0), getB(2,1), getB(2,2)];
        if (ring.every(it => isBlock(it, BLOCK.COBBLESTONE))) return { type: 'block', id: BLOCK.FURNACE, count: 1 };
        if (ring.every(it => isBlock(it, BLOCK.PLANKS))) return { type: 'block', id: BLOCK.CHEST, count: 1 };
        if (ring.every(it => isItem(it, ITEM.IRON_INGOT))) return { type: 'item', id: ITEM.IRON_CHESTPLATE, count: 1, durability: 240, maxDurability: 240 };
        if (ring.every(it => isItem(it, ITEM.DIAMOND))) return { type: 'item', id: ITEM.DIAMOND_CHESTPLATE, count: 1, durability: 528, maxDurability: 528 };
      }

      // Helmet (5 items in n-shape)
      if (itemCount === 5 && !getB(1, 1) && !getB(2, 1)) {
        const helmetRing = [getB(0,0), getB(0,1), getB(0,2), getB(1,0), getB(1,2)];
        if (helmetRing.every(it => isItem(it, ITEM.IRON_INGOT))) return { type: 'item', id: ITEM.IRON_HELMET, count: 1, durability: 165, maxDurability: 165 };
        if (helmetRing.every(it => isItem(it, ITEM.DIAMOND))) return { type: 'item', id: ITEM.DIAMOND_HELMET, count: 1, durability: 363, maxDurability: 363 };
      }

      // Leggings (7 items in pants shape)
      if (itemCount === 7 && !getB(1, 1) && !getB(2, 1)) {
        const pantsRing = [getB(0,0), getB(0,1), getB(0,2), getB(1,0), getB(1,2), getB(2,0), getB(2,2)];
        if (pantsRing.every(it => isItem(it, ITEM.IRON_INGOT))) return { type: 'item', id: ITEM.IRON_LEGGINGS, count: 1, durability: 225, maxDurability: 225 };
        if (pantsRing.every(it => isItem(it, ITEM.DIAMOND))) return { type: 'item', id: ITEM.DIAMOND_LEGGINGS, count: 1, durability: 495, maxDurability: 495 };
      }
    }

    return null;
  }

  // Auto-fill recipe ingredients from backpack into crafting grid
  autoFillRecipe(recipeDef, is3x3 = false) {
    const grid = is3x3 ? this.craft3x3 : this.craft2x2;

    // First clear existing crafting slots back to backpack
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) {
        this.addItem(grid[i].type, grid[i].id, grid[i].count, grid[i].durability);
        grid[i] = null;
      }
    }

    // Attempt to withdraw required pattern
    for (let i = 0; i < recipeDef.pattern.length; i++) {
      const req = recipeDef.pattern[i];
      if (!req) continue;

      // Find in backpack (slots 0..35)
      let foundSlot = -1;
      for (let s = 0; s < 36; s++) {
        if (this.slots[s] && this.slots[s].id === req.id && this.slots[s].type === req.type && this.slots[s].count > 0) {
          foundSlot = s;
          break;
        }
      }

      if (foundSlot !== -1) {
        const it = this.slots[foundSlot];
        grid[i] = { type: it.type, id: it.id, count: 1, durability: it.durability, maxDurability: it.maxDurability };
        it.count--;
        if (it.count <= 0) this.slots[foundSlot] = null;
      }
    }

    if (window.game) {
      window.game.renderWorkstationUI();
      window.game.renderHotbar();
    }
  }

  // Workstation packet handler
  applyWorkstationUpdate(msg) {
    if (msg.workstationType === 'chest') {
      this.serverChests[msg.key] = msg.slots;
      if (this.activeWorkstationKey === msg.key && this.activeScreen === 'chest') {
        this.chestSlots = msg.slots;
        if (window.game) window.game.renderWorkstationUI();
      }
    } else if (msg.workstationType === 'furnace') {
      this.serverFurnaces[msg.key] = msg.furnaceState;
      if (this.activeWorkstationKey === msg.key && this.activeScreen === 'furnace') {
        this.furnaceState = msg.furnaceState;
        if (window.game) window.game.renderWorkstationUI();
      }
    }
  }

  // Command: /give <item> [count]
  giveItemCommand(itemArg, count = 1) {
    const key = itemArg.toUpperCase().replace(/\s+/g, '_');
    if (BLOCK[key] !== undefined) {
      this.addItem('block', BLOCK[key], count);
      return;
    }
    if (ITEM[key] !== undefined) {
      this.addItem('item', ITEM[key], count);
      return;
    }
    // Fallback search
    for (const [idStr, def] of Object.entries(ITEM_DEFS)) {
      if (def.name.toLowerCase().includes(itemArg)) {
        this.addItem('item', parseInt(idStr, 10), count);
        return;
      }
    }
    for (const [idStr, def] of Object.entries(BLOCK_DEFS)) {
      if (def.name.toLowerCase().includes(itemArg)) {
        this.addItem('block', parseInt(idStr, 10), count);
        return;
      }
    }
  }

  updateFurnace(dt) {
    const f = this.furnaceState;
    if (f.burnTimeRemaining > 0) {
      f.burnTimeRemaining -= dt;
    }

    const canSmelt = (
      f.input && (
        (f.input.id === BLOCK.IRON_ORE && (!f.output || (f.output.id === ITEM.IRON_INGOT && f.output.count < 64))) ||
        (f.input.id === BLOCK.GOLD_ORE && (!f.output || (f.output.id === ITEM.GOLD_INGOT && f.output.count < 64))) ||
        (f.input.id === BLOCK.COBBLESTONE && (!f.output || (f.output.id === BLOCK.STONE && f.output.count < 64))) ||
        (f.input.id === ITEM.RAW_PORKCHOP && (!f.output || (f.output.id === ITEM.COOKED_PORKCHOP && f.output.count < 64)))
      )
    );

    if (canSmelt) {
      if (f.burnTimeRemaining <= 0 && f.fuel && f.fuel.id === ITEM.COAL) {
        f.fuel.count--;
        if (f.fuel.count <= 0) f.fuel = null;
        f.burnDuration = 10.0;
        f.burnTimeRemaining = 10.0;
      }

      if (f.burnTimeRemaining > 0) {
        f.cookProgress += dt;
        if (f.cookProgress >= 8.0) {
          f.cookProgress = 0;
          let outputId = ITEM.IRON_INGOT;
          let outputType = 'item';
          if (f.input.id === BLOCK.GOLD_ORE) outputId = ITEM.GOLD_INGOT;
          else if (f.input.id === BLOCK.COBBLESTONE) { outputId = BLOCK.STONE; outputType = 'block'; }
          else if (f.input.id === ITEM.RAW_PORKCHOP) outputId = ITEM.COOKED_PORKCHOP;

          if (!f.output) {
            f.output = { type: outputType, id: outputId, count: 1 };
          } else {
            f.output.count++;
          }

          f.input.count--;
          if (f.input.count <= 0) f.input = null;
        }
      }
    } else {
      f.cookProgress = Math.max(0, f.cookProgress - dt * 2.0);
    }
  }
}
