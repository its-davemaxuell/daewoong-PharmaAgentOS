import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary"; pending?: boolean; pendingLabel?: string;
};
export function Button({ variant = "secondary", pending = false, pendingLabel, disabled, children, className = "", ...props }: ButtonProps) {
  return <button type="button" {...props} className={`button button--${variant} ${styles.action} ${className}`}
    disabled={disabled || pending} aria-busy={pending || undefined}>
    <span className={styles.label} data-visible={!pending || !pendingLabel} aria-hidden={pending && !!pendingLabel || undefined}>{children}</span>
    {pendingLabel ? <span className={styles.pending} data-visible={pending} aria-hidden={!pending}>{pendingLabel}</span> : null}
  </button>;
}
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" {...props} aria-label={label} title={label} className={`${styles.icon} ${props.className || ""}`}>{children}</button>;
}
export function SkeletonRows({ rows = 3, label }: { rows?: number; label: ReactNode }) {
  return <div className={styles.skeleton} role="status"><span className="sr-only">{label}</span>
    <div aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div className={styles.skeletonRow} key={index}><i /><span><b /><b /></span><i /></div>)}</div>
  </div>;
}
export function InlineFeedback({ kind = "info", children }: { kind?: "info" | "success" | "error"; children: ReactNode }) {
  return <p className={styles.feedback} data-kind={kind} role={kind === "error" ? "alert" : "status"}>{children}</p>;
}

export function LoadingIndicator({ label }: { label: ReactNode }) {
  return <span className={styles.loadingIndicator} role="status"><span className={styles.spinner} aria-hidden="true" /><span className="sr-only">{label}</span></span>;
}
