import { getDb } from '../../db/context';
import { Chat, ChatCreationAttributes, ChatUpdateAttributes } from './types';

export const chatCommands = {
  async create(data: ChatCreationAttributes): Promise<Chat> {
    return getDb().one<Chat>(`
      INSERT INTO chats (title, description, tag)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, tag, created_at AS "createdAt", updated_at AS "updatedAt"
    `, [data.title, data.description, data.tag]);
  },

  async update(id: number, data: ChatUpdateAttributes): Promise<Chat> {
    const fields = Object.keys(data) as Array<keyof ChatUpdateAttributes>;
    if (fields.length === 0) {
      throw new Error('No fields provided for chat update');
    }

    const values = fields.map((field) => data[field]);
    const setClause = fields
      .map((field, index) => `${field.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`)
      .join(', ');

    return getDb().one<Chat>(
      `UPDATE chats SET ${setClause} WHERE id = $1 RETURNING id, title, description, tag, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, ...values]
    );
  },
};

export const chatQueries = {
  async getById(id: number): Promise<Chat | null> {
    return getDb().maybeOne<Chat>(
      'SELECT id, title, description, tag, created_at AS "createdAt", updated_at AS "updatedAt" FROM chats WHERE id = $1',
      [id]
    );
  },

  async getByIds(ids: number[], search?: string, limit = 20, offset = 0): Promise<Chat[]> {
    let query = 'SELECT id, title, description, tag, created_at AS "createdAt", updated_at AS "updatedAt" FROM chats WHERE id = ANY($1)';
    const params: any[] = [ids];

    if (search) {
      query += ' AND (title ILIKE $2 OR description ILIKE $2 OR tag ILIKE $2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    return getDb().many<Chat>(query, params);
  },
};

const dal = {
  ...chatQueries,
  ...chatCommands,
};

export default dal;
