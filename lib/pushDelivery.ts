import { createCipheriv, createECDH, createHmac, createPrivateKey, createSign, randomBytes } from 'crypto';

export type BrowserPushSubscription = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

export type ZipBookPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  bookingId?: string;
};

export type PushSendResult = {
  attempted: boolean;
  delivered: boolean;
  configured: boolean;
  provider: 'web-push';
  status?: number;
  invalidSubscription?: boolean;
  error?: string;
};

function trimEnv(value?: string) {
  return (value ?? '').trim();
}

export function getPushPublicKey() {
  return trimEnv(process.env.ZIPBOOK_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_ZIPBOOK_VAPID_PUBLIC_KEY);
}

function getPushPrivateKey() {
  return trimEnv(process.env.ZIPBOOK_VAPID_PRIVATE_KEY);
}

function getPushContact() {
  return trimEnv(process.env.ZIPBOOK_PUSH_CONTACT) || 'mailto:bookings@mail.zipbook.app';
}

export function isPushDeliveryConfigured() {
  return Boolean(getPushPublicKey() && getPushPrivateKey());
}

export function isPhonePushUserAgent(userAgent?: string) {
  const value = (userAgent ?? '').toLowerCase();
  if (!value) return false;
  return value.includes('iphone')
    || value.includes('ipod')
    || value.includes('windows phone')
    || (value.includes('android') && value.includes('mobile'));
}

export function normalisePushSubscription(subscription: BrowserPushSubscription): StoredPushSubscription {
  const endpoint = trimEnv(subscription.endpoint);
  const p256dh = trimEnv(subscription.keys?.p256dh);
  const auth = trimEnv(subscription.keys?.auth);

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Push subscription is missing endpoint or browser keys.');
  }

  return {
    id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    endpoint,
    p256dh,
    auth
  };
}

function base64UrlToBuffer(value: string) {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalised.length % 4)) % 4);
  return Buffer.from(normalised + padding, 'base64');
}

function bufferToBase64Url(buffer: Buffer | Uint8Array) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;

  while (Buffer.concat(blocks).length < length) {
    previous = createHmac('sha256', prk)
      .update(Buffer.concat([previous, info, Buffer.from([counter])]))
      .digest();
    blocks.push(previous);
    counter += 1;
  }

  return Buffer.concat(blocks).subarray(0, length);
}

function derToJose(signature: Buffer, bytes: number) {
  let offset = 0;
  if (signature[offset++] !== 0x30) throw new Error('Invalid VAPID signature format.');

  let sequenceLength = signature[offset++];
  if (sequenceLength & 0x80) {
    const lengthBytes = sequenceLength & 0x7f;
    sequenceLength = 0;
    for (let i = 0; i < lengthBytes; i += 1) sequenceLength = (sequenceLength << 8) + signature[offset++];
  }

  if (signature[offset++] !== 0x02) throw new Error('Invalid VAPID signature R value.');
  const rLength = signature[offset++];
  const r = signature.subarray(offset, offset + rLength);
  offset += rLength;

  if (signature[offset++] !== 0x02) throw new Error('Invalid VAPID signature S value.');
  const sLength = signature[offset++];
  const s = signature.subarray(offset, offset + sLength);

  const partLength = bytes / 2;
  const formatPart = (part: Buffer) => {
    let value = part;
    while (value.length > partLength && value[0] === 0) value = value.subarray(1);
    if (value.length > partLength) value = value.subarray(value.length - partLength);
    if (value.length < partLength) value = Buffer.concat([Buffer.alloc(partLength - value.length), value]);
    return value;
  };

  return Buffer.concat([formatPart(r), formatPart(s)]);
}

function createVapidJwt(endpoint: string) {
  const publicKey = getPushPublicKey();
  const privateKey = getPushPrivateKey();
  const publicKeyBytes = base64UrlToBuffer(publicKey);
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('ZIPBOOK_VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.');
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bufferToBase64Url(publicKeyBytes.subarray(1, 33)),
    y: bufferToBase64Url(publicKeyBytes.subarray(33, 65)),
    d: privateKey
  } as JsonWebKey;

  const keyObject = createPrivateKey({ key: jwk, format: 'jwk' });
  const header = bufferToBase64Url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bufferToBase64Url(Buffer.from(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
    sub: getPushContact()
  })));
  const signingInput = `${header}.${payload}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(keyObject);
  return `${signingInput}.${bufferToBase64Url(derToJose(signature, 64))}`;
}

function encryptPushPayload(subscription: StoredPushSubscription, payload: ZipBookPushPayload) {
  const receiverPublicKey = base64UrlToBuffer(subscription.p256dh);
  const authSecret = base64UrlToBuffer(subscription.auth);
  const salt = randomBytes(16);
  const serverCurve = createECDH('prime256v1');
  serverCurve.generateKeys();
  const serverPublicKey = serverCurve.getPublicKey();
  const sharedSecret = serverCurve.computeSecret(receiverPublicKey);

  const prkKey = createHmac('sha256', authSecret).update(sharedSecret).digest();
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), receiverPublicKey, serverPublicKey]);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);
  const prk = createHmac('sha256', salt).update(ikm).digest();
  const contentEncryptionKey = hkdfExpand(prk, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdfExpand(prk, Buffer.from('Content-Encoding: nonce\0'), 12);
  const plaintext = Buffer.concat([Buffer.from(JSON.stringify(payload)), Buffer.from([0x02])]);
  const cipher = createCipheriv('aes-128-gcm', contentEncryptionKey, nonce, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);

  return Buffer.concat([salt, recordSize, Buffer.from([serverPublicKey.length]), serverPublicKey, encrypted]);
}

export async function sendPushNotification(subscription: StoredPushSubscription, payload: ZipBookPushPayload): Promise<PushSendResult> {
  if (!isPushDeliveryConfigured()) {
    return { attempted: false, delivered: false, configured: false, provider: 'web-push' };
  }

  try {
    const body = encryptPushPayload(subscription, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      url: '/book',
      ...payload
    });
    const token = createVapidJwt(subscription.endpoint);
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: String(60 * 60 * 24 * 28),
        Urgency: 'normal',
        'Content-Encoding': 'aes128gcm',
        Authorization: `vapid t=${token}, k=${getPushPublicKey()}`,
        'Content-Type': 'application/octet-stream'
      },
      body
    });

    return {
      attempted: true,
      delivered: response.ok,
      configured: true,
      provider: 'web-push',
      status: response.status,
      invalidSubscription: response.status === 404 || response.status === 410
    };
  } catch (error) {
    return {
      attempted: true,
      delivered: false,
      configured: true,
      provider: 'web-push',
      error: error instanceof Error ? error.message : 'Push delivery failed.'
    };
  }
}
