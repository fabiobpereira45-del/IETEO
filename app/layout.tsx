import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "Avaliação Teológica — Instituto de Ensino Teológico - IETEO",
  description: "Sistema de Avaliação Teológica do IETEO — Curso de Teologia, Disciplina: Livros Poéticos",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
