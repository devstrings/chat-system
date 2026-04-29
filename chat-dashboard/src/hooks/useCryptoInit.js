import { useEffect } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "@/lib/axiosInstance";
import API_BASE_URL from "@/config/api";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
} from "@/utils/cryptoUtils";

export default function useCryptoInit() {
  const { currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!currentUser) return;

    const initCrypto = async () => {
      try {
        const userId = currentUser._id || currentUser.id;
        const privateKeyStr = localStorage.getItem(`chat_sk_${userId}`);
        const publicKeyStr = localStorage.getItem(`chat_pk_${userId}`);

        if (!privateKeyStr || !publicKeyStr) {
          const cloudBackupRes = await axiosInstance.get(
            `${API_BASE_URL}/api/auth/key-backup`,
          );
          const cloudBackup = cloudBackupRes?.data?.keyBackup;
          if (cloudBackup?.publicKey && cloudBackup?.privateKey) {
            localStorage.setItem(`chat_pk_${userId}`, cloudBackup.publicKey);
            localStorage.setItem(`chat_sk_${userId}`, cloudBackup.privateKey);
            await axiosInstance.post(`${API_BASE_URL}/api/auth/public-key`, {
              publicKey: cloudBackup.publicKey,
            });
          } else {
            const keyPair = await generateKeyPair();
            const pubKeyB64 = await exportPublicKey(keyPair.publicKey);
            const privKeyB64 = await exportPrivateKey(keyPair.privateKey);

            localStorage.setItem(`chat_pk_${userId}`, pubKeyB64);
            localStorage.setItem(`chat_sk_${userId}`, privKeyB64);

            await axiosInstance.post(`${API_BASE_URL}/api/auth/public-key`, {
              publicKey: pubKeyB64,
            });

            await axiosInstance.post(`${API_BASE_URL}/api/auth/key-backup`, {
              publicKey: pubKeyB64,
              privateKey: privKeyB64,
            });
          }
        }

        if (privateKeyStr && publicKeyStr) {
          try {
            const cloudBackupRes = await axiosInstance.get(
              `${API_BASE_URL}/api/auth/key-backup`,
            );
            const cloudBackup = cloudBackupRes?.data?.keyBackup;
            if (!cloudBackup?.privateKey) {
              await axiosInstance.post(`${API_BASE_URL}/api/auth/key-backup`, {
                publicKey: publicKeyStr,
                privateKey: privateKeyStr,
              });
            }
          } catch (err) {
            console.error("Failed to sync key backup", err);
          }
        }
      } catch (err) {
        console.error("Failed to initialize E2EE keys", err);
      }
    };

    initCrypto();
  }, [currentUser]);
}
