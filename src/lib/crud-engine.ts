import { supabase } from './supabase';
import { db } from './database';
import { addToSyncQueue } from './sync-engine';
import { generateId } from './utils';

// ============================================================
// UNIVERSAL CRUD ENGINE — Direct Supabase Operations
// ============================================================

type SupabaseTable = 'lancamentos' | 'contas' | 'categorias' | 'cartoes' | 'metas';

export interface CrudResult<T = unknown> {
  data: T | null;
  error: string | null;
}

/**
 * Insert a record: writes to IndexedDB (optimistic) + queues sync to Supabase
 */
export async function crudInsert<T extends Record<string, unknown>>(
  tableName: SupabaseTable,
  payload: Partial<T>,
  userId: string,
  tenantId: string,
): Promise<CrudResult<T>> {
  const now = new Date().toISOString();
  const id = generateId();

  const record = {
    id,
    user_id: userId,
    tenant_id: tenantId,
    ...payload,
    created_at: now,
    updated_at: now,
    version: 1,
    sync_status: 'pending',
  } as unknown as T & { id: string; sync_status: string };

  try {
    // Optimistic: write to IndexedDB first
    await db.table(tableName).put(record);

    // Queue for sync
    const { sync_status, last_synced_at, ...syncPayload } = record as Record<string, unknown>;
    await addToSyncQueue(tableName, id, 'insert', syncPayload);

    // Try immediate push to Supabase
    const { error } = await supabase.from(tableName).insert(syncPayload);
    if (!error) {
      await db.table(tableName).update(id, { sync_status: 'synced', last_synced_at: now });
      // Mark queue item as synced
      const queueItems = await db.sync_queue.where({ record_id: id, table_name: tableName }).toArray();
      for (const qi of queueItems) {
        if (qi.id) await db.sync_queue.update(qi.id, { synced: true });
      }
    }

    return { data: record as T, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao inserir';
    console.error(`[CRUD] Insert ${tableName} error:`, msg);
    return { data: null, error: msg };
  }
}

/**
 * Update a record: patches IndexedDB + queues sync
 */
export async function crudUpdate<T extends Record<string, unknown>>(
  tableName: SupabaseTable,
  id: string,
  changes: Partial<T>,
): Promise<CrudResult<T>> {
  const now = new Date().toISOString();
  const patchedChanges = { ...changes, updated_at: now };

  try {
    // Get current version
    const existing = await db.table(tableName).get(id);
    const newVersion = (existing?.version || 0) + 1;

    await db.table(tableName).update(id, {
      ...patchedChanges,
      version: newVersion,
      sync_status: 'pending',
    });

    const syncPayload = { ...patchedChanges, version: newVersion };
    await addToSyncQueue(tableName, id, 'update', syncPayload as Record<string, unknown>);

    // Try immediate push
    const { error } = await supabase.from(tableName).update(syncPayload).eq('id', id);
    if (!error) {
      await db.table(tableName).update(id, { sync_status: 'synced', last_synced_at: now });
    }

    const updated = await db.table(tableName).get(id);
    return { data: updated as T, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
    console.error(`[CRUD] Update ${tableName} error:`, msg);
    return { data: null, error: msg };
  }
}

/**
 * Soft-delete a record
 */
export async function crudDelete(
  tableName: SupabaseTable,
  id: string,
): Promise<CrudResult> {
  const now = new Date().toISOString();

  try {
    await db.table(tableName).update(id, {
      deleted_at: now,
      updated_at: now,
      sync_status: 'pending',
    });

    await addToSyncQueue(tableName, id, 'delete', { deleted_at: now, updated_at: now });

    // Try immediate push
    const { error } = await supabase.from(tableName).update({ deleted_at: now, updated_at: now }).eq('id', id);
    if (!error) {
      await db.table(tableName).update(id, { sync_status: 'synced' });
    }

    return { data: null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao excluir';
    console.error(`[CRUD] Delete ${tableName} error:`, msg);
    return { data: null, error: msg };
  }
}

// ============================================================
// EXPORT UTILITIES
// ============================================================

/**
 * Export data array to CSV and trigger download
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string, columns?: { key: string; label: string }[]): void {
  if (!data.length) return;

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => `"${c.label}"`).join(',');

  const rows = data.map(row =>
    cols.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );

  const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Print-friendly view of data
 */
export function printTable(title: string, data: Record<string, unknown>[], columns: { key: string; label: string }[]): void {
  const style = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 24px; }
      h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #0f172a; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      @media print { body { padding: 0; } }
    </style>
  `;

  const headerRow = columns.map(c => `<th>${c.label}</th>`).join('');
  const bodyRows = data.map(row =>
    '<tr>' + columns.map(c => {
      const val = row[c.key];
      return `<td>${val !== null && val !== undefined ? String(val) : ''}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html><head><title>${title}</title>${style}</head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Gerado em ${new Date().toLocaleString('pt-BR')} · ${data.length} registro(s)</p>
      <table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
      <div class="footer">Control GP · Sistema de Gestão Empresarial</div>
    </body></html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}
