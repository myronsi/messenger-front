import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface Props {
  displayName: string;
  accountDisplayName: string;
  isCurrentUser: boolean;
  isEditingContactName: boolean;
  customNameInput: string;
  setCustomNameInput: (name: string) => void;
  onSaveContactName: () => void;
  onCancelContactNameEdit: () => void;
  onEditContactName: () => void;
  isSavingContactName: boolean;
}

export function ContactNameHeading(props: Props) {
  const { translations } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const editing = !props.isCurrentUser && props.isEditingContactName;
  const actionClass = 'absolute top-0 rounded p-1 transition-[transform,opacity,color,background-color] duration-200 [transition-timing-function:cubic-bezier(0.2,0.8,0.2,1.2)] hover:bg-accent motion-reduce:transition-none';
  return (
    <div className="mt-3 flex justify-center px-12">
      <div className="relative min-w-0 max-w-full text-xl font-semibold leading-tight text-foreground">
        {editing ? (
          <div className="relative grid min-w-0 max-w-full">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre">{props.customNameInput || props.accountDisplayName || ' '}</span>
            <input
              ref={input}
              autoFocus
              value={props.customNameInput}
              placeholder={props.accountDisplayName}
              aria-label={translations.customName || 'Custom name'}
              maxLength={50}
              disabled={props.isSavingContactName}
              onChange={event => props.setCustomNameInput(event.target.value)}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing || props.isSavingContactName) return;
                if (event.key === 'Enter') { event.preventDefault(); props.onSaveContactName(); }
                if (event.key === 'Escape') { event.preventDefault(); props.onCancelContactNameEdit(); }
              }}
              className="absolute inset-0 min-w-0 w-full border-0 bg-transparent p-0 text-center text-xl font-semibold leading-tight outline-none placeholder:text-muted-foreground focus:ring-0"
            />
          </div>
        ) : <h3 className="min-w-0 break-words text-center">{props.displayName}</h3>}
        <span aria-hidden="true" className={`pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-center bg-primary/50 transition-transform duration-200 ease-out motion-reduce:transition-none ${editing ? 'scale-x-100' : 'scale-x-0'}`} />
        {!props.isCurrentUser && (
          <div className="absolute left-full top-1/2 ml-1 h-6 w-12 -translate-y-1/2">
            <button type="button" onClick={props.onSaveContactName} disabled={!editing || props.isSavingContactName} tabIndex={editing ? 0 : -1} hidden={!editing} aria-label={translations.save || 'Save'}
              className={`${actionClass} left-0 text-primary ${editing ? 'rotate-0 scale-100 opacity-100' : 'pointer-events-none -rotate-45 scale-50 opacity-0'}`}>
              {props.isSavingContactName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button type="button" onClick={props.onCancelContactNameEdit} disabled={!editing || props.isSavingContactName} tabIndex={editing ? 0 : -1} hidden={!editing} aria-label={translations.cancel || 'Cancel'}
              className={`${actionClass} left-6 text-muted-foreground ${editing ? 'translate-x-0 rotate-0 scale-100 opacity-100 delay-75' : 'pointer-events-none -translate-x-4 -rotate-90 scale-50 opacity-0'}`}><X className="h-4 w-4" /></button>
            <button type="button" data-testid="edit-contact-name" disabled={editing || props.isSavingContactName} tabIndex={editing ? -1 : 0} hidden={editing} aria-label={translations.customName || 'Custom name'} title={translations.customName || 'Custom name'}
              className={`${actionClass} left-0 text-muted-foreground hover:text-foreground ${editing ? 'pointer-events-none rotate-45 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} onClick={() => {
                flushSync(props.onEditContactName);
                input.current?.focus({ preventScroll: true });
              }}><Pencil className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
