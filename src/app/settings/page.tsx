import { SettingsContent } from '@/app/settings/settings-content'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return <SettingsContent />
}
