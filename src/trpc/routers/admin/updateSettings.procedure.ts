import { updateInstanceSettings } from '@/lib/instance-settings'
import { adminProcedure } from '@/trpc/routers/admin/protected'
import { z } from 'zod'

export const updateSettingsProcedure = adminProcedure
  .input(z.object({ requireLoginToCreateGroups: z.boolean() }))
  .mutation(async ({ input }) => {
    return updateInstanceSettings(input)
  })
