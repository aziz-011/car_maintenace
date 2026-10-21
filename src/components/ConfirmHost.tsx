import { useEffect, useState } from 'react';
import { registerConfirmHost, type ConfirmRequest } from '../confirm';
import { Modal } from './Modal';

/** Renders the dialog for confirmAction(); mount once near the app root. */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    registerConfirmHost(setReq);
    return () => registerConfirmHost(null);
  }, []);

  if (!req) return null;
  const done = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
  };

  return (
    <Modal title="Are you sure?" onClose={() => done(false)}>
      <div className="form">
        <p className="confirm-text">{req.message}</p>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => done(false)}>
            Cancel
          </button>
          <button type="button" className="btn danger" onClick={() => done(true)} autoFocus>
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
