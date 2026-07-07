export type EmailDeliveryResult = {
  attempted: boolean;
  delivered: boolean;
  provider: 'resend' | 'email-not-configured';
  message: string;
};

function getEmailFromAddress() {
  return process.env.ZIPBOOK_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || '';
}

function getEmailReplyTo() {
  return process.env.ZIPBOOK_EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO || '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isEmailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getEmailFromAddress());
}

export async function sendZipBookEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = getEmailFromAddress();
  const replyTo = getEmailReplyTo();
  const recipients = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to].filter(Boolean);

  if (!apiKey || !from || recipients.length === 0) {
    return {
      attempted: false,
      delivered: false,
      provider: 'email-not-configured',
      message: 'Email delivery is ready, but Resend is not configured yet.'
    };
  }

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
  } catch (error) {
    console.error('[ZipBook Email] Resend request failed.', error);
    return {
      attempted: true,
      delivered: false,
      provider: 'resend',
      message: 'Resend could not be reached just now.'
    };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[ZipBook Email] Resend failed: ${response.status} ${text}`);
    return {
      attempted: true,
      delivered: false,
      provider: 'resend',
      message: 'Resend could not send the email just now.'
    };
  }

  return {
    attempted: true,
    delivered: true,
    provider: 'resend',
    message: 'Email sent.'
  };
}

function zipBookShell(title: string, bodyHtml: string) {
  return `
    <div style="margin:0;padding:24px;background:#f5f8fc;font-family:Arial,Helvetica,sans-serif;color:#14304a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;border:1px solid #dbe8f5;box-shadow:0 12px 28px rgba(24,62,99,0.08);">
        <p style="margin:0 0 8px 0;color:#336699;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">ZipBook</p>
        <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#14304a;">${escapeHtml(title)}</h1>
        ${bodyHtml}
        <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6b7f92;">This is an automatic ZipBook email.</p>
      </div>
    </div>
  `;
}

export function buildOtpEmailHtml(input: { code: string; purpose: 'signup' | 'password-reset' | 'login' }) {
  const purposeText = input.purpose === 'password-reset'
    ? 'reset your ZipBook password'
    : input.purpose === 'signup'
      ? 'verify your ZipBook account'
      : 'continue signing in to ZipBook';

  return zipBookShell('Your ZipBook verification code', `
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4d6378;">Use this code to ${purposeText}. It will expire in 10 minutes.</p>
    <div style="margin:22px 0;padding:18px 20px;background:#eef6ff;border:1px solid #cfe2f5;border-radius:16px;text-align:center;font-size:30px;letter-spacing:0.22em;font-weight:800;color:#255f99;">${escapeHtml(input.code)}</div>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7f92;">If you did not request this code, you can safely ignore this email.</p>
  `);
}

export function buildClientBookingConfirmationEmailHtml(input: {
  patientName: string;
  date: string;
  time: string;
  endTime: string;
  procedureName: string;
  practitionerName: string;
  source: string;
  notes?: string;
}) {
  const bookedByAdmin = input.source === 'admin' || input.source === 'reception';
  const intro = bookedByAdmin
    ? 'Your booking has been added by the practice team. Please keep this email for your records.'
    : 'Thank you. Your booking has been received and added to the diary.';

  const rows = [
    ['Name', input.patientName],
    ['Date', input.date],
    ['Time', `${input.time} - ${input.endTime}`],
    ['Procedure', input.procedureName],
    ['Practitioner', input.practitionerName],
    ['Notes', input.notes || 'None']
  ];

  return zipBookShell('Your ZipBook booking confirmation', `
    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4d6378;">${escapeHtml(intro)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#14304a;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #edf3f8;font-weight:700;width:34%;">${escapeHtml(label)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #edf3f8;">${escapeHtml(value)}</td>
        </tr>
      `).join('')}
    </table>
    <p style="margin:18px 0 0 0;font-size:13px;line-height:1.5;color:#6b7f92;">If anything looks wrong, please contact the practice directly.</p>
  `);
}
