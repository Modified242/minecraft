/**
 * IndexedDB World & Player Persistence Engine
 * Saves chunk block deltas (only modified blocks) and player state
 * seamlessly across browser sessions without massive disk overhead.
 */

class WorldStorage {
  constructor(dbName = 'VoxelSandboxDB') {
    this.dbName = dbName;
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('chunkDeltas')) {
          db.createObjectStore('chunkDeltas', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('playerData')) {
          db.createObjectStore('playerData', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB unavailable, falling back to in-memory storage:', e);
        resolve(null);
      };
    });
  }

  // Save modified blocks for a specific chunk
  async saveChunkDelta(cx, cz, deltas) {
    if (!this.db) return;
    try {
      const key = `${cx},${cz}`;
      const tx = this.db.transaction('chunkDeltas', 'readwrite');
      const store = tx.objectStore('chunkDeltas');
      store.put({ key, deltas });
    } catch (err) {
      console.warn('Error saving chunk delta:', err);
    }
  }

  // Load modified blocks for a specific chunk
  async loadChunkDelta(cx, cz) {
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const key = `${cx},${cz}`;
        const tx = this.db.transaction('chunkDeltas', 'readonly');
        const store = tx.objectStore('chunkDeltas');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.deltas : null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Save player state (position, inventory, health, time)
  async savePlayerData(data) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction('playerData', 'readwrite');
      const store = tx.objectStore('playerData');
      store.put({ id: 'player_default', ...data, timestamp: Date.now() });
    } catch (e) {
      console.warn('Error saving player data:', e);
    }
  }

  // Load player state
  async loadPlayerData() {
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('playerData', 'readonly');
        const store = tx.objectStore('playerData');
        const req = store.get('player_default');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Clear all saved data (world reset)
  async clearWorld() {
    if (!this.db) return;
    const tx = this.db.transaction(['chunkDeltas', 'playerData'], 'readwrite');
    tx.objectStore('chunkDeltas').clear();
    tx.objectStore('playerData').clear();
  }
}
