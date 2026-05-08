// Supabase Edge Function: hyper-responder (send-push)
// Deploy: supabase functions deploy hyper-responder --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nodus.app';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Helpers VAPID ──────────────────────────────────────────────────────────

function b64UrlToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ToB64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJwt(audience: string): Promise<{ jwt: string; publicKeyB64: string }> {
  const now = Math.floor(Date.now() / 1000);

  const header  = uint8ToB64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = uint8ToB64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 43200,
    sub: VAPID_SUBJECT,
  })));

  const signingInput = `${header}.${payload}`;

  // Importar chave privada como JWK
  const privateKeyJwk = {
    kty: 'EC', crv: 'P-256',
    d: VAPID_PRIVATE_KEY,
    x: VAPID_PUBLIC_KEY.substring(0, 43),
    y: VAPID_PUBLIC_KEY.substring(43, 86),
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk', privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  return {
    jwt: `${signingInput}.${uint8ToB64Url(new Uint8Array(sig))}`,
    publicKeyB64: VAPID_PUBLIC_KEY,
  };
}

// ── Criptografia do payload (aesgcm / RFC 8291 simplificado) ──────────────

async function encryptPayload(
  payloadStr: string,
  clientPublicKeyB64: string,
  clientAuthB64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKeyBytes = b64UrlToUint8(clientPublicKeyB64);
  const clientAuthBytes = b64UrlToUint8(clientAuthB64);

  // Gerar par de chaves efêmero
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveKey', 'deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // Importar chave pública do cliente
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // Derivar segredo compartilhado
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey, 256
  );

  const sharedSecret = new Uint8Array(sharedBits);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK via HKDF-SHA256
  const prkKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuthBytes, info: new Uint8Array(0) },
    prkKey, 256
  );

  // Content encryption key
  const cekInfo = new TextEncoder().encode('Content-Encoding: aesgcm\0');
  const cekKey = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveKey']);
  const contentKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    cekKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt']
  );

  // Nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceKey = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveBits']);
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    nonceKey, 96
  );
  const nonce = new Uint8Array(nonceBits);

  // Padding (2 bytes de padding nulo) + payload
  const payloadBytes = new TextEncoder().encode(payloadStr);
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded.set(payloadBytes, 2);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, padded)
  );

  return { encrypted, salt, serverPublicKey: serverPublicKeyRaw };
}

// ── Enviar uma Web Push ────────────────────────────────────────────────────

async function sendOnePush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string): Promise<void> {
  const origin = new URL(sub.endpoint).origin;
  const { jwt, publicKeyB64 } = await buildVapidJwt(origin);

  const { encrypted, salt, serverPublicKey } = await encryptPayload(payload, sub.p256dh, sub.auth);

  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':    `vapid t=${jwt},k=${publicKeyB64}`,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption':       `salt=${uint8ToB64Url(salt)}`,
      'Crypto-Key':       `dh=${uint8ToB64Url(serverPublicKey)};p256ecdsa=${publicKeyB64}`,
      'TTL':              '86400',
    },
    body: encrypted,
  });

  if (!response.ok && response.status !== 201) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
}

// ── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: { user_id: string; title: string; body: string; link?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { user_id, title, body: message = '', link = '/' } = body;

  console.log(`[push] Received for user=${user_id} title="${title}"`);

  if (!user_id) {
    return new Response('Missing user_id', { status: 400 });
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user_id);

  if (error) {
    console.error('[push] DB error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log(`[push] Found ${subs?.length ?? 0} subscription(s) for user`);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no_subscriptions' }), { status: 200 });
  }

  const payload = JSON.stringify({ title, body: message, link, tag: 'nodus' });
  let sent = 0;
  const errors: string[] = [];

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await sendOnePush(sub, payload);
      sent++;
      console.log(`[push] OK → ${sub.endpoint.slice(0, 60)}`);
    } catch (err) {
      const msg = String(err);
      errors.push(msg);
      console.error(`[push] FAIL → ${msg}`);
      // Remove subscriptions expiradas
      if (msg.includes('410') || msg.includes('404') || msg.includes('Gone')) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        console.log(`[push] Removed expired endpoint`);
      }
    }
  }));

  return new Response(
    JSON.stringify({ sent, total: subs.length, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
