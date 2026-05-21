'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'תורים', icon: '📋', exact: true },
  { href: '/admin/calendar', label: 'לוח שנה', icon: '📅', exact: false },
  { href: '/admin/services', label: 'שירותים', icon: '💅', exact: false },
  { href: '/admin/availability', label: 'זמינות', icon: '🕐', exact: false },
  { href: '/admin/settings', label: 'הגדרות', icon: '⚙️', exact: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-charcoal flex flex-col min-h-screen">
      <div className="px-4 py-6 border-b border-white/10">
        <p className="text-warm-white font-bold tracking-widest text-lg">✦ CLAWS</p>
        <p className="text-white/40 text-xs tracking-widest mt-0.5">ניהול</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm border-r-4 transition-colors
                ${isActive
                  ? 'border-warm-white bg-white/10 text-warm-white'
                  : 'border-transparent text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
        >
          <span>🔓</span> יציאה
        </button>
      </div>
    </aside>
  )
}
