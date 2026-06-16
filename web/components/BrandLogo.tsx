import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function BrandLogo({ className = "", showWordmark = true }: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 transition opacity-100 hover:opacity-90 ${className}`}
      aria-label="Rental Reviews BG — на главную"
    >
      <Image
        src={showWordmark ? "/logo.svg" : "/icon.svg"}
        alt=""
        width={showWordmark ? 176 : 32}
        height={32}
        className={showWordmark ? "h-8 w-auto" : "h-8 w-8"}
        style={showWordmark ? { width: "auto", height: "2rem" } : undefined}
        priority
      />
    </Link>
  );
}
