import { prisma } from '@/lib/prisma'
import { protectedProcedure } from './protected'
import { removeGroupInputSchema } from './schemas'
import { hashGroupId } from './utils'

export const removeGroupProcedure = protectedProcedure
  .input(removeGroupInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { user } = ctx
    const { groupId } = input

    return await prisma.$transaction(async (tx) => {
      const syncProfile = await tx.syncProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })

      // Delete SyncedGroup
      await tx.syncedGroup.deleteMany({
        where: {
          profileId: syncProfile.id,
          groupId,
        },
      })

      // Calculate hash and add to omittedGroupIds (atomic operation using push)
      const groupHash = hashGroupId(groupId)

      // Use push which is atomic and won't duplicate if already exists
      await tx.syncProfile.update({
        where: { id: syncProfile.id },
        data: {
          omittedGroupIds: {
            push: groupHash,
          },
        },
      })

      return { success: true }
    })
  })
