import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { getTranslations } from 'next-intl/server'
import { protectedProcedure } from './protected'
import { updateMetadataInputSchema } from './schemas'

export const updateMetadataProcedure = protectedProcedure
  .input(updateMetadataInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { groupId, isStarred, isArchived, activeParticipantId } = input
    const t = await getTranslations('SyncErrors')

    return await prisma.$transaction(async (tx) => {
      // Validate activeParticipantId belongs to the group
      if (activeParticipantId) {
        const participant = await tx.participant.findFirst({
          where: { id: activeParticipantId, groupId },
        })
        if (!participant) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: t('validation.invalidParticipant'),
          })
        }
      }

      const syncProfile = await tx.syncProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })

      // Check if the group is synced
      const existingSync = await tx.syncedGroup.findUnique({
        where: {
          profileId_groupId: {
            profileId: syncProfile.id,
            groupId,
          },
        },
      })

      if (!existingSync) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: t('notSynced'),
        })
      }

      // Build update data with only provided fields
      const updateData: {
        isStarred?: boolean
        isArchived?: boolean
        activeParticipantId?: string | null
      } = {}

      if (isStarred !== undefined) updateData.isStarred = isStarred
      if (isArchived !== undefined) updateData.isArchived = isArchived
      if (activeParticipantId !== undefined)
        updateData.activeParticipantId = activeParticipantId

      // Update the synced group
      return await tx.syncedGroup.update({
        where: {
          profileId_groupId: {
            profileId: syncProfile.id,
            groupId,
          },
        },
        data: updateData,
      })
    })
  })
