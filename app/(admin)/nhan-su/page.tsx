"use client";

import {
  CheckCircle2,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { initials, roleLabels, userName, type ApiUser } from "@/lib/api/domain";
import { gatewayApi } from "@/lib/api/gateway";
import styles from "./nhan-su.module.css";

type AppRole = "admin" | "user";
type Editor =
  | { mode: "create"; username: string; email: string; password: string; role: AppRole }
  | { mode: "role"; user: ApiUser; role: AppRole };

function roleOf(user: ApiUser): AppRole {
  return user.role?.toLowerCase() === "admin" ? "admin" : "user";
}

export default function EmployeeDirectoryPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await gatewayApi<{ users: ApiUser[] }>("user/user/all");
      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách tài khoản.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadUsers); }, [loadUsers]);
  useEffect(() => {
    if (!editor) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setEditor(null); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); };
  }, [editor]);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    return users.filter((user) => {
      if (roleFilter !== "all" && roleOf(user) !== roleFilter) return false;
      return !keyword || `${userName(user)} ${user.email ?? ""} ${user._id}`.toLocaleLowerCase("vi").includes(keyword);
    });
  }, [query, roleFilter, users]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy("save");
    try {
      if (editor.mode === "create") {
        const username = editor.username.trim();
        const email = editor.email.trim().toLowerCase();
        if (!username || !/^\S+@\S+\.\S+$/.test(email) || editor.password.length < 6) throw new Error("Tên, email hợp lệ và mật khẩu từ 6 ký tự là bắt buộc.");
        const result = await gatewayApi<{ userId: string }>("auth/register", { method: "POST", json: { username, email, password: editor.password } });
        if (editor.role === "admin") {
          await gatewayApi(`auth/users/${encodeURIComponent(result.userId)}/role`, { method: "PATCH", json: { role: "admin" } });
        }
        showNotice(`Đã tạo tài khoản ${username}.`);
      } else {
        await gatewayApi(`auth/users/${encodeURIComponent(editor.user._id)}/role`, { method: "PATCH", json: { role: editor.role } });
        showNotice(`Đã cập nhật vai trò của ${userName(editor.user)}.`);
      }
      setEditor(null);
      await loadUsers();
    } catch (saveError) {
      showNotice(saveError instanceof Error ? saveError.message : "Không thể lưu tài khoản.");
    } finally { setBusy(""); }
  };

  const removeUser = async (user: ApiUser) => {
    if (busy || !window.confirm(`Xóa vĩnh viễn tài khoản “${userName(user)}”? Thao tác này không thể hoàn tác.`)) return;
    setBusy(user._id);
    try {
      await gatewayApi(`auth/users/${encodeURIComponent(user._id)}`, { method: "DELETE" });
      await loadUsers();
      showNotice(`Đã xóa tài khoản ${userName(user)}.`);
    } catch (removeError) {
      showNotice(removeError instanceof Error ? removeError.message : "Không thể xóa tài khoản.");
    } finally { setBusy(""); }
  };

  const adminCount = users.filter((user) => roleOf(user) === "admin").length;
  const completeEmailCount = users.filter((user) => Boolean(user.email)).length;

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")}><X size={14} /></button></div> : null}
      <PageHeader
        eyebrow="Tổ chức / Tài khoản"
        title="Quản lý nhân sự"
        description="Tạo tài khoản, tra cứu danh bạ và phân quyền theo đúng hai vai trò mà backend hỗ trợ."
        actions={<><button className="button-secondary" type="button" onClick={() => void loadUsers()} disabled={loading}><RefreshCw size={16} /> Làm mới</button><button className="button-primary" type="button" onClick={() => setEditor({ mode: "create", username: "", email: "", password: "", role: "user" })}><Plus size={16} /> Tạo tài khoản</button></>}
      />

      {error ? <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => void loadUsers()}>Thử lại</button></div> : null}

      <section className={styles.stats} aria-label="Tổng quan tài khoản">
        <StatCard label="Tổng tài khoản" value={users.length} helper="trả về từ User Service" icon={<Users size={18} />} tone="blue" />
        <StatCard label="Quản trị viên" value={adminCount} helper="có quyền vào trang admin" icon={<ShieldCheck size={18} />} tone="red" />
        <StatCard label="Nhân viên" value={users.length - adminCount} helper="vai trò người dùng chuẩn" icon={<UserRound size={18} />} tone="emerald" />
        <StatCard label="Có email" value={`${completeEmailCount}/${users.length}`} helper="email công việc đã đồng bộ" icon={<Mail size={18} />} tone="violet" />
      </section>

      <section className={styles.directory}>
        <header className={styles.directoryHeader}>
          <div><small>DANH BẠ HỆ THỐNG</small><h2>Tài khoản NRApp</h2><p>Backend hiện cung cấp tên, email, mã tài khoản và vai trò.</p></div>
          <Badge tone={error ? "red" : "emerald"} dot>{error ? "Mất đồng bộ" : `${users.length} tài khoản`}</Badge>
        </header>
        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={17} /><span className="sr-only">Tìm tài khoản</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, email hoặc mã..." />{query ? <button type="button" onClick={() => setQuery("")}><X size={14} /></button> : null}</label>
          <label className={styles.roleFilter}><ShieldCheck size={15} /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | AppRole)}><option value="all">Mọi vai trò</option><option value="admin">Quản trị viên</option><option value="user">Nhân viên</option></select></label>
          <span className={styles.result}>{filteredUsers.length} kết quả</span>
        </div>

        <div className={styles.userList}>
          <div className={styles.userHead}><span>Tài khoản</span><span>Email</span><span>Vai trò</span><span>Mã người dùng</span><span>Thao tác</span></div>
          {filteredUsers.map((user, index) => {
            const role = roleOf(user);
            const name = userName(user);
            return <article className={styles.userRow} key={user._id}>
              <div className={styles.identity}><Avatar initials={initials(name)} tone={index % 2 ? "blue" : "slate"} size="md" /><div><strong>{name}</strong><small>Tài khoản đã đồng bộ</small></div></div>
              <div className={styles.email}><Mail size={14} /><span>{user.email || "Chưa có email"}</span></div>
              <div><Badge tone={role === "admin" ? "red" : "blue"} dot>{roleLabels[role]}</Badge></div>
              <code>{user._id}</code>
              <div className={styles.actions}><button type="button" onClick={() => setEditor({ mode: "role", user, role })}><ShieldCheck size={14} /> Phân quyền</button><button className={styles.deleteButton} type="button" onClick={() => void removeUser(user)} disabled={busy === user._id} aria-label={`Xóa ${name}`}><Trash2 size={15} /></button></div>
            </article>;
          })}
          {!filteredUsers.length ? <div className={styles.empty}><Users size={28} /><strong>Không tìm thấy tài khoản</strong><p>Kiểm tra từ khóa hoặc vai trò đang lọc.</p></div> : null}
        </div>
      </section>

      {editor ? <div className="modal-backdrop" onMouseDown={() => setEditor(null)}><section className={`modal-card ${styles.modal}`} role="dialog" aria-modal="true" aria-labelledby="employee-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}><div><span>{editor.mode === "create" ? <Plus size={19} /> : <ShieldCheck size={19} />}</span><div><small>{editor.mode === "create" ? "Tài khoản mới" : "Phân quyền truy cập"}</small><h2 id="employee-editor-title">{editor.mode === "create" ? "Tạo tài khoản nhân sự" : userName(editor.user)}</h2></div></div><button type="button" onClick={() => setEditor(null)}><X size={18} /></button></header>
        <form onSubmit={(event) => void save(event)}>
          <div className={styles.modalBody}>
            {editor.mode === "create" ? <>
              <label><span className="form-label">Tên tài khoản <em>*</em></span><div className={styles.inputIcon}><UserRound size={16} /><input autoFocus value={editor.username} onChange={(event) => setEditor({ ...editor, username: event.target.value })} placeholder="Nguyễn Văn A" required /></div></label>
              <label><span className="form-label">Email <em>*</em></span><div className={styles.inputIcon}><Mail size={16} /><input type="email" value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} placeholder="name@company.vn" required /></div></label>
              <label><span className="form-label">Mật khẩu ban đầu <em>*</em></span><div className={styles.inputIcon}><KeyRound size={16} /><input type="password" minLength={6} value={editor.password} onChange={(event) => setEditor({ ...editor, password: event.target.value })} placeholder="Tối thiểu 6 ký tự" required /></div></label>
            </> : <div className={styles.accountSummary}><Avatar initials={initials(userName(editor.user))} size="lg" tone="blue" /><div><strong>{userName(editor.user)}</strong><span>{editor.user.email}</span><code>{editor.user._id}</code></div></div>}
            <label><span className="form-label">Vai trò hệ thống</span><select className="select-field" value={editor.role} onChange={(event) => setEditor({ ...editor, role: event.target.value as AppRole })}><option value="user">Nhân viên</option><option value="admin">Quản trị viên</option></select></label>
            <div className={styles.permissionNote}><ShieldCheck size={17} /><p><strong>Backend chỉ hỗ trợ `admin` và `user`.</strong><span>Quản trị viên có thể truy cập và thay đổi toàn bộ dữ liệu vận hành.</span></p></div>
          </div>
          <footer className={styles.modalFooter}><button className="button-secondary" type="button" onClick={() => setEditor(null)}>Hủy</button><button className="button-primary" type="submit" disabled={busy === "save"}>{busy === "save" ? "Đang lưu..." : editor.mode === "create" ? "Tạo tài khoản" : "Lưu vai trò"}</button></footer>
        </form>
      </section></div> : null}
    </div>
  );
}
