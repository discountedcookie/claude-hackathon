// Cheap guess of a short text's language from its script, to skip translating text the reader can already read.
export function scriptLang(text: string): "en" | "th" | "zh" {
  if (/[฀-๿]/.test(text)) return "th";
  if (/[㐀-鿿]/.test(text)) return "zh";
  return "en";
}
