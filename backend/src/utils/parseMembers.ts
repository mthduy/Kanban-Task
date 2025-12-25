export function parseMembersInput(
  members: string | Array<string | { _id?: string }> | null | undefined
): string[] {
  if (!members) return [];
  if (Array.isArray(members))
    return members.map((m) => (typeof m === 'string' ? m : String(m._id))).map(String);
    if (typeof members === 'string' && members.trim().length) {
    try {
      const parsed = JSON.parse(members);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      return members.split(',').map((s) => String(s).trim()).filter(Boolean);
    }
  }
  return [];
}
