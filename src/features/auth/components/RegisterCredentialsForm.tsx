import { useState, type FormEvent } from 'react';
import { Loader2, WandSparkles } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { validateRegisterField, type AccountField, type RegisterFieldErrors } from '../model/registerForm';
import { generatePassword } from '../model/generatePassword';
import { AuthField, PasswordInput } from './AuthFormParts';
import { authInputClass, fieldMessageId } from './authFieldStyles';
import { afterPointerRelease } from './pointerRelease';
import { PasswordRuleList } from './PasswordRuleList';

interface RegisterCredentialsFormProps {
  username: string;
  password: string;
  fieldErrors: RegisterFieldErrors;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onBlur: (field: AccountField) => void;
  onSubmit: (event: FormEvent) => void;
}

export const RegisterCredentialsForm = ({
  username, password, fieldErrors, isSubmitting, onUsernameChange, onPasswordChange, onBlur, onSubmit,
}: RegisterCredentialsFormProps) => {
  const { translations } = useLanguage();
  const t = translations.authLayout;
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = () => {
    onPasswordChange(generatePassword());
    setGenerated(true);
    setCopied(false);
  };
  const copy = () => {
    void navigator.clipboard?.writeText(password).then(() => setCopied(true)).catch(() => setCopied(false));
  };
  const passwordOk = !validateRegisterField('password', password);
  const errorText = (field: AccountField) => {
    const error = fieldErrors[field];
    return error ? t.errors[error] : undefined;
  };
  const described = (id: string, field: AccountField) => ({
    'aria-describedby': fieldMessageId(id),
    'aria-invalid': fieldErrors[field] ? true : undefined,
    onBlur: () => afterPointerRelease(() => onBlur(field)),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <AuthField id="register-username" label={translations.username} hint={t.usernameHint} error={errorText('username')}>
        <Input id="register-username" name="username" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          maxLength={32} value={username} onChange={(event) => onUsernameChange(event.target.value)}
          className={authInputClass(Boolean(fieldErrors.username))} {...described('register-username', 'username')} />
      </AuthField>
      <AuthField id="register-password" label={translations.password} error={errorText('password')}
        hint={generated ? t.generatedHint : undefined} valid={generated}
        labelAside={(
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={generate} aria-label={t.generateActionLabel} title={t.generateActionLabel}
            className="inline-flex items-center gap-1 rounded-sm text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />{t.generateAction}
          </button>
        )}
        footer={(focused) => (!generated && (focused || (password.length > 0 && !passwordOk))
          ? <PasswordRuleList id="register-password-rules" password={password} /> : null)}>
        <PasswordInput id="register-password" name="new-password" autoComplete="new-password" maxLength={128} value={password} revealed={generated}
          showLabel={translations.signInScreen.holdToShowPassword} invalid={Boolean(fieldErrors.password)}
          copy={generated ? { label: copied ? t.copied : t.copyGenerated, done: copied, onCopy: copy } : undefined}
          onChange={(event) => { setGenerated(false); onPasswordChange(event.target.value); }} {...described('register-password', 'password')}
          aria-describedby={`${fieldMessageId('register-password')} register-password-rules`} />
      </AuthField>
      <Button type="submit" className="mt-1 h-11 w-full text-[15px] font-semibold"
        disabled={isSubmitting || !username.trim() || !password || Boolean(fieldErrors.username || fieldErrors.password)}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? t.creatingAccount : t.createAccount}
      </Button>
    </form>
  );
};
