"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  Download,
  Filter,
  Flag,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Target,
  TimerReset,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { employees, tasks as initialTasks } from "@/lib/mock-data";
import type { BadgeTone, Task, TaskPriority, TaskStatus } from "@/lib/types";
import styles from "./cong-viec.module.css";

type StatusFilter = "all" | TaskStatus;

const statusMeta: Record<TaskStatus, { label: string; tone: BadgeTone; progress: number }> = {
  todo: { label: "Cần làm", tone: "slate", progress: 0 },
  in_progress: { label: "Đang thực hiện", tone: "blue", progress: 55 },
  review: { label: "Chờ duyệt", tone: "amber", progress: 90 },
  done: { label: "Hoàn tất", tone: "emerald", progress: 100 },
};

const priorityMeta: Record<TaskPriority, { label: string; tone: BadgeTone }> = {
  high: { label: "Ưu tiên cao", tone: "red" },
  medium: { label: "Trung bình", tone: "amber" },
  low: { label: "Ưu tiên thấp", tone: "slate" },
};

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "todo", label: "Cần làm" },
  { key: "in_progress", label: "Đang làm" },
  { key: "review", label: "Chờ duyệt" },
  { key: "done", label: "Hoàn tất" },
];

const emptyForm = {
  title: "",
  description: "",
  assigneeId: "NV-014",
  department: "Vận hành",
  due: "2026-09-02T17:30",
  priority: "medium" as TaskPriority,
};

function formatDue(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} · ${time}`;
}

function taskTone(index: number): BadgeTone {
  return (["violet", "blue", "amber", "cyan", "red"] as BadgeTone[])[index % 5];
}

export default function TasksPage() {
  const [taskItems, setTaskItems] = useState<Task[]>(initialTasks);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [priority, setPriority] = useState<"all" | TaskPriority>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  const counts = useMemo(() => ({
    all: taskItems.length,
    todo: taskItems.filter((task) => task.status === "todo").length,
    in_progress: taskItems.filter((task) => task.status === "in_progress").length,
    review: taskItems.filter((task) => task.status === "review").length,
    done: taskItems.filter((task) => task.status === "done").length,
  }), [taskItems]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return taskItems.filter((task) => {
      const matchesStatus = activeStatus === "all" || task.status === activeStatus;
      const matchesDepartment = department === "all" || task.department === department;
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesQuery = !normalizedQuery || `${task.title} ${task.description} ${task.assignee} ${task.id}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      return matchesStatus && matchesDepartment && matchesPriority && matchesQuery;
    });
  }, [activeStatus, department, priority, query, taskItems]);

  const completed = counts.done;
  const averageProgress = Math.round(taskItems.reduce((total, task) => total + task.progress, 0) / Math.max(taskItems.length, 1));
  const departments = Array.from(new Set(taskItems.map((task) => task.department)));

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    setTaskItems((current) => current.map((task) => task.id === id ? { ...task, status, progress: statusMeta[status].progress } : task));
    showNotice(`Đã chuyển công việc sang “${statusMeta[status].label}”.`);
  };

  const resetFilters = () => {
    setQuery("");
    setDepartment("all");
    setPriority("all");
    setActiveStatus("all");
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.title.trim().length < 4) {
      setFormError("Tên công việc cần có ít nhất 4 ký tự.");
      return;
    }
    const assignee = employees.find((employee) => employee.id === form.assigneeId) ?? employees[0];
    const numericIds = taskItems.map((task) => Number(task.id.replace("CV-", ""))).filter(Number.isFinite);
    const nextId = Math.max(1082, ...numericIds) + 1;
    const newTask: Task = {
      id: `CV-${nextId}`,
      title: form.title.trim(),
      description: form.description.trim() || "Chưa có mô tả chi tiết.",
      assignee: assignee.name,
      assigneeInitial: assignee.initial,
      department: form.department,
      due: formatDue(form.due),
      status: "todo",
      priority: form.priority,
      progress: 0,
    };
    setTaskItems((current) => [newTask, ...current]);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(false);
    setActiveStatus("all");
    showNotice(`Đã tạo ${newTask.id} và giao cho ${newTask.assignee}.`);
  };

  return (
    <div className={styles.page}>
      {notice ? <div className={styles.toast} role="status"><CheckCircle2 size={17} /><span>{notice}</span></div> : null}

      <PageHeader
        eyebrow="Không gian cộng tác"
        title="Điều phối công việc"
        description="Giao việc, theo dõi tiến độ và tháo gỡ điểm nghẽn cho toàn bộ đội ngũ."
        actions={
          <>
            <button className="button-secondary" onClick={() => showNotice("Bảng công việc đã được xuất thành báo cáo.")}><Download size={16} /> Xuất dữ liệu</button>
            <button className="button-primary" onClick={() => setModalOpen(true)}><Plus size={17} /> Tạo công việc</button>
          </>
        }
      />

      <section className={styles.statsGrid} aria-label="Tổng quan công việc">
        <StatCard label="Tổng công việc" value={taskItems.length} helper="trong chu kỳ hiện tại" trend="+2 tuần này" icon={<ClipboardCheck size={18} />} tone="red" />
        <StatCard label="Đang thực hiện" value={counts.in_progress} helper="đang được cập nhật" icon={<CircleDashed size={18} />} tone="blue" />
        <StatCard label="Chờ phê duyệt" value={counts.review} helper="cần quản lý phản hồi" icon={<TimerReset size={18} />} tone="amber" />
        <StatCard label="Đã hoàn thành" value={completed} helper={`${averageProgress}% tiến độ trung bình`} trend="+12%" icon={<CheckCircle2 size={18} />} tone="emerald" />
      </section>

      <section className={styles.commandBar}>
        <div className={styles.statusTabs} role="tablist" aria-label="Lọc theo trạng thái">
          {statusTabs.map((tab) => (
            <button key={tab.key} className={activeStatus === tab.key ? styles.statusTabActive : ""} onClick={() => setActiveStatus(tab.key)} role="tab" aria-selected={activeStatus === tab.key}>
              {tab.label}<span>{counts[tab.key]}</span>
            </button>
          ))}
        </div>
        <button className={styles.quickCreate} onClick={() => setModalOpen(true)}><Plus size={16} /> Giao việc mới</button>
      </section>

      <div className={styles.workspaceGrid}>
        <section className={`${styles.taskPanel} surface-card`}>
          <div className={styles.taskPanelHead}>
            <div>
              <p className={styles.kicker}>Danh sách tập trung</p>
              <h2>Công việc của đội ngũ</h2>
            </div>
            <div className={styles.resultMeta}><span className={styles.liveDot} /> {filteredTasks.length} kết quả</div>
          </div>

          <div className={styles.filters}>
            <label className={styles.searchBox}>
              <Search size={16} />
              <span className="sr-only">Tìm công việc</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mã hoặc người phụ trách..." />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={14} /></button> : null}
            </label>
            <label className={styles.selectWrap}>
              <UsersRound size={15} />
              <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Lọc bộ phận">
                <option value="all">Mọi bộ phận</option>
                {departments.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
            <label className={styles.selectWrap}>
              <Flag size={15} />
              <select value={priority} onChange={(event) => setPriority(event.target.value as "all" | TaskPriority)} aria-label="Lọc mức ưu tiên">
                <option value="all">Mọi ưu tiên</option>
                <option value="high">Ưu tiên cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Ưu tiên thấp</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button className={styles.filterButton} onClick={resetFilters} title="Đặt lại bộ lọc"><ListFilter size={16} /></button>
          </div>

          <div className={styles.tableHead} aria-hidden="true">
            <span>Công việc</span><span>Người phụ trách</span><span>Thời hạn</span><span>Tiến độ</span><span>Trạng thái</span><span />
          </div>

          <div className={styles.taskList}>
            {filteredTasks.map((task, index) => {
              const status = statusMeta[task.status];
              const priorityInfo = priorityMeta[task.priority];
              return (
                <article className={styles.taskRow} key={task.id}>
                  <div className={styles.taskIdentity}>
                    <span className={`${styles.taskMark} ${styles[`mark_${task.priority}`]}`} />
                    <div>
                      <div className={styles.taskTitleLine}><span>{task.id}</span><Badge tone={priorityInfo.tone}>{priorityInfo.label}</Badge></div>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                    </div>
                  </div>
                  <div className={styles.assignee}>
                    <Avatar initials={task.assigneeInitial} size="sm" tone={taskTone(index)} />
                    <div><strong>{task.assignee}</strong><span>{task.department}</span></div>
                  </div>
                  <div className={styles.deadline}>
                    <CalendarClock size={15} />
                    <div><strong>{task.due.split(" · ")[0]}</strong><span>{task.due.split(" · ")[1] ?? "Cả ngày"}</span></div>
                  </div>
                  <div className={styles.progressCell}>
                    <div><span>Tiến độ</span><strong>{task.progress}%</strong></div>
                    <div className={styles.progressTrack}><span className={styles[`progress_${status.tone}`]} style={{ width: `${task.progress}%` }} /></div>
                  </div>
                  <label className={`${styles.statusSelect} ${styles[`status_${status.tone}`]}`}>
                    <span className={styles.statusDot} />
                    <select value={task.status} onChange={(event) => updateStatus(task.id, event.target.value as TaskStatus)} aria-label={`Trạng thái ${task.title}`}>
                      {Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <button className={styles.moreButton} onClick={() => showNotice(`Đang mở chi tiết ${task.id}.`)} aria-label={`Mở chi tiết ${task.id}`}><MoreHorizontal size={17} /></button>
                </article>
              );
            })}
            {!filteredTasks.length ? (
              <div className={styles.emptyState}>
                <span><Filter size={24} /></span>
                <strong>Chưa tìm thấy công việc phù hợp</strong>
                <p>Thử thay đổi từ khóa hoặc đặt lại bộ lọc hiện tại.</p>
                <button onClick={resetFilters}>Đặt lại bộ lọc</button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.focusCard}>
            <div className={styles.focusTop}>
              <span><Target size={19} /></span>
              <Badge tone="red">Tuần 35</Badge>
            </div>
            <p className={styles.darkKicker}>Nhịp độ đội ngũ</p>
            <h2>Tiến độ đang đúng kế hoạch</h2>
            <p>{completed} công việc đã hoàn thành. Tập trung xử lý các mục chờ duyệt để giữ nhịp tuần.</p>
            <div className={styles.focusScore}><strong>{averageProgress}%</strong><span>tiến độ chung</span></div>
            <div className={styles.focusProgress}><span style={{ width: `${averageProgress}%` }} /></div>
            <button onClick={() => setActiveStatus("review")}>Xem việc chờ duyệt <ArrowRight size={15} /></button>
          </section>

          <section className={`${styles.workloadCard} surface-card`}>
            <div className={styles.sideHeading}>
              <div><p className={styles.kicker}>Phân bổ hiện tại</p><h2>Khối lượng theo nhóm</h2></div>
              <BarChart3 size={18} />
            </div>
            <div className={styles.workloadList}>
              {[
                ["Căn tin", 86, "3 việc"],
                ["Vận hành", 68, "2 việc"],
                ["Nhân sự", 52, "1 việc"],
                ["Kỹ thuật", 38, "1 việc"],
              ].map(([label, value, count]) => (
                <div className={styles.workloadItem} key={label}>
                  <div><strong>{label}</strong><span>{count}</span></div>
                  <div><span style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.deadlineCard} surface-card`}>
            <div className={styles.sideHeading}>
              <div><p className={styles.kicker}>48 giờ tới</p><h2>Mốc cần chú ý</h2></div>
              <AlertCircle size={18} />
            </div>
            <div className={styles.deadlineList}>
              <div><span className={styles.dateTile}><strong>28</strong><small>T8</small></span><p><strong>Báo cáo vận hành</strong><small>Hôm nay · 17:30</small></p><Badge tone="red">Gấp</Badge></div>
              <div><span className={styles.dateTile}><strong>29</strong><small>T8</small></span><p><strong>Kiểm kê nguyên liệu</strong><small>Ngày mai · 20:00</small></p><Badge tone="amber">Cao</Badge></div>
            </div>
          </section>
        </aside>
      </div>

      {modalOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setModalOpen(false)}>
          <section className={`${styles.modal} modal-card`} role="dialog" aria-modal="true" aria-labelledby="create-task-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleIcon}><Plus size={20} /></div>
              <div><p className={styles.kicker}>Phân công nhanh</p><h2 id="create-task-title">Tạo công việc mới</h2><p>Thêm đầu việc và chỉ định người phụ trách.</p></div>
              <button onClick={() => setModalOpen(false)} aria-label="Đóng"><X size={18} /></button>
            </div>
            <form onSubmit={createTask}>
              <div className={styles.modalBody}>
                <label className={styles.fullField}>
                  <span className="form-label">Tên công việc <em>*</em></span>
                  <input className="field" autoFocus value={form.title} onChange={(event) => { setForm({ ...form, title: event.target.value }); setFormError(""); }} placeholder="Ví dụ: Tổng hợp báo cáo vận hành tuần" />
                  {formError ? <small className={styles.formError}><AlertCircle size={13} /> {formError}</small> : null}
                </label>
                <label className={styles.fullField}>
                  <span className="form-label">Mô tả</span>
                  <textarea className="textarea-field" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Mô tả kết quả mong đợi, tài liệu liên quan..." />
                </label>
                <label>
                  <span className="form-label">Người phụ trách</span>
                  <select className="select-field" value={form.assigneeId} onChange={(event) => {
                    const nextEmployee = employees.find((employee) => employee.id === event.target.value);
                    setForm({ ...form, assigneeId: event.target.value, department: nextEmployee?.department ?? form.department });
                  }}>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="form-label">Bộ phận</span>
                  <select className="select-field" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
                    {Array.from(new Set(employees.map((employee) => employee.department))).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span className="form-label">Thời hạn</span>
                  <input className="field" type="datetime-local" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} required />
                </label>
                <label>
                  <span className="form-label">Mức ưu tiên</span>
                  <select className="select-field" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>
                    <option value="high">Ưu tiên cao</option><option value="medium">Trung bình</option><option value="low">Ưu tiên thấp</option>
                  </select>
                </label>
                <div className={styles.assignmentHint}>
                  <Sparkles size={17} />
                  <div><strong>Gợi ý giao việc</strong><p>Người phụ trách sẽ nhận thông báo ngay sau khi bạn tạo công việc.</p></div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className="button-secondary" onClick={() => setModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="button-primary"><UserRoundCheck size={16} /> Tạo & giao việc</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
