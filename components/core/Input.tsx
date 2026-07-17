"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  labelIcon?: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  wrapperClassName?: string;
}

/** Labelled text field with optional leading icon. */
export function Input({
  label = null,
  labelIcon = null,
  icon = null,
  hint = null,
  id,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
  const autoId = React.useId();
  const inputId = id || autoId;
  return (
    <div className={cn("ffs-field", wrapperClassName)}>
      {label && (
        <label className="ffs-field__label" htmlFor={inputId}>
          {labelIcon}
          {label}
        </label>
      )}
      <div className={cn("ffs-inputwrap", icon && "ffs-inputwrap--hasicon")}>
        {icon && <span className="ffs-inputwrap__icon">{icon}</span>}
        <input id={inputId} className={cn("ffs-input", className)} {...rest} />
      </div>
      {hint && <span className="ffs-field__hint">{hint}</span>}
    </div>
  );
}
