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

// Encrypt plaintext for a set of public keys OR using an existing shared key
// publicKeys is an object: { userId: publicKeyBase64 }
// existingKey is an optional CryptoKey (AES-GCM)
export async function encryptMessage(text, publicKeysObj, existingKey = null) {
  // 1. Use existing key or generate random AES-GCM key
  let aesKey;
  if (existingKey) {
     // existingKey is a hex string
     aesKey = await hexToKey(existingKey);
  } else {
     aesKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

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

  if (existingKey) {
     // If using existing key, we don't need to return encryptedKeys (they are already in the conversation)
     return {
       cipherText: encryptedTextBase64,
       encryptionData: {
         iv: ivBase64,
         isSharedKey: true
       }
     };
  }

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

// Decrypt message using User's private key OR a shared key
export async function decryptMessage(cipherText, encryptedAesKeyB64, ivB64, privateKeyB64, sharedKey = null) {
  if (!cipherText || (!encryptedAesKeyB64 && !sharedKey) || !ivB64) {
      return cipherText; // Probably not encrypted
  }
  try {
    let aesKey;

    if (sharedKey) {
      // sharedKey is a hex string
      aesKey = await hexToKey(sharedKey);
    } else {
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
      aesKey = await window.crypto.subtle.importKey(
        "raw",
        rawAesKey,
        {
          name: "AES-GCM",
        },
        true,
        ["decrypt"]
      );
    }

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
    console.error("Decryption failed:", error.name, error.message);
    if (error.name === "OperationError") {
      return "[Message cannot be decrypted - Key mismatch]";
    }
    return "[Encrypted Message]";
  }
}

// Helper to decrypt a full message object
export async function decryptMessageHelper(msg, currentUserId, sharedKey = null) {
  if (msg && msg.encryptionData && msg.encryptionData.iv) {
    // 1. If using conversation-level shared key
    if (msg.encryptionData.isSharedKey && sharedKey) {
      return await decryptMessage(msg.text, null, msg.encryptionData.iv, null, sharedKey);
    }

    // 2. Fallback to per-message keys (backward compatibility)
    if (msg.encryptionData.keys) {
      const encryptedAesKey = msg.encryptionData.keys[currentUserId];
      if (encryptedAesKey) {
        // Try current private key first
        const privKey = localStorage.getItem(`chat_sk_${currentUserId}`);
        if (privKey) {
           const decodedText = await decryptMessage(msg.text, encryptedAesKey, msg.encryptionData.iv, privKey);
           if (decodedText !== "[Encrypted Message]") {
               return decodedText;
           }
        }
        
        // Fallback to history keys
        const historyJson = localStorage.getItem(`chat_sk_history_${currentUserId}`);
        if (historyJson) {
           const history = JSON.parse(historyJson);
           for (let i = history.length - 1; i >= 0; i--) {
              const oldKey = history[i];
              const decodedTextOld = await decryptMessage(msg.text, encryptedAesKey, msg.encryptionData.iv, oldKey);
              if (decodedTextOld !== "[Encrypted Message]") {
                  return decodedTextOld;
              }
           }
        }
        return "[Encrypted Message]";
      }
    }
  }
  return msg.text;
}

// Function to refresh E2EE key pair and archive old private keys locally
export async function refreshKeyPair(userId) {
  // 1. Archive current private key
  const currentPrivKey = localStorage.getItem(`chat_sk_${userId}`);
  if (currentPrivKey) {
    const historyJson = localStorage.getItem(`chat_sk_history_${userId}`);
    const history = historyJson ? JSON.parse(historyJson) : [];
    history.push(currentPrivKey);
    localStorage.setItem(`chat_sk_history_${userId}`, JSON.stringify(history));
  }

  // 2. Generate new key pair
  const keyPair = await generateKeyPair();
  const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
  const privKeyB64 = await exportPrivateKey(keyPair.privateKey);

  // 3. Save new keys to local storage
  localStorage.setItem(`chat_pk_${userId}`, pubKeyB64);
  localStorage.setItem(`chat_sk_${userId}`, privKeyB64);

  return pubKeyB64;
}

// Decrypt the conversation-level shared key using user's private key
export async function decryptSharedKey(encryptedKeyB64, privateKeyB64) {
  if (!encryptedKeyB64 || !privateKeyB64) return null;
  try {
    const privateKey = await importPrivateKey(privateKeyB64);
    const encryptedKeyArray = new Uint8Array(atob(encryptedKeyB64).split("").map(c => c.charCodeAt(0)));
    
    const decryptedRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyArray
    );

    const hexKey = new TextDecoder().decode(decryptedRaw);
    return hexKey;
  } catch (err) {
    console.error("Shared key decryption failed", err);
    return null;
  }
}

// Convert hex symmetric key to CryptoKey
export async function hexToKey(hex) {
  const binary = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return await window.crypto.subtle.importKey(
    "raw",
    binary.buffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

const arrayBufferToBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToUint8Array = (base64) =>
  new Uint8Array(atob(base64).split("").map((c) => c.charCodeAt(0)));

export async function encryptAttachmentFile(file, sharedKey) {
  if (!sharedKey) return null;
  const aesKey = await hexToKey(sharedKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer,
  );

  return {
    encryptedBlob: new Blob([encrypted], { type: "application/octet-stream" }),
    encryptionData: {
      iv: arrayBufferToBase64(iv.buffer),
      algorithm: "AES-GCM",
    },
    originalFileType: file.type,
  };
}

export async function decryptAttachmentBlob(blob, ivB64, sharedKey) {
  if (!ivB64 || !sharedKey) return blob;
  const aesKey = await hexToKey(sharedKey);
  const iv = base64ToUint8Array(ivB64);
  const encryptedBuffer = await blob.arrayBuffer();
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedBuffer,
  );
  return new Blob([decrypted]);
}
