import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from './protected'
import { syncAllInputSchema } from './schemas'
import { hashGroupId } from './utils'

const MAX_GROUPS_PER_SYNC = 100

export const syncAllProcedure = protectedProcedure
  .input(syncAllInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { groups, clearOmitList } = input

    // Enforce rate limit
    if (groups.length > MAX_GROUPS_PER_SYNC) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot sync more than ${MAX_GROUPS_PER_SYNC} groups at once`,
      })
    }

    return await prisma.$transaction(async (tx) => {
      const syncProfile = await tx.syncProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })

      if (clearOmitList) {
        await tx.syncProfile.update({
          where: { id: syncProfile.id },
          data: { omittedGroupIds: [] },
        })
      }

      // Filter out omitted groups (unless we're clearing the list)
      const groupsToSync = clearOmitList
        ? groups
        : groups.filter((group) => {
            const hash = hashGroupId(group.groupId)
            return !syncProfile.omittedGroupIds.includes(hash)
          })

      const skipped = groups.length - groupsToSync.length

      // Bulk upsert synced groups
      for (const group of groupsToSync) {
        // Validate activeParticipantId belongs to the group
        if (group.activeParticipantId) {
          const participant = await tx.participant.findFirst({
            where: { id: group.activeParticipantId, groupId: group.groupId },
          })
          if (!participant) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid participant for group ${group.groupId}`,
            })
          }
        }

        await tx.syncedGroup.upsert({
          where: {
            profileId_groupId: {
              profileId: syncProfile.id,
              groupId: group.groupId,
            },
          },
          create: {
            profileId: syncProfile.id,
            groupId: group.groupId,
            isStarred: group.isStarred ?? false,
            isArchived: group.isArchived ?? false,
            activeParticipantId: group.activeParticipantId,
          },
          update: {
            isStarred: group.isStarred ?? undefined,
            isArchived: group.isArchived ?? undefined,
            activeParticipantId: group.activeParticipantId,
            syncedAt: new Date(),
          },
        })
      }

      return {
        synced: groupsToSync.length,
        skipped,
      }
    })
  })
