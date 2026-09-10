import styles from "./page-loading.module.css";
import { SkeletonRows } from "./controls";
import { BilingualText } from "@/lib/i18n";

export function PageLoading({ contained = false }: { contained?: boolean }) {
  return (
    <section
      className={`${styles.loader}${contained ? ` ${styles.contained}` : ""}`}
      aria-busy="true"
    >
      <div className={styles.frame}>
        <div className={styles.heading} aria-hidden="true" />
        <div className={styles.panel}><SkeletonRows rows={4} label={<BilingualText en="Loading workspace…" ko="워크스페이스를 불러오는 중…" />} /></div>
      </div>
    </section>
  );
}
