import { createClient } from '@/lib/supabase/server'
import { SETTINGS_ID } from '@/lib/constants'
import SettingsForm from '@/components/admin/SettingsForm'
import type { SalonSettings } from '@/lib/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('salon_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single()

  const settings: SalonSettings = data ?? {
    id: SETTINGS_ID,
    address: '',
    phone: '',
    instagram: '',
    description: '',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-charcoal">הגדרות סלון</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
