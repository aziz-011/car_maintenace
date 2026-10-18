// Sends email through a provider's HTTP API, so no SMTP library is needed.

export const PROVIDERS = {
  resend: {
    label: 'Resend',
    async send({ apiKey, from, to, subject, text, html, attachments = [] }) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
          html,
          attachments: attachments.map((a) => ({ filename: a.filename, content: a.base64 })),
        }),
      });
      if (!res.ok) throw new Error(`Resend: ${await errorText(res)}`);
    },
  },
  brevo: {
    label: 'Brevo',
    async send({ apiKey, from, to, subject, text, html, attachments = [] }) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: parseAddress(from),
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html,
          ...(attachments.length && { attachment: attachments.map((a) => ({ name: a.filename, content: a.base64 })) }),
        }),
      });
      if (!res.ok) throw new Error(`Brevo: ${await errorText(res)}`);
    },
  },
};

/** "Car Maintenance <me@example.com>" → { name, email } */
export function parseAddress(value) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: value.trim() };
}

async function errorText(res) {
  const body = await res.text();
  try {
    const json = JSON.parse(body);
    return json.message ?? json.error?.message ?? json.error ?? body;
  } catch {
    return body || `HTTP ${res.status}`;
  }
}

export async function sendEmail(email, message) {
  const provider = PROVIDERS[email.provider];
  if (!provider) throw new Error('Choose an email provider');
  if (!email.apiKey) throw new Error('Add your API key');
  if (!email.from || !email.to) throw new Error('Fill in the From and To addresses');
  await provider.send({ apiKey: email.apiKey, from: email.from, to: email.to, ...message });
}
