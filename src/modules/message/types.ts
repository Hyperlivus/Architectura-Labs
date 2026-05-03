export interface Message {
  id: number;
  chatId: number;
  userId: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageCreationAttributes {
  chatId: number;
  userId: number;
  content: string;
}

export interface MessageUpdateAttributes {
  content?: string;
}