import { useEffect, useState, type FormEvent } from 'react';
import { t } from '../i18n';

interface AiConfig {
  hasKey: boolean;
  keyHint: string;
}

/**
 * The Claude API key the home server uses to read receipt photos. Like the
 * email key, it stays on the PC: the browser only learns whether one is set.
 */
export function ReceiptAiSettings() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const call = async (body?: object) => {
    const res = await fetch('/api/settings/ai', body ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    setConfig(json.ai);
  };

  useEffect(() => {
    call().catch((e) => setMessage({ text: t('Could not load settings: {error}', { error: e.message }), error: true }));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await call({ apiKey: key });
      setKey('');
      setMessage({ text: t('Saved. "Fill in from a receipt photo" now appears when you add a fill-up.') });
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
    }
  };

  if (!config) return message ? <p className="hint warn">{message.text}</p> : null;

  return (
    <form className="form" onSubmit={save}>
      <p className="muted">
        {t('The home server sends the receipt photo to Claude to read the liters, price, total, station and date. This needs a Claude API key from console.anthropic.com (API keys → Create key). Each receipt costs about one cent.')}
      </p>
      <label>
        {t('Claude API key')}
        <input
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={config.hasKey ? t('Saved ({hint}). Type a new key to replace it.', { hint: config.keyHint }) : 'sk-ant-…'}
        />
      </label>
      <div className="quick-actions">
        <button className="btn primary" disabled={!key.trim()}>
          {t('Save key')}
        </button>
        {config.hasKey && (
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              call({ removeKey: true })
                .then(() => setMessage({ text: t('Key removed.') }))
                .catch((err) => setMessage({ text: (err as Error).message, error: true }))
            }
          >
            {t('Remove key')}
          </button>
        )}
      </div>
      {message && <p className={`hint${message.error ? ' warn' : ''}`}>{message.text}</p>}
    </form>
  );
}
