/**
 * Who may connect Claude to Sigil.
 *
 * A Sigil account already means an admin put the address on the access list, so every active
 * account may connect Claude: `profiles.mcp_access` defaults to true. An admin can turn it off per
 * person under Users, which also stops tokens that person already holds at their next call. The
 * spend control is the daily allowance in lib/headless/allowance.ts, not this switch.
 */

export interface AccessProfile {
  id: string
  role: string
  isDisabled: boolean
  mcpAccess: boolean
}

export type RefusalReason = 'no_profile' | 'disabled' | 'admin_decided'

export type ClaudeAccess = { state: 'allowed' } | { state: 'refused'; reason: RefusalReason }

export function claudeAccessFor(profile: AccessProfile | null): ClaudeAccess {
  if (!profile) return { state: 'refused', reason: 'no_profile' }
  if (profile.isDisabled) return { state: 'refused', reason: 'disabled' }
  if (profile.role === 'admin' || profile.mcpAccess) return { state: 'allowed' }
  return { state: 'refused', reason: 'admin_decided' }
}
