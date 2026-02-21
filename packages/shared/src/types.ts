export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export type ChannelType = 'text' | 'voice' | 'category' | 'dm' | 'group';

export type MessageType = 'default' | 'reply' | 'thread_starter';

export const PERMISSIONS = {
  MANAGE_CHANNELS: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  READ_MESSAGES: 1 << 2,
  MANAGE_MESSAGES: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
  MANAGE_ROLES: 1 << 6,
  MANAGE_SERVER: 1 << 7,
  CREATE_INVITE: 1 << 8,
  ADD_REACTIONS: 1 << 9,
  MENTION_EVERYONE: 1 << 10,
} as const;

export type PermissionFlag = keyof typeof PERMISSIONS;
