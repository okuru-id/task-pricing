import { ReceiptText, Tag, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

export type TaskPricerLogoVariant = "calculator" | "tag" | "receipt" | "wallet";

const GLYPH_ICON = {
  tag: Tag,
  receipt: ReceiptText,
  wallet: Wallet,
} as const;

/**
 * Logo TaskPricer — memakai token tema (`var(--primary)` dkk) sehingga
 * otomatis mengikuti light/dark mode, bukan warna hardcode.
 *
 * Varian `calculator` = artwork kalkulator yang diperbaiki (default).
 * Varian lain = glif Lucide di atas kotak primary.
 */
export function TaskPricerLogo({
  className,
  size = 36,
  variant = "calculator",
}: {
  className?: string;
  size?: number;
  variant?: TaskPricerLogoVariant;
}) {
  if (variant !== "calculator") {
    const Icon = GLYPH_ICON[variant];
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs",
          className,
        )}
        aria-label="TaskPricer Logo"
      >
        <Icon className="size-[55%]" />
      </span>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-label="TaskPricer Logo"
    >
      {/* Background Squircle — mengikuti warna primary tema */}
      <rect width="512" height="512" rx="120" fill="var(--primary)" />

      {/* Calculator Body — kontras terhadap background */}
      <rect x="116" y="86" width="280" height="340" rx="40" fill="var(--primary-foreground)" />

      {/* Screen Display */}
      <rect x="156" y="126" width="200" height="70" rx="16" fill="var(--primary)" />
      <rect x="176" y="152" width="50" height="18" rx="6" fill="var(--primary-foreground)" opacity="0.9" />
      <rect x="236" y="152" width="24" height="18" rx="6" fill="var(--primary-foreground)" opacity="0.55" />
      <circle cx="330" cy="161" r="9" fill="var(--primary-foreground)" />

      {/* Keypad Buttons */}
      {/* Row 1 */}
      <rect x="156" y="222" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="228" y="222" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="300" y="222" width="56" height="44" rx="12" fill="var(--primary)" opacity="0.25" />

      {/* Row 2 */}
      <rect x="156" y="280" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="228" y="280" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="300" y="280" width="56" height="44" rx="12" fill="var(--primary)" opacity="0.25" />

      {/* Row 3 */}
      <rect x="156" y="338" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="228" y="338" width="56" height="44" rx="12" fill="var(--primary-soft)" />
      <rect x="300" y="338" width="56" height="44" rx="12" fill="var(--primary)" />

      {/* Sparkle AI Star top right */}
      <path
        d="M420 50 L428 78 L456 86 L428 94 L420 122 L412 94 L384 86 L412 78 Z"
        fill="var(--primary-foreground)"
      />
    </svg>
  );
}
