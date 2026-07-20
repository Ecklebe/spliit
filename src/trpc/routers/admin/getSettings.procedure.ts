import { getInstanceSettings } from '@/lib/instance-settings'
import { adminProcedure } from '@/trpc/routers/admin/protected'

export const getSettingsProcedure = adminProcedure.query(async () => {
  return getInstanceSettings()
})
