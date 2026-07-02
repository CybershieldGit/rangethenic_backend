import { Lato, Cormorant_Garamond, Questrial, Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/context/SocketContext";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-body",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-heading",
});

const questrial = Questrial({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-heading-mobile",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Rakaarituals Admin Panel",
  description: "Rakaarituals Admin Panel Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${lato.variable} ${cormorant.variable} ${questrial.variable} ${inter.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-primary-background text-text font-sans antialiased overflow-x-hidden relative" suppressHydrationWarning>
        <SocketProvider>
          {/* ATMOSPHERIC OVERLAYS */}
          <div className="grain-overlay"></div>
          <div className="ambient-light"></div>

          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
