/* eslint-disable */
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Manrope, Geist } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { FramerMotionProvider } from "@/components/providers/FramerMotionProvider";
import { WebVitals } from "@/components/providers/WebVitals";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "FlashChat - AI OS",
  description: "A premium, real-time messaging experience.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${manrope.variable} ${geist.variable} antialiased selection:bg-secondary selection:text-on-secondary`}
      >
        <FramerMotionProvider>
          <ErrorBoundary>
            <AuthProvider>
              <WebVitals />
              {children}
            </AuthProvider>
          </ErrorBoundary>
        </FramerMotionProvider>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-outline)',
              color: 'var(--color-on-surface)',
            }
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
