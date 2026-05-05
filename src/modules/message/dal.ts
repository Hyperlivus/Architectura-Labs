import { getDb } from '../../db/context';
import { Message, MessageCreationAttributes, MessageUpdateAttributes } from './types';

export const messageCommands = {
  async create(data: MessageCreationAttributes): Promise<Message> {
    const result = await getDb().query<{
      id: number;
      chat_id: number;
      user_id: number;
      content: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO messages (chat_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [data.chatId, data.userId, data.content]
    );

    return {
      id: result.rows[0].id,
      chatId: result.rows[0].chat_id,
      userId: result.rows[0].user_id,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  },

  async update(id: number, data: MessageUpdateAttributes): Promise<Message | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await getDb().query<Message>(
      `UPDATE messages SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, chat_id AS "chatId", user_id AS "userId", content, created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<boolean> {
    const result = await getDb().query('DELETE FROM messages WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  },
};

export const messageQueries = {
  async getById(id: number): Promise<Message | null> {
    return getDb().maybeOne<Message>(
      `SELECT id, chat_id AS "chatId", user_id AS "userId", content, created_at AS "createdAt", updated_at AS "updatedAt" FROM messages WHERE id = $1`,
      [id]
    );
  },

  async getByChat(chatId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return getDb().many<Message>(
      `SELECT id, chat_id AS "chatId", user_id AS "userId", content, created_at AS "createdAt", updated_at AS "updatedAt" FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
  },
};

const dal = {
  ...messageQueries,
  ...messageCommands,
};

export default dal;