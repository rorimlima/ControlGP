import Dexie, { type Table } from 'dexie';

// ============================================================
// LOCAL DATABASE — OFFLINE-FIRST ENGINE
// ============================================================

export interface LocalLancamento {
  id: string;
  tenant_id: string;
  user_id: string;
  tipo: 'receita' | 'despesa' | 'transferencia';
  descricao: string;
  valor: number;
  data_competencia: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  categoria_id?: string;
  subcategoria_id?: string;
  conta_id?: string;
  conta_destino_id?: string;
  cartao_id?: string;
  forma_pagamento?: string;
  parcelado: boolean;
  quantidade_parcelas?: number;
  parcela_atual?: number;
  lancamento_pai_id?: string;
  recorrente: boolean;
  frequencia?: string;
  observacoes?: string;
  anexo_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface LocalConta {
  id: string;
  tenant_id: string;
  user_id: string;
  nome: string;
  banco?: string;
  tipo_conta: string;
  agencia?: string;
  numero_conta?: string;
  saldo_inicial: number;
  saldo_atual: number;
  cor: string;
  icone: string;
  conta_principal: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface LocalCategoria {
  id: string;
  tenant_id: string;
  user_id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone: string;
  categoria_pai_id?: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface LocalCartao {
  id: string;
  tenant_id: string;
  user_id: string;
  nome: string;
  banco?: string;
  bandeira: string;
  limite: number;
  limite_disponivel: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string;
  icone: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface LocalMeta {
  id: string;
  tenant_id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  valor_alvo: number;
  valor_atual: number;
  data_inicio: string;
  data_alvo: string;
  categoria_id?: string;
  conta_id?: string;
  cor: string;
  icone: string;
  status: 'em_andamento' | 'concluida' | 'cancelada' | 'pausada';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  synced: boolean;
  retry_count: number;
  error?: string;
  created_at: string;
}

export interface SyncMeta {
  id?: number;
  table_name: string;
  last_synced_at: string;
}

class ControlGPDatabase extends Dexie {
  lancamentos!: Table<LocalLancamento, string>;
  contas!: Table<LocalConta, string>;
  categorias!: Table<LocalCategoria, string>;
  cartoes!: Table<LocalCartao, string>;
  metas!: Table<LocalMeta, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  sync_meta!: Table<SyncMeta, number>;

  constructor() {
    super('ControlGPDB');

    this.version(1).stores({
      lancamentos: 'id, tenant_id, user_id, tipo, status, categoria_id, conta_id, cartao_id, data_competencia, data_vencimento, updated_at, sync_status',
      contas: 'id, tenant_id, user_id, ativo, updated_at, sync_status',
      categorias: 'id, tenant_id, user_id, tipo, ativo, updated_at, sync_status',
      cartoes: 'id, tenant_id, user_id, ativo, updated_at, sync_status',
      metas: 'id, tenant_id, user_id, status, updated_at, sync_status',
      sync_queue: '++id, table_name, record_id, synced, created_at',
      sync_meta: '++id, table_name',
    });
  }
}

export const db = new ControlGPDatabase();
