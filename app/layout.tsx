import type { Metadata, Viewport } from "next"
import { Inter, Merriweather } from "next/font/google"
import "./globals.css"
import { RotateCcw } from "lucide-react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming and helps PWA feel native
}

export const metadata: Metadata = {
  title: "Avaliação Teológica — Instituto de Ensino Teológico - IETEO",
  description: "Sistema de Avaliação Teológica do IETEO — Curso de Teologia, Disciplina: Livros Poéticos",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IETEO",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        {/* CSS Lock Screen for Portrait mode */}
        <div className="require-landscape-layer fixed inset-0 z-[9999] bg-background flex-col items-center justify-center p-8 text-center">
          <RotateCcw className="w-16 h-16 mb-6 text-primary" style={{ animation: "spin 4s linear infinite" }} />
          <h2 className="text-2xl font-bold mb-3 font-serif">Vire seu dispositivo</h2>
          <p className="text-muted-foreground text-base max-w-sm">
            Nosso sistema foi projetado para telas largas. Por favor, desative o bloqueio de rotação e <strong>vire o seu celular para a horizontal (modo paisagem)</strong> para continuar.
          </p>
        </div>

        {/* Main Application Content (hidden on portrait) */}
        <div className="main-app-content min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
