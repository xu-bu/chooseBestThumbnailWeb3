import dotenv from "dotenv";
dotenv.config();

const config = {
  USER_JWT_SECRET: process.env.JWT_SECRET!,
  WORKER_JWT_SECRET: process.env.JWT_SECRET + "worker",
  accessKey: process.env.ACCESS_KEY!,
  accessSecret: process.env.ACCESS_SECRET!,
  awsRegion: process.env.AWS_REGION!,
  defaultTaskTitle: "Select the most clickable thubnail",
  lamportsConverter: 1000_000_000,
  RPC_URL: process.env.RPC_URL!,
  serverPublicKey: process.env.PARENT_ADDRESS!,
  serverPrivateKey: process.env.SERVER_PRIVATE_KEY!,
};
export default config;
