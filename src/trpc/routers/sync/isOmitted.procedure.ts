import { prisma } from '@/lib/prisma'
import { protectedProcedure } from './protected'
import { isOmittedInputSchema } from './schemas'
import { hashGroupId } from './utils'

export const isOmittedProcedure = protectedProcedure
  .input(isOmittedInputSchema)
  .query(async ({ ctx, input }) => {
    const { user } = ctx
    const { groupId } = input

    const syncProfile = await prisma.syncProfile.findUniqueOrThrow({
      where: { userId: user.id },
    })

    // Check if hash is in omittedGroupIds
    const groupHash = hashGroupId(groupId)
    const omitted = syncProfile.omittedGroupIds.includes(groupHash)

    return { omitted }
  })
