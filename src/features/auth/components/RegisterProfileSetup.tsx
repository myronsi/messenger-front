import type { ChangeEvent } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import type { en } from '@/shared/lang/en';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import AvatarCropModal from '@/widgets/profile-panel/ui/AvatarCropModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

interface RegisterProfileSetupProps {
  profileAvatarFile: File | null;
  profileAvatarPreview: string;
  avatarCropFile: File | null;
  avatarCropPreview: string;
  profileBio: string;
  isSavingProfile: boolean;
  translations: typeof en;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onBioChange: (bio: string) => void;
  onSave: () => void;
  onSkip: () => void;
  onCancelCrop: () => void;
  onConfirmCrop: (file: File) => void;
}

export const RegisterProfileSetup = ({
  profileAvatarFile,
  profileAvatarPreview,
  avatarCropFile,
  avatarCropPreview,
  profileBio,
  isSavingProfile,
  translations,
  onAvatarChange,
  onRemoveAvatar,
  onBioChange,
  onSave,
  onSkip,
  onCancelCrop,
  onConfirmCrop,
}: RegisterProfileSetupProps) => (
  <>
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {translations.setupProfile || 'Set up your profile'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {translations.setupProfileDescription || 'Add an avatar and bio now, or skip this step.'}
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={profileAvatarPreview || DEFAULT_AVATAR}
            alt="Profile avatar preview"
            className="h-24 w-24 rounded-full border border-gray-200 object-cover"
          />
          {profileAvatarFile && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              disabled={isSavingProfile}
              className="absolute -right-1 -top-1 rounded-full bg-gray-900 p-1 text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
              aria-label="Remove selected avatar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Camera className="h-4 w-4" />
          {profileAvatarFile ? (translations.changeAvatar || 'Change avatar') : (translations.addAvatar || 'Add avatar')}
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
            disabled={isSavingProfile}
          />
        </Label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profileBio">{translations.bio || 'Bio'}</Label>
        <Textarea
          id="profileBio"
          value={profileBio}
          onChange={(event) => onBioChange(event.target.value)}
          maxLength={500}
          disabled={isSavingProfile}
          placeholder={translations.bioPlaceholder || 'Write a short bio'}
        />
        <p className="text-right text-xs text-muted-foreground">{profileBio.length}/500</p>
      </div>
      <div className="grid gap-2">
        <Button onClick={onSave} disabled={isSavingProfile} className="w-full">
          {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {translations.finish || 'Finish'}
        </Button>
        <Button type="button" variant="outline" onClick={onSkip} disabled={isSavingProfile} className="w-full">
          {translations.skipForNow || 'Skip for now'}
        </Button>
      </div>
    </div>
    {avatarCropFile && avatarCropPreview && (
      <AvatarCropModal
        file={avatarCropFile}
        imageUrl={avatarCropPreview}
        isUploading={isSavingProfile}
        onCancel={onCancelCrop}
        onConfirm={onConfirmCrop}
      />
    )}
  </>
);
