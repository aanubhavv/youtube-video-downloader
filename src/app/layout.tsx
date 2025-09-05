import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YTFlow - YouTube Video Downloader",
  description:
    "Experience the future of YouTube downloading with YTFlow's cutting-edge interface",
  keywords: ["YouTube", "download", "video", "futuristic", "modern"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="particle-bg"></div>
        {children}
      </body>
    </html>
  );
}
