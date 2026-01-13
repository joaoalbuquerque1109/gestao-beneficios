import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner"; // Componente de notificações
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configuração moderna de Metadados
export const metadata: Metadata = {
  title: {
    template: "%s | ValeGestão", // Ex: "Dashboard | ValeGestão"
    default: "ValeGestão",
  },
  description: "Sistema Integrado de Gestão de RH e Benefícios",
  icons: {
    icon: "/favicon.ico", // Adicione seu ícone na pasta public depois
  },
};

// Configuração de Viewport (importante para mobile)
export const viewport: Viewport = {
  themeColor: "#1e293b", // Cor da barra do navegador (slate-800)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Mudança para pt-BR e h-full para garantir altura correta
    <html lang="pt-BR" className="h-full antialiased">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50 text-slate-900`}
      >
        {/* Renderiza a aplicação */}
        {children}

        {/* Componente Global de Notificações 
          Agora você pode chamar toast.success('...') em qualquer lugar
        */}
        <Toaster 
          richColors 
          position="top-right" 
          closeButton 
          theme="light"
        />
      </body>
    </html>
  );
}