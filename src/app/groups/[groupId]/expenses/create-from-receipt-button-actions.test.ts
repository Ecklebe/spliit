/**
 * These exercise server-side code (Prisma, tRPC callers, Request/Response), so
 * they need Node's globals. Upstream's jest.config.ts defaults to jsdom for
 * component tests; this overrides it per file.
 *
 * @jest-environment node
 */
// See the note in src/components/expense-form-actions.test.ts on why this is a
// `var` reached through an arrow.
var mockCreate = jest.fn()
var mockFindUnique = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    chat = {
      completions: { create: (...args: unknown[]) => mockCreate(...args) },
    }
  },
}))
jest.mock('../../../../lib/env', () => ({
  env: {
    OPENAI_API_KEY: 'sk-test',
    OPENAI_BASE_URL: undefined,
    OPENAI_MODEL_RECEIPT_EXTRACT: 'test-vision-model',
    S3_UPLOAD_BUCKET: 'test-bucket',
  },
}))
jest.mock('../../../../lib/prisma', () => ({
  prisma: {
    expenseDocument: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))
jest.mock('../../../../lib/s3', () => ({
  getS3Client: () => ({}),
  parseObjectKeyFromUrl: (url: string) => url.split('/').pop(),
}))
jest.mock('@aws-sdk/client-s3', () => ({ GetObjectCommand: class {} }))
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://uploads.test/presigned/receipt.jpg',
}))
jest.mock('../../../../lib/featureFlags', () => ({
  getRuntimeFeatureFlags: async () => ({ enableReceiptExtract: true }),
}))
jest.mock('../../../../lib/api', () => ({
  getCategories: async () => [
    { id: 0, grouping: 'General', name: 'General' },
    { id: 4, grouping: 'Transport', name: 'Taxi' },
  ],
}))

import { extractExpenseInformationFromImage } from './create-from-receipt-button-actions'

// An ExpenseDocument id, not a URL: the action looks the row up itself.
const IMAGE = 'doc-1'

function respondWith(content: string | null) {
  mockCreate.mockResolvedValue({ choices: [{ message: { content } }] })
}

const NOTHING_EXTRACTED = {
  amount: null,
  categoryId: null,
  date: null,
  title: null,
}

describe('extractExpenseInformationFromImage', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockFindUnique.mockReset()
    mockFindUnique.mockResolvedValue({
      id: 'doc-1',
      url: 'https://uploads.test/receipt.jpg',
    })
  })

  it('returns every field the model read off the receipt', async () => {
    respondWith(
      JSON.stringify({
        amount: 42.5,
        categoryId: '4',
        date: '2026-03-01',
        title: 'Dinner',
      }),
    )
    expect(await extractExpenseInformationFromImage(IMAGE)).toEqual({
      amount: 42.5,
      categoryId: '4',
      date: '2026-03-01',
      title: 'Dinner',
    })
  })

  it('keeps a title containing a comma intact', async () => {
    respondWith(
      JSON.stringify({
        amount: 42.5,
        categoryId: '4',
        date: '2026-03-01',
        title: 'Dinner, drinks and tip',
      }),
    )
    const info = await extractExpenseInformationFromImage(IMAGE)
    expect(info.title).toBe('Dinner, drinks and tip')
    expect(info.amount).toBe(42.5)
  })

  it('asks for a strict JSON schema, and for the configured model', async () => {
    respondWith(
      JSON.stringify({
        amount: 1,
        categoryId: '0',
        date: '2026-03-01',
        title: 'x',
      }),
    )
    await extractExpenseInformationFromImage(IMAGE)

    const request = mockCreate.mock.calls[0][0]
    expect(request.model).toBe('test-vision-model')
    expect(request.response_format.type).toBe('json_schema')
    expect(request.response_format.json_schema.strict).toBe(true)
  })

  it.each([
    [
      'a field of the wrong type',
      JSON.stringify({
        amount: '42.5',
        categoryId: '4',
        date: '2026-03-01',
        title: 'x',
      }),
    ],
    ['a missing field', JSON.stringify({ amount: 42.5, categoryId: '4' })],
    ['a response that is not JSON', '42.5,4,2026-03-01,Dinner'],
    ['an empty response', ''],
  ])('reports nothing extracted for %s', async (_name, content) => {
    respondWith(content)
    expect(await extractExpenseInformationFromImage(IMAGE)).toEqual(
      NOTHING_EXTRACTED,
    )
  })

  it('reports nothing extracted when there is no content at all', async () => {
    respondWith(null)
    expect(await extractExpenseInformationFromImage(IMAGE)).toEqual(
      NOTHING_EXTRACTED,
    )
  })

  it('refuses a document id that is not in the database', async () => {
    respondWith(JSON.stringify({ amount: 1 }))
    mockFindUnique.mockResolvedValue(null)
    await expect(
      extractExpenseInformationFromImage('not-a-real-document'),
    ).rejects.toThrow('Document not found.')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('sends the model a presigned URL, never the stored one', async () => {
    respondWith(
      JSON.stringify({
        amount: 1,
        categoryId: '0',
        date: '2026-03-01',
        title: 'x',
      }),
    )
    await extractExpenseInformationFromImage(IMAGE)

    const request = mockCreate.mock.calls[0][0]
    const imagePart = request.messages
      .flatMap((m: { content: unknown[] }) => m.content)
      .find((part: { type: string }) => part.type === 'image_url')
    expect(imagePart.image_url.url).toBe(
      'https://uploads.test/presigned/receipt.jpg',
    )
  })
})
