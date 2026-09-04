"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FilterX,
  IdCard,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { gatewayApi } from "@/lib/api/gateway";
import { toEmployee, type ApiUser } from "@/lib/api/domain";
import type { BadgeTone, Employee } from "@/lib/types";
import styles from "./nhan-su.module.css";

type ModalMode = "view" | "manage";
type StatusFilter = Employee["status"] | "all";

const statusMeta: Record<Employee["status"], { label: string; tone: BadgeTone; helper: string }> = {
  active: { label: "Tài khoản hiện có", tone: "emerald", helper: "Đã đồng bộ" },
  offline: { label: "Chưa có trạng thái", tone: "slate", helper: "Chưa ghi nhận" },
  leave: { label: "Đang nghỉ phép", tone: "amber", helper: "Theo lịch" },
};

const roleTone: Record<string, BadgeTone> = {
  "Quản trị viên": "red",
  "Quản lý": "violet",
  "Bếp trưởng": "amber",
  "Thu ngân": "emerald",
  "Phục vụ": "cyan",
  "Nhân viên": "blue",
};

const roleOptions = ["Quản trị viên", "Quản lý", "Bếp trưởng", "Thu ngân", "Phục vụ", "Nhân viên"];
const roleValues: Record<string, string> = { "Quản trị viên": "admin", "Quản lý": "manager", "Bếp trưởng": "chef", "Thu ngân": "cashier", "Phục vụ": "waiter", "Nhân viên": "user" };

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

export default function EmployeeDirectoryPage() {
  const [directory, setDirectory] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("Tất cả");
  const [roleFilter, setRoleFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("view");
  const [draft, setDraft] = useState<Employee | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadDirectory = useCallback(async () => {
    try {
      const result = await gatewayApi<{ users: ApiUser[] }>("user/user/all");
      setDirectory((Array.isArray(result.users) ? result.users : []).map(toEmployee));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tải danh bạ nhân sự."); }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadDirectory); }, [loadDirectory]);

  const departments = useMemo(() => ["Tất cả", ...Array.from(new Set(directory.map((employee) => employee.department)))], [directory]);
  const roles = useMemo(() => ["Tất cả", ...Array.from(new Set(directory.map((employee) => employee.role)))], [directory]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return directory
      .filter((employee) => {
        const searchable = normalizeSearch([employee.name, employee.id, employee.email, employee.phone, employee.department, employee.role].join(" "));
        const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
        const matchesDepartment = departmentFilter === "Tất cả" || employee.department === departmentFilter;
        const matchesRole = roleFilter === "Tất cả" || employee.role === roleFilter;
        const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
        return matchesQuery && matchesDepartment && matchesRole && matchesStatus;
      })
      .sort((left, right) => left.name.localeCompare(right.name, "vi"));
  }, [departmentFilter, directory, query, roleFilter, statusFilter]);

  const filtersActive = Boolean(query || departmentFilter !== "Tất cả" || roleFilter !== "Tất cả" || statusFilter !== "all");
  const activeCount = directory.filter((employee) => employee.status === "active").length;
  const roleCount = new Set(directory.map((employee) => employee.role)).size;

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [modalOpen]);

  const resetFilters = () => {
    setQuery("");
    setDepartmentFilter("Tất cả");
    setRoleFilter("Tất cả");
    setStatusFilter("all");
  };

  const openProfile = (employee: Employee, mode: ModalMode = "view") => {
    setDraft({ ...employee });
    setModalMode(mode);
    setIsCreating(false);
    setFormError("");
    setModalOpen(true);
  };

  const openCreate = () => {
    setDraft({
      id: "",
      name: "",
      email: "",
      phone: "",
      role: "Nhân viên",
      department: "Chưa có phòng ban",
      status: "active",
      joinedAt: "Chưa có dữ liệu",
      shift: "Chưa có dữ liệu",
      initial: "NV",
      tone: "blue",
    });
    setModalMode("manage");
    setIsCreating(true);
    setFormError("");
    setNewPassword("");
    setModalOpen(true);
  };

  const updateDraft = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveProfile = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.email.trim()) {
      setFormError("Vui lòng nhập đầy đủ họ tên và email công việc.");
      return;
    }

    if (isCreating && newPassword.length < 6) { setFormError("Mật khẩu cần có ít nhất 6 ký tự."); return; }
    try {
      if (isCreating) {
        const result = await gatewayApi<{ userId: string }>("auth/register", { method: "POST", json: { username: draft.name.trim(), email: draft.email.trim().toLowerCase(), password: newPassword } });
        const role = roleValues[draft.role] ?? "user";
        if (role !== "user") await gatewayApi(`auth/users/${encodeURIComponent(result.userId)}/role`, { method: "PATCH", json: { role } });
        setNotice(`Đã tạo tài khoản cho ${draft.name.trim()}.`);
      } else {
        await gatewayApi(`auth/users/${encodeURIComponent(draft.id)}/role`, { method: "PATCH", json: { role: roleValues[draft.role] ?? "user" } });
        setNotice(`Đã cập nhật vai trò của ${draft.name}.`);
      }
      await loadDirectory();
      setModalOpen(false); setFormError("");
    } catch (error) { setFormError(error instanceof Error ? error.message : "Không thể lưu tài khoản."); }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredEmployees.map((employee) => employee.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => (allSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Tổ chức & tài khoản"
        title="Danh bạ nhân sự"
        description="Tra cứu thông tin liên hệ, theo dõi trạng thái làm việc và quản lý vai trò truy cập của từng thành viên."
        actions={
          <>
            <button className="button-secondary" type="button" onClick={() => void loadDirectory()}><Download size={16} /> Làm mới danh sách</button>
            <button className="button-primary" type="button" onClick={openCreate}><Plus size={16} /> Thêm nhân sự</button>
          </>
        }
      />

      {notice ? (
        <div className={styles.notice} role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">Đóng</button></div>
      ) : null}

      <section className={styles.statsGrid} aria-label="Tổng quan nhân sự">
        <StatCard label="Tổng nhân sự" value={directory.length} helper="từ NRApp Gateway" icon={<Users size={18} />} tone="red" />
        <StatCard label="Tài khoản đã đồng bộ" value={activeCount} helper={`${Math.round((activeCount / Math.max(directory.length, 1)) * 100)}% danh bạ`} icon={<UserCheck size={18} />} tone="emerald" />
        <StatCard label="Vai trò hệ thống" value={roleCount} helper="theo dữ liệu xác thực" icon={<UserRoundX size={18} />} tone="amber" />
        <StatCard label="Nhóm dữ liệu" value={departments.length - 1} helper="backend chưa có phòng ban" icon={<Building2 size={18} />} tone="violet" />
      </section>

      <section className={`surface-card ${styles.directoryPanel}`}>
        <div className={styles.panelHeader}>
          <div><span>Danh sách thành viên</span><h2>Tất cả nhân sự</h2><p>Nhấp vào một hồ sơ để xem thông tin chi tiết.</p></div>
          <div className={styles.syncState}><span /> Dữ liệu đã đồng bộ</div>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchField}>
            <Search size={17} />
            <span className="sr-only">Tìm kiếm nhân sự</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, mã nhân sự, email..." />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa từ khóa"><X size={14} /></button> : null}
          </label>
          <label className={styles.selectWrap}><span className="sr-only">Lọc phòng ban</span><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className={styles.selectWrap}><span className="sr-only">Lọc vai trò</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label className={styles.selectWrap}>
            <span className="sr-only">Lọc trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="all">Mọi trạng thái</option>
              {Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
            </select>
          </label>
          {filtersActive ? <button className={styles.clearFilters} type="button" onClick={resetFilters}><FilterX size={14} /> Xóa lọc</button> : null}
        </div>

        <div className={styles.resultBar}>
          <span>Tìm thấy <strong>{filteredEmployees.length}</strong> nhân sự</span>
          {selectedIds.length > 0 ? (
            <div className={styles.bulkActions}><strong>{selectedIds.length} đã chọn</strong><button type="button" onClick={() => setSelectedIds([])}>Bỏ chọn</button></div>
          ) : <span className={styles.resultHint}>Nguồn: NRApp Gateway</span>}
        </div>

        <div className={styles.employeeTable}>
          <div className={`${styles.employeeRow} ${styles.tableHead}`}>
            <label className={styles.checkbox}><input type="checkbox" checked={filteredEmployees.length > 0 && filteredEmployees.every((employee) => selectedIds.includes(employee.id))} onChange={toggleAllVisible} /><span /></label>
            <span>Nhân sự</span><span>Liên hệ</span><span>Vai trò</span><span>Ca làm</span><span>Trạng thái</span><span>Ngày vào</span><span aria-label="Thao tác" />
          </div>
          {filteredEmployees.map((employee) => {
            const status = statusMeta[employee.status];
            return (
              <article className={styles.employeeRow} key={employee.id}>
                <label className={styles.checkbox} onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleSelected(employee.id)} /><span /></label>
                <button className={styles.employeeIdentity} type="button" onClick={() => openProfile(employee)}>
                  <Avatar initials={employee.initial} tone={employee.tone} size="md" />
                  <span><strong>{employee.name}</strong><small>{employee.id} · {employee.department}</small></span>
                </button>
                <div className={styles.contactCell}><span><Mail size={12} /> {employee.email}</span><small><Phone size={11} /> {employee.phone}</small></div>
                <div><Badge tone={roleTone[employee.role] ?? "slate"}>{employee.role}</Badge></div>
                <div className={styles.shiftCell}><Clock3 size={13} /><span>{employee.shift}</span></div>
                <div><Badge tone={status.tone} dot>{status.helper}</Badge></div>
                <time className={styles.joinedAt}>{employee.joinedAt}</time>
                <div className={styles.rowActions} onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => openProfile(employee)} title="Xem hồ sơ" aria-label={`Xem hồ sơ ${employee.name}`}><Eye size={15} /></button>
                  <button type="button" onClick={() => openProfile(employee, "manage")} title="Quản lý hồ sơ" aria-label={`Quản lý hồ sơ ${employee.name}`}><ShieldCheck size={15} /></button>
                </div>
              </article>
            );
          })}
          {filteredEmployees.length === 0 ? <div className={styles.emptyState}><Users size={28} /><strong>Không tìm thấy nhân sự</strong><p>Thử thay đổi từ khóa hoặc bộ lọc đang áp dụng.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
        </div>

        <div className={styles.mobileList}>
          {filteredEmployees.map((employee) => {
            const status = statusMeta[employee.status];
            return (
              <article className={styles.employeeCard} key={employee.id}>
                <div className={styles.cardTop}>
                  <Avatar initials={employee.initial} tone={employee.tone} size="lg" />
                  <div><strong>{employee.name}</strong><span>{employee.id} · {employee.department}</span><div><Badge tone={roleTone[employee.role] ?? "slate"}>{employee.role}</Badge><Badge tone={status.tone} dot>{status.helper}</Badge></div></div>
                  <button type="button" onClick={(event) => { event.stopPropagation(); openProfile(employee, "manage"); }} aria-label={`Quản lý ${employee.name}`}><PencilLine size={15} /></button>
                </div>
                <div className={styles.cardDetails}><span><Mail size={13} /> {employee.email}</span><span><Phone size={13} /> {employee.phone}</span><span><Clock3 size={13} /> {employee.shift}</span><span><CalendarDays size={13} /> Từ {employee.joinedAt}</span></div>
                <button className={styles.cardFooter} type="button" onClick={() => openProfile(employee)}><span>Xem hồ sơ chi tiết</span><ChevronRight size={15} /></button>
              </article>
            );
          })}
          {filteredEmployees.length === 0 ? <div className={styles.mobileEmpty}><Users size={26} /><strong>Không có kết quả</strong><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div> : null}
        </div>

        <footer className={styles.pagination}>
          <span>Hiển thị <strong>{filteredEmployees.length}</strong> trên {directory.length} nhân sự</span>
          <div><button type="button" disabled aria-label="Trang trước"><ChevronLeft size={15} /></button><button className={styles.pageActive} type="button">1</button><button type="button" disabled={filteredEmployees.length < 8} aria-label="Trang sau"><ChevronRight size={15} /></button></div>
        </footer>
      </section>

      {modalOpen && draft ? (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className={`modal-card ${styles.profileModal}`} role="dialog" aria-modal="true" aria-labelledby="employee-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div><span className={styles.modalIcon}>{isCreating ? <UserPlus size={19} /> : modalMode === "manage" ? <ShieldCheck size={19} /> : <IdCard size={19} />}</span><div><small>{isCreating ? "Hồ sơ mới" : modalMode === "manage" ? "Quản lý tài khoản" : "Thông tin nhân sự"}</small><h2 id="employee-modal-title">{isCreating ? "Thêm nhân sự" : draft.name}</h2></div></div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Đóng"><X size={18} /></button>
            </header>

            {modalMode === "view" ? (
              <>
                <div className={styles.profileHero}>
                  <Avatar initials={draft.initial} tone={draft.tone} size="xl" />
                  <div><h3>{draft.name}</h3><p>{draft.role} · {draft.department}</p><Badge tone={statusMeta[draft.status].tone} dot>{statusMeta[draft.status].label}</Badge></div>
                </div>
                <div className={styles.profileBody}>
                  <section><h4>Thông tin liên hệ</h4><div className={styles.infoGrid}><div><span><Mail size={14} /></span><p><small>Email công việc</small><strong>{draft.email}</strong></p></div><div><span><Phone size={14} /></span><p><small>Số điện thoại</small><strong>{draft.phone}</strong></p></div><div><span><MapPin size={14} /></span><p><small>Nguồn hồ sơ</small><strong>NRApp Gateway</strong></p></div><div><span><Building2 size={14} /></span><p><small>Phòng ban</small><strong>{draft.department}</strong></p></div></div></section>
                  <section><h4>Thông tin công việc</h4><div className={styles.workSummary}><div><small>Mã nhân sự</small><strong>{draft.id}</strong></div><div><small>Ngày gia nhập</small><strong>{draft.joinedAt}</strong></div><div><small>Ca làm mặc định</small><strong>{draft.shift}</strong></div><div><small>Vai trò hệ thống</small><strong>{draft.role}</strong></div></div></section>
                  <div className={styles.permissionNote}><ShieldCheck size={18} /><div><strong>Quyền truy cập đang hoạt động</strong><p>Vai trò {draft.role.toLowerCase()} quyết định các phân hệ thành viên có thể truy cập.</p></div></div>
                </div>
                <footer className={styles.modalFooter}><button className="button-secondary" type="button" onClick={() => setModalOpen(false)}>Đóng</button><button className="button-primary" type="button" onClick={() => setModalMode("manage")}><PencilLine size={15} /> Quản lý hồ sơ</button></footer>
              </>
            ) : (
              <>
                <div className={styles.manageIntro}>
                  <Avatar initials={draft.initial || "NV"} tone={draft.tone} size="lg" />
                  <div><strong>{isCreating ? "Tạo tài khoản nhân sự" : draft.name}</strong><p>{isCreating ? "Nhập thông tin để thêm thành viên vào hệ thống." : `${draft.id} · Chỉnh sửa thông tin và quyền truy cập.`}</p></div>
                </div>
                <form className={styles.manageForm} onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
                  <div className={styles.formGrid}>
                    <label className={styles.fullField}><span className="form-label">Họ và tên *</span><input className="field" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Nhập họ và tên" autoFocus disabled={!isCreating} /></label>
                    <label><span className="form-label">Mã tài khoản</span><input className="field" value={draft.id || "Được tạo bởi Gateway"} readOnly /></label>
                    <label><span className="form-label">Email công việc *</span><input className="field" type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} placeholder="ten@hdg.vn" disabled={!isCreating} /></label>
                    {isCreating ? <label><span className="form-label">Mật khẩu ban đầu *</span><input className="field" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label> : null}
                    <label><span className="form-label">Số điện thoại</span><input className="field" value={draft.phone} disabled /></label>
                    <label><span className="form-label">Phòng ban</span><input className="field" value={draft.department} disabled /></label>
                    <label><span className="form-label">Vai trò hệ thống</span><select className="select-field" value={draft.role} onChange={(event) => updateDraft("role", event.target.value)}>{roleOptions.map((role) => <option key={role}>{role}</option>)}</select></label>
                    <label><span className="form-label">Trạng thái</span><input className="field" value="Tài khoản đang tồn tại" disabled /></label>
                    <label><span className="form-label">Ca làm mặc định</span><input className="field" value={draft.shift} disabled /></label>
                    <label><span className="form-label">Ngày gia nhập</span><input className="field" value={draft.joinedAt} disabled /></label>
                  </div>
                  {formError ? <p className={styles.formError}>{formError}</p> : null}
                  <div className={styles.securityHint}><BriefcaseBusiness size={17} /><p><strong>Lưu ý phân quyền</strong><span>Backend hiện chỉ cho quản trị viên đổi vai trò; các trường hồ sơ mở rộng chưa có API cập nhật.</span></p></div>
                  <footer className={styles.modalFooter}><button className="button-secondary" type="button" onClick={() => isCreating ? setModalOpen(false) : setModalMode("view")}>{isCreating ? "Hủy" : "Quay lại"}</button><button className="button-primary" type="submit"><Save size={15} /> {isCreating ? "Thêm nhân sự" : "Lưu thay đổi"}</button></footer>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
