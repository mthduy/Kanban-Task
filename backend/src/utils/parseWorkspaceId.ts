function parseWorkspaceId(ws: string | { _id?: string } | null | undefined): string | null {
  if (!ws) return null;
  if (typeof ws === 'string') {
    const trimmed = ws.trim();
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        const parsedObj = parsed as { _id?: string };
        if (parsedObj && typeof parsedObj._id === 'string') return String(parsedObj._id);
    } catch (e) {
      return trimmed;
    }
  }
  if (typeof ws === 'object' && ws && '_id' in ws) return String(ws._id);
  return null;
}
export { parseWorkspaceId };