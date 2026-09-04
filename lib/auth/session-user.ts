export const adminAreaRoles = ["admin"] as const;
export type AdminAreaRole = (typeof adminAreaRoles)[number];
export type SessionUser = { id: string; name: string; username?: string; email: string; role: AdminAreaRole };

export function normalizeSessionUser(raw: unknown): SessionUser | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const id = String(value._id ?? "").trim();
  const email = String(value.email ?? "").trim().toLowerCase();
  const role = String(value.role ?? "").trim().toLowerCase();
  if (!id || !email || !adminAreaRoles.includes(role as AdminAreaRole)) return null;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  return { id, email, role: role as AdminAreaRole, name: name || username || email.split("@")[0], ...(username ? { username } : {}) };
}
export function getUserInitials(name: string) { const words = name.trim().split(/\s+/).filter(Boolean); return words.length ? words.slice(-2).map((word) => word[0]?.toLocaleUpperCase("vi") ?? "").join("") : "QT"; }
export function getRoleLabel(role?: string) { return ({ admin: "Quản trị viên", manager: "Quản lý", chef: "Bếp trưởng", cashier: "Thu ngân", waiter: "Phục vụ" } as Record<string, string>)[role ?? ""] ?? "Nhân sự vận hành"; }
