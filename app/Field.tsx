"use client";

import { InputHTMLAttributes, useState } from "react";
import { useT } from "@/lib/i18n";
import { check, type Rule } from "@/lib/validate";

// An input that shows whether its value is valid: red border + short hint once touched, green check when fine.
export default function Field({
  rule,
  value,
  optional = false,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rule: Rule; value: string; optional?: boolean; hint?: string }) {
  const t = useT();
  const [touched, setTouched] = useState(false);
  const empty = !value.trim();
  const problem = optional && empty ? null : check(rule, value);
  const show = touched && !!problem;
  return (
    <span className="block space-y-1">
      <span className="relative block">
        <input
          {...props}
          value={value}
          aria-invalid={show}
          onBlur={(e) => {
            setTouched(true);
            props.onBlur?.(e);
          }}
          className={`cnx-input pr-9 ${show ? "border-cnx-danger focus:outline-cnx-danger" : ""} ${className}`}
        />
        {!problem && !empty && (
          <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-cnx-green">
            ✓
          </span>
        )}
      </span>
      {show ? (
        <span role="alert" className="block text-xs text-cnx-danger">
          {t(problem!)}
        </span>
      ) : (
        hint && <span className="block text-xs text-cnx-muted">{hint}</span>
      )}
    </span>
  );
}

// True when every (rule, value, optional) triple passes; used to enable submit buttons.
export function allValid(fields: [Rule, string, boolean?][]) {
  return fields.every(([rule, value, optional]) => (optional && !value.trim()) || !check(rule, value));
}
