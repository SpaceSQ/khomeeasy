export type WorkspaceKind = 'owner' | 'installer' | 'unknown';

/** Manage chooses a surface from profiles.role. Anything else is not treated as an owner. */
export function workspaceForRole(role: string | null | undefined): WorkspaceKind {
  if (role === 'installer') {
    return 'installer';
  }
  if (role === 'homeowner') {
    return 'owner';
  }
  return 'unknown';
}
