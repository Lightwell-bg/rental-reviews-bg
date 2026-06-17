import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  /** Полный логотип с текстом — для светлого фона */
  variant?: "full" | "onDark" | "icon";
};

export function BrandLogo({ className = "", variant = "full" }: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <Link
        href="/"
        className={`inline-flex items-center transition hover:opacity-90 ${className}`}
        aria-label="Rental Reviews BG — на главную"
      >
        <Image
          src="/brand/icon.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg"
          priority
        />
      </Link>
    );
  }

  if (variant === "onDark") {
    return (
      <Link
        href="/"
        className={`inline-flex items-center gap-2.5 transition hover:opacity-90 ${className}`}
        aria-label="Rental Reviews BG — на главную"
      >
        <Image
          src="/brand/icon.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg shadow-sm"
          priority
        />
        <span className="text-base font-semibold leading-tight text-white sm:text-lg">
          Rental Reviews{" "}
          <span className="font-bold text-brand-400">BG</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`inline-flex items-center transition hover:opacity-90 ${className}`}
      aria-label="Rental Reviews BG — на главную"
    >
      <Image
        src="/brand/logo.png"
        alt="Rental Reviews BG"
        width={220}
        height={40}
        className="h-9 w-auto"
        style={{ width: "auto", height: "2.25rem" }}
        priority
      />
    </Link>
  );
}
