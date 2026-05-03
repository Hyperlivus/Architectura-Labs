import db from '../../providers/db';
import { Member, MemberCreationAttributes } from './types';
import { MemberPermissions } from './permissions';

const dal = {
  async create(data: MemberCreationAttributes): Promise<Member> {
    return db.one<Member>(`
      INSERT INTO members (user_id, chat_id, banned)
      VALUES ($1, $2, $3)
      RETURNING id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt"
    `, [data.userId, data.chatId, data.banned]);
  },

  async getById(id: number): Promise<Member | null> {
    return db.maybeOne<Member>(
      'SELECT id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt" FROM members WHERE id = $1',
      [id]
    );
  },

  async getByUserAndChat(userId: number, chatId: number): Promise<Member | null> {
    return db.maybeOne<Member>(
      'SELECT id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt" FROM members WHERE user_id = $1 AND chat_id = $2',
      [userId, chatId]
    );
  },

  async getByUserId(userId: number): Promise<Member[]> {
    return db.many<Member>(
      'SELECT id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt" FROM members WHERE user_id = $1 AND banned = false',
      [userId]
    );
  },

  async getByChatId(chatId: number): Promise<Member[]> {
    return db.many<Member>(
      'SELECT id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt" FROM members WHERE chat_id = $1 AND banned = false',
      [chatId]
    );
  },

  async update(id: number, data: Partial<Omit<Member, 'id'>>): Promise<Member> {
    const fields = Object.keys(data) as Array<keyof Omit<Member, 'id'>>;
    if (fields.length === 0) {
      throw new Error('No fields provided for member update');
    }

    const values = fields.map((field) => data[field]);
    const setClause = fields
      .map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`)
      .join(', ');

    return db.one<Member>(
      `UPDATE members SET ${setClause} WHERE id = $1 RETURNING id, user_id AS "userId", chat_id AS "chatId", banned, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, ...values]
    );
  },

  async createPermissions(memberId: number, permissions: MemberPermissions): Promise<void> {
    await db.query(`
      INSERT INTO member_permissions (member_id, permissions)
      VALUES ($1, $2)
      ON CONFLICT (member_id) DO UPDATE SET permissions = $2
    `, [memberId, JSON.stringify(permissions)]);
  },

  async getPermissions(memberId: number): Promise<MemberPermissions> {
    const row = await db.maybeOne<{ permissions: string }>('SELECT permissions FROM member_permissions WHERE member_id = $1', [memberId]);
    return row ? JSON.parse(row.permissions) : { chatUpdate: false, memberAdd: false, memberRemove: false, memberPermissions: false };
  },

  async updatePermissions(memberId: number, permissions: MemberPermissions): Promise<void> {
    await db.query(`
      UPDATE member_permissions SET permissions = $1 WHERE member_id = $2
    `, [JSON.stringify(permissions), memberId]);
  },
};

export default dal;
