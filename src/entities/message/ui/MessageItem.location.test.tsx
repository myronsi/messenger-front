import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message, MessageLocation } from '../model/types';
import MessageItem from './MessageItem';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src, onError }: { src?: string; onError?: () => void }) => <img alt="" data-testid="map-image" data-src={src} onError={onError} />,
}));

const place = (extra: Partial<MessageLocation> = {}): MessageLocation => ({
  latitude: 48.137154, longitude: 11.576124, accuracy_m: 25, title: 'Marienplatz',
  map: { url: '/api/v2/maps/static?lat=48.137154&lon=11.576124&sig=abc', width: 640, height: 320 }, ...extra,
});

const item = (location: MessageLocation) => {
  const message: Message = {
    id: '32', sender: 'Anna', sender_id: '2', content: '📍 Marienplatz', timestamp: '2026-11-25T10:00:00Z', type: 'message', read_by: [], location,
  };
  return (
    <MessageItem
      message={message} prevMessage={null} nextMessage={null} userId="1" isGroup={false} isImage={false} isMobile={false}
      showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
      isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => 'Today'}
      getMessageTime={() => '10:00'} isOwnMessage={(entry) => entry.sender_id === '1'} getFileTypeConfig={() => undefined}
      renderMessageContent={(entry) => entry.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
      onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
    />
  );
};

describe('MessageItem location', () => {
  it('shows the map from our server with the attribution, the name and the accuracy', () => {
    render(item(place()));
    expect(screen.getByTestId('map-image')).toHaveAttribute('data-src', expect.stringContaining('/api/v2/maps/static?'));
    expect(screen.getByTestId('map-attribution')).toHaveTextContent('© OpenStreetMap contributors');
    expect(screen.getByTestId('location-message')).toHaveTextContent('Marienplatz');
    expect(screen.getByTestId('location-message')).toHaveTextContent('± 25 m');
  });

  it('offers the place in three map services as plain links', () => {
    render(item(place()));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Open in' }), { button: 0, ctrlKey: false });
    expect(screen.getByRole('menuitem', { name: 'OpenStreetMap' })).toHaveAttribute('href',
      'https://www.openstreetmap.org/?mlat=48.137154&mlon=11.576124#map=16/48.137154/11.576124');
    expect(screen.getByRole('menuitem', { name: 'Google Maps' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('menuitem', { name: 'Apple Maps' })).toHaveAttribute('href', expect.stringContaining('https://maps.apple.com/'));
  });

  it('shows the coordinates when there is no map, and the attribution still', () => {
    render(item(place({ map: null, accuracy_m: null, title: null })));
    expect(screen.queryByTestId('map-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-message')).toHaveTextContent('48.13715, 11.57612');
    expect(screen.getByTestId('location-message')).toHaveTextContent('Location');
    expect(screen.getByTestId('map-attribution')).toBeInTheDocument();
  });

  it('falls back to a plain card when the map image fails', () => {
    render(item(place()));
    fireEvent.error(screen.getByTestId('map-image'));
    expect(screen.getByTestId('location-message')).toHaveTextContent("The map can't be shown right now.");
  });
});
