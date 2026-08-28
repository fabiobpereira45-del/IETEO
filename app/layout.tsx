import type { Metadata, Viewport } from "next"
import { Inter, Merriweather } from "next/font/google"
import "./globals.css"
import Script from 'next/script'

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
  userScalable: false,
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

import { ActivityTracker } from "@/components/activity-tracker"
import { PoloProvider } from "@/lib/polo-context"
import { Suspense } from "react"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <Suspense fallback={null}>
          <ActivityTracker />
        </Suspense>
        <PoloProvider>
          {children}
        </PoloProvider>
        <Script
          id="clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "w5fvsw89jw");`,
          }}
        />
      </body>
    </html>
  )
}
