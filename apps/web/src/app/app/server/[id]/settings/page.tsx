'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Server = { id: string; name: string; iconUrl: string | null };
type Member = { id: string; user: { id: string; username: string; displayName: string | null }; roles?: { roleId: string }[] };
type Channel = { id: string; name: string; type: string };
type Invite = {
  id: string;
  code: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  channel: { id: string; name: string };
  inviter: { id: string; username: string };
};
type Role = { id: string; name: string; color: string | null; mentionable: boolean; permissions: string; position: number };
type ServerFull = Server & { owner?: { id: string }; members?: Member[]; channels?: Channel[] };

const PERMISSIONS: { key: string; bit: string; label: string }[] = [
  { key: 'MANAGE_CHANNELS', bit: '1', label: 'Manage Channels' },
  { key: 'SEND_MESSAGES', bit: '2', label: 'Send Messages' },
  { key: 'READ_MESSAGES', bit: '4', label: 'Read Messages' },
  { key: 'MANAGE_MESSAGES', bit: '8', label: 'Manage Messages' },
  { key: 'KICK_MEMBERS', bit: '16', label: 'Kick Members' },
  { key: 'BAN_MEMBERS', bit: '32', label: 'Ban Members' },
  { key: 'MANAGE_ROLES', bit: '64', label: 'Manage Roles' },
  { key: 'MANAGE_SERVER', bit: '128', label: 'Manage Server' },
  { key: 'CREATE_INVITE', bit: '256', label: 'Create Invite' },
  { key: 'ADD_REACTIONS', bit: '512', label: 'Add Reactions' },
  { key: 'MENTION_EVERYONE', bit: '1024', label: 'Mention Everyone' },
];

function hasPerm(mask: string | bigint | undefined, flag: string) {
  const v = typeof mask === 'bigint' ? mask : BigInt(mask || '0');
  const f = BigInt(flag);
  return (v & f) === f;
}

export default function ServerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<ServerFull | null>(null);
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#99aab5');
  const [newRoleMentionable, setNewRoleMentionable] = useState(false);
  const [newRolePerms, setNewRolePerms] = useState<bigint>(BigInt(0));

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteChannelId, setInviteChannelId] = useState('');
  const [inviteExpiresIn, setInviteExpiresIn] = useState<number>(86400);
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(0);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [origin, setOrigin] = useState('');

  async function loadServer() {
    if (!id) return;
    try {
      const s = await api<ServerFull>(`/servers/${id}`);
      setServer(s);
      setName(s.name);
      setIconUrl(s.iconUrl || '');
      const firstText = s.channels?.find((c) => c.type === 'text');
      setInviteChannelId((prev) => prev || firstText?.id || '');
    } catch {
      setServer(null);
    }
  }

  async function loadInvites() {
    if (!id) return;
    try {
      const list = await api<Invite[]>(`/invites/servers/${id}`);
      setInvites(list);
    } catch {
      setInvites([]);
    }
  }

  async function loadRoles() {
    if (!id) return;
    try {
      const [r, perms] = await Promise.all([
        api<Role[]>(`/servers/${id}/roles`),
        api<{ canManageRoles: boolean }>(`/servers/${id}/roles/me/can-manage`),
      ]);
      setRoles(r);
      setCanManageRoles(perms.canManageRoles);
    } catch {
      setRoles([]);
      setCanManageRoles(false);
    }
  }

  useEffect(() => {
    loadServer();
    loadInvites();
    loadRoles();
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, [id]);

  const textChannels = useMemo(() => (server?.channels ?? []).filter((c) => c.type === 'text'), [server]);

  async function save() {
    try {
      const updated = await api<ServerFull>(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify({ name, iconUrl }) });
      setServer(updated);
      setMsg('Server settings saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function createInvite() {
    if (!inviteChannelId || creatingInvite) return;
    setCreatingInvite(true);
    setMsg(null);
    try {
      await api<Invite>(`/invites/servers/${id}/channels/${inviteChannelId}`, {
        method: 'POST',
        body: JSON.stringify({
          expiresIn: inviteExpiresIn > 0 ? inviteExpiresIn : undefined,
          maxUses: inviteMaxUses > 0 ? inviteMaxUses : undefined,
        }),
      });
      await loadInvites();
      setMsg('Invite created');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvite(code: string) {
    const url = `${origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setMsg('Invite link copied');
  }

  async function createRole() {
    if (!canManageRoles || !newRoleName.trim()) return;
    try {
      await api(`/servers/${id}/roles`, {
        method: 'POST',
        body: JSON.stringify({ name: newRoleName.trim(), color: newRoleColor, mentionable: newRoleMentionable, permissions: newRolePerms.toString() }),
      });
      setNewRoleName('');
      setNewRolePerms(BigInt(0));
      await loadRoles();
      await loadServer();
      setMsg('Role created');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to create role');
    }
  }

  async function toggleRolePerm(role: Role, bit: string) {
    if (!canManageRoles) return;
    const current = BigInt(role.permissions || '0');
    const b = BigInt(bit);
    const next = hasPerm(current, bit) ? (current & ~b) : (current | b);
    try {
      await api(`/servers/${id}/roles/${role.id}`, { method: 'PATCH', body: JSON.stringify({ permissions: next.toString() }) });
      await loadRoles();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update role');
    }
  }

  async function toggleAssign(roleId: string, memberId: string, assigned: boolean) {
    if (!canManageRoles) return;
    try {
      await api(`/servers/${id}/roles/${roleId}/members/${memberId}`, { method: assigned ? 'DELETE' : 'POST' });
      await loadServer();
      setMsg('Role assignments updated');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to assign role');
    }
  }

  if (!server) return <div className="p-6 text-gray-400">Server not found or no permission</div>;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Server settings</h1>

      <section className="glass-subtle rounded-xl border border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-semibold">General</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
        <input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="Icon URL" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
        <button onClick={save} className="px-4 py-2 rounded bg-space-300 text-white">Save</button>
      </section>

      <section className="glass-subtle rounded-xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Roles</h2>
          <span className="text-xs text-gray-400">{canManageRoles ? 'You can manage roles' : 'You cannot manage roles'}</span>
        </div>

        {canManageRoles ? (
          <div className="grid md:grid-cols-4 gap-2 items-end">
            <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Role name" className="px-3 py-2 rounded bg-space-900 border border-white/10" />
            <input value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} type="color" className="h-10 rounded bg-space-900 border border-white/10" />
            <label className="text-sm text-gray-300 flex items-center gap-2"><input type="checkbox" checked={newRoleMentionable} onChange={(e) => setNewRoleMentionable(e.target.checked)} /> Mentionable</label>
            <button onClick={createRole} className="px-4 py-2 rounded bg-space-300 text-white">Create role</button>
          </div>
        ) : null}

        {canManageRoles ? (
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={hasPerm(newRolePerms, p.bit)} onChange={() => setNewRolePerms((v) => { const b = BigInt(p.bit); return hasPerm(v, p.bit) ? (v & ~b) : (v | b); })} />{p.label}</label>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 pt-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-space-900/30">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color || '#99aab5' }} />
                <span className="font-medium">{r.name}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-xs mb-3">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={hasPerm(r.permissions, p.bit)} disabled={!canManageRoles} onChange={() => toggleRolePerm(r, p.bit)} />
                    {p.label}
                  </label>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2">
                <p className="text-xs text-gray-400 mb-1">Assign members</p>
                <div className="grid md:grid-cols-2 gap-1">
                  {(server.members ?? []).map((m) => {
                    const assigned = Boolean(m.roles?.some((mr) => mr.roleId === r.id));
                    return (
                      <label key={`${r.id}-${m.id}`} className="text-xs text-gray-300 flex items-center gap-2">
                        <input type="checkbox" checked={assigned} disabled={!canManageRoles} onChange={() => toggleAssign(r.id, m.id, assigned)} />
                        {m.user.displayName || m.user.username}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-subtle rounded-xl border border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Invites</h2>
        <p className="text-xs text-gray-400">Create and share invite links for this server.</p>
        <div className="grid md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Channel</label>
            <select value={inviteChannelId} onChange={(e) => setInviteChannelId(e.target.value)} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10">
              {textChannels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Expires (seconds, 0 = never)</label>
            <input type="number" min={0} value={inviteExpiresIn} onChange={(e) => setInviteExpiresIn(Number(e.target.value || 0))} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Max uses (0 = unlimited)</label>
            <input type="number" min={0} value={inviteMaxUses} onChange={(e) => setInviteMaxUses(Number(e.target.value || 0))} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          </div>
        </div>
        <button disabled={creatingInvite || !inviteChannelId} onClick={createInvite} className="px-4 py-2 rounded bg-space-300 text-white disabled:opacity-50">{creatingInvite ? 'Creating...' : 'Create invite'}</button>

        <div className="space-y-2 pt-2">
          {invites.length === 0 ? <p className="text-sm text-gray-500">No invites yet.</p> : invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 bg-space-900/40 px-3 py-2 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100 truncate">{origin}/invite/{inv.code}</p>
                <p className="text-xs text-gray-500">#{inv.channel.name} · uses {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ''} · {inv.expiresAt ? `expires ${new Date(inv.expiresAt).toLocaleString()}` : 'never expires'}</p>
              </div>
              <button onClick={() => copyInvite(inv.code)} className="text-xs px-2 py-1 rounded bg-space-700 hover:bg-space-600">Copy</button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-subtle rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Moderation</h2>
        <p className="text-xs text-gray-400 mb-3">Kick / ban / mute members (requires permissions).</p>
        <div className="space-y-2">
          {(server.members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-2 bg-space-900/40 px-2 py-2 rounded">
              <span className="flex-1 text-sm">{m.user.displayName || m.user.username}</span>
              <button className="text-xs px-2 py-1 rounded bg-red-700/70" onClick={() => api(`/servers/${id}/moderation/kick/${m.user.id}`, { method: 'POST' }).then(() => setMsg('User kicked')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Kick</button>
              <button className="text-xs px-2 py-1 rounded bg-red-900/70" onClick={() => api(`/servers/${id}/moderation/ban/${m.user.id}`, { method: 'POST', body: JSON.stringify({ reason: 'moderation action' }) }).then(() => setMsg('User banned')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Ban</button>
              <button className="text-xs px-2 py-1 rounded bg-yellow-700/70" onClick={() => api(`/servers/${id}/moderation/mute/${m.user.id}`, { method: 'POST', body: JSON.stringify({ seconds: 600 }) }).then(() => setMsg('User muted (10m)')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Mute</button>
            </div>
          ))}
        </div>
      </section>

      {msg ? <p className="text-sm text-gray-300">{msg}</p> : null}
    </div>
  );
}
