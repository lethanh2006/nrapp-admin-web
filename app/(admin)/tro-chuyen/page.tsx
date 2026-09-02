"use client";

import {
  ArrowLeft,
  CheckCheck,
  Circle,
  ImagePlus,
  Info,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { conversations as initialConversations, initialMessages } from "@/lib/mock-data";
import type { ChatMessage } from "@/lib/types";
import styles from "./tro-chuyen.module.css";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [conversationItems, setConversationItems] = useState(initialConversations);
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "groups">("all");
  const [selectedId, setSelectedId] = useState(initialConversations[0].id);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(initialMessages);
  const [draft, setDraft] = useState("");
  const [conversationOpen, setConversationOpen] = useState(false);
  const [hint, setHint] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return conversationItems.filter((item) => {
      if (conversationFilter === "unread" && item.unread === 0) return false;
      if (conversationFilter === "groups") return false;
      if (!normalized) return true;
      return `${item.name} ${item.role}`.toLocaleLowerCase("vi").includes(normalized);
    });
  }, [conversationFilter, conversationItems, query]);

  const selected = conversationItems.find((item) => item.id === selectedId) ?? conversationItems[0];
  const currentMessages = messages[selected.id] ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [currentMessages.length, selected.id]);

  const openConversation = (id: string) => {
    if (id !== selectedId) setDraft("");
    setSelectedId(id);
    setConversationOpen(true);
    setConversationItems((current) => current.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    const nextMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: "admin",
      content,
      time: new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    };
    setMessages((current) => ({
      ...current,
      [selected.id]: [...(current[selected.id] ?? []), nextMessage],
    }));
    setConversationItems((current) => current.map((item) => (
      item.id === selected.id
        ? { ...item, lastMessage: content, time: "Bây giờ", unread: 0 }
        : item
    )));
    setDraft("");
  };

  const showDemoHint = (message: string) => {
    setHint(message);
    window.setTimeout(() => setHint(""), 2200);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Kết nối nội bộ"
        title="Trò chuyện"
        description="Trao đổi nhanh với nhân sự và theo dõi hội thoại trong cùng một không gian làm việc."
        actions={<Badge tone="emerald" dot>Hệ thống realtime hoạt động</Badge>}
      />

      <section className={styles.chatShell}>
        <aside className={`${styles.conversationPanel} ${conversationOpen ? styles.conversationPanelHidden : ""}`}>
          <div className={styles.panelHeader}>
            <div>
              <p>Kênh trao đổi</p>
              <h2>Tin nhắn gần đây</h2>
            </div>
            <span className={styles.messageCount}>{conversationItems.length}</span>
          </div>

          <label className={styles.searchBox}>
            <Search size={16} />
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhân sự..." />
          </label>

          <div className={styles.filterRow}>
            <button className={conversationFilter === "all" ? styles.filterActive : ""} onClick={() => setConversationFilter("all")}>Tất cả</button>
            <button className={conversationFilter === "unread" ? styles.filterActive : ""} onClick={() => setConversationFilter("unread")}>
              Chưa đọc <span>{conversationItems.reduce((total, item) => total + item.unread, 0)}</span>
            </button>
            <button className={conversationFilter === "groups" ? styles.filterActive : ""} onClick={() => setConversationFilter("groups")}>Nhóm</button>
          </div>

          <div className={styles.conversationList}>
            {filteredConversations.map((conversation) => (
              <button
                className={`${styles.conversationItem} ${selected.id === conversation.id ? styles.conversationActive : ""}`}
                key={conversation.id}
                onClick={() => openConversation(conversation.id)}
              >
                <Avatar initials={conversation.initial} tone={conversation.id === "quoc-bao" ? "amber" : conversation.id === "thu-huong" ? "blue" : "red"} online={conversation.online} />
                <span className={styles.conversationCopy}>
                  <span className={styles.conversationTop}>
                    <strong>{conversation.name}</strong>
                    <time>{conversation.time}</time>
                  </span>
                  <span className={styles.conversationBottom}>
                    <span>{conversation.lastMessage}</span>
                    {conversation.unread ? <b>{conversation.unread}</b> : null}
                  </span>
                </span>
              </button>
            ))}
            {filteredConversations.length === 0 ? (
              <div className={styles.emptySearch}>
                <Search size={26} />
                <strong>{conversationFilter === "groups" ? "Chưa có hội thoại nhóm" : "Không tìm thấy nhân sự"}</strong>
                <span>{conversationFilter === "groups" ? "Nhóm mới sẽ xuất hiện tại đây." : "Thử một tên hoặc chức vụ khác."}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.teamStatus}>
            <span><Circle size={9} fill="currentColor" /> 2 người đang trực tuyến</span>
            <button onClick={() => showDemoHint("Danh bạ đã được làm mới")}>Làm mới</button>
          </div>
        </aside>

        <div className={`${styles.messagePanel} ${conversationOpen ? styles.messagePanelOpen : ""}`}>
          <header className={styles.messageHeader}>
            <button className={styles.mobileBack} onClick={() => setConversationOpen(false)} aria-label="Quay lại danh sách hội thoại">
              <ArrowLeft size={19} />
            </button>
            <Avatar initials={selected.initial} online={selected.online} />
            <div className={styles.messagePerson}>
              <strong>{selected.name}</strong>
              <span>{selected.online ? "Đang trực tuyến" : selected.role}</span>
            </div>
            <div className={styles.messageActions}>
              <button onClick={() => showDemoHint("Cuộc gọi thoại sẽ khả dụng khi kết nối dịch vụ realtime")} aria-label="Gọi thoại"><Phone size={17} /></button>
              <button onClick={() => showDemoHint("Cuộc gọi video sẽ khả dụng khi kết nối dịch vụ realtime")} aria-label="Gọi video"><Video size={18} /></button>
              <button onClick={() => showDemoHint("Thông tin hội thoại")} aria-label="Thông tin hội thoại"><Info size={18} /></button>
              <button onClick={() => showDemoHint("Tùy chọn hội thoại đang ở chế độ trình diễn")} aria-label="Tùy chọn"><MoreHorizontal size={19} /></button>
            </div>
          </header>

          <div className={styles.messages}>
            <div className={styles.dayDivider}><span>Hôm nay</span></div>
            {currentMessages.map((message, index) => {
              const isAdmin = message.sender === "admin";
              const previous = currentMessages[index - 1];
              const showAvatar = !isAdmin && previous?.sender !== "member";
              return (
                <div className={`${styles.messageRow} ${isAdmin ? styles.messageRowAdmin : ""}`} key={message.id}>
                  {!isAdmin ? (
                    showAvatar ? <Avatar initials={selected.initial} size="sm" /> : <span className={styles.avatarSpacer} />
                  ) : null}
                  <div className={`${styles.bubbleWrap} ${isAdmin ? styles.bubbleWrapAdmin : ""}`}>
                    <div className={`${styles.bubble} ${isAdmin ? styles.bubbleAdmin : styles.bubbleMember}`}>
                      {message.content}
                    </div>
                    <span className={styles.messageTime}>
                      {message.time} {isAdmin ? <CheckCheck size={13} /> : null}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className={styles.typingRow}>
              <span className={styles.avatarSpacer} />
              <div className={styles.typingBubble}><i /><i /><i /></div>
              <span>{selected.name.split(" ").at(-1)} đang nhập...</span>
            </div>
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <div className={styles.composerTools}>
              <button type="button" onClick={() => showDemoHint("Tính năng đính kèm là phần giao diện demo")} aria-label="Đính kèm tệp"><Paperclip size={18} /></button>
              <button type="button" onClick={() => showDemoHint("Tính năng gửi ảnh là phần giao diện demo")} aria-label="Gửi hình ảnh"><ImagePlus size={18} /></button>
            </div>
            <label className={styles.messageInput}>
              <span className="sr-only">Nội dung tin nhắn</span>
              <textarea
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={`Nhắn tin cho ${selected.name}...`}
              />
              <button type="button" onClick={() => setDraft((value) => `${value} 😊`)} aria-label="Thêm biểu tượng cảm xúc"><Smile size={18} /></button>
            </label>
            <button className={styles.sendButton} type="submit" disabled={!draft.trim()} aria-label="Gửi tin nhắn">
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>

      {hint ? <div className={styles.toast} role="status" aria-live="polite"><MessageCircle size={15} />{hint}</div> : null}
    </div>
  );
}
