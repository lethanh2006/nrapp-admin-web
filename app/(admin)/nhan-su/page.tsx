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
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { employees as mockEmployees } from "@/lib/mock-data";
import type { BadgeTone, Employee } from "@/lib/types";
import styles from "./nhan-su.module.css";

type ModalMode = "view" | "manage";
type StatusFilter = Employee["status"] | "all";

const statusMeta: Record<Employee["status"], { label: string; tone: BadgeTone; helper: string }> = {
  active: { label: "Đang làm việc", tone: "emerald", helper: "Hoạt động" },
  offline: { label: "Ngoại tuyến", tone: "slate", helper: "Chưa check-in" },
  leave: { label: "Đang nghỉ phép", tone: "amber", helper: "Tạm vắng" },
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
const shiftOptions = ["Hành chính", "Ca sáng", "Ca chiều", "Ca tối", "Linh hoạt"];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NV";
  return `${parts[Math.max(0, parts.length - 2)]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export default function EmployeeDirectoryPage() {
  const [directory, setDirectory] = useState<Employee[]>(() => mockEmployees.map((employee) => ({ ...employee })));
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
  const leaveCount = directory.filter((employee) => employee.status === "leave").length;

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
      id: `NV-${String(51 + directory.length).padStart(3, "0")}`,
      name: "",
      email: "",
      phone: "",
      role: "Nhân viên",
      department: "Vận hành",
      status: "active",
      joinedAt: "28/08/2026",
      shift: "Hành chính",
      initial: "NV",
      tone: "blue",
    });
    setModalMode("manage");
    setIsCreating(true);
    setFormError("");
    setModalOpen(true);
  };

  const updateDraft = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveProfile = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.email.trim()) {
      setFormError("Vui lòng nhập đầy đủ họ tên và email công việc.");
      return;
    }

    const savedEmployee: Employee = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      initial: getInitials(draft.name),
      tone: roleTone[draft.role] ?? draft.tone,
    };

    if (isCreating) {
      setDirectory((current) => [...current, savedEmployee]);
      setNotice(`Đã thêm ${savedEmployee.name} vào danh bạ nhân sự.`);
    } else {
      setDirectory((current) => current.map((employee) => (employee.id === savedEmployee.id ? savedEmployee : employee)));
      setNotice(`Hồ sơ ${savedEmployee.name} đã được cập nhật.`);
    }
    setModalOpen(false);
    setFormError("");
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredEmployees.map((employee) => employee.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => (allSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))));
  };

  const markSelectedActive = () => {
    setDirectory((current) => current.map((employee) => (selectedIds.includes(employee.id) ? { ...employee, status: "active" } : employee)));
    setNotice(`Đã chuyển ${selectedIds.length} hồ sơ sang trạng thái đang làm việc.`);
    setSelectedIds([]);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Tổ chức & tài khoản"
        title="Danh bạ nhân sự"
        description="Tra cứu thông tin liên hệ, theo dõi trạng thái làm việc và quản lý vai trò truy cập của từng thành viên."
        actions={
          <>
            <button className="button-secondary" type="button" onClick={() => setNotice("Danh sách nhân sự đã được chuẩn bị để xuất file.")}><Download size={16} /> Xuất danh sách</button>
            <button className="button-primary" type="button" onClick={openCreate}><Plus size={16} /> Thêm nhân sự</button>
          </>
        }
      />

      {notice ? (
        <div className={styles.notice} role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">Đóng</button></div>
      ) : null}

      <section className={styles.statsGrid} aria-label="Tổng quan nhân sự">
        <StatCard label="Tổng nhân sự" value={directory.length} trend="2 người" helper="mới trong tháng" icon={<Users size={18} />} tone="red" />
        <StatCard label="Đang làm việc" value={activeCount} helper={`${Math.round((activeCount / Math.max(directory.length, 1)) * 100)}% lực lượng`} icon={<UserCheck size={18} />} tone="emerald" />
        <StatCard label="Đang nghỉ phép" value={leaveCount} helper="đã có lịch trở lại" icon={<UserRoundX size={18} />} tone="amber" />
        <StatCard label="Phòng ban" value={departments.length - 1} helper="đang hoạt động" icon={<Building2 size={18} />} tone="violet" />
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
            <div className={styles.bulkActions}><strong>{selectedIds.length} đã chọn</strong><button type="button" onClick={markSelectedActive}><UserCheck size={13} /> Đánh dấu đang làm</button><button type="button" onClick={() => setSelectedIds([])}>Bỏ chọn</button></div>
          ) : <span className={styles.resultHint}>Cập nhật gần nhất: 2 phút trước</span>}
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
                  <Avatar initials={employee.initial} tone={employee.tone} size="md" online={employee.status === "active"} />
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
                  <Avatar initials={employee.initial} tone={employee.tone} size="lg" online={employee.status === "active"} />
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
                  <Avatar initials={draft.initial} tone={draft.tone} size="xl" online={draft.status === "active"} />
                  <div><h3>{draft.name}</h3><p>{draft.role} · {draft.department}</p><Badge tone={statusMeta[draft.status].tone} dot>{statusMeta[draft.status].label}</Badge></div>
                </div>
                <div className={styles.profileBody}>
                  <section><h4>Thông tin liên hệ</h4><div className={styles.infoGrid}><div><span><Mail size={14} /></span><p><small>Email công việc</small><strong>{draft.email}</strong></p></div><div><span><Phone size={14} /></span><p><small>Số điện thoại</small><strong>{draft.phone}</strong></p></div><div><span><MapPin size={14} /></span><p><small>Khu vực</small><strong>TP. Hồ Chí Minh</strong></p></div><div><span><Building2 size={14} /></span><p><small>Phòng ban</small><strong>{draft.department}</strong></p></div></div></section>
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
                <form className={styles.manageForm} onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
                  <div className={styles.formGrid}>
                    <label className={styles.fullField}><span className="form-label">Họ và tên *</span><input className="field" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Nhập họ và tên" autoFocus /></label>
                    <label><span className="form-label">Mã nhân sự</span><input className="field" value={draft.id} readOnly /></label>
                    <label><span className="form-label">Email công việc *</span><input className="field" type="email" value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} placeholder="ten@hdg.vn" /></label>
                    <label><span className="form-label">Số điện thoại</span><input className="field" value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} placeholder="090 000 0000" /></label>
                    <label><span className="form-label">Phòng ban</span><input className="field" value={draft.department} onChange={(event) => updateDraft("department", event.target.value)} placeholder="Tên phòng ban" /></label>
                    <label><span className="form-label">Vai trò hệ thống</span><select className="select-field" value={draft.role} onChange={(event) => updateDraft("role", event.target.value)}>{roleOptions.map((role) => <option key={role}>{role}</option>)}</select></label>
                    <label><span className="form-label">Trạng thái</span><select className="select-field" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as Employee["status"])}>{Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}</select></label>
                    <label><span className="form-label">Ca làm mặc định</span><select className="select-field" value={draft.shift} onChange={(event) => updateDraft("shift", event.target.value)}>{shiftOptions.map((shift) => <option key={shift}>{shift}</option>)}</select></label>
                    <label><span className="form-label">Ngày gia nhập</span><input className="field" value={draft.joinedAt} onChange={(event) => updateDraft("joinedAt", event.target.value)} /></label>
                  </div>
                  {formError ? <p className={styles.formError}>{formError}</p> : null}
                  <div className={styles.securityHint}><BriefcaseBusiness size={17} /><p><strong>Lưu ý phân quyền</strong><span>Thay đổi vai trò sẽ áp dụng ngay cho tài khoản trong bản giao diện hiện tại.</span></p></div>
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
