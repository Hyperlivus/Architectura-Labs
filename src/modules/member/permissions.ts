export enum MemberPermission {
  ChatUpdate = 'chatUpdate',
  MemberAdd = 'memberAdd',
  MemberRemove = 'memberRemove',
  MemberPermissions = 'memberPermissions',
}

export type MemberPermissions = {
  [MemberPermission.ChatUpdate]: boolean;
  [MemberPermission.MemberAdd]: boolean;
  [MemberPermission.MemberRemove]: boolean;
  [MemberPermission.MemberPermissions]: boolean;
};