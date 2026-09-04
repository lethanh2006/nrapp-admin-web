import { clearSessionCookies } from "@/lib/auth/cookies";
import { jsonResponse } from "@/lib/api/route-response";
export const runtime = "nodejs";
export async function POST() { await clearSessionCookies(); return jsonResponse({ message: "Đã đăng xuất." }); }
