import type { Metadata, Viewport } from "next"
import { Inter, Merriweather } from "next/font/google"
import "./globals.css"

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
  title: "Instituto de Ensino Teológico - IETEO",
  description: "Sistema de Avaliação Teológica do IETEO",
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
        {children}
      </body>
    </html>
  )
}
