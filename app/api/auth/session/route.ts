import { jsonResponse, routeErrorResponse } from "@/lib/api/route-response";
import { getCurrentSessionUser, SessionError } from "@/lib/auth/server-session";
export const runtime = "nodejs";
export async function GET() { try { return jsonResponse({ user: await getCurrentSessionUser() }); } catch (error) { return error instanceof SessionError ? jsonResponse({ code: error.code, message: error.message }, error.status) : routeErrorResponse(error, "Không thể kiểm tra phiên."); } }
