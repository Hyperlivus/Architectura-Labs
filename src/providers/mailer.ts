import nodemailer from 'nodemailer';
import {MailOptions} from "nodemailer/lib/smtp-pool";


const mailer = {
    sendMail: async (mailOptions: MailOptions) => {
        const account = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            auth: {
                user: account.user,
                pass: account.pass,
            },
        });

        await transporter.sendMail(mailOptions);
    }
}

export default mailer;