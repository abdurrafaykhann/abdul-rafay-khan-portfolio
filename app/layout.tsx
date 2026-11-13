import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { MotionReady } from "@/components/motion/MotionReady";
import { MOTION_INIT_SCRIPT } from "@/lib/motion/prefs";
import { site } from "@/lib/site";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#0C0C0C",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the head script adds motion classes before hydration.
    <html
      lang="en"
      className={`${kanit.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_INIT_SCRIPT }} />
      </head>
      <body>
        <MotionReady />
        {children}
      </body>
    </html>
  );
}
