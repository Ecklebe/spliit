'use server'
import { getCategories } from '@/lib/api'
import { env } from '@/lib/env'
import { getRuntimeFeatureFlags } from '@/lib/featureFlags'
import { prisma } from '@/lib/prisma'
import { getS3Client, parseObjectKeyFromUrl } from '@/lib/s3'
import { formatCategoryForAIPrompt } from '@/lib/utils'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import OpenAI from 'openai'
import { z } from 'zod'

const s3 = getS3Client()

/**
 * Documents live in a private bucket (see PR #499), so the model is handed a
 * short-lived presigned URL rather than a public one. This also replaces
 * upstream's `isAllowedUploadUrl` SSRF guard with a stronger one: the caller
 * passes an ExpenseDocument id, and the URL is derived from our own database
 * row, so an arbitrary attacker-supplied URL can never reach OpenAI.
 */
async function resolveDocumentToPresignedUrl(id: string): Promise<string> {
  const doc = await prisma.expenseDocument.findUnique({ where: { id } })
  if (!doc || !doc.url) throw new Error('Document not found.')

  if (!s3) throw new Error('S3 client not configured')

  const command = new GetObjectCommand({
    Bucket: env.S3_UPLOAD_BUCKET!,
    Key: parseObjectKeyFromUrl(String(doc.url)),
  })

  return getSignedUrl(s3, command, { expiresIn: 60 * 5 })
}

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL,
})

// The model is contractually bound to this shape by `strict: true` below, but
// the response is still parsed rather than trusted: a self-hosted or older
// endpoint may ignore the schema.
const receiptResponseSchema = z.object({
  amount: z.number(),
  categoryId: z.string(),
  date: z.string(),
  title: z.string(),
})

export async function extractExpenseInformationFromImage(documentId: string) {
  'use server'

  // Enforce the feature flag server-side: the UI gate only hides the button, it
  // does not prevent the action endpoint from being invoked directly.
  const { enableReceiptExtract } = await getRuntimeFeatureFlags()
  if (!enableReceiptExtract) {
    throw new Error('Receipt extraction is not enabled.')
  }

  const categories = await getCategories()

  const imageUrl = await resolveDocumentToPresignedUrl(documentId)

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL_RECEIPT_EXTRACT,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'receipt_response',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            categoryId: { type: 'string' },
            date: { type: 'string' },
            title: { type: 'string' },
          },
          required: ['amount', 'categoryId', 'date', 'title'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
              This image contains a receipt.
              Read the total amount and store it as a non-formatted number without any other text or currency.
              Then guess the category for this receipt among the following categories and store its ID: ${categories.map(
                (category) => formatCategoryForAIPrompt(category),
              )}.
              Guess the expense’s date and store it as yyyy-mm-dd.
              Guess a title for the expense.`,
          },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: imageUrl } }],
      },
    ],
  })

  const messageContent = completion.choices.at(0)?.message.content
  const parsed = (() => {
    if (!messageContent) return null
    try {
      return receiptResponseSchema.parse(JSON.parse(messageContent))
    } catch {
      // Malformed or schema-violating output: report "nothing extracted"
      // rather than passing junk on to the expense form.
      return null
    }
  })()

  const amount = Number(parsed?.amount)
  return {
    amount: Number.isFinite(amount) ? amount : null,
    categoryId: parsed?.categoryId ?? null,
    date: parsed?.date ?? null,
    title: parsed?.title ?? null,
  }
}

export type ReceiptExtractedInfo = Awaited<
  ReturnType<typeof extractExpenseInformationFromImage>
>
