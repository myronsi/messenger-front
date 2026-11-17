import React, { useRef, useState } from 'react';
import { Ban, Plus, Sparkles } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { ReactionEmoji } from '@/entities/emoji';
import { burstReaction, setDoubleTapReaction, useDoubleTapReaction, useQuickReactions } from '@/entities/message';
import { ReactionPicker } from '@/features/message-actions';
import { useSettingsLayout } from '../model/settingsLayout';
import { AppearanceSection } from './AppearanceControls';

const PREVIEW_DOUBLE_TAP_MS = 300;
const OPTION = 'flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none transition-[transform,background-color,box-shadow] duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface PersonalizationSettingsPageProps {
  userId: EntityId;
  onBack: () => void;
}

const PersonalizationSettingsPage: React.FC<PersonalizationSettingsPageProps> = ({ userId, onBack }) => {
  const { translations } = useLanguage();
  const t = translations.personalization;
  const pane = useSettingsLayout() === 'pane';
  const current = useDoubleTapReaction(userId);
  const quick = useQuickReactions(userId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMounted, setPickerMounted] = useState(false);
  const [previewReacted, setPreviewReacted] = useState(false);
  const lastTap = useRef(0);
  const options = current && !quick.includes(current) ? [...quick, current] : quick;

  const choose = (reaction: string) => {
    setDoubleTapReaction(userId, reaction);
    setPreviewReacted(false);
    setPickerOpen(false);
  };
  const togglePicker = () => {
    setPickerMounted(true);
    setPickerOpen((open) => !open);
  };
  const tapPreview = (event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current > PREVIEW_DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (!current) return;
    if (!previewReacted) burstReaction(current, { x: event.clientX, y: event.clientY });
    setPreviewReacted((reacted) => !reacted);
  };
  const choiceClass = (active: boolean) => cn(OPTION, active ? 'scale-110 bg-primary/15 ring-2 ring-primary' : 'bg-muted hover:bg-accent');

  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-muted-foreground" />{t.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <AppearanceSection title={t.doubleTap}>
          <div className="chat-surface rounded-xl border border-border px-4 pb-7 pt-4">
            <div className="relative w-fit max-w-[85%]">
              <button type="button" data-testid="double-tap-preview" onClick={tapPreview}
                className="select-none rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-left text-sm text-foreground shadow-sm [touch-action:manipulation]">
                {t.tryIt}
              </button>
              {previewReacted && current && (
                <span data-testid="double-tap-preview-chip"
                  className="motion-reaction-pop absolute left-2 top-full -mt-1.5 inline-flex h-5 items-center rounded-full border border-border/70 bg-background px-1 text-[13px] leading-none shadow-sm">
                  <ReactionEmoji reaction={current} />
                </span>
              )}
            </div>
          </div>
          <div role="radiogroup" aria-label={t.doubleTap} className="flex flex-wrap gap-2 pt-1">
            <button type="button" role="radio" aria-checked={!current} aria-label={t.off} title={t.off} onClick={() => choose('')}
              className={cn(choiceClass(!current), 'text-muted-foreground')}>
              <Ban className="h-5 w-5" aria-hidden="true" />
            </button>
            {options.map((reaction) => (
              <button key={reaction} type="button" role="radio" aria-checked={current === reaction} aria-label={reaction} onClick={() => choose(reaction)}
                className={choiceClass(current === reaction)}>
                <ReactionEmoji reaction={reaction} />
              </button>
            ))}
            <button type="button" aria-label={t.more} title={t.more} aria-expanded={pickerOpen} onClick={togglePicker}
              className={cn(OPTION, 'text-muted-foreground', pickerOpen ? 'rotate-45 bg-accent text-foreground' : 'bg-muted hover:bg-accent')}>
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${pickerOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            aria-hidden={!pickerOpen} inert={!pickerOpen}>
            <div className="min-h-0 overflow-hidden">
              {pickerMounted && <div className="mt-1 rounded-2xl border border-border bg-popover pt-2"><ReactionPicker embedded onPick={choose} /></div>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{current ? t.doubleTapHint : t.offHint}</p>
        </AppearanceSection>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">{t.deviceOnly}</p>
      </div>
    </div>
  );
};

export default PersonalizationSettingsPage;
