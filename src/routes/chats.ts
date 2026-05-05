import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authGuard } from '../modules/auth/guard';
import chatService from '../modules/chat/service';
import memberService from '../modules/member/service';
import { MemberPermissions, MemberPermission } from '../modules/member/permissions';
import { createChatSchema, updateChatSchema } from '../modules/chat/validation';
import { addMemberSchema, updateMemberPermissionsSchema } from '../modules/member/validation';
import messageService from '../modules/message/service';
import { createMessageSchema, updateMessageSchema } from '../modules/message/validation';

export async function chatRoutes(app: FastifyInstance) {
  app.get('/chats', async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = await authGuard(request);
    const { search, limit = 20, offset = 0 } = request.query as any;
    const chats = await chatService.getUserChats(authUser.id, search, limit, offset);
    reply.send({ chats });
  });

  app.post('/chats', async (request, reply) => {
    const data = createChatSchema.parse(request.body);
    const authUser = await authGuard(request);
    const chat = await chatService.createChat(data, authUser.id);
    reply.send({ chat });
  });

  app.patch('/chats/:chatId', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const data = updateChatSchema.parse(request.body);
    await memberService.validatePermission(request, chatId, MemberPermission.ChatUpdate);
    const chat = await chatService.updateChat(chatId, data);
    reply.send({ chat });
  });

  app.post('/chats/:chatId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const data = addMemberSchema.parse(request.body);
    await memberService.validatePermission(request, chatId, MemberPermission.MemberAdd);
    const member = await memberService.addMemberToChat(data.userId, chatId, data.permissions as MemberPermissions);
    reply.send({ member });
  });

  app.delete('/chats/:chatId/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const memberId = Number((request.params as any).memberId);
    await memberService.validatePermission(request, chatId, MemberPermission.MemberRemove, memberId, true);
    const member = await memberService.removeMember(memberId);
    reply.send({ member });
  });

  app.get('/chats/:chatId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    await memberService.validatePermission(request, chatId, MemberPermission.MemberAdd); // or any permission to view
    const members = await memberService.getByChatId(chatId);
    reply.send({ members });
  });

  app.patch('/chats/:chatId/members/:memberId/permissions', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const memberId = Number((request.params as any).memberId);
    const data = updateMemberPermissionsSchema.parse(request.body);
    await memberService.validatePermission(request, chatId, MemberPermission.MemberPermissions, memberId, true);
    const member = await memberService.updatePermissions(memberId, data.permissions as MemberPermissions);
    reply.send({ member });
  });

  // Messages
  app.post('/chats/:chatId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const data = createMessageSchema.parse(request.body);
    const authUser = await authGuard(request);
    const message = await messageService.createMessage({ chatId, userId: authUser.id, content: data.content });
    reply.send({ message });
  });

  app.patch('/chats/:chatId/messages/:messageId', async (request: FastifyRequest, reply: FastifyReply) => {
    const messageId = Number((request.params as any).messageId);
    const data = updateMessageSchema.parse(request.body);
    const authUser = await authGuard(request);
    const message = await messageService.updateMessage(messageId, authUser.id, data);
    reply.send({ message });
  });

  app.delete('/chats/:chatId/messages/:messageId', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const messageId = Number((request.params as any).messageId);
    const authUser = await authGuard(request);
    await messageService.deleteMessage(messageId, authUser.id, chatId);
    reply.send({ success: true });
  });

  app.get('/chats/:chatId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const chatId = Number((request.params as any).chatId);
    const authUser = await authGuard(request);
    const { limit = 50, offset = 0 } = request.query as any;
    const messages = await messageService.getMessagesByChat(chatId, authUser.id, limit, offset);
    reply.send({ messages });
  });
}
