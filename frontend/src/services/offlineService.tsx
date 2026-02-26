import localforage from 'localforage';
import { openDB } from 'idb';

// interface OfflineData {
//   shifts: any[];
//   clockIns: any[];
//   lastSync: Date;
// }

class OfflineService {
  private db: any;
  private store: any;

  constructor() {
    this.initDB();
  }

  async initDB() {
    // Initialize IndexedDB
    this.db = await openDB('WorkforceDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('shifts')) {
          db.createObjectStore('shifts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clockIns')) {
          db.createObjectStore('clockIns', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      }
    });

    // Initialize localForage for metadata
    this.store = localforage.createInstance({
      name: 'workforce',
      storeName: 'metadata'
    });
  }

  async saveShifts(shifts: any[]) {
    const tx = this.db.transaction('shifts', 'readwrite');
    for (const shift of shifts) {
      await tx.store.put(shift);
    }
    await tx.done;
  }

  async getShifts(): Promise<any[]> {
    return await this.db.getAll('shifts');
  }

  async saveClockIn(clockIn: any) {
    const tx = this.db.transaction('clockIns', 'readwrite');
    await tx.store.add({
      ...clockIn,
      synced: false,
      timestamp: new Date().toISOString()
    });
    await tx.done;
  }

  async getUnsyncedClockIns(): Promise<any[]> {
    const all = await this.db.getAll('clockIns');
    return all.filter((item: any) => !item.synced);
  }

  async markAsSynced(ids: number[]) {
    const tx = this.db.transaction('clockIns', 'readwrite');
    for (const id of ids) {
      const item = await tx.store.get(id);
      if (item) {
        item.synced = true;
        await tx.store.put(item);
      }
    }
    await tx.done;
  }

  async saveMetadata(key: string, value: any) {
    await this.store.setItem(key, value);
  }

  async getMetadata(key: string): Promise<any> {
    return await this.store.getItem(key);
  }

  async clearOldData(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const tx = this.db.transaction('clockIns', 'readwrite');
    const all = await tx.store.getAll();
    
    for (const item of all) {
      if (new Date(item.timestamp) < cutoff) {
        await tx.store.delete(item.id);
      }
    }
    await tx.done;
  }
}

export default new OfflineService();