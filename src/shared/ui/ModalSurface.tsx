import { useRef, type ComponentPropsWithoutRef, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface Props extends ComponentPropsWithoutRef<'div'> {
  label: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
  onPointerDownOutside?: ComponentPropsWithoutRef<typeof Dialog.Content>['onPointerDownOutside'];
}

// Preserve custom window layouts while sharing Radix's stacked modal focus scope.
export function ModalSurface({ label, children, returnFocusRef, lockScroll, onPointerDownOutside, ...props }: Props) {
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return (
    <Dialog.Root open>
      {lockScroll && <Dialog.Overlay className="fixed inset-0" />}
      <Dialog.Content
        asChild
        aria-describedby={undefined}
        onEscapeKeyDown={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = returnFocusRef?.current || opener.current;
          if (target?.isConnected) target.focus({ preventScroll: true });
        }}
      >
        <div {...props}>
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
