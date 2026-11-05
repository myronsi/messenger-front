import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ImageViewerHeader from './ImageViewerHeader';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', translations: { showInChat: 'Show in chat' } }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));

it('shows who sent the picture and when, next to the gallery position', () => {
  const sentAt = `${new Date().getFullYear()}-03-05T14:02:00Z`;
  render(<ImageViewerHeader info={{ sender: 'Anna', avatarUrl: '/avatar.png', sentAt }} index={0} total={2} />);
  const info = screen.getByTestId('image-viewer-info');
  expect(info).toHaveTextContent('Anna');
  expect(info).toHaveTextContent(/5 Mar/);
  expect(info).toHaveTextContent('1 / 2');
});

it('falls back to the plain counter without sender details', () => {
  render(<ImageViewerHeader index={1} total={3} />);
  expect(screen.queryByTestId('image-viewer-info')).not.toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
});

it('closes the viewer and jumps to the message with Show in chat', () => {
  const calls: string[] = [];
  render(<ImageViewerHeader info={{ sender: 'Anna' }} index={0} total={1} onClose={() => calls.push('close')} onShowInChat={() => calls.push('jump')} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show in chat' }));
  expect(calls).toEqual(['close', 'jump']);
});

it('offers Show in chat even without sender details', () => {
  const onShowInChat = vi.fn();
  render(<ImageViewerHeader index={0} total={2} onShowInChat={onShowInChat} />);
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show in chat' }));
  expect(onShowInChat).toHaveBeenCalledOnce();
});
