import React from 'react';
import { Monitor, Moon, Palette, RotateCcw, Sun } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useAppearance } from '@/shared/contexts/AppearanceContext';
import { CORNERS, DENSITIES, FONT_SIZE_MAX, FONT_SIZE_MIN, THEME_CHOICES } from '@/shared/lib/appearance/settings';
import { useSettingsLayout } from '../model/settingsLayout';
import { AccentSwatches, AppearanceSection, BackgroundSwatches, ChoiceGroup } from './AppearanceControls';
import { AppearancePreview } from './AppearancePreview';

const AppearanceSettingsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { translations } = useLanguage();
  const t = translations.appearance;
  const { settings, theme, tone, setTheme, update, reset } = useAppearance();
  const pane = useSettingsLayout() === 'pane';
  const sizeLabel = t.textSizeValue.replace('{size}', String(settings.fontSize));
  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><Palette className="h-4 w-4 text-muted-foreground" />{t.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <AppearancePreview label={t.preview} incoming={t.previewIncoming} outgoing={t.previewOutgoing} background={settings.chatBackground} />
        <AppearanceSection title={t.theme}>
          <ChoiceGroup label={t.theme} value={theme} options={THEME_CHOICES} labels={t.themes}
            icons={{ light: Sun, dark: Moon, system: Monitor }} onChange={setTheme} />
        </AppearanceSection>
        <AppearanceSection title={t.accent}>
          <AccentSwatches label={t.accent} value={settings.accent} tone={tone} names={t.accents} onChange={(accent) => update({ accent })} />
        </AppearanceSection>
        <AppearanceSection title={t.textSize} aside={<span className="text-sm tabular-nums text-muted-foreground">{sizeLabel}</span>}>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-xs text-muted-foreground">A</span>
            <input type="range" min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} step={1} value={settings.fontSize} aria-label={t.textSize} aria-valuetext={sizeLabel}
              onChange={(event) => update({ fontSize: Number(event.target.value) })} className="h-2 flex-1 cursor-pointer accent-primary" />
            <span aria-hidden="true" className="text-lg text-muted-foreground">A</span>
          </div>
        </AppearanceSection>
        <AppearanceSection title={t.corners}>
          <ChoiceGroup label={t.corners} value={settings.corners} options={CORNERS} labels={t.cornerOptions} onChange={(corners) => update({ corners })} />
        </AppearanceSection>
        <AppearanceSection title={t.density}>
          <ChoiceGroup label={t.density} value={settings.density} options={DENSITIES} labels={t.densities} onChange={(density) => update({ density })} />
        </AppearanceSection>
        <AppearanceSection title={t.chatBackground}>
          <BackgroundSwatches label={t.chatBackground} value={settings.chatBackground} names={t.chatBackgrounds}
            onChange={(chatBackground) => update({ chatBackground })} />
        </AppearanceSection>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">{t.deviceOnly}</p>
          <button type="button" onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />{t.reset}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettingsPage;
