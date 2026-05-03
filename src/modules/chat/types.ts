export type Chat = {
  id: number;
  title: string;
  description: string;
  tag: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatCreationAttributes = Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>;
export type ChatUpdateAttributes = Partial<ChatCreationAttributes>;
