import { makeDB } from '../db';

export default makeDB({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    password: process.env.DB_PASSWORD || 'postgres',
    username: process.env.DB_USER || 'postgres',
    name: process.env.DB_NAME || 'chat',
});
