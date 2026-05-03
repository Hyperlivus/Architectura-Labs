export type User = {
    id: number;
    nickname: string;
    email: string;
    tag: string;
    password: string;
    otp: string | null;
    email_verified: boolean;
}