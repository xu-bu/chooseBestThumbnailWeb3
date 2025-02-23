'use client'

import React, { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { 
    ConnectionProvider, 
    WalletProvider, 
    useWallet 
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

const WalletInfo = () => {
    const { publicKey, connected, disconnect } = useWallet();
    console.log(publicKey);
    return (
        <div>
            <WalletMultiButton />
            {connected && publicKey ? (
                <div>
                    <p>Connected Wallet: {publicKey.toBase58()}</p>
                    <button onClick={disconnect}>Disconnect</button>
                </div>
            ) : (
                <p>Please connect your wallet</p>
            )}
        </div>
    );
};

export default function Page() {
    const endpoint = clusterApiUrl("devnet"); // 选择 Solana 网络
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletInfo />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
