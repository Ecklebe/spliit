import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { baseProcedure } from '@/trpc/init'
import { assertGroupCreationAllowed } from '@/trpc/routers/groups/require-login-gate'
import { z } from 'zod'

export const createGroupProcedure = baseProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ ctx, input: { groupFormValues } }) => {
    await assertGroupCreationAllowed(ctx.req)
    const group = await createGroup(groupFormValues)
    return group
  })
