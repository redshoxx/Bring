export const kinds = ['shopping', 'task', 'dinner', 'takeaway', 'pantry', 'appointment', 'expense', 'saving'];
export const defaults = { shopping: true, task: true, dinner: true, takeaway: false, pantry: false, appointment: false, expense: false, saving: false };
export const parseSettings = user => { try { return JSON.parse(user.settings); } catch { return {}; } };
export const shares = (owner, kind) => parseSettings(owner).shares?.[kind] ?? defaults[kind];
export function canRead(user, item, owner) {
  if (item.owner === user.id) return true;
  return user.household === item.household && owner?.household === user.household && item.visibility === 'shared' && shares(owner, item.kind);
}
export function canWrite(user, item, owner) {
  if (item.owner === user.id) return true;
  // Financial, personal inventory and appointments are only editable by their owner.
  return ['shopping','task','dinner'].includes(item.kind) && canRead(user, item, owner);
}
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, household: user.household, settings: parseSettings(user) };
}
