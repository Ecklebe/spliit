import { prisma } from '@/lib/prisma'

// Single global settings row - see prisma/schema.prisma's InstanceSettings
// model. The row is seeded by that model's own migration (id = 'singleton'),
// so it's guaranteed to already exist - a missing row is a real
// misconfiguration to surface loudly, not a condition to paper over with
// an in-code default.
const INSTANCE_SETTINGS_ID = 'singleton'

export async function getInstanceSettings() {
  return prisma.instanceSettings.findUniqueOrThrow({
    where: { id: INSTANCE_SETTINGS_ID },
  })
}

export async function updateInstanceSettings(data: {
  requireLoginToCreateGroups: boolean
}) {
  return prisma.instanceSettings.update({
    where: { id: INSTANCE_SETTINGS_ID },
    data,
  })
}
