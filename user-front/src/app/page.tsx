"use client";
import { Appbar } from "@/components/Appbar";
import { Hello } from "@/components/Hello";
import { Upload } from "@/components/Upload";
import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export default function Home() {
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT!;

  const wallets = useMemo(() => [], [network]);
  return (
    <main>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <Appbar />
          <Hello />
          <Upload />
        </WalletProvider>
      </ConnectionProvider>
    </main>
  );
}
