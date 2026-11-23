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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  // permite usar a área segura (barra do iPhone) com env(safe-area-inset-*)
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <html
      lang="pt-BR"
      // o script abaixo muda data-theme antes do React: sem isso, um aviso de hidratação
      suppressHydrationWarning
      // A cor da marca, escolhida no painel (já validada ao salvar)
      style={{ "--brand": settings.primaryColor } as React.CSSProperties}
    >
      <head>
        {/* Aplica o tema salvo ANTES da primeira pintura (evita o "piscar" claro) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("busnow:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}