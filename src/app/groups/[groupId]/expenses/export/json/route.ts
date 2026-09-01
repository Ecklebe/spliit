import { prisma } from '@/lib/prisma'
import { create as contentDisposition } from 'content-disposition'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      information: true,
      currency: true,
      currencyCode: true,
      expenses: {
        select: {
          id: true,
          createdAt: true,
          expenseDate: true,
          title: true,
          category: { select: { grouping: true, name: true } },
          amount: true,
          originalAmount: true,
          originalCurrency: true,
          conversionRate: true,
          paidById: true,
          paidFor: { select: { participantId: true, shares: true } },
          isReimbursement: true,
          splitMode: true,
          recurrenceRule: true,
          notes: true,
          documents: {
            select: { id: true, width: true, height: true },
          },
        },
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
      },
      participants: { select: { id: true, name: true } },
      activities: {
        select: {
          id: true,
          time: true,
          activityType: true,
          participantId: true,
          expenseId: true,
          data: true,
        },
        orderBy: { time: 'asc' },
      },
    },
  })
  if (!group)
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 404 })

  // Documents are exported as links, not bytes, so a group can be migrated
  // between instances (upstream #554). This fork deliberately exports the
  // app's own /api/documents/<id> path rather than ExpenseDocument.url:
  // since PR #499 the bucket is private, so the stored S3 URL is not
  // fetchable by anyone and would only leak the bucket layout. The path is
  // relative because it is only meaningful against the exporting instance's
  // own origin - which is exactly what a migrating consumer has.
  const exported = {
    exportVersion: 3 as const,
    ...group,
    expenses: group.expenses.map((expense) => ({
      ...expense,
      documents: expense.documents.map((document) => ({
        ...document,
        url: `/api/documents/${encodeURIComponent(document.id)}`,
      })),
    })),
  }

  const date = new Date().toISOString().split('T')[0]
  const filename = `Spliit Export - ${date}`
  return NextResponse.json(exported, {
    headers: {
      'content-type': 'application/json',
      'content-disposition': contentDisposition(`${filename}.json`),
    },
  })
}
