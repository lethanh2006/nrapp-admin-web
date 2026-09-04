import type { BadgeTone, CanteenOrder, Employee, ScheduleRequest, Task } from "@/lib/types";

export type ApiUser = { _id: string; name?: string; username?: string; email?: string; role?: string };
export type ApiTask = {
  _id: string; title: string; description?: string; status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high"; assignedTo?: string | ApiUser; createdBy?: string | ApiUser;
  deadline?: string; createdAt?: string; updatedAt?: string;
};
export type ApiTaskPage = { tasks: ApiTask[]; pagination?: { total: number } };
export type ApiScheduleEntry = { date: string; type: "office" | "remote" | "day_off" | "leave"; period?: "full_day" | "morning" | "afternoon"; note?: string };
export type ApiScheduleRequest = {
  _id: string; employee_id: string; week_start: string; status: "pending" | "approved" | "rejected";
  submitted_at?: string; reject_reason?: string; employee?: ApiUser | null; entries?: ApiScheduleEntry[];
};
export type ApiWorkRequest = {
  _id: string; employee_id: string; type: "leave" | "late" | "early" | "overtime" | "business_trip" | "remote";
  status: "pending" | "approved" | "rejected" | "cancelled"; start_at: string; end_at?: string;
  period: "full_day" | "morning" | "afternoon"; reason: string; employee?: ApiUser | null; createdAt?: string;
};
export type ApiAttendance = { _id: string; employee_id: string; date: string; schedule_type: "office" | "remote"; check_in_at?: string; check_out_at?: string; source: "qr" | "schedule"; employee?: ApiUser | null };
export type ApiPolicy = { registration_start: string; registration_end: string; locked?: boolean };
export type ApiHeatmapRow = { _id: string; stats: Array<{ type: ApiScheduleEntry["type"]; count: number }> };
export type ApiOrderStatus = "CREATED" | "CONFIRMED" | "COOKING" | "READY" | "COMPLETED" | "PAID" | "CANCELLED";
export type ApiOrder = {
  _id: string; orderNumber: string; userId: string; tableId?: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  finalAmount: number; status: ApiOrderStatus; paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  paymentMethod: string; createdAt: string;
};
export type ApiOrderPage = { orders: ApiOrder[]; pagination?: { total: number } };
export type ApiMenuItem = { _id: string; categoryId: string; name: string; description?: string; price: number; imageUrl?: string; isAvailable: boolean; options?: Array<{ name: string; price: number }> };
export type ApiCategory = { _id: string; name: string; description?: string; displayOrder?: number; isActive?: boolean };
export type ApiMenuCatalog = { categories: ApiCategory[]; items: ApiMenuItem[] };
export type ApiIngredient = { _id: string; name: string; unit: string; minimumThreshold: number; updatedAt?: string };
export type ApiExpiryAlert = { batchId: string; ingredientId: string; ingredientName: string; unit: string; expiryDate: string; quantity: number; originalQuantity: number; supplier?: string };
export type ApiTopDish = { menuItemId: string; name: string; salesCount: number; totalRevenue: number };
export type ApiListResponse<T> = { success: true; data: T[]; meta?: { total: number } };
export type ApiChatRecord = { _id: string; users: string[]; latestMessage: { text: string; sender: string } | null; updatedAt: string; unseenCount: number };
export type ApiChatListItem = { user: { user?: ApiUser } | ApiUser; chat: ApiChatRecord };
export type ApiMessage = { _id: string; chatId: string; sender: string; text?: string; messageType: "text" | "image"; createdAt: string };

export function unwrapData<T>(value: T | { data: T }): T {
  return typeof value === "object" && value !== null && "data" in value ? (value as { data: T }).data : value as T;
}
export function userName(user?: ApiUser | null) { return user?.name?.trim() || user?.username?.trim() || user?.email?.split("@")[0] || "Người dùng"; }
export function initials(name: string) { const words = name.trim().split(/\s+/).filter(Boolean); return words.length ? words.slice(-2).map((word) => word[0]?.toLocaleUpperCase("vi") ?? "").join("") : "ND"; }
export function formatDateTime(value?: string) {
  if (!value) return "Chưa cập nhật"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

const roleLabels: Record<string, string> = { admin: "Quản trị viên", manager: "Quản lý", chef: "Bếp trưởng", cashier: "Thu ngân", waiter: "Phục vụ", user: "Nhân viên", vip: "Khách VIP" };
const tones: BadgeTone[] = ["red", "violet", "blue", "amber", "emerald", "cyan", "slate"];
export function toEmployee(user: ApiUser, index = 0): Employee {
  const name = userName(user);
  return { id: user._id, name, email: user.email ?? "Chưa cập nhật", phone: "Chưa cập nhật", role: roleLabels[user.role ?? ""] ?? user.role ?? "Thành viên", department: "Chưa có phòng ban", status: "active", joinedAt: "Chưa có dữ liệu", shift: "Chưa có dữ liệu", initial: initials(name), tone: tones[index % tones.length] };
}
export function toTask(task: ApiTask): Task | null {
  if (task.status === "cancelled") return null;
  const assignee = typeof task.assignedTo === "object" ? task.assignedTo : undefined;
  const name = userName(assignee);
  return { id: task._id, title: task.title, description: task.description?.trim() || "Không có mô tả.", assignee: name, assigneeInitial: initials(name), department: "NRApp", due: formatDateTime(task.deadline), status: task.status, priority: task.priority, progress: task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0 };
}
export function toScheduleRequest(request: ApiScheduleRequest): ScheduleRequest {
  const name = userName(request.employee);
  const working = (request.entries ?? []).filter((entry) => entry.type === "office" || entry.type === "remote").length;
  return { id: request._id, employee: name, initial: initials(name), department: request.employee?.role ? roleLabels[request.employee.role] ?? request.employee.role : "Nhân sự", kind: "Đăng ký lịch tuần", schedule: `${formatDateTime(request.week_start).split(" ")[0]} · ${working} ngày làm`, submittedAt: formatDateTime(request.submitted_at), status: request.status };
}
export function toCanteenOrder(order: ApiOrder): CanteenOrder | null {
  if (order.status === "CANCELLED") return null;
  const status: CanteenOrder["status"] = order.status === "CREATED" ? "new" : order.status === "CONFIRMED" ? "confirmed" : order.status === "COOKING" ? "cooking" : order.status === "READY" ? "ready" : "completed";
  return { id: order._id, code: order.orderNumber, table: order.tableId || "Mang đi", customer: order.userId, items: order.items.map((item) => `${item.name} × ${item.quantity}`), total: order.finalAmount, createdAt: formatDateTime(order.createdAt), status, payment: order.paymentStatus === "PAID" ? "paid" : "unpaid" };
}
