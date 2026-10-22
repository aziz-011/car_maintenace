import { useEffect, useState, type FormEvent } from 'react';
import { t } from '../i18n';

interface EmailConfig {
  enabled: boolean;
  provider: string;
  from: string;
  to: string;
  daysBefore: number;
  weeklyBackup: boolean;
  weeklyCheckin: boolean;
  checkinDay: number;
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    api<SettingsResponse>('api/settings')
      .then((s) => {
        setConfig(s.email);
        setProviders(s.providers);
      })
      .catch((e) => setMessage({ text: t('Could not load settings: {error}', { error: e.message }), error: true }));
  }, []);

  if (!config) return message ? <p className="hint warn">{message.text}</p> : null;

  const set = <K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) => setConfig({ ...config, [key]: value });
  const help = HELP[config.provider];

  const save = async (extra: object = {}) => {
    const s = await api<SettingsResponse>('api/settings', {
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
      return t('Saved.');
    });
  };

  const sendTest = () =>
    run(async () => {
      await save();
      await api('api/email/test', { method: 'POST' });
      return t('Test email sent to {to}. Check your inbox (and spam folder).', { to: config.to });
    });

  const sendCheckin = () =>
    run(async () => {
      await save();
      await api('api/email/checkin', { method: 'POST' });
      return t('Check-in email sent to {to}.', { to: config.to });
    });

  const checkNow = () =>
    run(async () => {
      await save();
      const r = await api<{ reminders?: number; backup?: boolean; skipped?: string }>('api/email/check', { method: 'POST' });
      if (r.skipped) return t(r.skipped);
      if (!r.reminders && !r.backup) return t('Nothing new to send: you already got an email for everything due.');
      return r.backup ? t('Sent {n} reminder(s) and a backup.', { n: r.reminders ?? 0 }) : t('Sent {n} reminder(s).', { n: r.reminders ?? 0 });
    });

  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="check">
        <input type="checkbox" checked={config.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        {t('Email me about upcoming and overdue reminders')}
      </label>

      <label>
        {t('Email service')}
        <select value={config.provider} onChange={(e) => set('provider', e.target.value)}>
          {Object.entries(providers).map(([id, label]) => (
            <option key={id} value={id}>
              {t('{name} (free)', { name: label })}
            </option>
          ))}
        </select>
      </label>
      {help && (
        <p className="hint">
          {t(help.steps)}{' '}
          <a href={help.signup} target="_blank" rel="noreferrer">
            {t('Get a key')}
          </a>
        </p>
      )}

      <label>
        {t('API key')}
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config.hasKey ? t('Saved ({hint}). Type a new key to replace it.', { hint: config.keyHint }) : t('Paste your API key')}
        />
      </label>

      <label>
        {t('To (your email)')}
        <input type="email" value={config.to} onChange={(e) => set('to', e.target.value)} placeholder={t('you@gmail.com')} />
      </label>
      <label>
        {t('From')}
        <input value={config.from} onChange={(e) => set('from', e.target.value)} />
      </label>
      {help && <p className="hint">{t(help.from)}</p>}

      <label>
        {t('First warning, days before a date')}
        <input
          type="number"
          min="1"
          max="365"
          value={config.daysBefore}
          onChange={(e) => set('daysBefore', Number(e.target.value))}
        />
      </label>
      <p className="hint">{t('You get an email then, again a week before, and when it is overdue. Distance reminders warn 1,000 km ahead.')}</p>

      <label className="check">
        <input type="checkbox" checked={config.weeklyCheckin} onChange={(e) => set('weeklyCheckin', e.target.checked)} />
        {t('Weekly odometer check-in: ask for my readings and list what is coming up')}
      </label>
      {config.weeklyCheckin && (
        <label>
          {t('Send it every')}
          <select value={config.checkinDay} onChange={(e) => set('checkinDay', Number(e.target.value))}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {t('{day} evening (from 18:00)', { day: t(d) })}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="check">
        <input type="checkbox" checked={config.weeklyBackup} onChange={(e) => set('weeklyBackup', e.target.checked)} />
        {t('Also email me a backup of my data every week')}
      </label>

      {message && <p className={`hint ${message.error ? 'warn' : ''}`}>{message.text}</p>}
      <div className="quick-actions">
        <button className="btn primary" disabled={busy}>
          {t('Save')}
        </button>
        <button type="button" className="btn" disabled={busy || (!config.hasKey && !apiKey) || !config.to} onClick={sendTest}>
          {t('Send test email')}
        </button>
        <button type="button" className="btn" disabled={busy || !config.enabled} onClick={checkNow}>
          {t('Check now')}
        </button>
        <button type="button" className="btn" disabled={busy || (!config.hasKey && !apiKey) || !config.to} onClick={sendCheckin}>
          {t('Send check-in now')}
        </button>
      </div>
      <p className="hint">{t('Emails are sent by the PC running the server, so it needs to be on. The API key stays on that PC.')}</p>
    </form>
  );
}
