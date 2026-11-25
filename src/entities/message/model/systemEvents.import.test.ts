import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { systemEventText } from './systemEvents';

const nobody = () => false;
const summary = { import_id: '9', source: 'whatsapp' as const, message_count: 3214, first_at: '2019-03-12T14:05:00Z', last_at: '2026-11-02T10:00:00Z' };

describe('systemEventText for imported history', () => {
  it('opens the block with the source, importer, count and period', () => {
    const text = systemEventText({ kind: 'history_imported', actor_id: '1', actor_name: 'Anna', import: summary }, en, nobody);
    expect(text).toMatch(/^Imported from WhatsApp by Anna · 3,214 messages · .*2019 – .*2026$/);
  });

  it('closes the block', () => {
    expect(systemEventText({ kind: 'history_import_ended', actor_id: '1', actor_name: 'Anna', import: summary }, en, nobody)).toBe('End of imported history');
  });

  it('shows an imported note as it is', () => {
    expect(systemEventText({ kind: 'imported_note', actor_id: null, actor_name: '', text: 'Poll: Where do we meet?' }, en, nobody)).toBe('Poll: Where do we meet?');
  });
});
