import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import styles from "./ui.module.css";
import type { BadgeTone } from "@/lib/types";

export function StatCard({
  label,
  value,
  helper,
  trend,
  trendDirection = "up",
  icon,
  tone = "red",
}: {
  label: string;
  value: string | number;
  helper?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  icon: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <article className={styles.statCard}>
      <div className={styles.statTop}>
        <p>{label}</p>
        <span className={`${styles.statIcon} ${styles[`statIcon_${tone}`]}`}>{icon}</span>
      </div>
      <strong className={styles.statValue}>{value}</strong>
      <div className={styles.statBottom}>
        {trend ? (
          <span className={trendDirection === "up" ? styles.trendUp : styles.trendDown}>
            {trendDirection === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {trend}
          </span>
        ) : null}
        {helper ? <span>{helper}</span> : null}
      </div>
    </article>
  );
}
