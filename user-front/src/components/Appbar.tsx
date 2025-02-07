"use client";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";
// import { Wallet } from "./Wallet";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import React, { useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/utils/index";

export const Appbar = () => {
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

    if (!publicKey) return;
    signAndSend();
  }, [publicKey, signMessage]);

  return (
    <div className="flex justify-between border-b pb-2 pt-2">
      <div className="text-2xl pl-4 flex justify-center pt-3">Turkify</div>
      <div className="text-xl pr-4 pb-2">
        <WalletModalProvider>
          {publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />}
        </WalletModalProvider>
      </div>
    </div>
  );
};
