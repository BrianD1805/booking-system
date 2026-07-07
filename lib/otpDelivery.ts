import { buildOtpEmailHtml, sendZipBookEmail } from './emailDelivery';

export type OtpDeliveryChannel = 'sms' | 'email';

export type OtpDeliveryPurpose = 'signup' | 'password-reset' | 'login';

export type OtpDeliveryResult = {
  attempted: boolean;
  delivered: boolean;
  provider: 'console' | 'test-mode' | 'resend' | 'email-not-configured' | 'sms-planned';
  mode: 'server-console-preview' | 'test-mode-preview' | 'email-provider' | 'email-provider-not-configured' | 'provider-not-connected';
  message: string;
};

function maskDestination(destination: string) {
  if (destination.includes('@')) {
    const [name, domain] = destination.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return destination.length > 6 ? `${destination.slice(0, 4)}***${destination.slice(-2)}` : destination;
}

export function isOtpTestModeEnabled() {
  return process.env.ZIPBOOK_OTP_TEST_MODE === 'true' || process.env.ZIPBOOK_OTP_TEST_MODE === '1';
}

function getOtpPurposeMessage(purpose: OtpDeliveryPurpose) {
  if (purpose === 'password-reset') return 'We have emailed your password reset code. Please check your inbox.';
  if (purpose === 'signup') return 'We have emailed your sign-up verification code. Please check your inbox.';
  return 'We have emailed your verification code. Please check your inbox.';
}

async function sendEmailOtp(input: { destination: string; code: string; purpose: OtpDeliveryPurpose }): Promise<OtpDeliveryResult> {
  const result = await sendZipBookEmail({
    to: input.destination,
    subject: input.purpose === 'password-reset' ? 'Reset your ZipBook password' : 'Your ZipBook verification code',
    html: buildOtpEmailHtml({ code: input.code, purpose: input.purpose })
  });

  if (!result.delivered) {
    return {
      attempted: result.attempted,
      delivered: false,
      provider: result.provider,
      mode: result.provider === 'email-not-configured' ? 'email-provider-not-configured' : 'email-provider',
      message: result.provider === 'email-not-configured'
        ? 'Email verification codes are ready to send, but Resend is not configured yet.'
        : 'We could not send the email verification code just now. Please try again in a moment.'
    };
  }

  return {
    attempted: true,
    delivered: true,
    provider: 'resend',
    mode: 'email-provider',
    message: getOtpPurposeMessage(input.purpose)
  };
}

export async function deliverClientOtp(input: {
  channel: OtpDeliveryChannel;
  destination: string;
  code: string;
  otpId: string;
  purpose?: OtpDeliveryPurpose;
}): Promise<OtpDeliveryResult> {
  const maskedDestination = maskDestination(input.destination);

  if (isOtpTestModeEnabled()) {
    console.info(`[ZipBook OTP TEST MODE] ${input.channel.toUpperCase()} code for ${maskedDestination}: ${input.code} (OTP ${input.otpId})`);
    return {
      attempted: true,
      delivered: true,
      provider: 'test-mode',
      mode: 'test-mode-preview',
      message: 'Temporary OTP test mode is enabled. Use the verification code shown on screen.'
    };
  }

  if (input.channel === 'email') {
    const emailResult = await sendEmailOtp({ destination: input.destination, code: input.code, purpose: input.purpose ?? 'login' });
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
