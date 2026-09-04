import { gatewayRequest } from "@/lib/api/server";
import { jsonResponse, routeErrorResponse, validationResponse } from "@/lib/api/route-response";
import { clearPendingEmail, getPendingEmail, setSessionCookies } from "@/lib/auth/cookies";
import { normalizeSessionUser } from "@/lib/auth/session-user";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const email = await getPendingEmail();
    if (!email) return jsonResponse({ code: "OTP_SESSION_EXPIRED", message: "Phiên OTP đã hết hạn. Vui lòng đăng nhập lại." }, 400);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    if (!/^\d{6}$/.test(otp)) return validationResponse(["otp"]);
    const result = await gatewayRequest<{ message: string; token: string; refreshToken: string; user: unknown }>("/auth/verify", { method: "POST", body: { email, otp } });
    const user = normalizeSessionUser(result.user);
    if (!user) return jsonResponse({ code: "FORBIDDEN_ROLE", message: "Tài khoản không có quyền truy cập cổng quản trị." }, 403);
    await setSessionCookies(result.token, result.refreshToken); await clearPendingEmail();
    return jsonResponse({ message: result.message, user });
  } catch (error) { return routeErrorResponse(error, "Không thể xác thực OTP."); }
}
