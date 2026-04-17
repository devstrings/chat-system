import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import axiosInstance from '@/lib/axiosInstance';
import API_BASE_URL from '@/config/api';
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey
} from '@/utils/cryptoUtils';

export default function useCryptoInit() {
  const { currentUser } = useSelector(state => state.auth);

  useEffect(() => {
    if (!currentUser) return;

    const initCrypto = async () => {
      try {
        const userId = currentUser._id || currentUser.id;
        const privateKeyStr = localStorage.getItem(`chat_sk_${userId}`);
        const publicKeyStr = localStorage.getItem(`chat_pk_${userId}`);
        
        // Only generate if we don't have it locally
        if (!privateKeyStr || !publicKeyStr) {
          console.log("Generating new E2EE keypair...");
          const keyPair = await generateKeyPair();
          const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
          const privKeyB64 = await exportPrivateKey(keyPair.privateKey);

          localStorage.setItem(`chat_pk_${userId}`, pubKeyB64);
          localStorage.setItem(`chat_sk_${userId}`, privKeyB64);

          // Upload public key to server
          await axiosInstance.post(`${API_BASE_URL}/api/auth/public-key`, {
            publicKey: pubKeyB64
          });
          console.log("E2EE keypair generated and public key uploaded.");
        }
      } catch (err) {
        console.error("Failed to initialize E2EE keys", err);
      }
    };

    initCrypto();
  }, [currentUser]);
}
