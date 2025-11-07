import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poly Trading Bot",
  description: "Automated Trading Bot for Polymarket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="relative min-h-screen bg-background/90 text-foreground">
            <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-60" aria-hidden>
              <div className="absolute -top-36 -left-28 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_top,_rgba(51,197,255,0.35),_transparent_60%)] blur-3xl" />
              <div className="absolute -bottom-48 right-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(139,91,255,0.35),_transparent_65%)] blur-[160px]" />
            </div>
            <div className="relative min-h-screen backdrop-blur-[20px] bg-gradient-to-b from-background/90 via-background/80 to-background/95">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

