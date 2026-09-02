import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <section className="surface-card" style={{ width: "min(100%, 460px)", padding: 32, textAlign: "center" }}>
        <span style={{ display: "grid", width: 58, height: 58, margin: "0 auto 16px", placeItems: "center", borderRadius: 18, background: "var(--red-50)", color: "var(--red-600)" }}>
          <Compass size={27} />
        </span>
        <p style={{ margin: 0, color: "var(--red-600)", fontSize: 10, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>Lỗi 404</p>
        <h1 style={{ margin: "7px 0 0", fontSize: 25, fontWeight: 900, letterSpacing: "-.04em" }}>Không tìm thấy trang</h1>
        <p style={{ margin: "10px auto 20px", color: "var(--slate-500)", fontSize: 12, lineHeight: 1.6 }}>Đường dẫn bạn đang mở không tồn tại hoặc đã được di chuyển.</p>
        <Link href="/dashboard" className="button-primary"><ArrowLeft size={16} /> Về bảng điều hành</Link>
      </section>
    </main>
  );
}
