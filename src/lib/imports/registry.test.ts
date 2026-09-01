/**
 * Cross-detection between the registered import formats.
 *
 * Each adapter has its own tests, but nothing checked that the registry picks
 * the right one when both are registered - which is the part that breaks when
 * a format is added. Splitwise CSV and Spliit JSON have to reject each other's
 * files outright, not merely score lower.
 */
import { detectFormat } from '@/lib/imports/registry'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8')

const SPLIIT_JSON = JSON.stringify({
  participants: [{ name: 'Alice' }, { name: 'Bob' }],
  expenses: [
    {
      paidById: '1',
      paidFor: [{ participantId: '2', shares: 1 }],
      amount: 3000,
      expenseDate: '2025-11-15',
      title: 'Dinner',
    },
  ],
})

describe('import format detection', () => {
  it('picks the Splitwise adapter for a Splitwise CSV export', async () => {
    const format = await detectFormat(fixture('splitwise-test.csv'))
    expect(format?.id).toBe('splitwise-csv')
  })

  it('picks the Splitwise adapter for a localised (German) export', async () => {
    const format = await detectFormat(fixture('splitwise-test-de.csv'))
    expect(format?.id).toBe('splitwise-csv')
  })

  it('still picks the Spliit adapter for a Spliit JSON export', async () => {
    const format = await detectFormat(SPLIIT_JSON)
    expect(format?.id).toBe('spliit-json')
  })

  it('opts out entirely rather than guessing on an unrelated file', async () => {
    expect(await detectFormat('hello,world\n1,2\n')).toBeNull()
    expect(await detectFormat('not a file we know')).toBeNull()
  })
})
