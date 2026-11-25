import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];

export type ImportSourceName = Schema['ImportSource'];

export type ImportSenderState = Schema['ImportSenderState'];

export type MessageImportInfo = Schema['MessageImport'];

export type ImportSummaryInfo = Schema['ImportSummary'];
