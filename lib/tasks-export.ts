export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export function parseTaskInput(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw new Error('Title is required');
  const status = typeof body.status === 'string' && (TASK_STATUSES as readonly string[]).includes(body.status) ? body.status : 'OPEN';
  return {
    title,
    description: typeof body.description === 'string' ? body.description : null,
    status,
    priority: typeof body.priority === 'string' ? body.priority : 'NORMAL',
    dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
    assignedToId: typeof body.assignedToId === 'string' && body.assignedToId ? body.assignedToId : null,
    patientId: typeof body.patientId === 'string' && body.patientId ? body.patientId : null,
  };
}

export function toCsv(rows: Record<string, unknown>[], fields: string[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [fields.join(','), ...rows.map((r) => fields.map((f) => esc(r[f])).join(','))].join('\n') + '\n';
}
