import { useRef, type ComponentPropsWithoutRef, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { composeRefs, useExitGhost } from '@/shared/lib/useExitGhost';
import { BackToClose } from './BackToClose';

interface Props extends ComponentPropsWithoutRef<'div'> {
  label: string;
  onDismiss: () => void;
  dismissOnBackdrop?: boolean;
  back?: 'auto' | 'route';
  ownExit?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
  onPointerDownOutside?: ComponentPropsWithoutRef<typeof Dialog.Content>['onPointerDownOutside'];
  surfaceRef?: RefObject<HTMLDivElement | null>;
}

export function ModalSurface({
  label, children, onDismiss, dismissOnBackdrop = true, back = 'auto', ownExit = false, returnFocusRef, lockScroll,
  onPointerDownOutside, surfaceRef, onPointerDown, onClick, ...props
}: Props) {
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const pressedBackdrop = useRef(false);
  const ghost = useExitGhost(!ownExit);
  return (
    <Dialog.Root open>
      {lockScroll && <Dialog.Overlay className="fixed inset-0" />}
      <Dialog.Content
        asChild
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => { event.preventDefault(); onDismiss(); }}
        onInteractOutside={event => event.preventDefault()}
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = returnFocusRef?.current || opener.current;
          if (target?.isConnected) target.focus({ preventScroll: true });
        }}
      >
        <div ref={composeRefs(ghost, surfaceRef)} role="dialog" data-modal-surface="" data-own-motion={ownExit ? '' : undefined} {...props}
          onPointerDown={(event) => {
            onPointerDown?.(event);
            pressedBackdrop.current = dismissOnBackdrop && event.target === event.currentTarget;
          }}
          onClick={(event) => {
            onClick?.(event);
            const fromBackdrop = pressedBackdrop.current && event.target === event.currentTarget;
            pressedBackdrop.current = false;
            if (fromBackdrop) onDismiss();
          }}>
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {back === 'auto' && <BackToClose flag="window" onClose={onDismiss} />}
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
