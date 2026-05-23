export type OtpDeliveryChannel = 'sms' | 'email';

export type OtpDeliveryResult = {
  attempted: boolean;
  delivered: boolean;
  provider: 'console' | 'resend' | 'email-not-configured' | 'sms-planned';
  mode: 'server-console-preview' | 'email-provider' | 'email-provider-not-configured' | 'provider-not-connected';
  message: string;
};

function maskDestination(destination: string) {
  if (destination.includes('@')) {
    const [name, domain] = destination.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return destination.length > 6 ? `${destination.slice(0, 4)}***${destination.slice(-2)}` : destination;
}

function getEmailFromAddress() {
  return process.env.ZIPBOOK_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || '';
}

function getEmailReplyTo() {
  return process.env.ZIPBOOK_EMAIL_REPLY_TO || process.env.RESEND_REPLY_TO || '';
}

function buildEmailHtml(code: string) {
  return `
    <div style="margin:0;padding:24px;background:#f5f8fc;font-family:Arial,Helvetica,sans-serif;color:#14304a;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;border:1px solid #dbe8f5;box-shadow:0 12px 28px rgba(24,62,99,0.08);">
        <p style="margin:0 0 8px 0;color:#336699;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">ZipBook verification code</p>
        <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#14304a;">Your ZipBook verification code</h1>
        <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4d6378;">Use this code to verify your mobile number for your ZipBook account. It will expire in 10 minutes.</p>
        <div style="margin:22px 0;padding:18px 20px;background:#eef6ff;border:1px solid #cfe2f5;border-radius:16px;text-align:center;font-size:30px;letter-spacing:0.22em;font-weight:800;color:#255f99;">${code}</div>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7f92;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    </div>
  `;
}

async function sendEmailOtp(input: { destination: string; code: string }): Promise<OtpDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = getEmailFromAddress();
  const replyTo = getEmailReplyTo();

  if (!apiKey || !from) {
    return {
      attempted: false,
      delivered: false,
      provider: 'email-not-configured',
      mode: 'email-provider-not-configured',
      message: 'Email verification codes are ready to send, but the email provider is not configured yet.'
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [input.destination],
      subject: 'Your ZipBook verification code',
      html: buildEmailHtml(input.code),
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[ZipBook OTP] Email provider failed: ${response.status} ${text}`);
    return {
      attempted: true,
      delivered: false,
      provider: 'resend',
      mode: 'email-provider',
      message: 'We could not send the email verification code just now. Please try again in a moment.'
    };
  }

  return {
    attempted: true,
    delivered: true,
    provider: 'resend',
    mode: 'email-provider',
    message: 'We have emailed your verification code. Please check your inbox.'
  };
}

export async function deliverClientOtp(input: {
  channel: OtpDeliveryChannel;
  destination: string;
  code: string;
  otpId: string;
}): Promise<OtpDeliveryResult> {
  const maskedDestination = maskDestination(input.destination);

  if (input.channel === 'email') {
    const emailResult = await sendEmailOtp({ destination: input.destination, code: input.code });
    if (emailResult.delivered || process.env.NODE_ENV === 'production') return emailResult;

    console.info(`[ZipBook OTP] EMAIL code for ${maskedDestination}: ${input.code} (OTP ${input.otpId})`);
    return {
      attempted: true,
      delivered: true,
      provider: 'console',
      mode: 'server-console-preview',
      message: 'Email delivery is not configured locally yet. For local testing, check the Netlify dev terminal for the verification code.'
    };
  }

  if (process.env.NODE_ENV !== 'production' || process.env.ZIPBOOK_OTP_CONSOLE_PREVIEW === 'true') {
    console.info(`[ZipBook OTP] SMS code for ${maskedDestination}: ${input.code} (OTP ${input.otpId})`);
    return {
      attempted: true,
      delivered: true,
      provider: 'console',
      mode: 'server-console-preview',
      message: 'SMS delivery is not connected yet. For local testing, check the Netlify dev terminal for the verification code.'
    };
  }

  return {
    attempted: false,
    delivered: false,
    provider: 'sms-planned',
    mode: 'provider-not-connected',
    message: 'SMS delivery is ready to connect, but no live SMS provider has been configured yet.'
  };
}
