import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant }) {
  return (
    <button className={`ui-button ui-button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  className = "",
  variant = "primary"
}: Readonly<{
  children: ReactNode;
  href: string;
  className?: string;
  variant?: ButtonVariant;
}>) {
  return (
    <a className={`ui-button ui-button-${variant} ${className}`.trim()} href={href}>
      {children}
    </a>
  );
}
