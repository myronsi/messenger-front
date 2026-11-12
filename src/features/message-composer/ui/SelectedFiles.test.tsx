import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/shared/contexts/LanguageContext';
import SelectedFiles from './SelectedFiles';

vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }));

const file = (name: string, type: string) => new File(['x'], name, { type });
const renderFiles = (files: File[]) => render(
  <LanguageProvider>
    <SelectedFiles files={files} removeLabel="Remove" addLabel="Add" canAdd onAdd={vi.fn()} onRemove={vi.fn()} />
  </LanguageProvider>,
);

beforeEach(() => localStorage.setItem('language', 'en'));

describe('SelectedFiles caption target', () => {
  it('names the file that gets the caption when the selection is sent as several messages', () => {
    renderFiles([file('route.wav', 'audio/wav'), file('notes.txt', 'text/plain')]);
    expect(screen.getByTestId('caption-target')).toHaveTextContent('The caption is sent with route.wav.');
  });

  it('says the caption goes with the album when photos are mixed with files', () => {
    renderFiles([file('notes.txt', 'text/plain'), file('a.png', 'image/png'), file('b.png', 'image/png')]);
    expect(screen.getByTestId('caption-target')).toHaveTextContent('The caption is sent with the album.');
  });

  it('says nothing when everything goes into one message', () => {
    renderFiles([file('a.png', 'image/png'), file('b.png', 'image/png')]);
    expect(screen.queryByTestId('caption-target')).not.toBeInTheDocument();
  });
});
