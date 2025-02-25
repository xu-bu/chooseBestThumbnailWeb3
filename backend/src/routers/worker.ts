import nacl from "tweetnacl";
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import config from "../const";
import { userMiddleware, workerMiddleware } from "../middleware";
import { createSubmissionInput } from "../types";
import { getNextTask } from "../db";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

// we assume 100 people voted, then reward will be devided by 100
const TOTAL_SUBMISSIONS = 100;
const prismaClient = new PrismaClient();
const router = Router();

router.post("/signin", async (req, res) => {
  const { publicKey, signature } = req.body;
  const message = new TextEncoder().encode(
    "Sign into mechanical turks as a worker"
  );
  const result = nacl.sign.detached.verify(
    message,
    new Uint8Array(signature.data),
    new PublicKey(publicKey).toBytes()
  );
  if (!result) {
    res.status(411).json({ message: "Incorrect signature" });
  }

  let existingWorker = await prismaClient.worker.findFirst({
    where: { address: publicKey },
  });

  if (!existingWorker) {
    existingWorker = await prismaClient.worker.create({
      data: {
        address: publicKey,
        pending_amount: 0,
        locked_amount: 0,
      },
    });
  }
  const token = jwt.sign(
    { workerId: existingWorker.id },
    config.WORKER_JWT_SECRET
  );
  res.json({
    token,
    amount: existingWorker.pending_amount / config.lamportsConverter,
  });
});

router.get("/getNextTask", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const workerId = Number(req.workerId);
  // no submissions of the task is done by this worker
  // then it could be the next task
  const nextTask = await getNextTask(workerId);
  if (!nextTask) {
    res.status(411).json({ msg: "no more task available" });
    return;
  }
  res.status(200).json(nextTask);
});

router.get("/balance", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const workerId = Number(req.workerId);
  // no submissions of the task is done by this worker
  // then it could be the next task
  const worker = await prismaClient.worker.findFirst({
    where: {
      id: workerId,
    },
    select: {
      pending_amount: true,
      locked_amount: true,
    },
  });
  if (!worker) {
    res.status(411).json({ msg: "wrong jwt token" });
    return;
  }
  res.status(200).json({
    pendingAmount: worker.pending_amount,
    lockedAmount: worker.locked_amount,
  });
});

router.post("/submission", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const workerId = Number(req.workerId);
  const body = req.body;
  const parsedBody = createSubmissionInput.safeParse(body);
  if (!parsedBody.success) {
    res.status(411).json({ msg: "invalid input" });
    return;
  }
  const task = await getNextTask(workerId);
  if (!task || task.id !== Number(parsedBody.data.taskId)) {
    res.status(411).json({ msg: "incorrect task id" });
    return;
  }
  // how much money this worker got for this submission
  const amount = (Number(task.amount) / TOTAL_SUBMISSIONS).toString();

  await prismaClient.$transaction(async (tx) => {
    await tx.submission.create({
      data: {
        worker_id: workerId,
        task_id: Number(parsedBody.data.taskId),
        option_id: Number(parsedBody.data.selection),
        amount: Number(amount),
      },
    });
    await tx.worker.update({
      where: {
        id: workerId,
      },
      data: {
        pending_amount: {
          increment: Number(amount),
        },
      },
    });
  });
  const nextTask = await getNextTask(workerId);

  res.status(200).json({ nextTask, earned: amount });
});

// worker withdraws the money
router.post("/payout", workerMiddleware, async (req, res) => {
  // @ts-ignore
  const workerId = Number(req.workerId);
  const worker = await prismaClient.worker.findFirst({
    where: {
      id: workerId,
    },
  });
  if (!worker) {
    res.status(403).json({ msg: "User not found" });
    return;
  }
  const address = worker.address;
  const pendingAmount = worker.pending_amount;
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(config.serverPublicKey),
      toPubkey: new PublicKey(address),
      lamports: pendingAmount,
    })
  );
  const keyPair = Keypair.fromSecretKey(bs58.decode(config.serverPrivateKey));
  const connection = new Connection(config.RPC_URL);
  let signature;
  try {
    signature = await sendAndConfirmTransaction(connection, transaction, [
      keyPair,
    ]);
  } catch (e) {
    res.json({
      message: "Transaction failed",
    });
    return;
  }

  await prismaClient.$transaction(async (tx) => {
    await tx.worker.update({
      where: {
        id: workerId,
      },
      data: {
        pending_amount: {
          decrement: pendingAmount,
        },
        locked_amount: {
          increment: pendingAmount,
        },
      },
    });
    await tx.payouts.create({
      data: {
        user_id: workerId,
        amount: pendingAmount,
        signature,
        status: "Processing",
      },
    });
  });

  res.status(200).json({ mewssage: "Processing payout", pendingAmount });
});

export default router;
