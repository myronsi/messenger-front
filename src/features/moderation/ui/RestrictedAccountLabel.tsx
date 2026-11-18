import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface RestrictedAccountLabelProps {
  label?: string | null;
  className?: string;
}

export const RestrictedAccountLabel = ({ label, className = '' }: RestrictedAccountLabelProps) => {
  const t = useLanguage().translations.moderation;
  if (!label) return null;
  return (
    <span data-testid="restricted-account-label"
      className={`inline-flex items-center gap-1 rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive ${className}`}>
      <ShieldAlert className="h-3 w-3" />{t.restrictedLabel}
    </span>
  );
};
