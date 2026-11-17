import { useState } from 'react';
import type { ProfileBackground, ProfileMusic, User } from '@/entities/user';
import {
  useDeleteMyBackgroundMutation, useDeleteMyMusicMutation, useSetMyBackgroundMutation, useSetMyMusicMutation,
  type MusicChoice, type SetBackgroundBody,
} from '@/features/profile';

type MusicDraft = { kind: 'keep' } | { kind: 'remove' } | ({ kind: 'set' } & MusicChoice);
type BackgroundDraft = { kind: 'keep' } | { kind: 'set'; body: SetBackgroundBody | null; preview: ProfileBackground | null };

const KEEP = { kind: 'keep' } as const;
const orNull = (value: string) => value.trim() || null;

export const useProfileMediaDraft = (user?: Pick<User, 'music' | 'background'> | null) => {
  const [music, setMusicDraft] = useState<MusicDraft>(KEEP);
  const [background, setBackgroundDraft] = useState<BackgroundDraft>(KEEP);
  const [version, setVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [setMusic] = useSetMyMusicMutation();
  const [deleteMusic] = useDeleteMyMusicMutation();
  const [setBackground] = useSetMyBackgroundMutation();
  const [deleteBackground] = useDeleteMyBackgroundMutation();

  const musicPreview: ProfileMusic | null = music.kind === 'keep' ? user?.music ?? null
    : music.kind === 'remove' ? null
      : { attachment: music.attachment, title: orNull(music.title), artist: orNull(music.artist) };
  const backgroundPreview = background.kind === 'keep' ? user?.background ?? null : background.preview;

  const chooseMusic = (choice: MusicChoice | null) => setMusicDraft(choice ? { kind: 'set', ...choice } : { kind: 'remove' });
  const chooseBackground = (body: SetBackgroundBody | null, preview: ProfileBackground | null) => {
    setBackgroundDraft({ kind: 'set', body, preview });
    return Promise.resolve();
  };

  const save = async () => {
    setIsSaving(true);
    try {
      if (music.kind === 'set') {
        await setMusic({ attachment_id: music.attachment.id, title: orNull(music.title), artist: orNull(music.artist) }).unwrap();
      } else if (music.kind === 'remove' && user?.music) {
        await deleteMusic().unwrap();
      }
      setMusicDraft(KEEP);
      if (background.kind === 'set' && background.body) {
        await setBackground(background.body).unwrap();
      } else if (background.kind === 'set' && user?.background) {
        await deleteBackground().unwrap();
      }
      setBackgroundDraft(KEEP);
    } finally {
      setIsSaving(false);
    }
  };

  const discard = () => {
    setMusicDraft(KEEP);
    setBackgroundDraft(KEEP);
    setVersion((value) => value + 1);
  };

  return {
    music: musicPreview, background: backgroundPreview, chooseMusic, chooseBackground,
    changed: music.kind !== 'keep' || background.kind !== 'keep', isSaving, save, discard, version,
  };
};

export type ProfileMediaDraft = ReturnType<typeof useProfileMediaDraft>;
