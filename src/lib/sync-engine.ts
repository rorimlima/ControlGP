import { supabase } from './supabase';
import { db, type SyncQueueItem, clearAllLocalData } from './database';

// ============================================================
// SYNC ENGINE — DELTA SYNC + CONFLICT RESOLUTION
// ============================================================

const SYNC_TABLES = ['lancamentos', 'contas', 'categorias', 'cartoes', 'metas', 'pessoas'] as const;
type SyncTable = typeof SYNC_TABLES[number];

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

// Track which user owns the current local cache
let currentSyncUserId: string | null = null;

// Get the current authenticated user ID
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// Get last sync timestamp for a table
async function getLastSync(tableName: string): Promise<string | null> {
  const meta = await db.sync_meta.where('table_name').equals(tableName).first();
  return meta?.last_synced_at || null;
}

// Update last sync timestamp
async function setLastSync(tableName: string, timestamp: string): Promise<void> {
  const existing = await db.sync_meta.where('table_name').equals(tableName).first();
  if (existing) {
    await db.sync_meta.update(existing.id!, { last_synced_at: timestamp });
  } else {
    await db.sync_meta.add({ table_name: tableName, last_synced_at: timestamp });
  }
}

// ============================================================
// DELTA SYNC — Pull changes from server
// ============================================================
export async function pullChanges(tableName: SyncTable): Promise<number> {
  const lastSync = await getLastSync(tableName);
  
  let query = supabase.from(tableName).select('*');
  
  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  } else {
    // First sync for this table — clear any stale local data
    await db.table(tableName).clear();
  }

  const { data, error } = await query.order('updated_at', { ascending: true });
  
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const table = db.table(tableName);
  
  for (const record of data) {
    const existing = await table.get(record.id);
    
    if (existing) {
      // Last Write Wins — server always wins on pull
      if (existing.sync_status === 'pending') {
        // Local has unpushed changes — check version
        if (record.version > existing.version) {
          // Server is newer — server wins
          await table.put({ ...record, sync_status: 'synced', last_synced_at: new Date().toISOString() });
        }
        // else: local is newer or same — keep local, it will be pushed
      } else {
        await table.put({ ...record, sync_status: 'synced', last_synced_at: new Date().toISOString() });
      }
    } else {
      await table.put({ ...record, sync_status: 'synced', last_synced_at: new Date().toISOString() });
    }
  }

  // Update sync timestamp
  const latestRecord = data[data.length - 1];
  await setLastSync(tableName, latestRecord.updated_at);

  return data.length;
}

// ============================================================
// PUSH CHANGES — Send local mutations to server
// ============================================================
export async function pushChanges(): Promise<number> {
  const pendingItems = await db.sync_queue
    .where('synced')
    .equals(0)
    .and(item => item.retry_count < MAX_RETRIES)
    .toArray();

  if (pendingItems.length === 0) return 0;

  let successCount = 0;

  for (const item of pendingItems) {
    try {
      await processSyncItem(item);
      await db.sync_queue.update(item.id!, { synced: true });
      successCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await db.sync_queue.update(item.id!, {
        retry_count: item.retry_count + 1,
        error: errorMsg,
      });
    }
  }

  return successCount;
}

async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const { table_name, action, payload, record_id } = item;

  switch (action) {
    case 'insert': {
      const { error } = await supabase.from(table_name).insert(payload);
      if (error) throw error;
      // Mark local record as synced
      await db.table(table_name).update(record_id, { sync_status: 'synced', last_synced_at: new Date().toISOString() });
      break;
    }
    case 'update': {
      const { error } = await supabase.from(table_name).update(payload).eq('id', record_id);
      if (error) throw error;
      await db.table(table_name).update(record_id, { sync_status: 'synced', last_synced_at: new Date().toISOString() });
      break;
    }
    case 'delete': {
      // Soft delete
      const { error } = await supabase.from(table_name).update({ deleted_at: new Date().toISOString() }).eq('id', record_id);
      if (error) throw error;
      await db.table(table_name).update(record_id, { sync_status: 'synced', deleted_at: new Date().toISOString() });
      break;
    }
  }
}

// ============================================================
// FULL SYNC — Pull all + push all
// ============================================================
export async function fullSync(): Promise<{ pulled: number; pushed: number }> {
  let totalPulled = 0;
  let totalPushed = 0;

  // Verify current user — if user changed, wipe local cache entirely
  const userId = await getCurrentUserId();
  if (!userId) return { pulled: 0, pushed: 0 };

  const cachedUserId = localStorage.getItem('cgp_sync_owner');
  if (cachedUserId && cachedUserId !== userId) {
    console.warn('[Sync] User changed — clearing all local data');
    await clearAllLocalData();
    localStorage.setItem('cgp_sync_owner', userId);
    currentSyncUserId = userId;
  } else if (!cachedUserId) {
    // First time — clear just in case there's orphan data
    await clearAllLocalData();
    localStorage.setItem('cgp_sync_owner', userId);
    currentSyncUserId = userId;
  } else {
    currentSyncUserId = userId;
  }

  // Push first (local changes take priority)
  totalPushed = await pushChanges();

  // Then pull
  for (const table of SYNC_TABLES) {
    try {
      const pulled = await pullChanges(table);
      totalPulled += pulled;
    } catch (error) {
      console.error(`[Sync] Error pulling ${table}:`, error);
    }
  }

  return { pulled: totalPulled, pushed: totalPushed };
}

// ============================================================
// ADD TO SYNC QUEUE
// ============================================================
export async function addToSyncQueue(
  tableName: string,
  recordId: string,
  action: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>
): Promise<void> {
  await db.sync_queue.add({
    table_name: tableName,
    record_id: recordId,
    action,
    payload,
    synced: false,
    retry_count: 0,
    created_at: new Date().toISOString(),
  });
}

// ============================================================
// AUTO SYNC — runs periodically
// ============================================================
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000): void {
  if (syncInterval) return;
  
  syncInterval = setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      await fullSync();
    } catch (error) {
      console.error('[AutoSync] Error:', error);
    }
  }, intervalMs);

  // Also sync when coming back online
  window.addEventListener('online', async () => {
    try {
      await fullSync();
    } catch (error) {
      console.error('[AutoSync] Online sync error:', error);
    }
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
