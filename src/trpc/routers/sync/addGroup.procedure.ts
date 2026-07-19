import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { protectedProcedure } from './protected'
import { addGroupInputSchema } from './schemas'
import { hashGroupId } from './utils'

export const addGroupProcedure = protectedProcedure
  .input(addGroupInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { groupId, isStarred, isArchived, activeParticipantId } = input

    return await prisma.$transaction(async (tx) => {
      // Validate activeParticipantId belongs to the group
      if (activeParticipantId) {
        const participant = await tx.participant.findFirst({
          where: { id: activeParticipantId, groupId },
        })
        if (!participant) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid participant for this group',
          })
        }
      }

      const syncProfile = await tx.syncProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })

      // Calculate hash for this group
      const groupHash = hashGroupId(groupId)

      // Remove hash from omittedGroupIds if present
      // Note: Using raw SQL for PostgreSQL array_remove which is atomic and more efficient than read-filter-write
      await tx.$executeRaw`
        UPDATE "SyncProfile"
        SET "omittedGroupIds" = array_remove("omittedGroupIds", ${groupHash}::text)
        WHERE "id" = ${syncProfile.id}
      `

      // Upsert SyncedGroup
      return await tx.syncedGroup.upsert({
        where: {
          profileId_groupId: {
            profileId: syncProfile.id,
            groupId,
          },
        },
        create: {
          profileId: syncProfile.id,
          groupId,
          isStarred: isStarred ?? false,
          isArchived: isArchived ?? false,
          activeParticipantId,
        },
        update: {
          isStarred: isStarred ?? undefined,
          isArchived: isArchived ?? undefined,
          activeParticipantId,
          syncedAt: new Date(),
        },
      })
    })
  })
