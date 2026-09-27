import { jsonResponse, routeErrorResponse } from "@/lib/api/route-response";
import { sessionGatewayRequest } from "@/lib/auth/server-session";
export const runtime = "nodejs";
const roots = new Set(["auth", "user", "todo", "workschedule", "canteen", "payment", "chat"]);
type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    if (!path.length || !roots.has(path[0]) || path.some((part) => !/^[a-zA-Z0-9._-]+$/.test(part))) return jsonResponse({ code: "INVALID_API_PATH", message: "Đường dẫn API không hợp lệ." }, 400);
    const method = request.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const contentType = request.headers.get("content-type") ?? "";
    const body = method === "GET" || method === "DELETE" || !contentType.includes("application/json")
      ? undefined
      : await request.json().catch(() => undefined);
    const payload = await sessionGatewayRequest<unknown>(`/${path.join("/")}${new URL(request.url).search}`, { method, body });
    return jsonResponse(payload);
  } catch (error) { return routeErrorResponse(error, "Không thể xử lý yêu cầu quản trị."); }
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
