/**
 * Asks the viewer to confirm a destructive action with an in-page dialog.
 * Browser confirm() is not used because claude.ai pages cannot show it.
 */
export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

let show: ((req: ConfirmRequest) => void) | null = null;

export function registerConfirmHost(fn: typeof show) {
  show = fn;
}

export function confirmAction(message: string, confirmLabel = 'Delete'): Promise<boolean> {
  return new Promise((resolve) => (show ? show({ message, confirmLabel, resolve }) : resolve(false)));
}
