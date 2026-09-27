"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coffee,
  Download,
  FileCheck2,
  FileText,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { gatewayApi } from "@/lib/api/gateway";
import { formatDateTime, initials, toScheduleRequest, unwrapData, userName, type ApiAttendance, type ApiScheduleRequest, type ApiUser, type ApiWorkRequest } from "@/lib/api/domain";
import { notifyNavigationMetricsChanged } from "@/lib/navigation-metrics";
import type { BadgeTone, ScheduleRequest } from "@/lib/types";
import styles from "./lich-lam.module.css";

type TabKey = "approvals" | "forms" | "operations" | "reports";
type RequestFilter = "all" | "pending" | "resolved";

const tabs = [
  { key: "approvals" as const, label: "Duyệt lịch", icon: CalendarCheck2 },
  { key: "forms" as const, label: "Đơn từ", icon: FileText },
  { key: "operations" as const, label: "Vận hành", icon: ScanLine },
  { key: "reports" as const, label: "Báo cáo", icon: BarChart3 },
];

const workRequestLabels: Record<ApiWorkRequest["type"], string> = { leave: "Nghỉ phép", late: "Đi muộn", early: "Về sớm", overtime: "Làm thêm giờ", business_trip: "Công tác", remote: "Làm việc từ xa" };

function requestStatus(status: ScheduleRequest["status"]) {
  if (status === "approved") return { label: "Đã duyệt", tone: "emerald" as BadgeTone };
  if (status === "rejected") return { label: "Từ chối", tone: "red" as BadgeTone };
  return { label: "Chờ duyệt", tone: "amber" as BadgeTone };
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("approvals");
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [workRequests, setWorkRequests] = useState<ApiWorkRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<ApiAttendance[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<ApiAttendance[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [qrToken, setQrToken] = useState("");
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [notice, setNotice] = useState("");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);

  const loadSchedule = useCallback(async () => {
    const currentMonth = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
    const reportFrom = new Date();
    reportFrom.setDate(reportFrom.getDate() - 6);
    const [scheduleResult, workResult, todayResult, reportResult, usersResult] = await Promise.allSettled([
        gatewayApi<ApiScheduleRequest[] | { data: ApiScheduleRequest[] }>(`workschedule/schedule/all?month=${currentMonth}`),
        gatewayApi<ApiWorkRequest[] | { data: ApiWorkRequest[] }>(`workschedule/requests/admin?month=${currentMonth}`),
        gatewayApi<ApiAttendance[] | { data: ApiAttendance[] }>("workschedule/attendance/today"),
        gatewayApi<ApiAttendance[] | { data: ApiAttendance[] }>(`workschedule/attendance/report?from=${encodeURIComponent(reportFrom.toISOString())}&to=${encodeURIComponent(new Date().toISOString())}`),
        gatewayApi<{ users: ApiUser[] }>("user/user/all"),
      ]);
    if (scheduleResult.status === "fulfilled") setRequests(unwrapData(scheduleResult.value).map(toScheduleRequest));
    if (workResult.status === "fulfilled") setWorkRequests(unwrapData(workResult.value));
    if (todayResult.status === "fulfilled") setTodayAttendance(unwrapData(todayResult.value));
    if (reportResult.status === "fulfilled") setAttendanceReport(unwrapData(reportResult.value));
    if (usersResult.status === "fulfilled") setEmployeeCount(usersResult.value.users?.length ?? 0);
    const failed = [scheduleResult, workResult, todayResult, reportResult, usersResult].filter((result) => result.status === "rejected");
    if (failed.length) showNotice(`${failed.length}/5 nhóm dữ liệu chưa đồng bộ được. Các phần còn lại vẫn sử dụng bình thường.`);
  }, [showNotice]);

  useEffect(() => { void Promise.resolve().then(loadSchedule); }, [loadSchedule]);

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const filteredRequests = useMemo(() => {
    if (filter === "pending") return requests.filter((request) => request.status === "pending");
    if (filter === "resolved") return requests.filter((request) => request.status !== "pending");
    return requests;
  }, [filter, requests]);

  const resolveRequest = async (id: string, status: "approved" | "rejected") => {
    const selected = requests.find((request) => request.id === id);
    const reason = status === "rejected" ? window.prompt("Nhập lý do từ chối:") : undefined;
    if (status === "rejected" && !reason?.trim()) return;
    try {
      await gatewayApi(`workschedule/schedule/requests/${encodeURIComponent(id)}/${status === "approved" ? "approve" : "reject"}`, { method: "POST", json: status === "rejected" ? { reason: reason!.trim() } : {} });
      await loadSchedule();
      notifyNavigationMetricsChanged();
      if (selected) showNotice(`${status === "approved" ? "Đã duyệt" : "Đã từ chối"} yêu cầu của ${selected.employee}.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xử lý yêu cầu.");
    }
  };

  const approveAll = async () => {
    try {
      await gatewayApi("workschedule/schedule/requests/bulk-approve", { method: "POST", json: { ids: requests.filter((item) => item.status === "pending").map((item) => item.id) } });
      await loadSchedule();
      notifyNavigationMetricsChanged();
      showNotice("Đã duyệt toàn bộ yêu cầu đang chờ.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể duyệt hàng loạt.");
    }
  };

  const resolveWorkRequest = async (request: ApiWorkRequest) => {
    const approved = window.confirm(`Duyệt đơn ${workRequestLabels[request.type]} của ${userName(request.employee)}? Chọn Hủy để từ chối.`);
    const reason = approved ? undefined : window.prompt("Nhập lý do từ chối:");
    if (!approved && !reason?.trim()) return;
    try {
      await gatewayApi(`workschedule/requests/${encodeURIComponent(request._id)}/${approved ? "approve" : "reject"}`, { method: "POST", json: approved ? {} : { reason: reason!.trim() } });
      await loadSchedule();
      notifyNavigationMetricsChanged();
      showNotice(approved ? "Đã duyệt đơn từ." : "Đã từ chối đơn từ.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xử lý đơn từ.");
    }
  };

  const generateQr = async () => {
    try {
      const result = await gatewayApi<{ data: { token: string } }>("workschedule/attendance/qr/generate", { method: "POST" });
      setQrToken(result.data.token);
      showNotice("Đã tạo token chấm công mới.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tạo token chấm công.");
    }
  };

  const checkedOutCount = todayAttendance.filter((item) => item.check_out_at).length;
  const todayAttendanceRate = Math.round((todayAttendance.length / Math.max(employeeCount, 1)) * 100);
  const weeklyAttendance = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const iso = date.toISOString().slice(0, 10);
    const present = new Set(attendanceReport.filter((item) => item.date.slice(0, 10) === iso && item.check_in_at).map((item) => item.employee_id)).size;
    return { day: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date), present, value: Math.round((present / Math.max(employeeCount, 1)) * 100) };
  });
  const attendanceAverage = Math.round(weeklyAttendance.reduce((sum, item) => sum + item.value, 0) / 7);
  const approvedWorkRequests = workRequests.filter((item) => item.status === "approved").length;
  const pendingWorkRequests = workRequests.filter((item) => item.status === "pending").length;
  const workRequestCount = (type: ApiWorkRequest["type"]) => workRequests.filter((item) => item.type === type).length;
  const attendanceByType = ["office", "remote"].map((type) => ({
    name: type === "office" ? "Văn phòng" : "Làm từ xa",
    people: todayAttendance.filter((item) => item.schedule_type === type).length,
    tone: type === "office" ? "blue" : "violet",
  }));
  const attendanceByRole = Array.from(todayAttendance.reduce((map, item) => {
    const role = item.employee?.role ?? "Chưa phân vai trò";
    map.set(role, (map.get(role) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries());

  return (
    <div className={styles.page}>
      {notice ? (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Quản trị vận hành"
        title="Lịch làm & chấm công"
        description="Theo dõi nhân sự theo thời gian thực, xử lý yêu cầu và kiểm soát lịch làm trong một màn hình."
        actions={
          <>
            <button className="button-secondary" onClick={() => void loadSchedule()}>
              <RefreshCw size={16} /> Làm mới
            </button>
            <button className="button-primary" onClick={() => setActiveTab("reports")}>
              <Download size={16} /> Xem báo cáo
            </button>
          </>
        }
      />

      <section className={styles.periodStrip} aria-label="Kỳ chấm công hiện tại">
        <div className={styles.periodCopy}>
          <span className={styles.periodIcon}><CalendarDays size={19} /></span>
          <div><small>Kỳ làm việc hiện tại</small><strong>7 ngày gần nhất</strong></div>
        </div>
        <div className={styles.periodMeta}>
          <span><span className={styles.liveDot} /> Dữ liệu trực tiếp</span>
          <button>Tuần này <ChevronDown size={15} /></button>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Tổng quan chấm công">
        <StatCard label="Có mặt hôm nay" value={`${todayAttendance.length} / ${employeeCount}`} helper="nhân sự đã check-in" icon={<UserCheck size={18} />} tone="emerald" />
        <StatCard label="Chờ phê duyệt" value={pendingCount} helper="yêu cầu cần xử lý" icon={<TimerReset size={18} />} tone="amber" />
        <StatCard label="Đã check-out" value={checkedOutCount} helper="theo dữ liệu hôm nay" icon={<Clock3 size={18} />} tone="blue" />
        <StatCard label="Tỷ lệ hiện diện" value={`${attendanceAverage}%`} helper="trong 7 ngày gần nhất" icon={<Sparkles size={18} />} tone="blue" />
      </section>

      <div className={styles.tabs} role="tablist" aria-label="Chức năng lịch làm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} className={active ? styles.tabActive : ""} onClick={() => setActiveTab(tab.key)} role="tab" aria-selected={active}>
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.key === "approvals" && pendingCount ? <em>{pendingCount}</em> : null}
            </button>
          );
        })}
      </div>

      {activeTab === "approvals" ? (
        <div className={styles.approvalLayout}>
          <section className={`${styles.panel} surface-card`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>Hàng đợi phê duyệt</p>
                <h2>Yêu cầu lịch làm</h2>
                <p>Xác nhận đăng ký lịch làm theo tháng của nhân sự.</p>
              </div>
              {pendingCount ? <button className={styles.approveAll} onClick={() => void approveAll()}><CheckCheckIcon /> Duyệt tất cả</button> : null}
            </div>

            <div className={styles.listToolbar}>
              <div className={styles.miniTabs}>
                {(["all", "pending", "resolved"] as RequestFilter[]).map((item) => (
                  <button key={item} onClick={() => setFilter(item)} className={filter === item ? styles.miniTabActive : ""}>
                    {item === "all" ? "Tất cả" : item === "pending" ? "Chờ duyệt" : "Đã xử lý"}
                  </button>
                ))}
              </div>
              <span>{filteredRequests.length} yêu cầu</span>
            </div>

            <div className={styles.requestList}>
              {filteredRequests.map((request) => {
                const status = requestStatus(request.status);
                return (
                  <article className={styles.requestItem} key={request.id}>
                    <Avatar initials={request.initial} tone={request.role === "Quản trị viên" ? "red" : "blue"} size="md" />
                    <div className={styles.requestPerson}>
                      <strong>{request.employee}</strong>
                      <span>{request.role} · {request.id}</span>
                    </div>
                    <div className={styles.requestDetail}>
                      <strong>{request.kind}</strong>
                      <span><Clock3 size={13} /> {request.schedule}</span>
                    </div>
                    <div className={styles.requestTime}>
                      <Badge tone={status.tone} dot>{status.label}</Badge>
                      <small>{request.submittedAt}</small>
                    </div>
                    <div className={styles.requestActions}>
                      {request.status === "pending" ? (
                        <>
                          <button className={styles.rejectButton} onClick={() => void resolveRequest(request.id, "rejected")} aria-label={`Từ chối ${request.employee}`}><X size={16} /></button>
                          <button className={styles.approveButton} onClick={() => void resolveRequest(request.id, "approved")}><Check size={16} /> Duyệt</button>
                        </>
                      ) : (
                        <span className={styles.undoButton}>Đã xử lý</span>
                      )}
                    </div>
                  </article>
                );
              })}
              {!filteredRequests.length ? <div className={styles.emptyState}><CheckCircle2 size={30} /><strong>Không còn yêu cầu</strong><p>Hàng đợi đã được xử lý xong.</p></div> : null}
            </div>
          </section>

          <aside className={`${styles.todayPanel} surface-card`}>
            <div className={styles.todayHeading}>
              <div><p className={styles.kicker}>Hôm nay · {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date())}</p><h2>Hiện diện</h2></div>
              <Badge tone={employeeCount === 0 ? "slate" : todayAttendanceRate >= 80 ? "emerald" : "amber"} dot={employeeCount > 0}>{employeeCount === 0 ? "Chưa có dữ liệu" : todayAttendanceRate >= 80 ? "Tốt" : "Cần theo dõi"}</Badge>
            </div>
            <div className={styles.attendanceRing}>
              <div><strong>{todayAttendanceRate}%</strong><span>đã có mặt</span></div>
            </div>
            <div className={styles.attendanceLegend}>
              <div><span className={styles.greenDot} /><strong>{todayAttendance.length}</strong><small>Có mặt</small></div>
              <div><span className={styles.amberDot} /><strong>{checkedOutCount}</strong><small>Đã check-out</small></div>
              <div><span className={styles.slateDot} /><strong>{Math.max(employeeCount - todayAttendance.length, 0)}</strong><small>Chưa ghi nhận</small></div>
            </div>
            <div className={styles.shiftCard}>
              <div><span className={styles.shiftIcon}><Coffee size={16} /></span><div><strong>Dữ liệu chấm công hôm nay</strong><p>{todayAttendance.length} lượt được Gateway ghi nhận</p></div></div>
            </div>
            <div className={styles.policyNote}>
              <ShieldCheck size={18} />
              <div><strong>Nguồn chấm công</strong><p>Danh sách được lấy trực tiếp từ báo cáo của NRApp Gateway.</p></div>
            </div>
          </aside>
        </div>
      ) : null}

      {activeTab === "forms" ? (
        <div className={styles.formsLayout}>
          <section className={`${styles.panel} surface-card`}>
            <div className={styles.panelHeader}>
              <div><p className={styles.kicker}>Đơn từ nội bộ</p><h2>Đề nghị cần xử lý</h2><p>Theo dõi phép, công tác và nghỉ bù tập trung.</p></div>
              <button className="button-secondary" disabled title="API hiện chưa hỗ trợ tham số lọc đơn"><FileCheck2 size={16} /> Lọc đơn</button>
            </div>
            <div className={styles.leaveList}>
              {workRequests.map((request, index) => {
                const name = userName(request.employee);
                const tone: BadgeTone = request.status === "approved" ? "emerald" : request.status === "rejected" ? "red" : "amber";
                return (
                <article className={styles.leaveItem} key={request._id}>
                  <div className={styles.leaveIndex}>{String(index + 1).padStart(2, "0")}</div>
                  <Avatar initials={initials(name)} size="md" tone={tone} />
                  <div className={styles.leavePerson}><strong>{name}</strong><span>{request.employee?.role ?? "Nhân sự"} · {request._id}</span></div>
                  <div className={styles.leaveType}><Badge tone={tone}>{workRequestLabels[request.type]}</Badge><span>{request.reason}</span></div>
                  <div className={styles.leaveRange}><strong>{formatDateTime(request.start_at)}</strong><span>{request.period === "full_day" ? "Cả ngày" : request.period === "morning" ? "Buổi sáng" : "Buổi chiều"}</span></div>
                  {request.status === "pending" ? <button className={styles.reviewButton} onClick={() => void resolveWorkRequest(request)}>Xử lý</button> : <Badge tone={tone}>{request.status === "approved" ? "Đã duyệt" : request.status === "rejected" ? "Từ chối" : "Đã hủy"}</Badge>}
                </article>
                );
              })}
            </div>
          </section>

          <aside className={`${styles.policyPanel} surface-card`}>
            <div className={styles.policyHero}>
              <span><ShieldCheck size={22} /></span>
              <div><p className={styles.kicker}>Dữ liệu Gateway</p><h2>Tổng hợp đơn từ</h2></div>
            </div>
            <div className={styles.policyBalance}>
              <div><strong>{pendingWorkRequests}</strong><span>đơn đang chờ</span></div>
              <div><strong>{approvedWorkRequests}</strong><span>đơn đã duyệt</span></div>
            </div>
            <ul className={styles.policyList}>
              <li><CheckCircle2 size={16} /><div><strong>Nghỉ phép</strong><p>{workRequestCount("leave")} đơn trong dữ liệu hiện tại.</p></div></li>
              <li><CheckCircle2 size={16} /><div><strong>Làm thêm giờ</strong><p>{workRequestCount("overtime")} đơn trong dữ liệu hiện tại.</p></div></li>
              <li><CheckCircle2 size={16} /><div><strong>Làm việc từ xa</strong><p>{workRequestCount("remote")} đơn trong dữ liệu hiện tại.</p></div></li>
            </ul>
            <button className={styles.policyButton} onClick={() => void loadSchedule()}><FileText size={16} /> Đồng bộ lại đơn từ</button>
          </aside>
        </div>
      ) : null}

      {activeTab === "operations" ? (
        <div className={styles.operationsGrid}>
          <section className={styles.qrCard}>
            <div className={styles.qrContent}>
              <p className={styles.darkKicker}>Mã điểm danh trực tiếp</p>
              <h2>Token chấm công</h2>
              <p>Token được tạo trực tiếp bởi API chấm công và nhân sự có thể nhập hoặc quét trên ứng dụng NRApp.</p>
              <div className={styles.qrMeta}><span><ShieldCheck size={15} /> Sinh bởi NRApp Gateway</span><span><Clock3 size={15} /> Hiệu lực 30 giây</span></div>
              <button onClick={() => void generateQr()}><RefreshCw size={16} /> Tạo token mới</button>
            </div>
            <div className={styles.qrVisual}>
              <div className={styles.qrBox}><QrCode size={70} strokeWidth={1.45} /><small>{qrToken || "Chưa tạo token"}</small></div>
              <span><span className={styles.liveDot} /> Token có hiệu lực 30 giây</span>
            </div>
          </section>

          <section className={`${styles.shiftPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Hình thức làm việc</p><h2>Trạng thái hôm nay</h2></div><Badge tone="emerald" dot>{todayAttendance.length} lượt ghi nhận</Badge></div>
            <div className={styles.shiftRows}>
              {attendanceByType.map((item) => {
                const percent = Math.round((item.people / Math.max(todayAttendance.length, 1)) * 100);
                return <div className={styles.shiftRow} key={item.name}>
                  <span className={`${styles.shiftMarker} ${styles[`marker_${item.tone}`]}`} />
                  <div><strong>{item.name}</strong><span>Dữ liệu theo lịch</span></div>
                  <div className={styles.shiftPeople}><UsersRound size={14} /> {item.people}</div>
                  <div className={styles.shiftProgress}><span><i style={{ width: `${percent}%` }} /></span><strong>{percent}%</strong></div>
                </div>
              })}
            </div>
          </section>

          <section className={`${styles.alertPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Cần lưu ý</p><h2>Sự kiện gần đây</h2></div><Clock3 size={18} /></div>
            <div className={styles.eventList}>
              {todayAttendance.slice(0, 3).map((item) => <div key={item._id}><span className={styles.eventGreen}><Check size={15} /></span><p><strong>{userName(item.employee)} đã check-in</strong><small>{item.schedule_type === "office" ? "Văn phòng" : "Từ xa"} · {item.check_in_at ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.check_in_at)) : "—"}</small></p></div>)}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className={styles.reportLayout}>
          <section className={`${styles.chartPanel} surface-card`}>
            <div className={styles.panelHeader}>
              <div><p className={styles.kicker}>7 ngày gần nhất</p><h2>Tỷ lệ hiện diện theo ngày</h2><p>So sánh số nhân sự thực tế trên tổng tài khoản hiện có.</p></div>
              <button className={styles.periodButton}>7 ngày gần nhất <ChevronDown size={14} /></button>
            </div>
            <div className={styles.chartLegend}><span><i /> Hiện diện</span><small>Trung bình <strong>{attendanceAverage}%</strong></small></div>
            <div className={styles.barChart}>
              {weeklyAttendance.map((item) => (
                <div className={styles.barColumn} key={item.day}>
                  <div className={styles.barValue}>{item.value}%</div>
                  <div className={styles.barTrack}><span style={{ height: `${item.value}%` }} /></div>
                  <strong>{item.day}</strong><small>{item.present} người</small>
                </div>
              ))}
            </div>
          </section>

          <aside className={`${styles.insightPanel} surface-card`}>
            <div className={styles.insightIcon}><Sparkles size={20} /></div>
            <p className={styles.kicker}>Phân tích nhanh</p>
            <h2>{attendanceAverage >= 80 ? "Tỷ lệ hiện diện đang tốt" : "Tỷ lệ hiện diện cần theo dõi"}</h2>
            <p>Trung bình 7 ngày là <strong>{attendanceAverage}%</strong>; hôm nay ghi nhận {todayAttendance.length} lượt check-in và {checkedOutCount} lượt check-out.</p>
            <div className={styles.insightMetric}><span>Điểm hiện diện</span><strong>{(attendanceAverage / 10).toFixed(1)}<small>/10</small></strong></div>
            <div className={styles.insightProgress}><span style={{ width: `${attendanceAverage}%` }} /></div>
            <button onClick={() => void loadSchedule()}><BarChart3 size={16} /> Làm mới phân tích</button>
          </aside>

          <section className={`${styles.departmentPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Theo hệ thống</p><h2>Hiệu suất chấm công</h2></div><Badge tone="slate">{employeeCount} nhân sự</Badge></div>
            <div className={styles.departmentTable}>
              <div className={styles.tableHead}><span>Vai trò</span><span>Nhân sự</span><span>Tỷ lệ ghi nhận</span><span>Check-out</span><span>Trạng thái</span></div>
              {attendanceByRole.map(([role, count]) => (
                <div className={styles.tableRow} key={role}><span>{role}</span><span>{count}</span><span>{Math.round((count / Math.max(employeeCount, 1)) * 100)}%</span><span>{todayAttendance.filter((item) => item.employee?.role === role && item.check_out_at).length}</span><span><Badge tone="emerald">Đã ghi nhận</Badge></span></div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function CheckCheckIcon() {
  return <span className={styles.doubleCheck}><Check size={12} /><Check size={12} /></span>;
}
