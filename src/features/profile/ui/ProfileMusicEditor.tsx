import { useRef, useState } from 'react';
import { Music2, Trash2 } from 'lucide-react';
import type { ProfileMusic } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import type { ProfileUpload } from '../api/profileExtrasApi';
import { SongClipPicker } from './SongClipPicker';

export interface MusicChoice {
  attachment: ProfileUpload;
  title: string;
  artist: string;
}

interface ProfileMusicEditorProps {
  music?: ProfileMusic | null;
  onChange: (choice: MusicChoice | null) => void;
}

const BUTTON = 'motion-press inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50';

export const ProfileMusicEditor = ({ music, onChange }: ProfileMusicEditorProps) => {
  const { translations } = useLanguage();
  const t = translations.profileExtras;
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const choose = () => input.current?.click();

  return (
    <section data-testid="profile-music-editor" className="space-y-3">
      {music ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/50 text-primary-foreground">
            {music.attachment.thumbnail_url
              ? <AuthenticatedImage src={music.attachment.thumbnail_url} alt="" className="h-full w-full object-cover" />
              : <Music2 className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{music.title || t.music}</p>
            {music.artist && <p className="truncate text-xs text-muted-foreground">{music.artist}</p>}
          </div>
          <button type="button" onClick={choose} className={`${BUTTON} h-9 px-3 text-primary hover:bg-primary/10`}>{t.replaceSong}</button>
          <button type="button" onClick={() => onChange(null)} aria-label={t.removeMusic}
            className="motion-press flex h-9 w-9 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t.musicHint}</p>
          <button type="button" onClick={choose} className={`${BUTTON} border border-border hover:bg-accent`}>
            <Music2 className="h-4 w-4" />{t.chooseSong}
          </button>
        </>
      )}
      <input ref={input} type="file" accept="audio/*" className="hidden" data-testid="profile-music-input"
        onChange={(event) => { const picked = event.target.files?.[0]; event.target.value = ''; if (picked) setFile(picked); }} />
      {file && (
        <SongClipPicker key={`${file.name}:${file.size}:${file.lastModified}`} file={file} onCancel={() => setFile(null)}
          onDone={(choice) => { setFile(null); onChange(choice); }} />
      )}
    </section>
  );
};
