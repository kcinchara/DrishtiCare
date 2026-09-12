import React, { useState, useEffect } from 'react';
import {
  HardDrive, RefreshCw, CheckCircle2, AlertTriangle,
  Wifi, WifiOff, Trash2, Database, ShieldCheck
} from 'lucide-react';
import { useSync } from '../hooks/useSync';
import { idb } from '../services/indexedDB';
import { SyncQueueItem } from '../types';

export const OfflineSyncPage: React.FC = () => {
  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    triggerSync,
    refreshPendingCount
  } = useSync();

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [totalPatientsCached, setTotalPatientsCached] = useState<number>(0);
  const [totalScreeningsCached, setTotalScreeningsCached] = useState<number>(0);

  useEffect(() => {
    loadLocalStoreData();
  }, [pendingCount]);

  const loadLocalStoreData = async () => {
    try {
      const items = await idb.getAllSyncItems();
      setQueueItems(items);

      const pts = await idb.getAllPatients();
      setTotalPatientsCached(pts.length);

      const scrs = await idb.getAllScreenings();
      setTotalScreeningsCached(scrs.length);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCompleted = async () => {
    await idb.clearSyncedItems();
    await loadLocalStoreData();
    refreshPendingCount();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-teal-600" />
              <span>Offline-First Storage & Synchronization Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Local IndexedDB persistence, conflict resolution, and cloud synchronization queues
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isSimulatedOffline
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSimulatedOffline ? 'Re-enable Network' : 'Simulate Offline Mode'}
            </button>

            <button
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="btn-primary py-2 px-4 text-xs font-bold shadow-sm inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'SYNC ALL NOW'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Connectivity State</div>
          <div className="flex items-center gap-2 mt-2">
            {isOnline ? (
              <span className="badge-success text-xs font-bold">🟢 Connected / Online</span>
            ) : (
              <span className="badge-danger text-xs font-bold">🔴 Disconnected / Offline</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isSimulatedOffline ? 'Simulated via developer toggle' : 'Hardware network status'}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Sync Items</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {pendingCount > 0 ? 'Enqueued in IndexedDB' : 'All synced with server'}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Patients In Local DB</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalPatientsCached}</div>
          <div className="text-[11px] text-slate-400 mt-1">Available fully offline</div>
        </div>

        <div className="card">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Sync Timestamp</div>
          <div className="text-base font-extrabold text-slate-800 mt-1 font-mono">
            {lastSyncTime || 'Pending sync'}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Auto-sync on reconnect active
          </div>
        </div>
      </div>

      {/* Sync Queue Inspector Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Local Synchronization Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspecting records created on device awaiting transmission to district hospital server
            </p>
          </div>
          <button
            onClick={handleClearCompleted}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Synced Logs</span>
          </button>
        </div>

        {queueItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No items in queue. Local IndexedDB is in complete sync with central server.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold uppercase">
                  <th className="py-3 px-4">Queue ID</th>
                  <th className="py-3 px-4">Record Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500">#{item.id || idx + 1}</td>
                    <td className="py-3 px-4 uppercase font-bold text-slate-800">{item.record_type}</td>
                    <td className="py-3 px-4 font-mono text-teal-800 font-semibold">{item.record_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{item.action}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{item.client_timestamp}</td>
                    <td className="py-3 px-4">
                      {item.status === 'SYNCED' ? (
                        <span className="badge-success text-[10px]">Synced ✓</span>
                      ) : item.status === 'PENDING' ? (
                        <span className="badge-warning text-[10px]">Waiting for Sync</span>
                      ) : (
                        <span className="badge-danger text-[10px]">Conflict</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offline Architecture Documentation Box */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-2 text-slate-700">
        <h4 className="font-bold text-teal-950 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <span>Rural Offline-First Architectural Guarantee</span>
        </h4>
        <p className="leading-relaxed">
          The entire screening journey—patient registration, portable fundus image acquisition, image quality verification,
          and triage review—can proceed completely uninterrupted even when cellular signals drop out in remote rural areas.
          Data integrity is maintained using transactional browser IndexedDB stores, with atomic batched transmission
          when network access is restored.
        </p>
      </div>
    </div>
  );
};
