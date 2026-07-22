import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const hebrewFont = Noto_Sans_Hebrew({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Eazyplans - ניהול אולמות אירועים",
  description: "מערכת ניהול אולמות אירועים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${hebrewFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <DirectionProvider dir="rtl">
          {children}
          <Toaster richColors position="top-center" />
        </DirectionProvider>
      </body>
    </html>
  );
}
