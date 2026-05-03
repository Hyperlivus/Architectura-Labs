import z from "zod";


const PASSWORD_REGEXP = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,}$/;
const TAG_REGEXP = /^[a-z_]*$/;

export const loginScheme = z.object({
    emailOrTag: z.string().min(1),
    password: z.string().regex(PASSWORD_REGEXP),
});

export const registerScheme = z.object({
    email: z.email(),
    tag: z.string().regex(TAG_REGEXP),
    nickname: z.string().min(1),
    password: z.string().regex(PASSWORD_REGEXP),
});


export type LoginScheme = z.infer<typeof loginScheme>;
export type RegisterScheme = z.infer<typeof registerScheme>;