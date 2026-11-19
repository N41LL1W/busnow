import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { ServiceWorkerRegister } from "./service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: {
      default: settings.serviceName,
      template: `%s | ${settings.serviceName}`,
    },
    description: settings.tagline || "Acompanhe os ônibus em tempo real.",
    applicationName: settings.serviceName,
    appleWebApp: {
      capable: true,
      title: settings.serviceName,
      statusBarStyle: "black",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html
      lang="pt-BR"
      // A cor da marca, escolhida no painel (já validada ao salvar)
      style={{ "--brand": settings.primaryColor } as React.CSSProperties}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}