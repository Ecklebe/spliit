import { prisma } from '@/lib/prisma'
import { protectedProcedure } from './protected'
import { updatePreferencesInputSchema } from './schemas'

export const updatePreferencesProcedure = protectedProcedure
  .input(updatePreferencesInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { syncNewGroups } = input

    const syncProfile = await prisma.syncProfile.findUniqueOrThrow({
      where: { userId: user.id },
    })

    // Build update data with only provided fields
    const updateData: {
      syncNewGroups?: boolean
    } = {}

    if (syncNewGroups !== undefined) updateData.syncNewGroups = syncNewGroups

    // Upsert preferences
    const preferences = await prisma.syncPreferences.upsert({
      where: { profileId: syncProfile.id },
      create: {
        profileId: syncProfile.id,
        syncNewGroups: syncNewGroups ?? false,
      },
      update: updateData,
    })

    return {
      syncNewGroups: preferences.syncNewGroups,
    }
  })
