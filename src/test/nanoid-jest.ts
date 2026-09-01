// nanoid ships ESM-only (no CJS build), same class of issue as the other stubs
// in this directory. Ids must be genuinely unique, not merely well-shaped:
// database-backed tests insert them as primary keys, so a repeating sequence
// collides on Participant_pkey the moment two groups are created.
const ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

export function nanoid(size = 21) {
  let id = ''
  for (let i = 0; i < size; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return id
}
