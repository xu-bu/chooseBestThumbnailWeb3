"use client";
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL } from "@/utils/index";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// in this page, user needs to firstly make payment
// after treansaction is confirmed, we get the transation signature
// then user can click submit button to submit the task with signature
export const Upload = () => {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  async function onSubmit() {
    const response = await axios.post(
      `${BACKEND_URL}/v1/user/task`,
      {
        options: images.map((image) => ({
          imageUrl: image,
        })),
        title,
        signature: txSignature,
      },
      {
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      }
    );

    router.push(`/task/${response.data.createdTaskID}`);
  }

  async function makePayment() {
    console.log("make payment");
    console.log(publicKey);
    console.log(process.env.NEXT_PUBLIC_SERVER_WALLET_ADDRESS);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey!,
        toPubkey: new PublicKey(process.env.NEXT_PUBLIC_SERVER_WALLET_ADDRESS!),
        lamports: 100000000,
      })
    );
    const {
      context: { slot: minContextSlot },
    } = await connection.getLatestBlockhashAndContext();
    // phantom will pop up here
    const signature = await sendTransaction(transaction, connection, {
      minContextSlot,
    });
    // wait for the transaction to be confirmed
    let status = await connection.getSignatureStatus(signature);

    while (
      status.value === null ||
      status.value?.confirmationStatus ==="processed"
    ) {
      console.log("Transaction is still pending...");
      await new Promise((resolve) => setTimeout(resolve, 500)); // check it every 500ms
      status = await connection.getSignatureStatus(signature);
    }
    if (status.value?.err) {
      throw status.value?.err;
    }
    setTxSignature(signature);
  }

  return (
    <div className="flex justify-center">
      <div className="max-w-screen-lg w-full">
        <div className="text-2xl text-left pt-20 w-full pl-4">
          Create a task
        </div>

        <label className="pl-4 block mt-2 text-md font-medium text-gray-900 text-black">
          Task details
        </label>

        <input
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          type="text"
          id="first_name"
          className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          placeholder="What is your task?"
          required
        />

        <label className="pl-4 block mt-8 text-md font-medium text-gray-900 text-black">
          Add Images
        </label>
        <div className="flex justify-center pt-4 max-w-screen-lg">
          {images.map((image, index) => (
            <UploadImage
              key={index}
              image={image}
              onImageAdded={(imageUrl) => {
                setImages((i) => [...i, imageUrl]);
              }}
            />
          ))}
        </div>

        <div className="ml-4 pt-2 flex justify-center">
          <UploadImage
            onImageAdded={(imageUrl) => {
              setImages((i) => [...i, imageUrl]);
            }}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={txSignature ? onSubmit : makePayment}
            type="button"
            className="mt-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
          >
            {txSignature ? "Submit Task" : "Pay 0.1 SOL"}
          </button>
        </div>
      </div>
    </div>
  );
};
