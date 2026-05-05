import {LoginScheme, RegisterScheme} from "./validation";
import userService from '../user/service';
import otpService from '../../services/otp';
import jwt from '../../services/jwt';
import bcrypt from "bcrypt";
import {User} from "../user/types";
import {ServerErrorCode, throwServerError} from '../../providers/errors';
import mailer from "../../providers/mailer";
import {AuthenticatedUser} from "./guard";
import db from '../../providers/db';


const service = {
    generateAccessToken(user: User) {
        return jwt.generateToken({ id: user.id }, '1w');
    },

    async getMe({ id }: AuthenticatedUser) {
        const user = await userService.getById(id);
        if (!user) {
            throwServerError({
                code: ServerErrorCode.BAD_REQUEST,
                message: 'user not exist'
            });
        }

        return user;
    },

    async login(data: LoginScheme) {
        const { emailOrTag, password } = data;
        const user = await userService.getByTagOrEmail(emailOrTag);

        if (!user) {
            throwServerError({ code: ServerErrorCode.UNAUTHORIZED, message: 'Invalid credentials' });
        }

        const passwordValid = await bcrypt.compare(password, user.password);

        if (!passwordValid) {
            throwServerError({ code: ServerErrorCode.UNAUTHORIZED, message: 'Invalid credentials' });
        }

        return service.generateAccessToken(user);
    },

    async register(data: RegisterScheme) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const otp = otpService.generateOtp(6);

        const existed = (await Promise.all([
                userService.getByTag(data.tag),
                userService.getByEmail(data.email),
            ]))
                .find(user => {
                    return user !== null;
                });


            if (existed?.tag === data.tag) {
                return throwServerError({
                    code: ServerErrorCode.BAD_REQUEST,
                    message: 'user with this tag already exists',
                })
            }

            if (existed?.email === data.email) {
                return throwServerError({
                code: ServerErrorCode.BAD_REQUEST,
                message: 'user with this email already exists',
            })
        }


        const user = await userService.create({
            nickname: data.nickname,
            tag: data.tag,
            email: data.email,
            password: hashedPassword,
            otp,
        });
        await this.requestOtp(user.id);
        return service.generateAccessToken(user);
    },

    async requestOtp(id: number) {
        const otp = otpService.generateOtp(6);
        const user = await db.withTransaction(async () => {
            const current = await userService.getById(id);
            if (!current) {
                throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'User not found' });
            }
            await userService.update(current.id, { otp });
            return current;
        });
        await mailer.sendMail({
            to: user.email,
            from: 'chat@gmail.com',
            subject: 'New Otp',
            text: `New otp: ${otp}`,
        });

        return otp;
    },

    async verifyOtp(id: number, otp: string) {
        return db.withTransaction(async () => {
            const user = await userService.getById(id);
            if (!user || user.otp !== otp) {
                throwServerError({ code: ServerErrorCode.BAD_REQUEST, message: 'Invalid OTP code' });
            }

            return userService.update(user.id, {
                otp: null,
                email_verified: true,
            });
        });
    }
}

export default service;