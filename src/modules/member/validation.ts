import { z } from 'zod';
import { MemberPermission } from './permissions';

export const addMemberSchema = z.object({
  userId: z.number().int(),
  permissions: z.object({
    [MemberPermission.ChatUpdate]: z.boolean().optional(),
    [MemberPermission.MemberAdd]: z.boolean().optional(),
    [MemberPermission.MemberRemove]: z.boolean().optional(),
    [MemberPermission.MemberPermissions]: z.boolean().optional(),
  }),
});

export const updateMemberPermissionsSchema = z.object({
  permissions: z.object({
    [MemberPermission.ChatUpdate]: z.boolean().optional(),
    [MemberPermission.MemberAdd]: z.boolean().optional(),
    [MemberPermission.MemberRemove]: z.boolean().optional(),
    [MemberPermission.MemberPermissions]: z.boolean().optional(),
  }),
});