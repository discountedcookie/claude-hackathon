import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import RegisterSW from "./RegisterSW";

// LINE Seed (EN + TH, © LY Corporation, SIL OFL 1.1: app/fonts/OFL.txt) from the design polish; Noto Sans SC for Chinese.
// Chinese is not preloaded: the browser fetches only the unicode-range slices a page uses.
const lineSeed = localFont({
  src: [
    { path: "./fonts/LINESeedSans_W_Rg.woff2", weight: "400" },
    { path: "./fonts/LINESeedSans_W_Bd.woff2", weight: "700" },
  ],
  variable: "--font-line-seed",
  display: "swap",
});
const lineSeedThai = localFont({
  src: [
    { path: "./fonts/LINESeedSansTH_W_Rg.woff2", weight: "400" },
    { path: "./fonts/LINESeedSansTH_W_Bd.woff2", weight: "700" },
  ],
  variable: "--font-line-seed-th",
  display: "swap",
});
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
      className={`${lineSeed.variable} ${lineSeedThai.variable} ${notoSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
