import crypto from 'crypto';

/**
 * Encrypts data using a public key with RSA-OAEP padding.
 * @param {string} publicKeyBase64 - The public key in base64 format (without headers).
 * @param {string} data - The data to encrypt.
 * @returns {string} - The encrypted data in base64 format.
 */
export const encryptWithPublicKey = (publicKeyBase64, data) => {
  if (!publicKeyBase64) return null;
  
  try {
    // Construct PEM if it's missing headers
    let pem = publicKeyBase64;
    if (!pem.includes('-----BEGIN PUBLIC KEY-----')) {
       // Wrap with headers and ensure correct line breaks for PEM format
       pem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    }

    const buffer = Buffer.from(data);
    const encrypted = crypto.publicEncrypt(
      {
        key: pem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer
    );
    return encrypted.toString('base64');
  } catch (error) {
    console.error('RSA Encryption Error:', error);
    return null;
  }
};

/**
 * Generates a random symmetric key.
 * @returns {string} - A random 32-byte key as a hex string.
 */
export const generateSymmetricKey = () => {
  return crypto.randomBytes(32).toString('hex');
};
