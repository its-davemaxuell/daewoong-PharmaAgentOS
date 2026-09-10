import type { ButtonHTMLAttributes } from "react";

export function ReviewButton({ variant = "secondary", pending = false, pendingLabel, disabled, children, className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; pending?: boolean; pendingLabel?: string }) {
  return <button type="button" {...props} className={`button button--${variant} ${className}`} disabled={disabled || pending} aria-busy={pending || undefined}>{pending && pendingLabel ? pendingLabel : children}</button>;
}
