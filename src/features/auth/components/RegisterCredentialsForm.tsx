import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { en } from '@/shared/lang/en';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type Translations = typeof en;

interface RegisterCredentialsFormProps {
  username: string;
  displayName: string;
  password: string;
  showPassword: boolean;
  translations: Translations;
  isDisplayNameValid: boolean;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordVisibilityChange: (visible: boolean) => void;
  onSubmit: (event: FormEvent) => void;
}

export const RegisterCredentialsForm = ({
  username,
  displayName,
  password,
  showPassword,
  translations,
  isDisplayNameValid,
  onUsernameChange,
  onDisplayNameChange,
  onPasswordChange,
  onPasswordVisibilityChange,
  onSubmit,
}: RegisterCredentialsFormProps) => (
  <>
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="username">{translations.username}</Label>
        <Input
          id="username"
          type="text"
          placeholder={translations.username}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          type="text"
          placeholder="Display Name (3-50 characters)"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          maxLength={50}
          required
        />
        {displayName && !isDisplayNameValid && (
          <p className="text-sm text-destructive">Display name must be between 3 and 50 characters</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{translations.password}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={translations.password}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          <button
            type="button"
            onMouseDown={() => onPasswordVisibilityChange(true)}
            onMouseUp={() => onPasswordVisibilityChange(false)}
            onMouseLeave={() => onPasswordVisibilityChange(false)}
            onTouchStart={() => onPasswordVisibilityChange(true)}
            onTouchEnd={() => onPasswordVisibilityChange(false)}
            onTouchCancel={() => onPasswordVisibilityChange(false)}
            onPointerDown={() => onPasswordVisibilityChange(true)}
            onPointerUp={() => onPasswordVisibilityChange(false)}
            onPointerCancel={() => onPasswordVisibilityChange(false)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  </>
);
