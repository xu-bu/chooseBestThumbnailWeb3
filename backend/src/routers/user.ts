import nacl from "tweetnacl";
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "../const";
import { userMiddleware } from "../middleware";
import { createTaskInput } from "../types";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const prismaClient = new PrismaClient();
const s3Client = new S3Client({
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.accessSecret,
  },
  region: config.awsRegion,
});
const connection = new Connection(config.RPC_URL!);

const router = Router();

router.post("/signin", async (req, res) => {
  const { publicKey, signature } = req.body;
  const message = new TextEncoder().encode("Sign into mechanical turks");
  const result = nacl.sign.detached.verify(
    message,
    new Uint8Array(signature.data),
    new PublicKey(publicKey).toBytes()
  );
  if (!result) {
    res.status(411).json({ message: "Incorrect signature" });
  }

  let existingUser = await prismaClient.user.findFirst({
    where: { address: publicKey },
  });
  if (!existingUser) {
    existingUser = await prismaClient.user.create({
      data: { address: publicKey },
    });
  }

  const token = jwt.sign({ userId: existingUser.id }, config.USER_JWT_SECRET);
  res.json({ token });
});

router.get("/presignedUrl", userMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.userId;
  const params = {
    Bucket: "ap-southeast-2-pictures",
    Key: `${userId}-${Date.now()}-image.jpg`,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024], // 5 MB max
    ],
    Expires: 3600,
  };
  // @ts-ignore
  const { url, fields } = await createPresignedPost(s3Client, params);
  res.json({ preSignedUrl: url, fields });
});

// give userId and taskId in query
// return the count of each option in this task
router.get("/task", userMiddleware, async (req, res): Promise<void> => {
  // @ts-ignore
  const taskId = req.query.taskId;
  // @ts-ignore
  const userId: string = req.userId;
  const taskDetails = await prismaClient.task.findFirst({
    where: {
      id: Number(taskId),
      user_id: Number(userId),
    },
    include: {
      options: true,
    },
  });
  if (!taskDetails) {
    res.status(411).json({ msg: "you don't have access to this task" });
    return;
  }
  // count how many votes for each option of task
  const optionsDetail: Record<
    string,
    {
      count: number;
      imageUrl: string;
    }
  > = {};
  // init options of task
  taskDetails.options.forEach((option) => {
    optionsDetail[option.id] = {
      count: 0,
      imageUrl: option.image_url,
    };
  });
  // aggregate all submissions then we know which image has the larget count
  const allSubmissions = await prismaClient.submission.findMany({
    where: {
      task_id: Number(taskId),
    },
    include: {
      option: true,
    },
  });
  allSubmissions.forEach((submission) => {
    optionsDetail[submission.option_id].count += 1;
  });
  console.log(JSON.stringify({ taskDetails, optionsDetail }));
  res.status(200).json({ taskDetails, optionsDetail });
});

router.post(
  "/task",
  userMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    const userId = req.userId;
    const user=await prismaClient.user.findFirst({where:{id:Number(userId)}});
    // @ts-ignore
    const body = req.body;
    const parseData = createTaskInput.safeParse(body);

    if (!parseData.success) {
      res
        .status(411)
        .json({ msg: "failed to parse input", error: parseData.error });
      return;
    }
    //check if the transaction is valid
    const transaction = await connection.getTransaction(
      parseData.data.signature,
      {
        maxSupportedTransactionVersion: 1,
      }
    );
    // check if the amount is correct
    const moneyReceived =
      (transaction?.meta?.postBalances[1] ?? 0) -
      (transaction?.meta?.preBalances[1] ?? 0);

    if (moneyReceived !== 0.1 * config.lamportsConverter) {
      res.status(411).json({ msg: "Transaction signature/amount incorrect" });
      return;
    }
    //check if transaction paid/sent with wrong address
    const payerAddress = transaction?.transaction?.message.getAccountKeys().get(0)?.toString()??"";
    const receiverAddres = transaction?.transaction?.message.getAccountKeys().get(1)?.toString()??"";

    console.log("payerAddress",payerAddress);
    console.log("receiverAddres",receiverAddres);
    console.log("the user is ",user?.address);
    if(receiverAddres!==process.env.PARENT_ADDRESS){
      res.status(411).json({ msg: "Transaction sent to wrong address" });
      return;
    }
    if(payerAddress!==user?.address){
      res.status(411).json({ msg: "Transaction with wrong payer" });
      return;
    }

    const txRes = await prismaClient.$transaction(async (tx) => {
      const createTaskRes = await tx.task.create({
        data: {
          amount: 0.1 * config.lamportsConverter,
          title: parseData.data.title ?? config.defaultTaskTitle,
          user_id: userId,
          signature: parseData.data.signature,
        },
      });
      // a task could contain multiple options
      await tx.option.createMany({
        data: parseData.data.options.map((option) => ({
          image_url: option.imageUrl,
          task_id: createTaskRes.id,
        })),
      });
      return createTaskRes;
    });

    console.dir("createdTaskID", txRes?.id);
    res.status(200).json({ createdTaskID: txRes?.id });
  }
);

export default router;
