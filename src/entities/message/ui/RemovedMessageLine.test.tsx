import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RemovedMessageLine from './RemovedMessageLine';
import type { Message } from '../model/types';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});

const removed: Message = {
  id: '9', sender: 'Eve', content: '', timestamp: '2026-11-19T10:00:00Z', type: 'message', read_by: [], is_deleted: true,
  removed_by_moderation: true, moderation_reason: { code: 'harassment', text: 'Insults are not allowed.' },
};

describe('RemovedMessageLine', () => {
  it('shows the sender the rule and the explanation', () => {
    render(<RemovedMessageLine message={removed} isMine time="10:00" />);
    expect(screen.getByText('Removed by moderation')).toBeInTheDocument();
    expect(screen.getByText('Reason: Harassment')).toBeInTheDocument();
    expect(screen.getByText('Insults are not allowed.')).toBeInTheDocument();
  });

  it('shows other members only the placeholder', () => {
    render(<RemovedMessageLine message={removed} isMine={false} />);
    expect(screen.getByText('Removed by moderation')).toBeInTheDocument();
    expect(screen.queryByText(/Reason/)).not.toBeInTheDocument();
    expect(screen.queryByText('Insults are not allowed.')).not.toBeInTheDocument();
  });

  it('names unknown rules as community guidelines', () => {
    render(<RemovedMessageLine message={{ ...removed, moderation_reason: { code: 'brand_new', text: '' } }} isMine />);
    expect(screen.getByText('Reason: Community guidelines')).toBeInTheDocument();
  });
});
