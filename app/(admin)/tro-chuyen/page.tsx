"use client";

import {
  ArrowLeft,
  CheckCheck,
  Circle,
  Info,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthSession } from "@/components/providers/auth-session-provider";
import {
  formatDateTime,
  initials,
  userName,
  type ApiChatListItem,
  type ApiMessage,
  type ApiUser,
} from "@/lib/api/domain";
import { gatewayApi } from "@/lib/api/gateway";
import type { ChatMessage, Conversation } from "@/lib/types";
import styles from "./tro-chuyen.module.css";

const emptyConversation: Conversation = {
  id: "",
  name: "Chưa có cuộc trò chuyện",
  role: "",
  initial: "—",
  online: false,
  lastMessage: "",
  time: "",
  unread: 0,
};

export default function ChatPage() {
  const { user } = useAuthSession();
  const [query, setQuery] = useState("");
  const [conversationItems, setConversationItems] = useState<Conversation[]>([]);
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "groups">("all");
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [draft, setDraft] = useState("");
  const [conversationOpen, setConversationOpen] = useState(false);
  const [hint, setHint] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showHint = useCallback((message: string) => {
    setHint(message);
    window.setTimeout(() => setHint(""), 2600);
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const result = await gatewayApi<{ chats: ApiChatListItem[] }>("chat/chat/all");
      const rows = (Array.isArray(result.chats) ? result.chats : []).map(({ chat, user: wrapper }) => {
        const rawUser = (wrapper as { user?: ApiUser }).user ?? wrapper as ApiUser;
        const name = userName(rawUser);
        const updatedAt = new Date(chat.updatedAt);
        return {
          id: chat._id,
          name,
          role: rawUser.role ?? "Thành viên",
          initial: initials(name),
          online: false,
          lastMessage: chat.latestMessage?.text || "Bắt đầu cuộc trò chuyện",
          time: Number.isNaN(updatedAt.getTime())
            ? ""
            : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(updatedAt),
          unread: chat.unseenCount ?? 0,
        } satisfies Conversation;
      });
      setConversationItems(rows);
      setSelectedId((current) => rows.some((item) => item.id === current) ? current : rows[0]?.id ?? "");
      setHint("");
    } catch (error) {
      setConversationItems([]);
      showHint(error instanceof Error ? error.message : "Không thể tải danh sách trò chuyện.");
    }
  }, [showHint]);

  useEffect(() => { void Promise.resolve().then(loadChats); }, [loadChats]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return conversationItems.filter((item) => {
      if (conversationFilter === "unread" && item.unread === 0) return false;
      if (conversationFilter === "groups") return false;
      if (!normalized) return true;
      return `${item.name} ${item.role}`.toLocaleLowerCase("vi").includes(normalized);
    });
  }, [conversationFilter, conversationItems, query]);

  const selected = conversationItems.find((item) => item.id === selectedId) ?? conversationItems[0] ?? emptyConversation;
  const currentMessages = messages[selected.id] ?? [];

  useEffect(() => {
    if (!selectedId) return;
    void gatewayApi<{ messages: ApiMessage[] }>(`chat/message/${encodeURIComponent(selectedId)}`)
      .then((result) => {
        const rows = (Array.isArray(result.messages) ? result.messages : []).map((message) => ({
          id: message._id,
          sender: message.sender === user?.id ? "admin" as const : "member" as const,
          content: message.text?.trim() || (message.messageType === "image" ? "[Hình ảnh]" : ""),
          time: formatDateTime(message.createdAt),
        }));
        setMessages((current) => ({ ...current, [selectedId]: rows }));
        setConversationItems((current) => current.map((item) => item.id === selectedId ? { ...item, unread: 0 } : item));
      })
      .catch((error) => showHint(error instanceof Error ? error.message : "Không thể tải tin nhắn."));
  }, [selectedId, showHint, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [currentMessages.length, selected.id]);

  const openConversation = (id: string) => {
    if (id !== selectedId) setDraft("");
    setSelectedId(id);
    setConversationOpen(true);
    setConversationItems((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item));
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selected.id) return;
    try {
      const result = await gatewayApi<{ message: ApiMessage }>("chat/message", {
        method: "POST",
        json: { chatId: selected.id, text: content },
      });
      const nextMessage: ChatMessage = {
        id: result.message._id,
        sender: "admin",
        content: result.message.text ?? content,
        time: formatDateTime(result.message.createdAt),
      };
      setMessages((current) => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), nextMessage] }));
      setConversationItems((current) => current.map((item) => item.id === selected.id ? { ...item, lastMessage: content, time: "Bây giờ", unread: 0 } : item));
      setDraft("");
    } catch (error) {
      showHint(error instanceof Error ? error.message : "Không thể gửi tin nhắn.");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Kết nối nội bộ"
        title="Trò chuyện"
        description="Trao đổi nhanh với nhân sự và theo dõi hội thoại trong cùng một không gian làm việc."
        actions={<Badge tone="emerald" dot>Đồng bộ qua NRApp Gateway</Badge>}
      />

      <section className={styles.chatShell}>
        <aside className={`${styles.conversationPanel} ${conversationOpen ? styles.conversationPanelHidden : ""}`}>
          <div className={styles.panelHeader}>
            <div><p>Kênh trao đổi</p><h2>Tin nhắn gần đây</h2></div>
            <span className={styles.messageCount}>{conversationItems.length}</span>
          </div>

          <label className={styles.searchBox}>
            <Search size={16} />
            <span className="sr-only">Tìm cuộc trò chuyện</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhân sự..." />
          </label>

          <div className={styles.filterRow}>
            <button className={conversationFilter === "all" ? styles.filterActive : ""} onClick={() => setConversationFilter("all")}>Tất cả</button>
            <button className={conversationFilter === "unread" ? styles.filterActive : ""} onClick={() => setConversationFilter("unread")}>Chưa đọc <span>{conversationItems.reduce((total, item) => total + item.unread, 0)}</span></button>
            <button className={conversationFilter === "groups" ? styles.filterActive : ""} onClick={() => setConversationFilter("groups")}>Nhóm</button>
          </div>

          <div className={styles.conversationList}>
            {filteredConversations.map((conversation) => (
              <button className={`${styles.conversationItem} ${selected.id === conversation.id ? styles.conversationActive : ""}`} key={conversation.id} onClick={() => openConversation(conversation.id)}>
                <Avatar initials={conversation.initial} tone="blue" online={conversation.online} />
                <span className={styles.conversationCopy}>
                  <span className={styles.conversationTop}><strong>{conversation.name}</strong><time>{conversation.time}</time></span>
                  <span className={styles.conversationBottom}><span>{conversation.lastMessage}</span>{conversation.unread ? <b>{conversation.unread}</b> : null}</span>
                </span>
              </button>
            ))}
            {!filteredConversations.length ? (
              <div className={styles.emptySearch}><Search size={26} /><strong>{conversationFilter === "groups" ? "Backend chưa hỗ trợ hội thoại nhóm" : "Không có hội thoại phù hợp"}</strong><span>Dữ liệu được lấy trực tiếp từ NRApp Gateway.</span></div>
            ) : null}
          </div>

          <div className={styles.teamStatus}>
            <span><Circle size={9} fill="currentColor" /> {conversationItems.length} hội thoại từ máy chủ</span>
            <button onClick={() => void loadChats()}>Làm mới</button>
          </div>
        </aside>

        <div className={`${styles.messagePanel} ${conversationOpen ? styles.messagePanelOpen : ""}`}>
          <header className={styles.messageHeader}>
            <button className={styles.mobileBack} onClick={() => setConversationOpen(false)} aria-label="Quay lại danh sách hội thoại"><ArrowLeft size={19} /></button>
            <Avatar initials={selected.initial} online={selected.online} />
            <div className={styles.messagePerson}><strong>{selected.name}</strong><span>{selected.role || "Chọn một hội thoại để bắt đầu"}</span></div>
            <div className={styles.messageActions}>
              <button disabled title="Backend chưa hỗ trợ cuộc gọi thoại" aria-label="Gọi thoại"><Phone size={17} /></button>
              <button disabled title="Backend chưa hỗ trợ cuộc gọi video" aria-label="Gọi video"><Video size={18} /></button>
              <button onClick={() => showHint(`Mã hội thoại: ${selected.id || "chưa có"}`)} aria-label="Thông tin hội thoại"><Info size={18} /></button>
              <button disabled title="Backend chưa có API tùy chọn hội thoại" aria-label="Tùy chọn"><MoreHorizontal size={19} /></button>
            </div>
          </header>

          <div className={styles.messages}>
            <div className={styles.dayDivider}><span>Tin nhắn</span></div>
            {currentMessages.map((message, index) => {
              const isAdmin = message.sender === "admin";
              const previous = currentMessages[index - 1];
              const showAvatar = !isAdmin && previous?.sender !== "member";
              return (
                <div className={`${styles.messageRow} ${isAdmin ? styles.messageRowAdmin : ""}`} key={message.id}>
                  {!isAdmin ? (showAvatar ? <Avatar initials={selected.initial} size="sm" /> : <span className={styles.avatarSpacer} />) : null}
                  <div className={`${styles.bubbleWrap} ${isAdmin ? styles.bubbleWrapAdmin : ""}`}>
                    <div className={`${styles.bubble} ${isAdmin ? styles.bubbleAdmin : styles.bubbleMember}`}>{message.content}</div>
                    <span className={styles.messageTime}>{message.time} {isAdmin ? <CheckCheck size={13} /> : null}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.composer} onSubmit={(event) => void sendMessage(event)}>
            <div className={styles.composerTools}><button type="button" disabled title="Cổng web hiện chỉ gửi tin nhắn văn bản" aria-label="Đính kèm tệp"><Paperclip size={18} /></button></div>
            <label className={styles.messageInput}>
              <span className="sr-only">Nội dung tin nhắn</span>
              <textarea rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Nhắn tin cho ${selected.name}...`} />
              <button type="button" onClick={() => setDraft((value) => `${value}${value ? " " : ""}😊`)} aria-label="Thêm biểu tượng cảm xúc"><Smile size={18} /></button>
            </label>
            <button className={styles.sendButton} type="submit" disabled={!draft.trim() || !selected.id} aria-label="Gửi tin nhắn"><Send size={18} /></button>
          </form>
        </div>
      </section>

      {hint ? <div className={styles.toast} role="status" aria-live="polite">{hint}</div> : null}
    </div>
  );
}
