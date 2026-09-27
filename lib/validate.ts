// Shared form rules, used by the forms (inline hints) and mirrored on the server where it matters.
// Deliberately lenient: they catch clearly wrong input, not every edge case.

export const LINE_ID = /^@?[a-z0-9._-]{3,20}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LUMA = /^(https?:\/\/)?(www\.)?(lu\.ma|luma\.com)\/[a-z0-9-]+\/?(\?.*)?$/i;
const URLISH = /(https?:\/\/|www\.)/i;

export type Rule = "email" | "password" | "name" | "lineId" | "lumaUrl";

// Returns the i18n key of the problem, or null when the value is fine.
export function check(rule: Rule, raw: string): string | null {
  const v = raw.trim();
  switch (rule) {
    case "email":
      return EMAIL.test(v) ? null : "vEmail";
    case "password":
      return raw.length >= 6 ? null : "vPassword";
    case "name":
      if (!v) return "vRequired";
      if (v.length > 60) return "vTooLong";
      return URLISH.test(v) ? "vNoLinks" : null;
    case "lineId":
      return LINE_ID.test(v) ? null : "vLineId";
    case "lumaUrl":
      return LUMA.test(v) ? null : "vLuma";
  }
}
