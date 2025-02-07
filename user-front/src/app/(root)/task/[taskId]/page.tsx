
"use client";
import { Appbar } from "@/components/Appbar";
import { BACKEND_URL } from "@/utils/index";
import axios from "axios";
import { useEffect, useState,use } from "react";
import { print } from "@/utils/index";

interface TaskPageProps {
  params: Promise<{ taskId: string }>; // params 是一个 Promise
}

async function getTaskDetails(taskId: string) {
  const response = await axios.get(
    `${BACKEND_URL}/v1/user/task?taskId=${taskId}`,
    {
      headers: {
        Authorization: localStorage.getItem("token"),
      },
    }
  );
  return response.data;
}

// async function test() {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve({
//         result: {
//           "1": {
//             count: 10,
//             option: {
//               imageUrl: "https://via.placeholder.com/150",
//             },
//           },
//           "2": {
//             count: 20,
//             option: {
//               imageUrl: "https://via.placeholder.com/150",
//             },
//           },
//           "3": {
//             count: 30,
//             option: {
//               imageUrl: "https://via.placeholder.com/150",
//             },
//           },
//         },
//         taskDetails: {
//           title: "Which one do you like?",
//         },
//       });
//     }, 1000);
//   })
// }

export default function Page({ params }: TaskPageProps) {
  const { taskId } = use(params);
  const [optionsDetail, setOptionsDetail] = useState<
    Record<
      string,
      {
        count: number;
        imageUrl: string;
      }
    >
  >({});
  const [taskDetails, setTaskDetails] = useState<{
    title?: string;
  }>({});

  useEffect(() => {
    getTaskDetails(taskId).then((data) => {
      console.log(data);
      setOptionsDetail(data.optionsDetail);
      setTaskDetails(data.taskDetails);
    });
  }, [taskId]);

  Object.keys(optionsDetail || {}).map((taskId) => {
    const imageUrl=optionsDetail[taskId].imageUrl
    const votes=optionsDetail[taskId].count
    print({imageUrl,votes}) 
  })
  return (
    <div>
      <Appbar />
      <div className="text-2xl pt-20 flex justify-center">
        {taskDetails.title}
      </div>
      <div className="flex justify-center pt-8">
        {Object.keys(optionsDetail || {}).map((taskId) => (
          <Task
          key={taskId}
            imageUrl={optionsDetail[taskId].imageUrl}
            votes={optionsDetail[taskId].count}
          />
        ))}
      </div>
    </div>
  );
}

function Task({ imageUrl, votes }: { imageUrl: string; votes: number }) {
  return (
    <div>
      <img className={"p-2 w-96 rounded-md"} src={imageUrl} />
      <div className="flex justify-center">{votes}</div>
    </div>
  );
}
