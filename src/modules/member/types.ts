export type Member = {
  id: number;
  userId: number;
  chatId: number;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MemberCreationAttributes = Omit<Member, 'id' | 'createdAt' | 'updatedAt'>;
