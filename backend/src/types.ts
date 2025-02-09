import z from 'zod';

export const createTaskInput=z.object({
    options:z.array(z.object({
        imageUrl:z.string(),
    })),
    title:z.string().optional(),
    signature:z.string(),
})

export const createSubmissionInput=z.object({
    taskId:z.string(),
    // slection is the id of option
    selection:z.string(),
})

