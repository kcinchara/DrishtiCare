import { Patient, ScreeningDetail, SyncQueueItem } from '../types';

const DB_NAME = 'RetinalEdgeTriageDB';
const DB_VERSION = 2;

export interface OfflineRetinalImage {
  id?: number;
  screening_id: string;
  dataUrl: string; // Base64 representation of captured fundus image
  filename: string;
  eye: string;
  timestamp: string;
}

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('patients')) {
          const store = db.createObjectStore('patients', { keyPath: 'patient_id' });
          store.createIndex('full_name', 'full_name', { unique: false });
        }

        if (!db.objectStoreNames.contains('screenings')) {
          const store = db.createObjectStore('screenings', { keyPath: 'screening_id' });
          store.createIndex('patient_id', 'patient_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline_images')) {
          const store = db.createObjectStore('offline_images', { keyPath: 'screening_id' });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private getActiveUserId(providedUserId?: number): number | null {
    if (providedUserId !== undefined) return providedUserId;
    try {
      const u = localStorage.getItem('retinal_user');
      return u ? JSON.parse(u).id : null;
    } catch {
      return null;
    }
  }

  // --- Patients Store ---
  async savePatient(patient: Patient, userId?: number): Promise<void> {
    const db = await this.getDB();
    const uid = this.getActiveUserId(userId);
    if (uid && !patient.owner_user_id) {
      patient.owner_user_id = uid;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readwrite');
      tx.objectStore('patients').put(patient);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPatient(patient_id: string): Promise<Patient | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readonly');
      const req = tx.objectStore('patients').get(patient_id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllPatients(userId?: number): Promise<Patient[]> {
    const db = await this.getDB();
    const uid = this.getActiveUserId(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readonly');
      const req = tx.objectStore('patients').getAll();
      req.onsuccess = () => {
        const all: Patient[] = req.result || [];
        if (uid) {
          // Strict user isolation
          resolve(all.filter((p) => p.owner_user_id === uid));
        } else {
          resolve(all);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Screenings Store ---
  async saveScreening(screening: ScreeningDetail, userId?: number): Promise<void> {
    const db = await this.getDB();
    const uid = this.getActiveUserId(userId);
    if (uid && !(screening as any).performed_by) {
      (screening as any).performed_by = uid;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction('screenings', 'readwrite');
      tx.objectStore('screenings').put(screening);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getScreening(screening_id: string): Promise<ScreeningDetail | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('screenings', 'readonly');
      const req = tx.objectStore('screenings').get(screening_id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllScreenings(userId?: number): Promise<ScreeningDetail[]> {
    const db = await this.getDB();
    const uid = this.getActiveUserId(userId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('screenings', 'readonly');
      const req = tx.objectStore('screenings').getAll();
      req.onsuccess = () => {
        const all: ScreeningDetail[] = req.result || [];
        if (uid) {
          // Strict user isolation
          resolve(all.filter((s: any) => s.performed_by === uid || s.patient?.owner_user_id === uid));
        } else {
          resolve(all);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Offline Images Store ---
  async saveOfflineImage(image: OfflineRetinalImage): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_images', 'readwrite');
      tx.objectStore('offline_images').put(image);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getOfflineImage(screening_id: string): Promise<OfflineRetinalImage | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_images', 'readonly');
      const req = tx.objectStore('offline_images').get(screening_id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Sync Queue Store ---
  async enqueueSync(item: Omit<SyncQueueItem, 'id' | 'status'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const record: SyncQueueItem = {
        ...item,
        status: 'PENDING'
      };
      const req = tx.objectStore('sync_queue').add(record);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const index = store.index('status');
      const req = index.getAll('PENDING');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async markSyncItemComplete(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.status = 'SYNCED';
          store.put(req.result);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearSyncedItems(): Promise<void> {
    const db = await this.getDB();
    const items = await this.getAllSyncItems();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      for (const item of items) {
        if (item.status === 'SYNCED' && item.id) {
          store.delete(item.id);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllSyncItems(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

export const idb = new IndexedDBService();
