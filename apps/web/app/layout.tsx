import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { BilingualText, I18nProvider, type Locale } from "@/lib/i18n";
import "./globals.css";
import "./tokens.css";
import "./agent-theme.css";
import "./workspace.css";
import "./continuity.css";


const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-pretendard",
  display: "swap",
  fallback: ["Apple SD Gothic Neo", "Noto Sans KR", "Inter", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "PharmaAgent OS · 에이전트 워크스페이스",
    template: "%s · PharmaAgent OS",
  },
  description:
    "Plan regulatory reviews with specialist agents, traceable evidence, and human oversight. 전문 에이전트와 근거 기반 규제 검토를 설계합니다.",
  applicationName: "PharmaAgent OS",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("dli_locale")?.value;
  const initialLocale: Locale = cookieLocale === "en" ? "en" : "ko";

  return (
    <html
      lang={initialLocale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={pretendard.variable}
    >
      <body className={pretendard.className}>
        <noscript id="workspace-noscript"><p>JavaScript is required to prepare the workspace. Enable JavaScript and reload this page. / 워크스페이스를 준비하려면 JavaScript를 활성화한 후 새로고침하세요.</p></noscript>
        <I18nProvider initialLocale={initialLocale}>
          <a className="skip-link" href="#main-content">
            <BilingualText en="Skip to main content" ko="본문으로 건너뛰기" />
          </a>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
