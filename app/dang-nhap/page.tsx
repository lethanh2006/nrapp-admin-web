"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dang-nhap.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@hdg.vn");
  const [password, setPassword] = useState("12345678");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState(false);

  const login = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    window.setTimeout(() => router.push("/dashboard"), 650);
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
            <div><strong>126</strong><span>Nhân sự hoạt động</span></div>
            <div><strong>98.4%</strong><span>Hệ thống ổn định</span></div>
            <div><strong>24/7</strong><span>Giám sát vận hành</span></div>
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
              <input name="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@hdg.vn" required />
            </div>
          </label>

          <label className={styles.formGroup}>
            <span>Mật khẩu</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={18} />
              <input name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className={styles.formOptions}>
            <label><input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập</label>
            <button type="button" onClick={() => setRecoveryNotice(true)}>Quên mật khẩu?</button>
          </div>

          <button className={styles.submitButton} type="submit" disabled={loading} aria-busy={loading}>
            {loading ? <><span className={styles.spinner} /><span className="sr-only">Đang đăng nhập</span></> : <>Đăng nhập quản trị <ArrowRight size={18} /></>}
          </button>

          <div className={styles.demoNote}>
            {recoveryNotice ? <Mail size={16} /> : <CheckCircle2 size={16} />}
            <div>
              <strong>{recoveryNotice ? "Đã mô phỏng gửi hướng dẫn khôi phục" : "Tài khoản trình diễn đã được điền sẵn"}</strong>
              <span>{recoveryNotice ? `Hướng dẫn sẽ được gửi tới ${email || "email của bạn"}.` : "Bấm đăng nhập để mở giao diện quản trị."}</span>
            </div>
          </div>
        </form>
        <p className={styles.copyright}>Kết nối nội bộ được bảo mật bởi HDG · © 2026</p>
      </section>
    </main>
  );
}
