import db from '../../providers/db';
import { User } from './types';

export interface UserCreationAttributes {
    email: string;
    nickname: string;
    tag: string;
    password: string;
    otp?: string;
}
export type UpdatedUser = Omit<User, 'id'>;

const dal = {
    async create(data: UserCreationAttributes): Promise<User> {
        const result = await db.one<User>(`
            INSERT INTO users (nickname, email, tag, password, otp, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [data.nickname, data.email, data.tag, data.password, data.otp ?? '', false]);
        return result;
    },
    async getByTag(tag: string): Promise<User | null> {
        return db.maybeOne<User>('SELECT * FROM users WHERE tag = $1', [tag]);
    },
    async getByEmail(email: string): Promise<User | null> {
        return db.maybeOne<User>('SELECT * FROM users WHERE email = $1', [email]);
    },
    async getById(id: number): Promise<User | null> {
        return db.maybeOne<User>('SELECT * FROM users WHERE id = $1', [id]);
    },
    async getByEmailOrTag(value: string): Promise<User | null> {
        return db.maybeOne<User>('SELECT * FROM users WHERE email = $1 OR tag = $2', [value]);
    },
    async update(id: number, updated: Partial<UpdatedUser>): Promise<User> {
        const fields = Object.keys(updated) as Array<keyof UpdatedUser>;

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }


        const values = fields.map((field) => updated[field]);
        const setClause = fields
            .map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`)
            .join(', ');

        const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
        return db.one<User>(query, [id, ...values]);
    }
}

export default dal;