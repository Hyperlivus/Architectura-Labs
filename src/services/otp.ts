const DIGITS = Array.from({ length: 10 }, (_, index) => index.toString());

const otp = {
  generateOtp(length: number, charset: string[] = DIGITS): string {
    let result = '';

    for (let i = 0; i < length; i ++) {
        const idx = Math.floor(Math.random() * charset.length);
        const char = charset[idx];
        result += char;
    }

    return result;
  },
};

export default otp;