import { useState, useEffect, useCallback } from 'react';
import { idb } from '../services/indexedDB';
import { api } from '../services/api';
import { SyncQueueItem } from '../types';

export function useSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(
    localStorage.getItem('retinal_simulated_offline') === 'true'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Effective status considers both physical connection and user simulation
  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Refresh count of items waiting for sync
  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await idb.getPendingSyncItems();
      setPendingCount(items.length);
    } catch (e) {
      console.error('Failed to read sync queue:', e);
    }
  }, []);

  // Trigger push synchronization
  const triggerSync = useCallback(async () => {
    if (!effectiveOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      const items = await idb.getPendingSyncItems();
      if (items.length === 0) {
        setIsSyncing(false);
        return;
      }

      setSyncToast(`Syncing ${items.length} records...`);

      const result = await api.pushSyncItems(items);

      // Mark items complete in IndexedDB
      for (const item of items) {
        if (item.id) {
          await idb.markSyncItemComplete(item.id);
        }
      }

      setPendingCount(0);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncToast('Sync Complete ✓');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncToast('Sync failed — data remains safe locally.');
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  }, [effectiveOnline, isSyncing]);

  // Toggle simulation for demonstration purposes
  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      localStorage.setItem('retinal_simulated_offline', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        triggerSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isSimulatedOffline, triggerSync, refreshPendingCount]);

  return {
    isOnline: effectiveOnline,
    rawOnline: isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncToast,
    triggerSync,
    refreshPendingCount
  };
}
