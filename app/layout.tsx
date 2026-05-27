import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeApplier } from '@/components/theme-applier'
import { StoreHydration } from '@/components/store-hydration'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { NeuralBackground } from '@/components/ui/neural-background'
import { CommandPalette } from '@/components/ui/command-palette'
import { QuickCapture } from '@/components/ui/quick-capture'
import { WizardProvider } from '@/contexts/WizardContext'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'DecisionOS — Decision Journal',
  description: 'Log decisions. Schedule revisits. Write what you got wrong. A private, local-first decision journal for engineers and makers.',
  openGraph: {
    title: 'DecisionOS — Decision Journal',
    description: 'Log decisions. Schedule revisits. Write what you got wrong.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'DecisionOS — Decision Journal',
    description: 'Log decisions. Schedule revisits. Write what you got wrong.',
  },
  keywords: ['decision journal', 'decision log', 'retrospective', 'engineering decisions', 'local-first'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-bg-body" data-theme="void" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ErrorBoundary>
            <WizardProvider>
              <StoreHydration />
              <ThemeApplier>
                <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium">
                  Skip to content
                </a>
                <NeuralBackground />
                <CommandPalette />
                <QuickCapture />
                <div id="main-content" className="relative z-10">
                  {children}
                </div>
                <Toaster
                  position="bottom-right"
                  richColors
                  mobileOffset={{ bottom: 88, left: 16, right: 16 }}
                />
              </ThemeApplier>
            </WizardProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
