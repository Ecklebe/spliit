import { prisma } from '@/lib/prisma'
import { protectedProcedure } from './protected'

export const listGroupsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const { user } = ctx

  // Fetch all synced groups with group metadata
  const syncedGroups = await prisma.syncedGroup.findMany({
    where: {
      profile: {
        userId: user.id,
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      syncedAt: 'desc',
    },
  })

  return syncedGroups.map((sg) => ({
    groupId: sg.groupId,
    isStarred: sg.isStarred,
    isArchived: sg.isArchived,
    activeParticipantId: sg.activeParticipantId,
    syncedAt: sg.syncedAt,
    group: sg.group,
  }))
})
