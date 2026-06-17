import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "inverse";
};

const variants = {
  primary:
    "bg-brand-800 text-white hover:bg-brand-900 border border-brand-800 shadow-sm",
  secondary:
    "bg-surface-card text-zinc-900 hover:bg-white border border-brand-200",
  ghost:
    "bg-transparent text-brand-800 hover:bg-brand-50 border border-transparent",
  inverse:
    "bg-white text-brand-900 hover:bg-brand-50 border border-white/90 shadow-sm",
};

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function Button({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition ${variants[variant]} ${className}`;

  if (href) {
    if (isExternalHref(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
