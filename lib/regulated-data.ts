import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function key() {
  const encoded = process.env.REGULATED_DATA_KEY
  if (!encoded) throw new Error('REGULATED_DATA_KEY is required')
  const decoded = Buffer.from(encoded, 'base64')
  if (decoded.length !== 32) throw new Error('REGULATED_DATA_KEY must be a base64-encoded 32-byte key')
  return decoded
}

export function encryptRegulated(value: unknown) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), nonce)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return ['v1', nonce.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.')
}

export function decryptRegulated<T>(encoded: string): T {
  const [version, nonce, tag, ciphertext] = encoded.split('.')
  if (version !== 'v1' || !nonce || !tag || !ciphertext) throw new Error('Invalid regulated-data envelope')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(nonce, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8')) as T
}

export function digestRegulated(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function auditHash(previousHash: string | null, event: Record<string, unknown>) {
  return createHash('sha256').update(`${previousHash ?? 'GENESIS'}|${JSON.stringify(event)}`).digest('hex')
}
