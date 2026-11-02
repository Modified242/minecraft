/**
 * Expanded Procedural 16x16 Pixel-Art Texture Generator & Block/Item Registry
 * Features:
 * - 25+ authentic Minecraft block types including Ores, Biome Flora, and Workstations
 * - 10-stage block cracking overlay textures
 * - Item and Tool definitions with mining tiers, speed multipliers, and hardness
 * - Procedural Texture Atlas with crisp nearest-neighbor filtering
 */

const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  GLASS: 8,
  PLANKS: 9,
  COBBLESTONE: 10,
  BRICK: 11,
  GLOWSTONE: 12,
  BEDROCK: 13,
  // New Ores
  COAL_ORE: 14,
  IRON_ORE: 15,
  GOLD_ORE: 16,
  DIAMOND_ORE: 17,
  // New Natural & Biome Blocks
  SNOW_GRASS: 18,
  SNOW: 19,
  CACTUS: 20,
  BIRCH_WOOD: 21,
  BIRCH_LEAVES: 22,
  // Workstations & Functional Blocks
  CRAFTING_TABLE: 23,
  FURNACE: 24,
  FURNACE_LIT: 25,
  CHEST: 26,
  TORCH: 27,
  LAVA: 28,
  OBSIDIAN: 29,
  TNT: 30,
  GRAVEL: 31,
  // MultiCraft Signature Nodes
  MESE_ORE: 32,
  MESE_BLOCK: 33,
  JUNGLE_WOOD: 34,
  JUNGLE_PLANKS: 35,
  JUNGLE_LEAVES: 36,
  SANDSTONE: 37,
  SANDSTONE_BRICK: 38,
  PAPYRUS: 39,
  BOOKSHELF: 40,
  STEEL_BLOCK: 41,
};

const ITEM = {
  // Tools & Weapons
  WOODEN_PICKAXE: 101,
  STONE_PICKAXE: 102,
  IRON_PICKAXE: 103,
  DIAMOND_PICKAXE: 104,
  WOODEN_SWORD: 105,
  STONE_SWORD: 106,
  IRON_SWORD: 107,
  DIAMOND_SWORD: 108,
  WOODEN_AXE: 109,
  STONE_AXE: 110,
  IRON_AXE: 111,
  DIAMOND_AXE: 112,
  WOODEN_SHOVEL: 113,
  STONE_SHOVEL: 114,
  IRON_SHOVEL: 115,
  DIAMOND_SHOVEL: 116,
  BOW: 117,
  ARROW: 118,
  FLINT_AND_STEEL: 119,
  // MultiCraft Mese Tools
  MESE_PICKAXE: 120,
  MESE_SWORD: 121,
  // Materials & Food
  STICK: 201,
  COAL: 202,
  IRON_INGOT: 203,
  GOLD_INGOT: 204,
  DIAMOND: 205,
  RAW_PORKCHOP: 206,
  COOKED_PORKCHOP: 207,
  APPLE: 208,
  ROTTEN_FLESH: 209,
  FLINT: 210,
  GUNPOWDER: 211,
  STRING: 212,
  BONE: 213,
  SPIDER_EYE: 214,
  MESE_CRYSTAL: 215,
  PAPER: 216,
  BOOK: 217,
  // Armor
  IRON_HELMET: 301,
  IRON_CHESTPLATE: 302,
  IRON_LEGGINGS: 303,
  IRON_BOOTS: 304,
  DIAMOND_HELMET: 305,
  DIAMOND_CHESTPLATE: 306,
  DIAMOND_LEGGINGS: 307,
  DIAMOND_BOOTS: 308,
};

const TILE_SIZE = 16;
const ATLAS_TILES_PER_ROW = 16;
const ATLAS_SIZE = TILE_SIZE * ATLAS_TILES_PER_ROW; // 256x256 atlas (256 tiles capacity)

// Atlas Tile coordinates
const TILES = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  WOOD_TOP: 4,
  WOOD_SIDE: 5,
  LEAVES: 6,
  SAND: 7,
  WATER: 8,
  GLASS: 9,
  PLANKS: 10,
  COBBLESTONE: 11,
  BRICK: 12,
  GLOWSTONE: 13,
  BEDROCK: 14,
  // Ores
  COAL_ORE: 15,
  IRON_ORE: 16,
  GOLD_ORE: 17,
  DIAMOND_ORE: 18,
  // Biomes
  SNOW_TOP: 19,
  SNOW_SIDE: 20,
  SNOW_BLOCK: 21,
  CACTUS_TOP: 22,
  CACTUS_SIDE: 23,
  BIRCH_TOP: 24,
  BIRCH_SIDE: 25,
  BIRCH_LEAVES: 26,
  // Workstations
  CRAFT_TOP: 27,
  CRAFT_SIDE1: 28,
  CRAFT_SIDE2: 29,
  FURNACE_FRONT: 30,
  FURNACE_LIT: 31,
  FURNACE_SIDE: 32,
  FURNACE_TOP: 33,
  CHEST_TOP: 34,
  CHEST_SIDE: 35,
  CHEST_FRONT: 36,
  TORCH: 37,
  LAVA: 38,
  OBSIDIAN: 39,
  TNT_TOP: 40,
  TNT_SIDE: 41,
  TNT_BOTTOM: 42,
  GRAVEL: 43,
  // MultiCraft Signature Tiles
  MESE_ORE: 60,
  MESE_BLOCK: 61,
  JUNGLE_WOOD_TOP: 62,
  JUNGLE_WOOD_SIDE: 63,
  JUNGLE_PLANKS: 64,
  JUNGLE_LEAVES: 65,
  SANDSTONE_TOP: 66,
  SANDSTONE_SIDE: 67,
  SANDSTONE_BOTTOM: 68,
  SANDSTONE_BRICK: 69,
  PAPYRUS: 70,
  BOOKSHELF: 71,
  STEEL_BLOCK: 72,
  // Cracks (Tiles 48 to 57)
  CRACK_0: 48,
  CRACK_1: 49,
  CRACK_2: 50,
  CRACK_3: 51,
  CRACK_4: 52,
  CRACK_5: 53,
  CRACK_6: 54,
  CRACK_7: 55,
  CRACK_8: 56,
  CRACK_9: 57,
};

// Tool Tiers & Properties
const TOOL_TIERS = {
  NONE: { level: 0, multiplier: 1.0 },
  WOOD: { level: 1, multiplier: 2.0, durability: 59 },
  STONE: { level: 2, multiplier: 4.0, durability: 131 },
  IRON: { level: 3, multiplier: 6.0, durability: 250 },
  DIAMOND: { level: 4, multiplier: 8.0, durability: 1561 },
  MESE: { level: 5, multiplier: 12.0, durability: 2048 },
};

// Item definitions
const ITEM_DEFS = {
  // Tools & Weapons (MultiCraft Steel & Mese Tool Nomenclature)
  [ITEM.WOODEN_PICKAXE]: { name: 'Wooden Pickaxe', type: 'pickaxe', tier: TOOL_TIERS.WOOD, maxDurability: 59, damage: 2, maxStack: 1 },
  [ITEM.STONE_PICKAXE]: { name: 'Stone Pickaxe', type: 'pickaxe', tier: TOOL_TIERS.STONE, maxDurability: 131, damage: 3, maxStack: 1 },
  [ITEM.IRON_PICKAXE]: { name: 'Steel Pickaxe', type: 'pickaxe', tier: TOOL_TIERS.IRON, maxDurability: 250, damage: 4, maxStack: 1 },
  [ITEM.DIAMOND_PICKAXE]: { name: 'Diamond Pickaxe', type: 'pickaxe', tier: TOOL_TIERS.DIAMOND, maxDurability: 1561, damage: 5, maxStack: 1 },
  [ITEM.MESE_PICKAXE]: { name: 'Mese Pickaxe', type: 'pickaxe', tier: TOOL_TIERS.MESE, maxDurability: 2048, damage: 6, maxStack: 1 },
  [ITEM.WOODEN_SWORD]: { name: 'Wooden Sword', type: 'sword', tier: TOOL_TIERS.WOOD, maxDurability: 59, damage: 4, maxStack: 1 },
  [ITEM.STONE_SWORD]: { name: 'Stone Sword', type: 'sword', tier: TOOL_TIERS.STONE, maxDurability: 131, damage: 5, maxStack: 1 },
  [ITEM.IRON_SWORD]: { name: 'Steel Sword', type: 'sword', tier: TOOL_TIERS.IRON, maxDurability: 250, damage: 6, maxStack: 1 },
  [ITEM.DIAMOND_SWORD]: { name: 'Diamond Sword', type: 'sword', tier: TOOL_TIERS.DIAMOND, maxDurability: 1561, damage: 7, maxStack: 1 },
  [ITEM.MESE_SWORD]: { name: 'Mese Sword', type: 'sword', tier: TOOL_TIERS.MESE, maxDurability: 2048, damage: 8, maxStack: 1 },
  [ITEM.WOODEN_AXE]: { name: 'Wooden Axe', type: 'axe', tier: TOOL_TIERS.WOOD, maxDurability: 59, damage: 3, maxStack: 1 },
  [ITEM.STONE_AXE]: { name: 'Stone Axe', type: 'axe', tier: TOOL_TIERS.STONE, maxDurability: 131, damage: 4, maxStack: 1 },
  [ITEM.IRON_AXE]: { name: 'Steel Axe', type: 'axe', tier: TOOL_TIERS.IRON, maxDurability: 250, damage: 5, maxStack: 1 },
  [ITEM.DIAMOND_AXE]: { name: 'Diamond Axe', type: 'axe', tier: TOOL_TIERS.DIAMOND, maxDurability: 1561, damage: 6, maxStack: 1 },
  [ITEM.WOODEN_SHOVEL]: { name: 'Wooden Shovel', type: 'shovel', tier: TOOL_TIERS.WOOD, maxDurability: 59, damage: 1, maxStack: 1 },
  [ITEM.STONE_SHOVEL]: { name: 'Stone Shovel', type: 'shovel', tier: TOOL_TIERS.STONE, maxDurability: 131, damage: 2, maxStack: 1 },
  [ITEM.IRON_SHOVEL]: { name: 'Steel Shovel', type: 'shovel', tier: TOOL_TIERS.IRON, maxDurability: 250, damage: 3, maxStack: 1 },
  [ITEM.DIAMOND_SHOVEL]: { name: 'Diamond Shovel', type: 'shovel', tier: TOOL_TIERS.DIAMOND, maxDurability: 1561, damage: 4, maxStack: 1 },
  [ITEM.BOW]: { name: 'Bow', type: 'bow', maxDurability: 384, maxStack: 1 },
  [ITEM.ARROW]: { name: 'Arrow', type: 'arrow', maxStack: 64 },
  [ITEM.FLINT_AND_STEEL]: { name: 'Flint & Steel', type: 'flint_and_steel', maxDurability: 64, maxStack: 1 },
  // Materials & Food
  [ITEM.STICK]: { name: 'Stick', maxStack: 64 },
  [ITEM.COAL]: { name: 'Coal', fuelValue: 80, maxStack: 64 },
  [ITEM.IRON_INGOT]: { name: 'Steel Ingot', maxStack: 64 },
  [ITEM.GOLD_INGOT]: { name: 'Gold Ingot', maxStack: 64 },
  [ITEM.DIAMOND]: { name: 'Diamond', maxStack: 64 },
  [ITEM.MESE_CRYSTAL]: { name: 'Mese Crystal', maxStack: 64 },
  [ITEM.PAPER]: { name: 'Paper', maxStack: 64 },
  [ITEM.BOOK]: { name: 'Book', maxStack: 64 },
  [ITEM.RAW_PORKCHOP]: { name: 'Raw Porkchop', food: 3, maxStack: 64 },
  [ITEM.COOKED_PORKCHOP]: { name: 'Cooked Porkchop', food: 8, maxStack: 64 },
  [ITEM.APPLE]: { name: 'Apple', food: 4, maxStack: 64 },
  [ITEM.ROTTEN_FLESH]: { name: 'Rotten Flesh', food: 2, maxStack: 64 },
  [ITEM.FLINT]: { name: 'Flint', maxStack: 64 },
  [ITEM.GUNPOWDER]: { name: 'Gunpowder', maxStack: 64 },
  [ITEM.STRING]: { name: 'String', maxStack: 64 },
  [ITEM.BONE]: { name: 'Bone', maxStack: 64 },
  [ITEM.SPIDER_EYE]: { name: 'Spider Eye', food: 1, maxStack: 64 },
  // MultiCraft Steel Armor
  [ITEM.IRON_HELMET]: { name: 'Steel Helmet', type: 'armor', armorSlot: 'helmet', armor: 2, maxDurability: 165, maxStack: 1 },
  [ITEM.IRON_CHESTPLATE]: { name: 'Steel Chestplate', type: 'armor', armorSlot: 'chestplate', armor: 6, maxDurability: 240, maxStack: 1 },
  [ITEM.IRON_LEGGINGS]: { name: 'Steel Leggings', type: 'armor', armorSlot: 'leggings', armor: 5, maxDurability: 225, maxStack: 1 },
  [ITEM.IRON_BOOTS]: { name: 'Steel Boots', type: 'armor', armorSlot: 'boots', armor: 2, maxDurability: 195, maxStack: 1 },
  [ITEM.DIAMOND_HELMET]: { name: 'Diamond Helmet', type: 'armor', armorSlot: 'helmet', armor: 3, maxDurability: 363, maxStack: 1 },
  [ITEM.DIAMOND_CHESTPLATE]: { name: 'Diamond Chestplate', type: 'armor', armorSlot: 'chestplate', armor: 8, maxDurability: 528, maxStack: 1 },
  [ITEM.DIAMOND_LEGGINGS]: { name: 'Diamond Leggings', type: 'armor', armorSlot: 'leggings', armor: 6, maxDurability: 495, maxStack: 1 },
  [ITEM.DIAMOND_BOOTS]: { name: 'Diamond Boots', type: 'armor', armorSlot: 'boots', armor: 3, maxDurability: 429, maxStack: 1 },
};

// Comprehensive Block properties with hardness, required tools, drops & light
const BLOCK_DEFS = {
  [BLOCK.AIR]: {
    name: 'Air',
    solid: false,
    transparent: true,
    lightPasses: true,
    lightEmission: 0,
    hardness: 0,
  },
  [BLOCK.GRASS]: {
    name: 'Grass Block',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.6,
    bestTool: 'shovel',
    dropItem: { type: 'block', id: BLOCK.DIRT, count: 1 },
    tiles: { top: TILES.GRASS_TOP, bottom: TILES.DIRT, side: TILES.GRASS_SIDE },
    sound: 'grass',
  },
  [BLOCK.DIRT]: {
    name: 'Dirt',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.5,
    bestTool: 'shovel',
    dropItem: { type: 'block', id: BLOCK.DIRT, count: 1 },
    tiles: { all: TILES.DIRT },
    sound: 'dirt',
  },
  [BLOCK.STONE]: {
    name: 'Stone',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 1.5,
    requiredTier: 1, // Wooden pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.COBBLESTONE, count: 1 },
    tiles: { all: TILES.STONE },
    sound: 'stone',
  },
  [BLOCK.WOOD]: {
    name: 'Oak Wood',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.WOOD, count: 1 },
    tiles: { top: TILES.WOOD_TOP, bottom: TILES.WOOD_TOP, side: TILES.WOOD_SIDE },
    sound: 'wood',
  },
  [BLOCK.LEAVES]: {
    name: 'Oak Leaves',
    solid: true,
    transparent: true,
    lightPasses: false,
    hardness: 0.2,
    bestTool: 'shears',
    dropItem: { type: 'item', id: ITEM.APPLE, count: 1, chance: 0.1 },
    tiles: { all: TILES.LEAVES },
    sound: 'grass',
  },
  [BLOCK.SAND]: {
    name: 'Sand',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.5,
    bestTool: 'shovel',
    dropItem: { type: 'block', id: BLOCK.SAND, count: 1 },
    tiles: { all: TILES.SAND },
    sound: 'sand',
  },
  [BLOCK.WATER]: {
    name: 'Water',
    solid: false,
    transparent: true,
    lightPasses: true,
    isFluid: true,
    hardness: 100,
    tiles: { all: TILES.WATER },
    sound: 'water',
  },
  [BLOCK.GLASS]: {
    name: 'Glass',
    solid: true,
    transparent: true,
    lightPasses: true,
    hardness: 0.3,
    dropItem: null,
    tiles: { all: TILES.GLASS },
    sound: 'stone',
  },
  [BLOCK.PLANKS]: {
    name: 'Oak Planks',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.PLANKS, count: 1 },
    tiles: { all: TILES.PLANKS },
    sound: 'wood',
  },
  [BLOCK.COBBLESTONE]: {
    name: 'Cobblestone',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.COBBLESTONE, count: 1 },
    tiles: { all: TILES.COBBLESTONE },
    sound: 'stone',
  },
  [BLOCK.BRICK]: {
    name: 'Brick',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.BRICK, count: 1 },
    tiles: { all: TILES.BRICK },
    sound: 'stone',
  },
  [BLOCK.GLOWSTONE]: {
    name: 'Glowstone',
    solid: true,
    transparent: false,
    lightPasses: false,
    lightEmission: 15,
    hardness: 0.3,
    dropItem: { type: 'block', id: BLOCK.GLOWSTONE, count: 1 },
    tiles: { all: TILES.GLOWSTONE },
    sound: 'stone',
  },
  [BLOCK.BEDROCK]: {
    name: 'Bedrock',
    solid: true,
    transparent: false,
    lightPasses: false,
    indestructible: true,
    hardness: 99999,
    tiles: { all: TILES.BEDROCK },
    sound: 'stone',
  },
  // ORES
  [BLOCK.COAL_ORE]: {
    name: 'Coal Ore',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 3.0,
    requiredTier: 1, // Wooden pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'item', id: ITEM.COAL, count: 1 },
    tiles: { all: TILES.COAL_ORE },
    sound: 'stone',
  },
  [BLOCK.IRON_ORE]: {
    name: 'Iron Ore',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 3.0,
    requiredTier: 2, // Stone pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.IRON_ORE, count: 1 },
    tiles: { all: TILES.IRON_ORE },
    sound: 'stone',
  },
  [BLOCK.GOLD_ORE]: {
    name: 'Gold Ore',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 3.0,
    requiredTier: 3, // Iron pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.GOLD_ORE, count: 1 },
    tiles: { all: TILES.GOLD_ORE },
    sound: 'stone',
  },
  [BLOCK.DIAMOND_ORE]: {
    name: 'Diamond Ore',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 3.0,
    requiredTier: 3, // Iron pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'item', id: ITEM.DIAMOND, count: 1 },
    tiles: { all: TILES.DIAMOND_ORE },
    sound: 'stone',
  },
  // BIOME FLORA
  [BLOCK.SNOW_GRASS]: {
    name: 'Snowy Grass',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.6,
    bestTool: 'shovel',
    dropItem: { type: 'block', id: BLOCK.DIRT, count: 1 },
    tiles: { top: TILES.SNOW_TOP, bottom: TILES.DIRT, side: TILES.SNOW_SIDE },
    sound: 'grass',
  },
  [BLOCK.SNOW]: {
    name: 'Snow Block',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.2,
    bestTool: 'shovel',
    dropItem: { type: 'block', id: BLOCK.SNOW, count: 1 },
    tiles: { all: TILES.SNOW_BLOCK },
    sound: 'grass',
  },
  [BLOCK.CACTUS]: {
    name: 'Cactus',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.4,
    dropItem: { type: 'block', id: BLOCK.CACTUS, count: 1 },
    tiles: { top: TILES.CACTUS_TOP, bottom: TILES.CACTUS_TOP, side: TILES.CACTUS_SIDE },
    sound: 'wood',
  },
  [BLOCK.BIRCH_WOOD]: {
    name: 'Birch Wood',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.BIRCH_WOOD, count: 1 },
    tiles: { top: TILES.BIRCH_TOP, bottom: TILES.BIRCH_TOP, side: TILES.BIRCH_SIDE },
    sound: 'wood',
  },
  [BLOCK.BIRCH_LEAVES]: {
    name: 'Birch Leaves',
    solid: true,
    transparent: true,
    lightPasses: false,
    hardness: 0.2,
    dropItem: { type: 'item', id: ITEM.APPLE, count: 1, chance: 0.05 },
    tiles: { all: TILES.BIRCH_LEAVES },
    sound: 'grass',
  },
  // WORKSTATIONS
  [BLOCK.CRAFTING_TABLE]: {
    name: 'Crafting Table',
    solid: true,
    transparent: false,
    lightPasses: false,
    isWorkstation: 'crafting',
    hardness: 2.5,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.CRAFTING_TABLE, count: 1 },
    tiles: { top: TILES.CRAFT_TOP, bottom: TILES.PLANKS, side: TILES.CRAFT_SIDE1, front: TILES.CRAFT_SIDE2 },
    sound: 'wood',
  },
  [BLOCK.FURNACE]: {
    name: 'Furnace',
    solid: true,
    transparent: false,
    lightPasses: false,
    isWorkstation: 'furnace',
    hardness: 3.5,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.FURNACE, count: 1 },
    tiles: { top: TILES.FURNACE_TOP, bottom: TILES.FURNACE_TOP, side: TILES.FURNACE_SIDE, front: TILES.FURNACE_FRONT },
    sound: 'stone',
  },
  [BLOCK.FURNACE_LIT]: {
    name: 'Burning Furnace',
    solid: true,
    transparent: false,
    lightPasses: false,
    lightEmission: 13,
    isWorkstation: 'furnace',
    hardness: 3.5,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.FURNACE, count: 1 },
    tiles: { top: TILES.FURNACE_TOP, bottom: TILES.FURNACE_TOP, side: TILES.FURNACE_SIDE, front: TILES.FURNACE_LIT },
    sound: 'stone',
  },
  [BLOCK.CHEST]: {
    name: 'Chest',
    solid: true,
    transparent: false,
    lightPasses: false,
    isWorkstation: 'chest',
    hardness: 2.5,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.CHEST, count: 1 },
    tiles: { top: TILES.CHEST_TOP, bottom: TILES.CHEST_TOP, side: TILES.CHEST_SIDE, front: TILES.CHEST_FRONT },
    sound: 'wood',
  },
  [BLOCK.TORCH]: {
    name: 'Torch',
    solid: false,
    transparent: true,
    lightPasses: true,
    lightEmission: 14,
    hardness: 0.05,
    dropItem: { type: 'block', id: BLOCK.TORCH, count: 1 },
    tiles: { all: TILES.TORCH },
    sound: 'wood',
  },
  [BLOCK.LAVA]: {
    name: 'Lava',
    solid: false,
    transparent: false,
    lightPasses: false,
    lightEmission: 15,
    isFluid: true,
    hardness: 100,
    tiles: { all: TILES.LAVA },
    sound: 'stone',
  },
  [BLOCK.OBSIDIAN]: {
    name: 'Obsidian',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 50.0,
    requiredTier: 4, // Diamond Pickaxe
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.OBSIDIAN, count: 1 },
    tiles: { all: TILES.OBSIDIAN },
    sound: 'stone',
  },
  [BLOCK.TNT]: {
    name: 'TNT',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.0,
    dropItem: { type: 'block', id: BLOCK.TNT, count: 1 },
    tiles: { top: TILES.TNT_TOP, bottom: TILES.TNT_BOTTOM, side: TILES.TNT_SIDE },
    sound: 'grass',
  },
  [BLOCK.GRAVEL]: {
    name: 'Gravel',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 0.6,
    hasGravity: true,
    bestTool: 'shovel',
    dropItem: { type: 'item', id: ITEM.FLINT, count: 1, chance: 0.2 },
    tiles: { all: TILES.GRAVEL },
    sound: 'gravel',
  },
  // MultiCraft Signature Blocks
  [BLOCK.MESE_ORE]: {
    name: 'Mese Ore',
    solid: true,
    transparent: false,
    lightPasses: false,
    lightEmission: 3,
    hardness: 3.0,
    requiredTier: 2, // Stone or higher
    bestTool: 'pickaxe',
    dropItem: { type: 'item', id: ITEM.MESE_CRYSTAL, count: 1 },
    tiles: { all: TILES.MESE_ORE },
    sound: 'stone',
  },
  [BLOCK.MESE_BLOCK]: {
    name: 'Mese Block',
    solid: true,
    transparent: false,
    lightPasses: false,
    lightEmission: 9,
    hardness: 4.0,
    requiredTier: 2,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.MESE_BLOCK, count: 1 },
    tiles: { all: TILES.MESE_BLOCK },
    sound: 'stone',
  },
  [BLOCK.JUNGLE_WOOD]: {
    name: 'Jungle Tree',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.JUNGLE_WOOD, count: 1 },
    tiles: { top: TILES.JUNGLE_WOOD_TOP, bottom: TILES.JUNGLE_WOOD_TOP, side: TILES.JUNGLE_WOOD_SIDE },
    sound: 'wood',
  },
  [BLOCK.JUNGLE_PLANKS]: {
    name: 'Jungle Wood Planks',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 2.0,
    bestTool: 'axe',
    dropItem: { type: 'block', id: BLOCK.JUNGLE_PLANKS, count: 1 },
    tiles: { all: TILES.JUNGLE_PLANKS },
    sound: 'wood',
  },
  [BLOCK.JUNGLE_LEAVES]: {
    name: 'Jungle Leaves',
    solid: true,
    transparent: true,
    lightPasses: false,
    hardness: 0.2,
    dropItem: { type: 'item', id: ITEM.APPLE, count: 1, chance: 0.08 },
    tiles: { all: TILES.JUNGLE_LEAVES },
    sound: 'grass',
  },
  [BLOCK.SANDSTONE]: {
    name: 'Sandstone',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 1.2,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.SANDSTONE, count: 1 },
    tiles: { top: TILES.SANDSTONE_TOP, bottom: TILES.SANDSTONE_BOTTOM, side: TILES.SANDSTONE_SIDE },
    sound: 'stone',
  },
  [BLOCK.SANDSTONE_BRICK]: {
    name: 'Sandstone Brick',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 1.5,
    requiredTier: 1,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.SANDSTONE_BRICK, count: 1 },
    tiles: { all: TILES.SANDSTONE_BRICK },
    sound: 'stone',
  },
  [BLOCK.PAPYRUS]: {
    name: 'Papyrus',
    solid: false,
    transparent: true,
    lightPasses: true,
    hardness: 0.1,
    dropItem: { type: 'item', id: ITEM.PAPER, count: 1 },
    tiles: { all: TILES.PAPYRUS },
    sound: 'grass',
  },
  [BLOCK.BOOKSHELF]: {
    name: 'Bookshelf',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 1.5,
    bestTool: 'axe',
    dropItem: { type: 'item', id: ITEM.BOOK, count: 3 },
    tiles: { top: TILES.PLANKS, bottom: TILES.PLANKS, side: TILES.BOOKSHELF },
    sound: 'wood',
  },
  [BLOCK.STEEL_BLOCK]: {
    name: 'Steel Block',
    solid: true,
    transparent: false,
    lightPasses: false,
    hardness: 5.0,
    requiredTier: 2,
    bestTool: 'pickaxe',
    dropItem: { type: 'block', id: BLOCK.STEEL_BLOCK, count: 1 },
    tiles: { all: TILES.STEEL_BLOCK },
    sound: 'stone',
  },
};

// Texture Atlas & Procedural Pixel-Art Painter
class TextureManager {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.blockIcons = {};
    this.itemIcons = {};

    this.generateAtlas();
    this.createThreeTextures();
    this.generateIcons();
  }

  paintTile(tileIndex, drawFn) {
    const col = tileIndex % ATLAS_TILES_PER_ROW;
    const row = Math.floor(tileIndex / ATLAS_TILES_PER_ROW);
    const ox = col * TILE_SIZE;
    const oy = row * TILE_SIZE;

    this.ctx.save();
    this.ctx.translate(ox, oy);
    drawFn(this.ctx);
    this.ctx.restore();
  }

  seededRandom(seed) {
    let s = seed % 2147483647;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  generateAtlas() {
    const ctx = this.ctx;

    // 0. GRASS TOP
    this.paintTile(TILES.GRASS_TOP, (c) => {
      const rand = this.seededRandom(101);
      c.fillStyle = '#4c8a2b';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.75) { c.fillStyle = '#5ca233'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#3f7324'; c.fillRect(x, y, 1, 1); }
          else if (r > 0.65 && (x + y) % 2 === 0) { c.fillStyle = '#6ab83b'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // 1. GRASS SIDE
    this.paintTile(TILES.GRASS_SIDE, (c) => {
      const rand = this.seededRandom(303);
      c.fillStyle = '#7a5433';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#8f633d'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#634429'; c.fillRect(x, y, 1, 1); }
        }
      }
      const dripHeights = [3, 4, 3, 5, 4, 3, 4, 5, 3, 4, 5, 4, 3, 4, 3, 4];
      for (let x = 0; x < 16; x++) {
        const h = dripHeights[x];
        for (let y = 0; y < h; y++) {
          c.fillStyle = (y === 0 || rand() > 0.6) ? '#5ca233' : '#4c8a2b';
          c.fillRect(x, y, 1, 1);
        }
      }
    });

    // 2. DIRT
    this.paintTile(TILES.DIRT, (c) => {
      const rand = this.seededRandom(202);
      c.fillStyle = '#7a5433';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#8f633d'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.22) { c.fillStyle = '#634429'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.08) { c.fillStyle = '#50361f'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // 3. STONE
    const drawStoneBase = (c, seed) => {
      const rand = this.seededRandom(seed);
      c.fillStyle = '#7a7a7a';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.85) { c.fillStyle = '#949494'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.2) { c.fillStyle = '#616161'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.08) { c.fillStyle = '#4d4d4d'; c.fillRect(x, y, 1, 1); }
        }
      }
    };
    this.paintTile(TILES.STONE, (c) => drawStoneBase(c, 404));

    // 4. WOOD TOP
    this.paintTile(TILES.WOOD_TOP, (c) => {
      c.fillStyle = '#543b23';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#9c7a4b';
      c.fillRect(2, 2, 12, 12);
      c.strokeStyle = '#7c5f38';
      c.strokeRect(3.5, 3.5, 9, 9);
      c.strokeRect(5.5, 5.5, 5, 5);
      c.fillStyle = '#69502f';
      c.fillRect(7, 7, 2, 2);
    });

    // 5. WOOD SIDE
    this.paintTile(TILES.WOOD_SIDE, (c) => {
      const rand = this.seededRandom(606);
      c.fillStyle = '#543b23';
      c.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x++) {
        const stripe = (x % 4 === 0 || x % 5 === 2);
        for (let y = 0; y < 16; y++) {
          const r = rand();
          if (stripe || r < 0.3) { c.fillStyle = '#3d2b1a'; c.fillRect(x, y, 1, 1); }
          else if (r > 0.75) { c.fillStyle = '#6b4b2c'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // 6. LEAVES
    this.paintTile(TILES.LEAVES, (c) => {
      const rand = this.seededRandom(707);
      c.fillStyle = '#2d5e1e';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#498c31'; c.fillRect(x, y, 1, 1); }
          else if (r > 0.6) { c.fillStyle = '#397526'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#1c3e12'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.1) { c.clearRect(x, y, 1, 1); }
        }
      }
    });

    // 7. SAND
    this.paintTile(TILES.SAND, (c) => {
      const rand = this.seededRandom(808);
      c.fillStyle = '#d6c68b';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.82) { c.fillStyle = '#e8dca4'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#beaf73'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // 8. WATER
    this.paintTile(TILES.WATER, (c) => {
      c.fillStyle = 'rgba(32, 98, 204, 0.75)';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = 'rgba(80, 155, 255, 0.5)';
      c.fillRect(1, 3, 6, 1);
      c.fillRect(8, 7, 7, 1);
      c.fillRect(3, 11, 5, 1);
    });

    // 9. GLASS
    this.paintTile(TILES.GLASS, (c) => {
      c.clearRect(0, 0, 16, 16);
      c.fillStyle = 'rgba(215, 238, 255, 0.15)';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = 'rgba(235, 245, 255, 0.8)';
      c.strokeRect(0.5, 0.5, 15, 15);
      c.fillStyle = 'rgba(255, 255, 255, 0.7)';
      c.fillRect(2, 2, 3, 1); c.fillRect(3, 3, 3, 1);
      c.fillRect(11, 11, 2, 1); c.fillRect(12, 12, 2, 1);
    });

    // 10. PLANKS
    this.paintTile(TILES.PLANKS, (c) => {
      c.fillStyle = '#a17849';
      c.fillRect(0, 0, 16, 16);
      for (let p = 0; p < 4; p++) {
        const py = p * 4;
        c.fillStyle = '#614424'; c.fillRect(0, py + 3, 16, 1);
        c.fillStyle = '#b88d59'; c.fillRect(0, py, 16, 1);
        const seamX = (p % 2 === 0) ? 7 : 12;
        c.fillStyle = '#4a331a'; c.fillRect(seamX, py, 1, 3);
      }
    });

    // 11. COBBLESTONE
    this.paintTile(TILES.COBBLESTONE, (c) => {
      c.fillStyle = '#3a3a3a';
      c.fillRect(0, 0, 16, 16);
      const stones = [
        { x: 1, y: 1, w: 6, h: 4 }, { x: 8, y: 1, w: 7, h: 4 },
        { x: 1, y: 6, w: 5, h: 4 }, { x: 7, y: 6, w: 8, h: 4 },
        { x: 1, y: 11, w: 7, h: 4 }, { x: 9, y: 11, w: 6, h: 4 }
      ];
      stones.forEach(s => {
        c.fillStyle = '#7a7a7a'; c.fillRect(s.x, s.y, s.w, s.h);
        c.fillStyle = '#9c9c9c'; c.fillRect(s.x, s.y, s.w, 1); c.fillRect(s.x, s.y, 1, s.h);
        c.fillStyle = '#4f4f4f'; c.fillRect(s.x, s.y + s.h - 1, s.w, 1); c.fillRect(s.x + s.w - 1, s.y, 1, s.h);
      });
    });

    // 12. BRICK
    this.paintTile(TILES.BRICK, (c) => {
      c.fillStyle = '#b8b8b8';
      c.fillRect(0, 0, 16, 16);
      for (let row = 0; row < 4; row++) {
        const y = row * 4 + 1;
        const offset = (row % 2 === 0) ? 0 : 4;
        for (let b = -1; b < 3; b++) {
          const x = b * 8 + offset;
          c.fillStyle = '#9e3b2e'; c.fillRect(Math.max(0, x), y, Math.min(7, 16 - x), 3);
          c.fillStyle = '#b8493a'; c.fillRect(Math.max(0, x), y, Math.min(7, 16 - x), 1);
        }
      }
    });

    // 13. GLOWSTONE
    this.paintTile(TILES.GLOWSTONE, (c) => {
      const rand = this.seededRandom(1414);
      c.fillStyle = '#e8b84d';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#fff4a3'; c.fillRect(x, y, 1, 1); }
          else if (r > 0.5) { c.fillStyle = '#f7d363'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.2) { c.fillStyle = '#b8892a'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // 14. BEDROCK
    this.paintTile(TILES.BEDROCK, (c) => {
      const rand = this.seededRandom(1515);
      c.fillStyle = '#212121';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#424242'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.2) { c.fillStyle = '#0a0a0a'; c.fillRect(x, y, 1, 1); }
        }
      }
    });

    // --- NEW ORE TILES ---
    const paintOre = (tileIdx, oreColors, seed) => {
      this.paintTile(tileIdx, (c) => {
        drawStoneBase(c, seed);
        // Paint speckled mineral deposits
        const deposits = [
          [3, 3, 2, 2], [9, 2, 3, 2], [5, 8, 3, 2], [11, 9, 2, 3],
          [2, 12, 3, 2], [8, 13, 2, 2], [12, 5, 2, 2]
        ];
        deposits.forEach(([ox, oy, w, h]) => {
          c.fillStyle = oreColors.dark; c.fillRect(ox, oy, w, h);
          c.fillStyle = oreColors.main; c.fillRect(ox, oy, w - 1, h - 1);
          c.fillStyle = oreColors.light; c.fillRect(ox, oy, 1, 1);
        });
      });
    };

    // 15. COAL ORE
    paintOre(TILES.COAL_ORE, { dark: '#111111', main: '#2c2c2c', light: '#4d4d4d' }, 1601);

    // 16. IRON ORE
    paintOre(TILES.IRON_ORE, { dark: '#a5876d', main: '#d8af93', light: '#f0d3bc' }, 1602);

    // 17. GOLD ORE
    paintOre(TILES.GOLD_ORE, { dark: '#c79c1e', main: '#fce044', light: '#fff8a6' }, 1603);

    // 18. DIAMOND ORE
    paintOre(TILES.DIAMOND_ORE, { dark: '#2cb5b5', main: '#5ce8e8', light: '#bcfafa' }, 1604);

    // --- BIOME BLOCKS ---
    // 19. SNOW TOP
    this.paintTile(TILES.SNOW_TOP, (c) => {
      c.fillStyle = '#f5f9fc';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#e4edf5';
      c.fillRect(2, 3, 3, 1); c.fillRect(8, 7, 4, 1); c.fillRect(3, 12, 3, 1);
    });

    // 20. SNOW SIDE
    this.paintTile(TILES.SNOW_SIDE, (c) => {
      c.fillStyle = '#7a5433';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#f5f9fc';
      c.fillRect(0, 0, 16, 4);
      c.fillRect(2, 4, 2, 2); c.fillRect(6, 4, 3, 1); c.fillRect(11, 4, 2, 2);
    });

    // 21. SNOW BLOCK
    this.paintTile(TILES.SNOW_BLOCK, (c) => {
      c.fillStyle = '#eef5fa';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#ffffff';
      c.fillRect(1, 1, 5, 5); c.fillRect(8, 9, 6, 5);
      c.fillStyle = '#dbe6f0';
      c.fillRect(0, 15, 16, 1); c.fillRect(15, 0, 1, 16);
    });

    // 22. CACTUS TOP
    this.paintTile(TILES.CACTUS_TOP, (c) => {
      c.fillStyle = '#527d24';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#395719';
      c.strokeRect(1.5, 1.5, 13, 13);
      c.fillStyle = '#73a838';
      c.fillRect(4, 4, 8, 8);
    });

    // 23. CACTUS SIDE
    this.paintTile(TILES.CACTUS_SIDE, (c) => {
      c.fillStyle = '#527d24';
      c.fillRect(0, 0, 16, 16);
      // Vertical dark green ribs
      for (let x = 0; x < 16; x += 4) {
        c.fillStyle = '#395719';
        c.fillRect(x, 0, 1, 16);
        c.fillStyle = '#73a838';
        c.fillRect(x + 1, 0, 2, 16);
      }
      // Spikes
      c.fillStyle = '#1c2e0a';
      c.fillRect(1, 3, 1, 1); c.fillRect(5, 7, 1, 1); c.fillRect(9, 11, 1, 1); c.fillRect(13, 5, 1, 1);
    });

    // 24. BIRCH TOP
    this.paintTile(TILES.BIRCH_TOP, (c) => {
      c.fillStyle = '#dcdcdc';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#c5a777';
      c.fillRect(2, 2, 12, 12);
      c.strokeStyle = '#a48455';
      c.strokeRect(4.5, 4.5, 7, 7);
    });

    // 25. BIRCH SIDE
    this.paintTile(TILES.BIRCH_SIDE, (c) => {
      c.fillStyle = '#e8e8e8';
      c.fillRect(0, 0, 16, 16);
      // Black markings
      c.fillStyle = '#262626';
      c.fillRect(2, 2, 3, 1); c.fillRect(10, 4, 4, 2);
      c.fillRect(3, 8, 4, 1); c.fillRect(8, 11, 3, 1);
      c.fillRect(1, 13, 3, 2); c.fillRect(12, 14, 2, 1);
    });

    // 26. BIRCH LEAVES
    this.paintTile(TILES.BIRCH_LEAVES, (c) => {
      const rand = this.seededRandom(909);
      c.fillStyle = '#5b8731';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.8) { c.fillStyle = '#7db547'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#3f6120'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.1) { c.clearRect(x, y, 1, 1); }
        }
      }
    });

    // --- WORKSTATIONS ---
    // 27. CRAFTING TABLE TOP
    this.paintTile(TILES.CRAFT_TOP, (c) => {
      c.fillStyle = '#a17849';
      c.fillRect(0, 0, 16, 16);
      // 3x3 Grid
      c.fillStyle = '#614424';
      c.strokeRect(1.5, 1.5, 13, 13);
      c.fillRect(5, 2, 1, 12); c.fillRect(10, 2, 1, 12);
      c.fillRect(2, 5, 12, 1); c.fillRect(2, 10, 12, 1);
      c.fillStyle = '#4a331a';
      c.fillRect(2, 2, 3, 3); c.fillRect(7, 7, 2, 2);
    });

    // 28. CRAFTING TABLE SIDE 1 (Saw & Tools)
    this.paintTile(TILES.CRAFT_SIDE1, (c) => {
      c.fillStyle = '#a17849';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#614424';
      c.strokeRect(1.5, 1.5, 13, 13);
      // Hanging Saw
      c.fillStyle = '#b0b0b0';
      c.fillRect(4, 5, 8, 2);
      c.fillStyle = '#7a7a7a';
      c.fillRect(4, 6, 8, 1);
      c.fillStyle = '#543b23';
      c.fillRect(2, 4, 2, 4);
    });

    // 29. CRAFTING TABLE SIDE 2 (Hammer & Pliers)
    this.paintTile(TILES.CRAFT_SIDE2, (c) => {
      c.fillStyle = '#a17849';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#614424';
      c.strokeRect(1.5, 1.5, 13, 13);
      // Hanging Hammer
      c.fillStyle = '#543b23';
      c.fillRect(5, 5, 2, 7);
      c.fillStyle = '#949494';
      c.fillRect(3, 4, 6, 3);
    });

    // 30. FURNACE FRONT (Unlit)
    this.paintTile(TILES.FURNACE_FRONT, (c) => {
      drawStoneBase(c, 7001);
      c.fillStyle = '#3a3a3a';
      c.strokeRect(1.5, 1.5, 13, 13);
      // Arch door
      c.fillStyle = '#1c1c1c';
      c.fillRect(4, 6, 8, 7);
      c.fillRect(5, 5, 6, 1);
      // Grate
      c.fillStyle = '#505050';
      c.fillRect(5, 8, 6, 1); c.fillRect(5, 10, 6, 1);
    });

    // 31. FURNACE FRONT (Lit with fire)
    this.paintTile(TILES.FURNACE_LIT, (c) => {
      drawStoneBase(c, 7001);
      c.fillStyle = '#3a3a3a';
      c.strokeRect(1.5, 1.5, 13, 13);
      // Burning cavity
      c.fillStyle = '#cf3917';
      c.fillRect(4, 6, 8, 7);
      c.fillRect(5, 5, 6, 1);
      // Glowing core
      c.fillStyle = '#fcae1e';
      c.fillRect(5, 7, 6, 4);
      c.fillStyle = '#fff480';
      c.fillRect(6, 8, 4, 2);
    });

    // 32. FURNACE SIDE & 33. FURNACE TOP
    this.paintTile(TILES.FURNACE_SIDE, (c) => drawStoneBase(c, 7002));
    this.paintTile(TILES.FURNACE_TOP, (c) => {
      drawStoneBase(c, 7003);
      c.fillStyle = '#4a4a4a';
      c.strokeRect(2.5, 2.5, 11, 11);
    });

    // 34-36. CHEST
    this.paintTile(TILES.CHEST_TOP, (c) => {
      c.fillStyle = '#8a5e30';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#4a331a';
      c.strokeRect(1.5, 1.5, 13, 13);
    });
    this.paintTile(TILES.CHEST_SIDE, (c) => {
      c.fillStyle = '#8a5e30';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#4a331a';
      c.strokeRect(1.5, 1.5, 13, 13);
      c.fillRect(1, 5, 14, 1); // Lid split
    });
    this.paintTile(TILES.CHEST_FRONT, (c) => {
      c.fillStyle = '#8a5e30';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#4a331a';
      c.strokeRect(1.5, 1.5, 13, 13);
      c.fillRect(1, 5, 14, 1);
      // Metal Latch
      c.fillStyle = '#cccccc';
      c.fillRect(7, 4, 2, 4);
      c.fillStyle = '#555555';
      c.fillRect(7, 5, 2, 1);
    });

    // 37. TORCH
    this.paintTile(TILES.TORCH, (c) => {
      c.clearRect(0, 0, 16, 16);
      // Wooden stick
      c.fillStyle = '#664a2c';
      c.fillRect(7, 6, 2, 9);
      // Coal head
      c.fillStyle = '#262626';
      c.fillRect(7, 5, 2, 2);
      // Glowing flame
      c.fillStyle = '#ff7700';
      c.fillRect(6, 3, 4, 3);
      c.fillStyle = '#ffee44';
      c.fillRect(7, 2, 2, 3);
      c.fillStyle = '#ffffff';
      c.fillRect(7, 3, 1, 1);
    });

    // 38. LAVA
    this.paintTile(TILES.LAVA, (c) => {
      c.fillStyle = '#d94b11';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#ff8811';
      c.fillRect(1, 2, 7, 3); c.fillRect(8, 7, 7, 4); c.fillRect(2, 10, 6, 3);
      c.fillStyle = '#ffcc22';
      c.fillRect(2, 3, 4, 1); c.fillRect(10, 8, 4, 2);
    });

    // 39. OBSIDIAN
    this.paintTile(TILES.OBSIDIAN, (c) => {
      c.fillStyle = '#100c1e';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#22133d';
      c.fillRect(2, 2, 4, 5); c.fillRect(9, 3, 5, 4); c.fillRect(4, 9, 7, 5);
      c.fillStyle = '#3a2066';
      c.fillRect(3, 4, 2, 2); c.fillRect(10, 5, 2, 2); c.fillRect(5, 10, 3, 2);
      c.fillStyle = '#5c33a3';
      c.fillRect(4, 5, 1, 1); c.fillRect(11, 5, 1, 1);
    });

    // 40. TNT_TOP
    this.paintTile(TILES.TNT_TOP, (c) => {
      c.fillStyle = '#b82b1d';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#8f1d13';
      c.strokeRect(0.5, 0.5, 15, 15);
      // Center fuse circle
      c.fillStyle = '#666666';
      c.fillRect(6, 6, 4, 4);
      c.fillStyle = '#e6e6e6';
      c.fillRect(7, 7, 2, 2);
    });

    // 41. TNT_SIDE
    this.paintTile(TILES.TNT_SIDE, (c) => {
      // Red background
      c.fillStyle = '#cc2b1d';
      c.fillRect(0, 0, 16, 16);
      // White TNT text banner in middle
      c.fillStyle = '#f0f0f0';
      c.fillRect(0, 5, 16, 6);
      // TNT dark red pixel text
      c.fillStyle = '#222222';
      // T
      c.fillRect(1, 6, 4, 1); c.fillRect(2, 7, 2, 3);
      // N
      c.fillRect(6, 6, 1, 4); c.fillRect(7, 7, 1, 2); c.fillRect(8, 6, 1, 4);
      // T
      c.fillRect(10, 6, 4, 1); c.fillRect(11, 7, 2, 3);
    });

    // 42. TNT_BOTTOM
    this.paintTile(TILES.TNT_BOTTOM, (c) => {
      c.fillStyle = '#9e2216';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#6e150d';
      c.strokeRect(1, 1, 14, 14);
    });

    // 43. GRAVEL
    this.paintTile(TILES.GRAVEL, (c) => {
      c.fillStyle = '#888588';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#6a676b';
      c.fillRect(1, 2, 4, 3); c.fillRect(7, 4, 5, 3); c.fillRect(3, 9, 4, 4); c.fillRect(10, 10, 5, 3);
      c.fillStyle = '#a6a3a7';
      c.fillRect(2, 3, 2, 1); c.fillRect(8, 5, 2, 1); c.fillRect(4, 10, 2, 1);
      c.fillStyle = '#4a474a';
      c.fillRect(6, 2, 1, 2); c.fillRect(2, 14, 2, 1); c.fillRect(13, 8, 2, 1);
    });

    // --- MULTICRAFT SIGNATURE TILES ---
    // 60. MESE ORE
    this.paintTile(TILES.MESE_ORE, (c) => {
      drawStoneBase(c, 1605);
      const deposits = [
        [3, 3, 3, 2], [9, 2, 3, 3], [5, 8, 3, 2], [11, 9, 2, 3],
        [2, 12, 3, 2], [8, 12, 3, 2], [12, 5, 2, 2]
      ];
      deposits.forEach(([ox, oy, w, h]) => {
        c.fillStyle = '#b38600'; c.fillRect(ox, oy, w, h);
        c.fillStyle = '#ffcc00'; c.fillRect(ox, oy, w - 1, h - 1);
        c.fillStyle = '#fff480'; c.fillRect(ox + 1, oy + 1, 1, 1);
      });
    });

    // 61. MESE BLOCK (Golden Crystalline Block)
    this.paintTile(TILES.MESE_BLOCK, (c) => {
      c.fillStyle = '#e6b800';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#ffd733';
      c.fillRect(1, 1, 14, 14);
      c.fillStyle = '#ffea66';
      c.fillRect(2, 2, 12, 12);
      c.fillStyle = '#e6a800';
      c.strokeRect(0.5, 0.5, 15, 15);
      // Crystal facets
      c.fillStyle = '#fff480';
      c.fillRect(3, 3, 4, 4); c.fillRect(9, 9, 4, 4);
      c.fillStyle = '#d49600';
      c.fillRect(9, 3, 4, 4); c.fillRect(3, 9, 4, 4);
      c.fillStyle = '#ffffff';
      c.fillRect(4, 4, 2, 2); c.fillRect(10, 10, 2, 2);
    });

    // 62. JUNGLE WOOD TOP
    this.paintTile(TILES.JUNGLE_WOOD_TOP, (c) => {
      c.fillStyle = '#5c371d';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#7a4a27';
      c.fillRect(2, 2, 12, 12);
      c.fillStyle = '#402410';
      c.strokeRect(4.5, 4.5, 7, 7);
    });

    // 63. JUNGLE WOOD SIDE
    this.paintTile(TILES.JUNGLE_WOOD_SIDE, (c) => {
      c.fillStyle = '#4a2a16';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#5e361d';
      c.fillRect(2, 0, 3, 16); c.fillRect(9, 0, 4, 16);
      c.fillStyle = '#3b2011';
      c.fillRect(0, 0, 1, 16); c.fillRect(6, 0, 2, 16); c.fillRect(14, 0, 2, 16);
    });

    // 64. JUNGLE PLANKS
    this.paintTile(TILES.JUNGLE_PLANKS, (c) => {
      c.fillStyle = '#784c28';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#543317';
      c.fillRect(0, 3, 16, 1); c.fillRect(0, 7, 16, 1); c.fillRect(0, 11, 16, 1); c.fillRect(0, 15, 16, 1);
      c.fillStyle = '#8c5a31';
      c.fillRect(2, 1, 4, 2); c.fillRect(8, 5, 5, 2); c.fillRect(1, 9, 6, 2); c.fillRect(10, 13, 4, 2);
    });

    // 65. JUNGLE LEAVES
    this.paintTile(TILES.JUNGLE_LEAVES, (c) => {
      const rand = this.seededRandom(7788);
      c.fillStyle = '#2d7a22';
      c.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const r = rand();
          if (r > 0.75) { c.fillStyle = '#3da32f'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.25) { c.fillStyle = '#1e5416'; c.fillRect(x, y, 1, 1); }
          else if (r > 0.65 && (x + y) % 3 === 0) { c.fillStyle = '#4fc93e'; c.fillRect(x, y, 1, 1); }
          else if (r < 0.08) { c.clearRect(x, y, 1, 1); }
        }
      }
    });

    // 66. SANDSTONE TOP
    this.paintTile(TILES.SANDSTONE_TOP, (c) => {
      c.fillStyle = '#d4bf88';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#e2ce9a';
      c.fillRect(2, 2, 4, 3); c.fillRect(9, 7, 5, 4);
      c.fillStyle = '#c7b075';
      c.fillRect(7, 2, 3, 2); c.fillRect(3, 11, 4, 2);
    });

    // 67. SANDSTONE SIDE
    this.paintTile(TILES.SANDSTONE_SIDE, (c) => {
      c.fillStyle = '#d4bf88';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#c7b075';
      c.fillRect(0, 3, 16, 2); c.fillRect(0, 9, 16, 3);
      c.fillStyle = '#bfa565';
      c.fillRect(0, 13, 16, 3);
    });

    // 68. SANDSTONE BOTTOM
    this.paintTile(TILES.SANDSTONE_BOTTOM, (c) => {
      c.fillStyle = '#bfa565';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#a89050';
      c.strokeRect(1.5, 1.5, 13, 13);
    });

    // 69. SANDSTONE BRICK
    this.paintTile(TILES.SANDSTONE_BRICK, (c) => {
      c.fillStyle = '#d4bf88';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#a89050';
      c.fillRect(0, 3, 16, 1); c.fillRect(0, 7, 16, 1); c.fillRect(0, 11, 16, 1); c.fillRect(0, 15, 16, 1);
      c.fillRect(7, 0, 1, 3); c.fillRect(3, 4, 1, 3); c.fillRect(11, 4, 1, 3);
      c.fillRect(7, 8, 1, 3); c.fillRect(3, 12, 1, 3); c.fillRect(11, 12, 1, 3);
    });

    // 70. PAPYRUS
    this.paintTile(TILES.PAPYRUS, (c) => {
      c.clearRect(0, 0, 16, 16);
      c.fillStyle = '#48a034'; c.fillRect(3, 0, 3, 16);
      c.fillStyle = '#64c94b'; c.fillRect(4, 0, 1, 16);
      c.fillStyle = '#2e6b20'; c.fillRect(3, 5, 3, 1); c.fillRect(3, 11, 3, 1);
      c.fillStyle = '#48a034'; c.fillRect(10, 0, 3, 16);
      c.fillStyle = '#64c94b'; c.fillRect(11, 0, 1, 16);
      c.fillStyle = '#2e6b20'; c.fillRect(10, 3, 3, 1); c.fillRect(10, 9, 3, 1); c.fillRect(10, 14, 3, 1);
    });

    // 71. BOOKSHELF
    this.paintTile(TILES.BOOKSHELF, (c) => {
      c.fillStyle = '#8a5e30';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#543b23';
      c.strokeRect(0.5, 0.5, 15, 15);
      c.fillRect(0, 7, 16, 2);
      const bookColors = ['#992222', '#224499', '#228833', '#b8860b', '#7b1fa2'];
      let bx = 2;
      for (let i = 0; i < 4; i++) {
        c.fillStyle = bookColors[i % bookColors.length];
        c.fillRect(bx, 2, 2, 5);
        c.fillStyle = '#ffffff'; c.fillRect(bx, 3, 2, 1);
        bx += 3;
      }
      bx = 2;
      for (let i = 0; i < 4; i++) {
        c.fillStyle = bookColors[(i + 2) % bookColors.length];
        c.fillRect(bx, 10, 2, 5);
        c.fillStyle = '#e6b800'; c.fillRect(bx, 12, 2, 1);
        bx += 3;
      }
    });

    // 72. STEEL BLOCK
    this.paintTile(TILES.STEEL_BLOCK, (c) => {
      c.fillStyle = '#a6b5c0';
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#d2dce3';
      c.fillRect(1, 1, 14, 14);
      c.fillStyle = '#7a8c99';
      c.strokeRect(0.5, 0.5, 15, 15);
      c.fillStyle = '#b0bfc9';
      c.fillRect(3, 3, 10, 10);
      c.fillStyle = '#647480';
      c.strokeRect(2.5, 2.5, 11, 11);
      c.fillStyle = '#404c54';
      c.fillRect(1, 1, 1, 1); c.fillRect(14, 1, 1, 1);
      c.fillRect(1, 14, 1, 1); c.fillRect(14, 14, 1, 1);
    });

    // --- 10 CRACK STAGES (TILES 48 TO 57) ---
    for (let stage = 0; stage < 10; stage++) {
      this.paintTile(TILES.CRACK_0 + stage, (c) => {
        c.clearRect(0, 0, 16, 16);
        c.fillStyle = 'rgba(0, 0, 0, 0.75)';
        const count = (stage + 1) * 3;
        const rand = this.seededRandom(9990 + stage);
        for (let i = 0; i < count; i++) {
          const x = Math.floor(rand() * 14) + 1;
          const y = Math.floor(rand() * 14) + 1;
          const len = Math.floor(rand() * (stage + 2)) + 1;
          c.fillRect(x, y, (i % 2 === 0 ? len : 1), (i % 2 === 0 ? 1 : len));
        }
      });
    }
  }

  createThreeTextures() {
    this.atlasTexture = new THREE.CanvasTexture(this.canvas);
    this.atlasTexture.magFilter = THREE.NearestFilter;
    this.atlasTexture.minFilter = THREE.NearestFilter;
    this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.atlasTexture.needsUpdate = true;
  }

  getTileUVs(tileIndex) {
    const col = tileIndex % ATLAS_TILES_PER_ROW;
    const row = Math.floor(tileIndex / ATLAS_TILES_PER_ROW);

    const uMin = col / ATLAS_TILES_PER_ROW;
    const uMax = (col + 1) / ATLAS_TILES_PER_ROW;
    const vMax = 1.0 - (row / ATLAS_TILES_PER_ROW);
    const vMin = 1.0 - ((row + 1) / ATLAS_TILES_PER_ROW);

    return { uMin, vMin, uMax, vMax };
  }

  getBlockTileIndex(blockId, face) {
    const def = BLOCK_DEFS[blockId];
    if (!def || !def.tiles) return 0;
    if (def.tiles.all !== undefined) return def.tiles.all;
    if (face === 'top') return def.tiles.top !== undefined ? def.tiles.top : def.tiles.side;
    if (face === 'bottom') return def.tiles.bottom !== undefined ? def.tiles.bottom : def.tiles.side;
    if (face === 'front') return def.tiles.front !== undefined ? def.tiles.front : def.tiles.side;
    return def.tiles.side !== undefined ? def.tiles.side : 0;
  }

  generateIcons() {
    // Blocks
    for (const [idStr, def] of Object.entries(BLOCK_DEFS)) {
      const id = parseInt(idStr, 10);
      if (id === BLOCK.AIR) continue;

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 40;
      iconCanvas.height = 40;
      const ictx = iconCanvas.getContext('2d');
      ictx.imageSmoothingEnabled = false;

      const sideTile = this.getBlockTileIndex(id, 'side');
      const col = sideTile % ATLAS_TILES_PER_ROW;
      const row = Math.floor(sideTile / ATLAS_TILES_PER_ROW);

      ictx.drawImage(
        this.canvas,
        col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE,
        4, 4, 32, 32
      );

      ictx.strokeStyle = 'rgba(0,0,0,0.4)';
      ictx.lineWidth = 2;
      ictx.strokeRect(4, 4, 32, 32);

      this.blockIcons[id] = iconCanvas.toDataURL();
    }

    // Tools & Items
    for (const [itemIdStr, def] of Object.entries(ITEM_DEFS)) {
      const id = parseInt(itemIdStr, 10);
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 40;
      iconCanvas.height = 40;
      const c = iconCanvas.getContext('2d');
      c.imageSmoothingEnabled = false;

      // Draw pixel-art items
      if (def.type === 'pickaxe') {
        const headColor = id === ITEM.WOODEN_PICKAXE ? '#a17849' :
          (id === ITEM.STONE_PICKAXE ? '#888888' :
          (id === ITEM.IRON_PICKAXE ? '#e8e8e8' :
          (id === ITEM.MESE_PICKAXE ? '#ffe033' : '#5ce8e8')));
        // Stick
        c.fillStyle = '#664a2c';
        c.fillRect(8, 28, 4, 4); c.fillRect(12, 24, 4, 4);
        c.fillRect(16, 20, 4, 4); c.fillRect(20, 16, 4, 4);
        // Head
        c.fillStyle = headColor;
        c.fillRect(14, 6, 18, 5); c.fillRect(28, 11, 5, 6); c.fillRect(10, 10, 5, 5);
        if (id === ITEM.MESE_PICKAXE) {
          c.fillStyle = '#fff9a6';
          c.fillRect(16, 7, 8, 3);
        }
      } else if (def.type === 'sword') {
        const bladeColor = id === ITEM.WOODEN_SWORD ? '#a17849' :
          (id === ITEM.STONE_SWORD ? '#888888' :
          (id === ITEM.IRON_SWORD ? '#e8e8e8' :
          (id === ITEM.MESE_SWORD ? '#ffe033' : '#5ce8e8')));
        // Handle
        c.fillStyle = '#664a2c'; c.fillRect(8, 28, 5, 5);
        // Guard
        c.fillStyle = '#c5a777'; c.fillRect(11, 23, 7, 3); c.fillRect(14, 21, 3, 7);
        // Blade
        c.fillStyle = bladeColor;
        c.fillRect(16, 16, 5, 5); c.fillRect(20, 12, 5, 5); c.fillRect(24, 8, 5, 5); c.fillRect(28, 4, 4, 4);
        if (id === ITEM.MESE_SWORD) {
          c.fillStyle = '#fff9a6';
          c.fillRect(18, 14, 3, 3); c.fillRect(22, 10, 3, 3);
        }
      } else if (def.type === 'axe') {
        const headColor = id === ITEM.WOODEN_AXE ? '#a17849' :
          (id === ITEM.STONE_AXE ? '#888888' :
          (id === ITEM.IRON_AXE ? '#e8e8e8' : '#5ce8e8'));
        c.fillStyle = '#664a2c';
        c.fillRect(8, 28, 4, 4); c.fillRect(12, 24, 4, 4);
        c.fillRect(16, 20, 4, 4); c.fillRect(20, 16, 4, 4);
        c.fillStyle = headColor;
        c.fillRect(16, 8, 12, 10); c.fillRect(24, 18, 5, 4);
      } else if (def.type === 'shovel') {
        const headColor = id === ITEM.WOODEN_SHOVEL ? '#a17849' :
          (id === ITEM.STONE_SHOVEL ? '#888888' :
          (id === ITEM.IRON_SHOVEL ? '#e8e8e8' : '#5ce8e8'));
        c.fillStyle = '#664a2c';
        c.fillRect(6, 30, 4, 4); c.fillRect(10, 26, 4, 4);
        c.fillRect(14, 22, 4, 4); c.fillRect(18, 18, 4, 4);
        c.fillStyle = headColor;
        c.fillRect(22, 8, 10, 10); c.fillRect(24, 6, 6, 2);
      } else if (id === ITEM.BOW) {
        c.fillStyle = '#664a2c';
        c.fillRect(6, 12, 4, 16); c.fillRect(10, 8, 4, 4); c.fillRect(10, 28, 4, 4);
        c.fillRect(14, 6, 8, 3); c.fillRect(14, 31, 8, 3);
        c.fillStyle = '#e0e0e0';
        c.fillRect(22, 8, 1, 24);
      } else if (id === ITEM.ARROW) {
        c.fillStyle = '#e0e0e0';
        c.fillRect(26, 6, 6, 6); // Flint tip
        c.fillStyle = '#664a2c';
        c.fillRect(12, 18, 14, 3); // Shaft
        c.fillStyle = '#f5f5f5';
        c.fillRect(6, 22, 6, 6); // Feather fletching
      } else if (id === ITEM.FLINT_AND_STEEL) {
        c.fillStyle = '#444444'; c.fillRect(8, 20, 10, 12);
        c.fillStyle = '#e8e8e8'; c.fillRect(16, 12, 12, 16);
        c.fillStyle = '#ffaa00'; c.fillRect(20, 10, 4, 4);
      } else if (id === ITEM.FLINT) {
        c.fillStyle = '#333338'; c.fillRect(10, 12, 18, 18);
        c.fillStyle = '#1e1e24'; c.fillRect(14, 14, 10, 10);
      } else if (id === ITEM.GUNPOWDER) {
        c.fillStyle = '#555555'; c.fillRect(8, 14, 22, 16);
        c.fillStyle = '#777777'; c.fillRect(12, 10, 14, 6);
      } else if (id === ITEM.STRING) {
        c.fillStyle = '#eeeeee';
        c.fillRect(8, 10, 20, 2); c.fillRect(12, 16, 18, 2); c.fillRect(10, 22, 16, 2);
      } else if (id === ITEM.BONE) {
        c.fillStyle = '#eaeaea';
        c.fillRect(8, 26, 6, 6); c.fillRect(26, 8, 6, 6);
        c.fillRect(12, 14, 16, 6);
      } else if (id === ITEM.SPIDER_EYE) {
        c.fillStyle = '#991122'; c.fillRect(12, 12, 16, 16);
        c.fillStyle = '#ff2244'; c.fillRect(15, 15, 6, 6);
      } else if (id === ITEM.APPLE) {
        c.fillStyle = '#e61e1e'; c.fillRect(10, 12, 20, 20);
        c.fillStyle = '#558822'; c.fillRect(18, 6, 4, 6); // Leaf/stem
      } else if (id === ITEM.RAW_PORKCHOP) {
        c.fillStyle = '#e88888'; c.fillRect(8, 10, 24, 20);
        c.fillStyle = '#ffffff'; c.fillRect(12, 14, 6, 6);
      } else if (id === ITEM.COOKED_PORKCHOP) {
        c.fillStyle = '#9e5030'; c.fillRect(8, 10, 24, 20);
        c.fillStyle = '#d89060'; c.fillRect(12, 14, 8, 6);
      } else if (id === ITEM.ROTTEN_FLESH) {
        c.fillStyle = '#6b4c1b'; c.fillRect(8, 10, 24, 20);
        c.fillStyle = '#8f2020'; c.fillRect(12, 14, 8, 6);
      } else if (def.type === 'armor') {
        const matColor = id >= ITEM.DIAMOND_HELMET ? '#5ce8e8' : '#e0e0e0';
        const darkColor = id >= ITEM.DIAMOND_HELMET ? '#2cb8b8' : '#999999';
        c.fillStyle = matColor;
        if (def.armorSlot === 'helmet') {
          c.fillRect(8, 8, 24, 20);
          c.clearRect(14, 18, 12, 10);
        } else if (def.armorSlot === 'chestplate') {
          c.fillRect(6, 6, 28, 26);
          c.clearRect(14, 6, 12, 10);
          c.fillStyle = darkColor;
          c.fillRect(16, 18, 8, 12);
        } else if (def.armorSlot === 'leggings') {
          c.fillRect(8, 6, 24, 28);
          c.clearRect(16, 14, 8, 20);
        } else if (def.armorSlot === 'boots') {
          c.fillRect(6, 12, 10, 20); c.fillRect(24, 12, 10, 20);
          c.fillRect(4, 26, 12, 6); c.fillRect(24, 26, 12, 6);
        }
      } else if (id === ITEM.STICK) {
        c.fillStyle = '#664a2c';
        c.fillRect(6, 30, 4, 4); c.fillRect(10, 26, 4, 4);
        c.fillRect(14, 22, 4, 4); c.fillRect(18, 18, 4, 4);
        c.fillRect(22, 14, 4, 4); c.fillRect(26, 10, 4, 4);
      } else if (id === ITEM.COAL) {
        c.fillStyle = '#111111';
        c.fillRect(10, 12, 20, 18); c.fillStyle = '#333333'; c.fillRect(12, 14, 8, 8);
      } else if (id === ITEM.IRON_INGOT) {
        c.fillStyle = '#e0e0e0';
        c.fillRect(8, 14, 24, 12); c.fillStyle = '#ffffff'; c.fillRect(9, 15, 22, 2);
      } else if (id === ITEM.GOLD_INGOT) {
        c.fillStyle = '#facc15';
        c.fillRect(8, 14, 24, 12); c.fillStyle = '#fef08a'; c.fillRect(9, 15, 22, 2);
      } else if (id === ITEM.DIAMOND) {
        c.fillStyle = '#5ce8e8';
        c.fillRect(12, 10, 16, 20); c.fillStyle = '#ffffff'; c.fillRect(14, 12, 4, 4);
      } else if (id === ITEM.MESE_CRYSTAL) {
        // MultiCraft Mese Crystal
        c.fillStyle = '#ffcc00';
        c.fillRect(14, 8, 12, 24); c.fillRect(8, 14, 24, 12);
        c.fillStyle = '#ffea66';
        c.fillRect(12, 12, 16, 16);
        c.fillStyle = '#ffffff';
        c.fillRect(16, 14, 6, 6);
        c.fillStyle = '#cc9900';
        c.fillRect(14, 28, 12, 4); c.fillRect(28, 14, 4, 12);
      } else if (id === ITEM.PAPER) {
        c.fillStyle = '#e8ecef';
        c.fillRect(10, 8, 20, 24); c.fillStyle = '#ffffff'; c.fillRect(12, 10, 16, 20);
        c.fillStyle = '#a0aab2'; c.fillRect(14, 14, 12, 2); c.fillRect(14, 18, 12, 2); c.fillRect(14, 22, 8, 2);
      } else if (id === ITEM.BOOK) {
        c.fillStyle = '#8b261b';
        c.fillRect(10, 8, 20, 24); c.fillStyle = '#e8ecef'; c.fillRect(12, 10, 16, 20);
        c.fillStyle = '#e6b800'; c.fillRect(8, 8, 4, 24); // Gold spine
        c.fillStyle = '#ff3333'; c.fillRect(18, 26, 4, 8); // Red bookmark ribbon
      } else {
        // Generic icon badge
        c.fillStyle = '#e8b84d';
        c.fillRect(12, 12, 16, 16);
      }

      this.itemIcons[id] = iconCanvas.toDataURL();
    }
  }

  getIconDataURL(blockOrItemId, isItem = false) {
    if (isItem) {
      return this.itemIcons[blockOrItemId] || '';
    }
    return this.blockIcons[blockOrItemId] || '';
  }
}
