'use client'

import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/utils/index";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

export const Wallet: FC = () => {
  const { publicKey, signMessage } = useWallet();
  useEffect(() => {
    async function signAndSend() {
      // use user's public key to sign a message to get signature
      // decoded in BE, if decoded text is "Sign into mechanical turks", then the signature is valid and BE will send back token
      const message = new TextEncoder().encode("Sign into mechanical turks");
      const signature = await signMessage?.(message);
      const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
        signature,
        publicKey: publicKey?.toString(),
      });

      localStorage.setItem("token", response.data.token);
    }

    if(!publicKey) return;
    signAndSend();
  }, [publicKey, signMessage]);

  return (
    <WalletModalProvider>
      {publicKey ? <WalletMultiButton />:  <WalletDisconnectButton />}
    </WalletModalProvider>
  );
};
