# Windows and modals

Every window, modal, sheet and confirmation in the app follows the same three rules:

1. **It animates when it opens and when it closes.**
2. **A click or tap outside it closes it.** Pressing Escape closes it too.
3. **On a phone, the back button or back gesture closes it**, with the same closing animation.

## How to build one

Build windows only from the parts in `src/shared/ui`. They follow the rules for you:

| Part | Use for |
|---|---|
| `Dialog` / `DialogContent` | Most windows. Keep it mounted and pass `open`, so the closing animation can play. |
| `AlertDialog` | Questions with buttons. A click outside counts as Cancel. |
| `Sheet` / `Drawer` | Panels that slide in from a side or from the bottom. |
| `ActionDialog` | Confirmations with an icon, points and one option checkbox. |
| `ConfirmModal` | Older confirmations. Prefer `ActionDialog` for new ones. |
| `ModalSurface` | Custom window layouts. `onDismiss` is required. |

`ModalSurface` options:

- `onDismiss` (required): called for a click on the backdrop, Escape and phone back. Ignore it while the window is busy.
- `back="route"`: the window belongs to a URL, so the router already closes it on back.
- `dismissOnBackdrop={false}`: only for full-screen windows that have no outside.
- `ownExit`: the window keeps itself mounted and plays its own closing animation.

If a window is removed at once (for example `{open && <ActionDialog … />}`), the shared parts still play its closing animation. They leave a short-lived copy (an "exit ghost") that fades out.

## What checks it

- **TypeScript:** a `ModalSurface` without `onDismiss` does not compile.
- **ESLint:** outside `src/shared/ui`, importing `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog` or `vaul`, and writing `role="dialog"`, `role="alertdialog"` or `aria-modal`, are errors.
- **Contract test:** `src/shared/ui/windowContract.test.tsx` checks every shared window type for all three rules. Add a row there when you add a new kind of window to `src/shared/ui`.

## Exceptions

- The incoming call card (`IncomingCallCard`) is not dismissed by a tap outside, so a ringing call is never lost by accident.
- Popovers and menus (`Popover`, `DropdownMenu`, context menus) are not windows. They still close on a click outside and on Escape.
