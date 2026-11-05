const viaClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const viaSelection = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  (previousFocus?.closest('[role="dialog"], [role="alertdialog"]') || document.body).appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    window.getSelection()?.removeAllRanges();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
};

export const copyText = async (text: string) =>
  (!!navigator.clipboard?.writeText && await viaClipboard(text)) || viaSelection(text);
