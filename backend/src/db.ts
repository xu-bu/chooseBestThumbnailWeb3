import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

export const getNextTask = async (workerId: number) => {
  console.log(workerId)
  const nextTask = await prismaClient.task.findFirst({
    where: {
      done: false,
      submissions: {
        none: { worker_id: workerId },
      },
    },
    // equal to projection
    select: {
      id: true,
      options: true,
      title: true,
      amount: true,
    },
  });
  return nextTask;
};
