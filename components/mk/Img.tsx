"use client";

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImgProps {
  src?: string | null;
  alt?: string;
  ratio?: string;
  dark?: boolean;
  radius?: number;
  label?: string;
  prompt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Shows an image when present, else a branded labelled placeholder. */
export function Img({
  src,
  alt = "",
  ratio,
  dark = false,
  radius,
  label = "Image",
  prompt,
  className,
  style,
}: ImgProps) {
  const [failed, setFailed] = React.useState(false);
  const wrapStyle: React.CSSProperties = {
    ...(ratio ? { aspectRatio: ratio } : {}),
    ...(radius != null ? { borderRadius: radius } : {}),
    ...style,
  };

  if (src && !failed) {
    return (
      <div className={cn("mk-img", className)} style={wrapStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div
      className={cn("mk-imgph", dark && "mk-imgph--dark", className)}
      style={wrapStyle}
      role="img"
      aria-label={prompt || alt || label}
    >
      <span className="mk-imgph__icon">
        <ImageIcon size={26} />
      </span>
      <span className="mk-imgph__label">{label}</span>
      {prompt && <span className="mk-imgph__prompt">{prompt}</span>}
    </div>
  );
}
