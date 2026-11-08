import React from 'react';
import { Globe, Monitor, Moon, Sun } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAppearance } from '@/shared/contexts/AppearanceContext';
import { THEME_CHOICES, type ThemeChoice } from '@/shared/lib/appearance/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const THEME_ICONS: Record<ThemeChoice, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

export const AuthToolbar: React.FC = () => {
  const { language, setLanguage, translations } = useLanguage();
  const { theme, tone, setTheme } = useAppearance();
  const t = translations.authLayout;
  const ToneIcon = tone === 'dark' ? Moon : Sun;
  const themeLabel = `${t.theme}: ${translations.appearance.themes[theme]}`;
  return (
    <div className="flex items-center gap-2">
      <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'ru')}>
        <SelectTrigger aria-label={t.language} className="h-9 w-auto gap-2 border-input px-3 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ru">Русский</SelectItem>
        </SelectContent>
      </Select>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={themeLabel} title={themeLabel}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-input text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ToneIcon className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>{t.theme}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeChoice)}>
            {THEME_CHOICES.map((choice) => {
              const Icon = THEME_ICONS[choice];
              return (
                <DropdownMenuRadioItem key={choice} value={choice} className="gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{translations.appearance.themes[choice]}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
