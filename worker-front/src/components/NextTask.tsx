'use client'

import React, { use, useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../utils/index";

interface Task {
  id: number;
  options: {
    id: number;
    image_url: string;
    task_id: number;
  }[];
  title: string;
  amount: number;
}
export const NextTask = () => {
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${BACKEND_URL}/v1/worker/getNextTask`, {
        headers: {
          Authorization: localStorage.getItem("workerToken"),
        },
      })
      .then((response) => {
        setNextTask(response.data);
        setLoading(false);
      });
  }, []);
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!nextTask) {
    return <div>now you have no more tasks</div>;
  }
  return <div>
        <div className='text-2xl pt-20 flex justify-center'>
            {nextTask.title}
            <div className="pl-4">
                {submitting && "Submitting..."}
            </div>
        </div>
        <div className='flex justify-center pt-8'>
            {nextTask.options.map(option => <Option onSelect={async () => {
                setSubmitting(true);
                try {
                    const response: { data:{nextTask:Task} } = await axios.post(`${BACKEND_URL}/v1/worker/submission`, {
                        taskId: nextTask?.id.toString() || '',
                        selection: option.id.toString()
                    }, {
                        headers: {
                            "Authorization": localStorage.getItem("workerToken")
                        }
                    });
    
                    const newNextTask = response.data.nextTask || null;
                    setNextTask(newNextTask)
                    // refresh the user balance in the appbar
                } catch(e) {
                    console.log(e);
                }
                setSubmitting(false);

            }} key={option.id} imageUrl={option.image_url} />)}
        </div>
    </div>
};

function Option({imageUrl, onSelect}: {
    imageUrl: string;
    onSelect: () => void;
}) {
    return <div>
        <img onClick={onSelect} className={"p-2 w-96 rounded-md"} src={imageUrl} />
    </div>
}