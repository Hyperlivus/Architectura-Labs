const dotenv = require('dotenv');

dotenv.config({ path: './env/test.env' });

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
}