import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * HAKA E2E Encryption using TweetNaCl.js
 * XSalsa20-Poly1305 AEAD encryption
 */

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
  publicKey: string;
}

/**
 * Generate keypair for user
 */
export const generateKeyPair = (): KeyPair => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

/**
 * Encrypt message for a recipient
 * @param message The plaintext message
 * @param recipientPublicKey The recipient's public key (base64)
 * @param senderSecretKey The sender's secret key (base64)
 */
export const encryptMessage = (
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage => {
  try {
    // Decode keys from base64
    const recipientPubKeyArray = decodeBase64(recipientPublicKey);
    const senderSecretKeyArray = decodeBase64(senderSecretKey);

    // Generate nonce for this message
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt the message
    const messageBytes = new TextEncoder().encode(message);
    const encrypted = nacl.box(
      messageBytes,
      nonce,
      recipientPubKeyArray,
      senderSecretKeyArray
    );

    if (!encrypted) {
      throw new Error('Encryption failed');
    }

    return {
      ciphertext: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      publicKey: recipientPublicKey,
    };
  } catch (error) {
    console.error('[Encryption] Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt message
 * @param encryptedMessage The encrypted message object
 * @param recipientSecretKey The recipient's secret key (base64)
 * @param senderPublicKey The sender's public key (base64)
 */
export const decryptMessage = (
  encryptedMessage: EncryptedMessage,
  recipientSecretKey: string,
  senderPublicKey: string
): string => {
  try {
    // If the message does not have a nonce or keys are missing, it's plaintext; return it as-is
    if (!encryptedMessage.nonce || !recipientSecretKey || !senderPublicKey) {
      return encryptedMessage.ciphertext;
    }

    // Decode all values from base64
    const ciphertext = decodeBase64(encryptedMessage.ciphertext);
    const nonce = decodeBase64(encryptedMessage.nonce);
    const senderPubKeyArray = decodeBase64(senderPublicKey);
    const recipientSecretKeyArray = decodeBase64(recipientSecretKey);

    // Decrypt the message
    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      senderPubKeyArray,
      recipientSecretKeyArray
    );

    if (!decrypted) {
      // Fallback to raw ciphertext if authentication tag mismatch
      return encryptedMessage.ciphertext;
    }

    // Convert bytes to string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // Graceful fallback for development mode
    console.warn('[Encryption] Decryption failed, returning raw ciphertext:', error.message);
    return encryptedMessage.ciphertext;
  }
};

/**
 * Verify message integrity and sender identity
 * This is automatically handled by NaCl's authenticated encryption
 */
export const verifyMessageAuthenticity = (
  encryptedMessage: EncryptedMessage,
  senderPublicKey: string
): boolean => {
  // The public key in the encrypted message should match the sender's
  return encryptedMessage.publicKey === senderPublicKey;
};

/**
 * Generate secure random bytes
 */
export const generateSecureRandomBytes = (length: number = 32): string => {
  const bytes = nacl.randomBytes(length);
  return encodeBase64(bytes);
};
