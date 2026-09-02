"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
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
  MapPin,
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
import { scheduleRequests } from "@/lib/mock-data";
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

const leaveRequests = [
  { id: "DT-089", name: "Vũ Gia Huy", initial: "GH", department: "Kỹ thuật", type: "Nghỉ phép năm", range: "02/09 – 03/09", duration: "2 ngày", reason: "Việc gia đình", tone: "blue" as BadgeTone },
  { id: "DT-088", name: "Nguyễn Minh Anh", initial: "MA", department: "Ban điều hành", type: "Công tác", range: "04/09 – 06/09", duration: "3 ngày", reason: "Gặp đối tác tại Đà Nẵng", tone: "violet" as BadgeTone },
  { id: "DT-087", name: "Bùi Khánh Vy", initial: "KV", department: "Căn tin", type: "Nghỉ bù", range: "30/08", duration: "1 ngày", reason: "Bù ca cuối tuần", tone: "amber" as BadgeTone },
];

const weeklyAttendance = [
  { day: "T2", value: 93, present: 45 },
  { day: "T3", value: 96, present: 46 },
  { day: "T4", value: 90, present: 43 },
  { day: "T5", value: 98, present: 47 },
  { day: "T6", value: 94, present: 45 },
  { day: "T7", value: 72, present: 18 },
  { day: "CN", value: 64, present: 16 },
];

function requestStatus(status: ScheduleRequest["status"]) {
  if (status === "approved") return { label: "Đã duyệt", tone: "emerald" as BadgeTone };
  if (status === "rejected") return { label: "Từ chối", tone: "red" as BadgeTone };
  return { label: "Chờ duyệt", tone: "amber" as BadgeTone };
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("approvals");
  const [requests, setRequests] = useState<ScheduleRequest[]>(scheduleRequests);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [notice, setNotice] = useState("");

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const filteredRequests = useMemo(() => {
    if (filter === "pending") return requests.filter((request) => request.status === "pending");
    if (filter === "resolved") return requests.filter((request) => request.status !== "pending");
    return requests;
  }, [filter, requests]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const resolveRequest = (id: string, status: "approved" | "rejected") => {
    const selected = requests.find((request) => request.id === id);
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
    if (selected) showNotice(`${status === "approved" ? "Đã duyệt" : "Đã từ chối"} yêu cầu của ${selected.employee}.`);
  };

  const approveAll = () => {
    setRequests((current) => current.map((request) => ({ ...request, status: request.status === "pending" ? "approved" : request.status })));
    showNotice("Đã duyệt toàn bộ yêu cầu đang chờ.");
  };

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
            <button className="button-secondary" onClick={() => showNotice("Đã làm mới dữ liệu chấm công.")}>
              <RefreshCw size={16} /> Làm mới
            </button>
            <button className="button-primary" onClick={() => showNotice("Báo cáo tuần đang được chuẩn bị.")}>
              <Download size={16} /> Xuất báo cáo
            </button>
          </>
        }
      />

      <section className={styles.periodStrip} aria-label="Kỳ chấm công hiện tại">
        <div className={styles.periodCopy}>
          <span className={styles.periodIcon}><CalendarDays size={19} /></span>
          <div><small>Kỳ làm việc hiện tại</small><strong>28/08 – 03/09/2026</strong></div>
        </div>
        <div className={styles.periodMeta}>
          <span><span className={styles.liveDot} /> Dữ liệu trực tiếp</span>
          <button>Tuần này <ChevronDown size={15} /></button>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Tổng quan chấm công">
        <StatCard label="Có mặt hôm nay" value="43 / 48" helper="nhân sự đã check-in" trend="+4,8%" icon={<UserCheck size={18} />} tone="emerald" />
        <StatCard label="Chờ phê duyệt" value={pendingCount} helper="yêu cầu cần xử lý" icon={<TimerReset size={18} />} tone="amber" />
        <StatCard label="Đi muộn" value="3" helper="giảm 2 so với hôm qua" trend="-40%" trendDirection="down" icon={<AlertTriangle size={18} />} tone="red" />
        <StatCard label="Tỷ lệ đúng giờ" value="94,6%" helper="trong tuần hiện tại" trend="+1,2%" icon={<Sparkles size={18} />} tone="blue" />
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
                <p>Xác nhận lịch, đổi ca và hình thức làm việc của nhân sự.</p>
              </div>
              {pendingCount ? <button className={styles.approveAll} onClick={approveAll}><CheckCheckIcon /> Duyệt tất cả</button> : null}
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
                    <Avatar initials={request.initial} tone={request.department === "Căn tin" ? "amber" : request.department === "Nhân sự" ? "blue" : "slate"} size="md" />
                    <div className={styles.requestPerson}>
                      <strong>{request.employee}</strong>
                      <span>{request.department} · {request.id}</span>
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
                          <button className={styles.rejectButton} onClick={() => resolveRequest(request.id, "rejected")} aria-label={`Từ chối ${request.employee}`}><X size={16} /></button>
                          <button className={styles.approveButton} onClick={() => resolveRequest(request.id, "approved")}><Check size={16} /> Duyệt</button>
                        </>
                      ) : (
                        <button className={styles.undoButton} onClick={() => {
                          setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: "pending" } : item));
                          showNotice("Đã đưa yêu cầu về trạng thái chờ duyệt.");
                        }}>Xem lại</button>
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
              <div><p className={styles.kicker}>Hôm nay · 28/08</p><h2>Hiện diện</h2></div>
              <Badge tone="emerald" dot>Ổn định</Badge>
            </div>
            <div className={styles.attendanceRing}>
              <div><strong>89,6%</strong><span>đã có mặt</span></div>
            </div>
            <div className={styles.attendanceLegend}>
              <div><span className={styles.greenDot} /><strong>43</strong><small>Có mặt</small></div>
              <div><span className={styles.amberDot} /><strong>3</strong><small>Đi muộn</small></div>
              <div><span className={styles.slateDot} /><strong>2</strong><small>Vắng</small></div>
            </div>
            <div className={styles.shiftCard}>
              <div><span className={styles.shiftIcon}><Coffee size={16} /></span><div><strong>Ca sáng sắp kết thúc</strong><p>08:00 – 12:00 · 24 nhân sự</p></div></div>
              <span>42 phút</span>
            </div>
            <div className={styles.policyNote}>
              <ShieldCheck size={18} />
              <div><strong>Chính sách đúng giờ</strong><p>Check-in hợp lệ trong bán kính 150m và trước 08:05.</p></div>
            </div>
          </aside>
        </div>
      ) : null}

      {activeTab === "forms" ? (
        <div className={styles.formsLayout}>
          <section className={`${styles.panel} surface-card`}>
            <div className={styles.panelHeader}>
              <div><p className={styles.kicker}>Đơn từ nội bộ</p><h2>Đề nghị cần xử lý</h2><p>Theo dõi phép, công tác và nghỉ bù tập trung.</p></div>
              <button className="button-secondary" onClick={() => showNotice("Đã mở bộ lọc đơn từ.")}><FileCheck2 size={16} /> Lọc đơn</button>
            </div>
            <div className={styles.leaveList}>
              {leaveRequests.map((request, index) => (
                <article className={styles.leaveItem} key={request.id}>
                  <div className={styles.leaveIndex}>{String(index + 1).padStart(2, "0")}</div>
                  <Avatar initials={request.initial} size="md" tone={request.tone} />
                  <div className={styles.leavePerson}><strong>{request.name}</strong><span>{request.department} · {request.id}</span></div>
                  <div className={styles.leaveType}><Badge tone={request.tone}>{request.type}</Badge><span>{request.reason}</span></div>
                  <div className={styles.leaveRange}><strong>{request.range}</strong><span>{request.duration}</span></div>
                  <button className={styles.reviewButton} onClick={() => showNotice(`Đã ghi nhận xử lý đơn của ${request.name}.`)}>Xử lý</button>
                </article>
              ))}
            </div>
          </section>

          <aside className={`${styles.policyPanel} surface-card`}>
            <div className={styles.policyHero}>
              <span><ShieldCheck size={22} /></span>
              <div><p className={styles.kicker}>Quy định 2026</p><h2>Chính sách nghỉ phép</h2></div>
            </div>
            <div className={styles.policyBalance}>
              <div><strong>12</strong><span>ngày tiêu chuẩn</span></div>
              <div><strong>4,6</strong><span>ngày còn lại TB</span></div>
            </div>
            <ul className={styles.policyList}>
              <li><CheckCircle2 size={16} /><div><strong>Phép năm</strong><p>Gửi trước tối thiểu 02 ngày làm việc.</p></div></li>
              <li><CheckCircle2 size={16} /><div><strong>Đổi ca</strong><p>Cần xác nhận của người nhận ca thay.</p></div></li>
              <li><CheckCircle2 size={16} /><div><strong>Làm việc từ xa</strong><p>Tối đa 02 ngày mỗi tháng.</p></div></li>
            </ul>
            <button className={styles.policyButton} onClick={() => showNotice("Đã mở sổ tay chính sách.")}><FileText size={16} /> Xem sổ tay đầy đủ</button>
          </aside>
        </div>
      ) : null}

      {activeTab === "operations" ? (
        <div className={styles.operationsGrid}>
          <section className={styles.qrCard}>
            <div className={styles.qrContent}>
              <p className={styles.darkKicker}>Mã điểm danh trực tiếp</p>
              <h2>Check-in ca sáng</h2>
              <p>Nhân sự quét mã trên ứng dụng NRApp. Mã tự động làm mới sau mỗi 60 giây.</p>
              <div className={styles.qrMeta}><span><MapPin size={15} /> Văn phòng HDG · Tầng 1</span><span><Clock3 size={15} /> 07:45 – 08:15</span></div>
              <button onClick={() => showNotice("Mã chấm công đã được làm mới.")}><RefreshCw size={16} /> Tạo mã mới</button>
            </div>
            <div className={styles.qrVisual}>
              <div className={styles.qrBox}><QrCode size={118} strokeWidth={1.45} /><span className={styles.qrScan} /></div>
              <span><span className={styles.liveDot} /> Còn 00:42</span>
            </div>
          </section>

          <section className={`${styles.shiftPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Điều phối ca</p><h2>Trạng thái vận hành</h2></div><Badge tone="emerald" dot>4 ca hoạt động</Badge></div>
            <div className={styles.shiftRows}>
              {[
                ["Ca sáng", "08:00 – 12:00", "24 / 26", "92%", "red"],
                ["Hành chính", "08:00 – 17:30", "14 / 15", "93%", "blue"],
                ["Ca chiều", "13:00 – 18:00", "08 / 09", "89%", "amber"],
                ["Ca tối", "18:00 – 22:00", "04 / 04", "100%", "violet"],
              ].map(([name, time, people, percent, tone]) => (
                <div className={styles.shiftRow} key={name}>
                  <span className={`${styles.shiftMarker} ${styles[`marker_${tone}`]}`} />
                  <div><strong>{name}</strong><span>{time}</span></div>
                  <div className={styles.shiftPeople}><UsersRound size={14} /> {people}</div>
                  <div className={styles.shiftProgress}><span><i style={{ width: percent }} /></span><strong>{percent}</strong></div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${styles.alertPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Cần lưu ý</p><h2>Sự kiện gần đây</h2></div><Clock3 size={18} /></div>
            <div className={styles.eventList}>
              <div><span className={styles.eventRed}><AlertTriangle size={15} /></span><p><strong>03 lượt check-in muộn</strong><small>Ca sáng · 08:06 – 08:14</small></p></div>
              <div><span className={styles.eventGreen}><Check size={15} /></span><p><strong>Phạm Quốc Bảo đã check-in</strong><small>Căn tin · 07:52</small></p></div>
              <div><span className={styles.eventBlue}><MapPin size={15} /></span><p><strong>Thiết bị tầng 2 hoạt động lại</strong><small>Kỹ thuật · 07:41</small></p></div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className={styles.reportLayout}>
          <section className={`${styles.chartPanel} surface-card`}>
            <div className={styles.panelHeader}>
              <div><p className={styles.kicker}>Tuần 35 · 2026</p><h2>Tỷ lệ hiện diện theo ngày</h2><p>So sánh số nhân sự thực tế trên tổng lịch đã phân.</p></div>
              <button className={styles.periodButton}>7 ngày gần nhất <ChevronDown size={14} /></button>
            </div>
            <div className={styles.chartLegend}><span><i /> Hiện diện</span><small>Trung bình <strong>86,7%</strong></small></div>
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
            <h2>Chỉ số tuần đang tốt</h2>
            <p>Tỷ lệ đúng giờ tăng <strong>1,2%</strong>. Khối Căn tin có cải thiện tốt nhất với 97% ca được xác nhận.</p>
            <div className={styles.insightMetric}><span>Điểm vận hành</span><strong>8.9<small>/10</small></strong></div>
            <div className={styles.insightProgress}><span style={{ width: "89%" }} /></div>
            <button onClick={() => showNotice("Đã tạo bản phân tích chi tiết.")}><BarChart3 size={16} /> Xem phân tích đầy đủ</button>
          </aside>

          <section className={`${styles.departmentPanel} surface-card`}>
            <div className={styles.panelHeader}><div><p className={styles.kicker}>Theo bộ phận</p><h2>Hiệu suất chấm công</h2></div><Badge tone="slate">48 nhân sự</Badge></div>
            <div className={styles.departmentTable}>
              <div className={styles.tableHead}><span>Bộ phận</span><span>Nhân sự</span><span>Đúng giờ</span><span>Vi phạm</span><span>Đánh giá</span></div>
              {[
                ["Căn tin", "13", "97%", "1", "Xuất sắc"],
                ["Vận hành", "11", "95%", "2", "Tốt"],
                ["Nhân sự", "08", "94%", "1", "Tốt"],
                ["Kỹ thuật", "09", "91%", "3", "Cần lưu ý"],
              ].map((row) => (
                <div className={styles.tableRow} key={row[0]}>{row.map((cell, index) => <span key={cell}>{index === 4 ? <Badge tone={cell === "Cần lưu ý" ? "amber" : "emerald"}>{cell}</Badge> : cell}</span>)}</div>
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
