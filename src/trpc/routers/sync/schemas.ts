import { z } from 'zod'

// ===== Base Field Schemas =====
export const groupIdSchema = z.string().min(1)
export const participantIdSchema = z.string().optional()

// ===== Shared Object Schemas =====

/** Common metadata fields for synced groups */
export const groupMetadataSchema = z.object({
  isStarred: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  activeParticipantId: participantIdSchema,
})

/** Group with metadata (for bulk operations) */
export const groupWithMetadataSchema = z
  .object({
    groupId: groupIdSchema,
  })
  .merge(groupMetadataSchema)

// ===== Input Schemas =====

/** Add a single group to sync */
export const addGroupInputSchema = groupWithMetadataSchema

/** Remove a group from sync */
export const removeGroupInputSchema = z.object({
  groupId: groupIdSchema,
})

/** Bulk sync multiple groups */
export const syncAllInputSchema = z.object({
  groups: z.array(groupWithMetadataSchema),
  clearOmitList: z.boolean().optional(),
})

/** Update metadata for a synced group */
export const updateMetadataInputSchema = z
  .object({
    groupId: groupIdSchema,
  })
  .merge(groupMetadataSchema)

/** Update sync preferences */
export const updatePreferencesInputSchema = z.object({
  syncNewGroups: z.boolean().optional(),
})

/** Check if a group is omitted */
export const isOmittedInputSchema = z.object({
  groupId: groupIdSchema,
})

// ===== Type Exports =====
export type GroupMetadata = z.infer<typeof groupMetadataSchema>
export type GroupWithMetadata = z.infer<typeof groupWithMetadataSchema>
export type AddGroupInput = z.infer<typeof addGroupInputSchema>
export type RemoveGroupInput = z.infer<typeof removeGroupInputSchema>
export type SyncAllInput = z.infer<typeof syncAllInputSchema>
export type UpdateMetadataInput = z.infer<typeof updateMetadataInputSchema>
export type UpdatePreferencesInput = z.infer<
  typeof updatePreferencesInputSchema
>
export type IsOmittedInput = z.infer<typeof isOmittedInputSchema>
