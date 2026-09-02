import styles from "./ui.module.css";
import type { BadgeTone } from "@/lib/types";

export function Avatar({
  initials,
  tone = "red",
  size = "md",
  online = false,
}: {
  initials: string;
  tone?: BadgeTone;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
}) {
  return (
    <span className={`${styles.avatar} ${styles[`avatar_${tone}`]} ${styles[`avatar_${size}`]}`}>
      {initials}
      {online ? <span className={styles.onlineDot} aria-label="Đang trực tuyến" /> : null}
    </span>
  );
}
