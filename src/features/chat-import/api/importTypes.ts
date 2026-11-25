import type { ServerEvent } from '@myronsi/messenger-api';
import type { EntityId } from '@/shared/api/entityId';
import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];

export type ImportSourceName = Schema['ImportSource'];
export type ImportSenderState = Schema['ImportSenderState'];
export type ChatImportState = Schema['ChatImportState'];
export type ChatImportSender = Schema['ChatImportSender'];
export type ChatImport = Schema['ChatImport'];
export type StartImportRequest = Schema['StartChatImportRequest'];
export type ImportedMessage = Schema['ImportedMessage'];
export type AddImportMessagesRequest = Schema['AddImportedMessagesRequest'];
export type SenderDecision = Schema['DecideImportSenderRequest']['decision'];
export type ImportServerEvent = Extract<ServerEvent, { type: 'import_update' | 'import_sender_update' }>;

export type SenderAssignment = 'me' | EntityId | null;
