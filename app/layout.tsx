import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_SC, Noto_Sans_Thai, Noto_Sans_Thai_Looped } from "next/font/google";
import "./globals.css";
import RegisterSW from "./RegisterSW";

// One family for every script. Thai UI is loopless; long descriptions use the looped Thai (.font-reading).
// Chinese and looped Thai are not preloaded: the browser fetches only the unicode-range slices a page uses.
const notoSans = Noto_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-noto", display: "swap" });
const notoThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-noto-thai", display: "swap" });
const notoThaiLooped = Noto_Sans_Thai_Looped({ subsets: ["thai"], variable: "--font-noto-thai-looped", display: "swap", preload: false });
const notoSC = Noto_Sans_SC({ variable: "--font-noto-sc", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "With · CNX",
  description: "Find an event and someone to go with in Chiang Mai · หาเพื่อนไปงานด้วยกัน · 找个伴，一起去",
};

export const viewport: Viewport = { themeColor: "#285c48" };

// <html lang> is updated on the client by LangProvider once the user's language is known.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoThai.variable} ${notoThaiLooped.variable} ${notoSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
