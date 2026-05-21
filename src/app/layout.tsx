import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CLAWS – תור לציפורניים',
  description: 'הזמני תור לסטודיו לציפורניים CLAWS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-warm-white text-charcoal font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
