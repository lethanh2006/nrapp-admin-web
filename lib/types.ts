export type BadgeTone =
  | "red"
  | "emerald"
  | "amber"
  | "blue"
  | "violet"
  | "cyan"
  | "slate";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeInitial: string;
  department: string;
  due: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "active" | "offline" | "leave";
  joinedAt: string;
  shift: string;
  initial: string;
  tone: BadgeTone;
};

export type ScheduleRequest = {
  id: string;
  employee: string;
  initial: string;
  department: string;
  kind: string;
  schedule: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
};

export type CanteenOrder = {
  id: string;
  code: string;
  table: string;
  customer: string;
  items: string[];
  total: number;
  createdAt: string;
  status: "new" | "confirmed" | "cooking" | "ready" | "completed";
  payment: "paid" | "unpaid";
};

export type Conversation = {
  id: string;
  name: string;
  role: string;
  initial: string;
  online: boolean;
  lastMessage: string;
  time: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  sender: "admin" | "member";
  content: string;
  time: string;
};
