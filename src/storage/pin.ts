/**
 * PIN hashing. WebCrypto SHA-256 with a salted input, plus the original
 * non-cryptographic FNV-1a fallback for contexts where `crypto.subtle` is
 * unavailable. The PIN is never stored in clear text.
 */

/** Cheap FNV-1a fallback for contexts without crypto.subtle. */
export function weakHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'w' + (h >>> 0).toString(16);
}

/** Salted PIN hash. Async because WebCrypto is. */
export async function hashPin(pin: string, salt: string | null): Promise<string> {
  const input = String(salt || '') + '|' + String(pin);
  const c = globalThis.crypto;
  if (c && c.subtle) {
    try {
      const buf = await c.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      /* fall through to the weak hash */
    }
  }
  return weakHash(input);
}

export function randomSalt(): string {
  const bytes = new Uint8Array(12);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
