import {LoginScheme, RegisterScheme} from "./validation";
import userService from '../user/service';
import otpService from '../../services/otp';
import jwt from '../../services/jwt';
import bcrypt from "bcrypt";
import {User} from "../user/types";
import {ServerErrorCode, throwServerError} from '../../providers/errors';
import mailer from "../../providers/mailer";


const service = {
    generateAccessToken(user: User) {
        return jwt.generateToken({ id: user.id }, '1w');
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

        return service.generateAccessToken(user);
    },

    async getUserById(id: number) {
        return userService.getById(id);
    },

    async requestOtp(id: number) {
        const user = await userService.getById(id);

        if (!user) {
            throwServerError({ code: ServerErrorCode.NOT_FOUND, message: 'User not found' });
        }

        const otp = otpService.generateOtp(6);
        await userService.update(user.id, {
            otp
        });
        mailer.sendMail({
            to: user.email,
            from: 'chat@gmail.com',
            subject: 'New Otp',
            text: `New otp: ${otp}`,
        })
        return otp;
    },

    async verifyOtp(id: number, otp: string) {
        const user = await userService.getById(id);
        if (!user || user.otp !== otp) {
            throwServerError({ code: ServerErrorCode.BAD_REQUEST, message: 'Invalid OTP code' });
        }

        return userService.update(user.id, {
            otp: null,
            email_verified: true,
        });
    }
}

export default service;