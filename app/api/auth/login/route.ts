import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";
import { setPendingEmail } from "@/lib/auth/cookies";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return validationResponse(["email", "password"]);
    const result = await gatewayRequest<{ message: string; email?: string }>("/auth/login", { method: "POST", body: { email, password } });
    await setPendingEmail(result.email || email);
    return jsonResponse({ message: result.message });
  } catch (error) { return routeErrorResponse(error, "Không thể bắt đầu đăng nhập."); }
}
