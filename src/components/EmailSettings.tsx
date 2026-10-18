import { useEffect, useState, type FormEvent } from 'react';

interface EmailConfig {
  enabled: boolean;
  provider: string;
  from: string;
  to: string;
  daysBefore: number;
  weeklyBackup: boolean;
  hasKey: boolean;
  keyHint: string;
}

interface SettingsResponse {
  email: EmailConfig;
  providers: Record<string, string>;
}

const HELP: Record<string, { signup: string; steps: string; from: string }> = {
  resend: {
    signup: 'https://resend.com/api-keys',
    steps: 'Create a free account at resend.com with the email you want reminders on, then API Keys → Create API key.',
    from: 'Without your own domain, keep the From address as onboarding@resend.dev and send To the email you signed up with.',
  },
  brevo: {
    signup: 'https://app.brevo.com/settings/keys/api',
    steps: 'Create a free account at brevo.com, then SMTP & API → API Keys → Generate a new API key.',
    from: 'The From address must be a sender you verified in Brevo (Senders & IP → Senders). Your own Gmail works.',
  },
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** Configure reminder emails. Lives on the server, so it only shows in server mode. */
export function EmailSettings() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SettingsResponse>('/api/settings')
      .then((s) => {
        setConfig(s.email);
        setProviders(s.providers);
      })
      .catch((e) => setMessage({ text: `Could not load settings: ${e.message}`, error: true }));
  }, []);

  if (!config) return message ? <p className="hint warn">{message.text}</p> : null;

  const set = <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => setConfig({ ...config, [key]: value });
  const help = HELP[config.provider];

  const save = async (extra: object = {}) => {
    const s = await api<SettingsResponse>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ email: { ...config, apiKey, ...extra } }),
    });
    setConfig(s.email);
    setApiKey('');
  };

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ text: await action() });
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await save();
      return 'Saved.';
    });
  };

  const sendTest = () =>
    run(async () => {
      await save();
      await api('/api/email/test', { method: 'POST' });
      return `Test email sent to ${config.to}. Check your inbox (and spam folder).`;
    });

  const checkNow = () =>
    run(async () => {
      await save();
      const r = await api<{ reminders?: number; backup?: boolean; skipped?: string }>('/api/email/check', { method: 'POST' });
      if (r.skipped) return r.skipped;
      if (!r.reminders && !r.backup) return 'Nothing new to send: you already got an email for everything due.';
      return `Sent ${r.reminders} reminder(s)${r.backup ? ' and a backup' : ''}.`;
    });

  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="check">
        <input type="checkbox" checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        Email me about upcoming and overdue reminders
      </label>

      <label>
        Email service
        <select value={config.provider} onChange={(e) => set('provider', e.target.value)}>
          {Object.entries(providers).map(([id, label]) => (
            <option key={id} value={id}>
              {label} (free)
            </option>
          ))}
        </select>
      </label>
      {help && (
        <p className="hint">
          {help.steps}{' '}
          <a href={help.signup} target="_blank" rel="noreferrer">
            Get a key
          </a>
        </p>
      )}

      <label>
        API key
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config.hasKey ? `Saved (${config.keyHint}). Paste a new one to replace it.` : 'Paste your API key'}
        />
      </label>

      <label>
        To (your email)
        <input type="email" value={config.to} onChange={(e) => set('to', e.target.value)} placeholder="you@gmail.com" />
      </label>
      <label>
        From
        <input value={config.from} onChange={(e) => set('from', e.target.value)} />
      </label>
      {help && <p className="hint">{help.from}</p>}

      <label>
        First warning, days before a date
        <input
          type="number"
          min="1"
          max="365"
          value={config.daysBefore}
          onChange={(e) => set('daysBefore', Number(e.target.value))}
        />
      </label>
      <p className="hint">You get an email then, again a week before, and when it is overdue. Distance reminders warn 1,000 km ahead.</p>

      <label className="check">
        <input type="checkbox" checked={config.weeklyBackup} onChange={(e) => set('weeklyBackup', e.target.checked)} />
        Also email me a backup of my data every week
      </label>

      {message && <p className={`hint ${message.error ? 'warn' : ''}`}>{message.text}</p>}
      <div className="quick-actions">
        <button className="btn primary" disabled={busy}>
          Save
        </button>
        <button type="button" className="btn" disabled={busy || (!config.hasKey && !apiKey) || !config.to} onClick={sendTest}>
          Send test email
        </button>
        <button type="button" className="btn" disabled={busy || !config.enabled} onClick={checkNow}>
          Check now
        </button>
      </div>
      <p className="hint">Emails are sent by the PC running the server, so it needs to be on. The API key stays on that PC.</p>
    </form>
  );
}
