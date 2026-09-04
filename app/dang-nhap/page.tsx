"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import type { SessionUser } from "@/lib/auth/session-user";
import styles from "./dang-nhap.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticatedUser } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (step === "credentials" && (!email.trim() || !password)) return;
    if (step === "otp" && !/^\d{6}$/.test(otp)) { setNotice("Vui lòng nhập đủ 6 chữ số OTP."); return; }
    setLoading(true);
    try {
      if (step === "credentials") {
        const result = await apiRequest<{ message: string }>("/api/auth/login", { method: "POST", json: { email: email.trim().toLowerCase(), password } });
        setStep("otp");
        setNotice(result.message || "Mã OTP đã được gửi tới email của bạn.");
      } else {
        const result = await apiRequest<{ user: SessionUser }>("/api/auth/verify", { method: "POST", json: { otp } });
        setAuthenticatedUser(result.user);
        const redirect = new URLSearchParams(window.location.search).get("redirect");
        router.replace(redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard");
        router.refresh();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.visualPanel}>
        <div className={styles.visualImage} />
        <div className={styles.visualContent}>
          <div className={styles.brand}>
            <span>HD</span>
            <div><strong>WorkSpace</strong><small>Admin Center</small></div>
          </div>
          <div className={styles.visualCopy}>
            <span className={styles.visualPill}><Sparkles size={14} /> Không gian quản trị tập trung</span>
            <h1>Một nơi để điều hành toàn bộ hoạt động nội bộ.</h1>
            <p>Theo dõi nhân sự, lịch làm, công việc và vận hành căn tin với dữ liệu rõ ràng theo thời gian thực.</p>
          </div>
          <div className={styles.visualStats}>
            <div><strong>API</strong><span>NRApp Gateway</span></div>
            <div><strong>OTP</strong><span>Xác thực email</span></div>
            <div><strong>BFF</strong><span>Cookie HttpOnly</span></div>
          </div>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}>
          <span>HD</span><div><strong>WorkSpace</strong><small>Admin Center</small></div>
        </div>
        <form className={styles.loginCard} onSubmit={login}>
          <div className={styles.securityMark}><ShieldCheck size={20} /></div>
          <p className={styles.eyebrow}>HDG WorkSpace</p>
          <h2>Chào mừng trở lại</h2>
          <p className={styles.subtitle}>Đăng nhập để tiếp tục truy cập trung tâm điều hành của bạn.</p>

          <label className={styles.formGroup}>
            <span>Email công việc</span>
            <div className={styles.inputWrap}>
              <Mail size={18} />
              <input name="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@hdg.vn" required disabled={loading || step === "otp"} />
            </div>
          </label>

          {step === "credentials" ? <label className={styles.formGroup}>
            <span>Mật khẩu</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={18} />
              <input name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required disabled={loading} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label> : <label className={styles.formGroup}>
            <span>Mã OTP</span>
            <div className={styles.inputWrap}><LockKeyhole size={18} /><input name="otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Nhập 6 chữ số" required disabled={loading} /></div>
          </label>}

          <div className={styles.formOptions}>
            <label><input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập</label>
            <button type="button" onClick={() => setNotice("Vui lòng liên hệ IT nội bộ để đặt lại mật khẩu.")}>Quên mật khẩu?</button>
          </div>

          <button className={styles.submitButton} type="submit" disabled={loading} aria-busy={loading}>
            {loading ? <><span className={styles.spinner} /><span className="sr-only">Đang đăng nhập</span></> : <>{step === "credentials" ? "Tiếp tục nhận OTP" : "Xác nhận đăng nhập"} <ArrowRight size={18} /></>}
          </button>

          {notice ? <div className={styles.notice} role="status">
            <Mail size={16} />
            <div>
              <strong>{step === "otp" ? "Xác thực hai bước" : "Thông báo đăng nhập"}</strong>
              <span>{notice}</span>
            </div>
          </div> : null}
        </form>
        <p className={styles.copyright}>Kết nối nội bộ được bảo mật bởi HDG · © {new Date().getFullYear()}</p>
      </section>
    </main>
  );
}
