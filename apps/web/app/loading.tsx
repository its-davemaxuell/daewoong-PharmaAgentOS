import { BilingualText } from "@/lib/i18n";
import styles from "@/components/workspace/startup-gate.module.css";

export default function Loading() {
  return <div className={styles.overlay}><div className={styles.panel}><div className={styles.sprite} aria-hidden="true" /><p className={styles.status} role="status"><BilingualText en="Preparing your workspace" ko="워크스페이스를 준비하고 있습니다" /></p></div></div>;
}
