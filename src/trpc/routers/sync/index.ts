import { createTRPCRouter } from '@/trpc/init'
import { addGroupProcedure } from './addGroup.procedure'
import { getPreferencesProcedure } from './getPreferences.procedure'
import { isOmittedProcedure } from './isOmitted.procedure'
import { listGroupsProcedure } from './listGroups.procedure'
import { removeGroupProcedure } from './removeGroup.procedure'
import { syncAllProcedure } from './syncAll.procedure'
import { updateMetadataProcedure } from './updateMetadata.procedure'
import { updatePreferencesProcedure } from './updatePreferences.procedure'

export const syncRouter = createTRPCRouter({
  listGroups: listGroupsProcedure,
  addGroup: addGroupProcedure,
  removeGroup: removeGroupProcedure,
  syncAll: syncAllProcedure,
  updateMetadata: updateMetadataProcedure,
  getPreferences: getPreferencesProcedure,
  updatePreferences: updatePreferencesProcedure,
  isOmitted: isOmittedProcedure,
})
