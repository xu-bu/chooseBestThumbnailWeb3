import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "../const";
import { userMiddleware, workerMiddleware } from "../middleware";
import { createSubmissionInput } from "../types";
import { getNextTask } from "../db";

// fake it here
const TOTAL_SUBMISSIONS = 100;

const prismaClient = new PrismaClient();
const client = new S3Client({
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.accessSecret,
  },
  region: config.awsRegion,
});

const router = Router();

router.post("/signin", async (req, res) => {
  const hardcodedWalletAddress = "xxxxxxxx";
  let existingWorker = await prismaClient.worker.findFirst({
    where: { address: hardcodedWalletAddress },
  });
  if (!existingWorker) {
    existingWorker = await prismaClient.worker.create({
      data: {
        address: hardcodedWalletAddress,
        pending_amount: 0,
        locked_amount: 0,
      },
    });
  }
  const token = jwt.sign(
    { workerId: existingWorker.id },
    config.WORKER_JWT_SECRET
  );
  res.json({ token });
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
  res
    .status(200)
    .json({
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
  const txnId="txnId";
  const pendingAmount = worker.pending_amount;
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
        signature: txnId,
        status: "Processing",
      },
    });
  });

  res.status(200).json({ mewssage: "Processing payout", pendingAmount });
});

export default router;
