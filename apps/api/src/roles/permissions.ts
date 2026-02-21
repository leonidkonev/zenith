export const PERMISSIONS = {
  MANAGE_CHANNELS: 1n << 0n,
  SEND_MESSAGES: 1n << 1n,
  READ_MESSAGES: 1n << 2n,
  MANAGE_MESSAGES: 1n << 3n,
  KICK_MEMBERS: 1n << 4n,
  BAN_MEMBERS: 1n << 5n,
  MANAGE_ROLES: 1n << 6n,
  MANAGE_SERVER: 1n << 7n,
  CREATE_INVITE: 1n << 8n,
  ADD_REACTIONS: 1n << 9n,
  MENTION_EVERYONE: 1n << 10n,
} as const;

const ALL_PERMISSIONS = Object.values(PERMISSIONS).reduce((a, b) => a | b, 0n);

export function hasPermission(userPerms: bigint, flag: keyof typeof PERMISSIONS): boolean {
  return (userPerms & PERMISSIONS[flag]) === PERMISSIONS[flag];
}

export function mergeAllowDeny(base: bigint, allow: bigint, deny: bigint): bigint {
  return (base | allow) & ~deny;
}

export function getOwnerPermissions(): bigint {
  return ALL_PERMISSIONS;
}
