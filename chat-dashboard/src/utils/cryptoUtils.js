// src/utils/cryptoUtils.js

// Generate RSA-OAEP Key Pair
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
  return keyPair;
}

// Export Public Key to Base64 String
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
}

// Export Private Key to Base64 String (for saving in localStorage)
export async function exportPrivateKey(privateKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedAsString);
}

// Import Public Key from Base64
export async function importPublicKey(pem) {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Import Private Key from Base64
export async function importPrivateKey(pem) {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Encrypt plaintext for a set of public keys
// publicKeys is an object: { userId: publicKeyBase64 }
export async function encryptMessage(text, publicKeysObj) {
  // 1. Generate random AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt the text using AES-GCM
  const encodedText = new TextEncoder().encode(text);
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedText
  );
  
  const encryptedTextBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(encryptedContent)));
  const ivBase64 = btoa(String.fromCharCode.apply(null, iv));

  // 4. Export the AES raw key to encrypt it with RSA
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 5. Encrypt the AES key for each participant's public key
  const encryptedKeys = {};
  for (const [userId, pubKeyB64] of Object.entries(publicKeysObj)) {
    if (!pubKeyB64) continue;
    try {
      const rsaPubKey = await importPublicKey(pubKeyB64);
      const encryptedAesKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        rsaPubKey,
        rawAesKey
      );
      encryptedKeys[userId] = btoa(String.fromCharCode.apply(null, new Uint8Array(encryptedAesKey)));
    } catch (err) {
      console.error(`Failed to encrypt for user ${userId}`, err);
    }
  }

  return {
    cipherText: encryptedTextBase64,
    encryptionData: {
      iv: ivBase64,
      keys: encryptedKeys
    }
  };
}

// Decrypt message using User's private key
export async function decryptMessage(cipherText, encryptedAesKeyB64, ivB64, privateKeyB64) {
  if (!cipherText || !encryptedAesKeyB64 || !ivB64 || !privateKeyB64) {
      return cipherText; // Probably not encrypted
  }
  try {
    // 1. Import Private Key
    const privateKey = await importPrivateKey(privateKeyB64);

    // 2. Decrypt the AES key
    const encryptedAesKeyArray = new Uint8Array(atob(encryptedAesKeyB64).split("").map(c => c.charCodeAt(0)));
    const rawAesKey = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP"
      },
      privateKey,
      encryptedAesKeyArray
    );

    // 3. Import the AES Key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      {
        name: "AES-GCM",
      },
      true,
      ["decrypt"]
    );

    // 4. Decrypt the message
    const ivArray = new Uint8Array(atob(ivB64).split("").map(c => c.charCodeAt(0)));
    const cipherTextArray = new Uint8Array(atob(cipherText).split("").map(c => c.charCodeAt(0)));

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivArray,
      },
      aesKey,
      cipherTextArray
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    console.error("Decryption failed", error);
    return "[Encrypted Message]";
  }
}

// Helper to decrypt a full message object
export async function decryptMessageHelper(msg, currentUserId) {
  if (msg && msg.encryptionData && msg.encryptionData.iv && msg.encryptionData.keys) {
    const encryptedAesKey = msg.encryptionData.keys[currentUserId];
    if (encryptedAesKey) {
      const privKey = localStorage.getItem(`chat_sk_${currentUserId}`);
      if (privKey) {
         return await decryptMessage(msg.text, encryptedAesKey, msg.encryptionData.iv, privKey);
      }
    }
  }
  return msg.text;
}
