import type React from 'react';
import { Camera, Users, X } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

interface GroupAvatarPickerProps {
  groupName: string;
  avatarPreview: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  chooseLabel: string;
  removeLabel: string;
}

const GroupAvatarPicker: React.FC<GroupAvatarPickerProps> = ({
  groupName, avatarPreview, inputRef, onChange, onRemove, chooseLabel, removeLabel,
}) => {
  const initial = Array.from(groupName.trim())[0]?.toUpperCase();
  return (
    <div className="relative h-24 w-24 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={chooseLabel}
        className="motion-press flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/70 to-primary text-4xl font-semibold text-primary-foreground shadow-sm"
      >
        {avatarPreview ? (
          <AuthenticatedImage src={avatarPreview} alt={groupName} className="h-full w-full object-cover" />
        ) : initial ? (
          <span aria-hidden>{initial}</span>
        ) : (
          <Users className="h-9 w-9" aria-hidden />
        )}
      </button>
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-background text-foreground"
      >
        <Camera className="h-4 w-4" />
      </span>
      {avatarPreview && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="motion-press absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-background text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
    </div>
  );
};

export default GroupAvatarPicker;
