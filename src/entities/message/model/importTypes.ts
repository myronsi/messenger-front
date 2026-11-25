import type { EntityId } from '@/shared/api/entityId';

export type ImportSourceName = 'telegram' | 'whatsapp';

export type ImportSenderState = 'me' | 'unassigned' | 'pending' | 'confirmed' | 'declined';

export interface MessageImportInfo {
  import_id: EntityId;
  source: ImportSourceName;
  original_at?: string;
  sender_name?: string;
  sender_state?: 'me' | 'confirmed' | 'unconfirmed';
}

export interface ImportSummaryInfo {
  import_id: EntityId;
  source: ImportSourceName;
  message_count: number;
  first_at: string;
  last_at: string;
}
