// ============================================================
// جرب حظك — تتبع الحضور الحي (من متصل الآن)
// عدّاد لكل مستخدم (قد يفتح أكثر من اتصال) + إجمالي السوكتات.
// ============================================================

const onlineUsers = new Map<string, number>(); // userId -> عدد الاتصالات الحية
let totalSockets = 0;

export function markUserOnline(userId: string) {
  onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
}

export function markUserOffline(userId: string) {
  const n = (onlineUsers.get(userId) ?? 0) - 1;
  if (n <= 0) onlineUsers.delete(userId);
  else onlineUsers.set(userId, n);
}

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId) ?? 0) > 0;
}

export function onlineUsersCount(): number {
  return onlineUsers.size;
}

export function markSocketConnected() {
  totalSockets += 1;
}

export function markSocketDisconnected() {
  totalSockets = Math.max(0, totalSockets - 1);
}

export function totalSocketCount(): number {
  return totalSockets;
}
