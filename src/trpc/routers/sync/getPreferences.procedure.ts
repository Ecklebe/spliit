import { prisma } from '@/lib/prisma'
import { protectedProcedure } from './protected'

export const getPreferencesProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const { user } = ctx

    const syncProfile = await prisma.syncProfile.findUniqueOrThrow({
      where: { userId: user.id },
    })

    // Get preferences or return defaults
    const preferences = await prisma.syncPreferences.findUnique({
      where: { profileId: syncProfile.id },
    })

    return {
      syncNewGroups: preferences?.syncNewGroups ?? false,
    }
  },
)
