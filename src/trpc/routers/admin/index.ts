import { createTRPCRouter } from '@/trpc/init'
import { getSettingsProcedure } from './getSettings.procedure'
import { updateSettingsProcedure } from './updateSettings.procedure'

export const adminRouter = createTRPCRouter({
  getSettings: getSettingsProcedure,
  updateSettings: updateSettingsProcedure,
})
