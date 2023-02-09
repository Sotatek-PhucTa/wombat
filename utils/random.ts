import { dynamicImport } from 'tsimportlib'
import seedrandom from 'seedrandom'
import { Random } from 'random/dist/random'

export async function CreateRandom(seed?: string): Promise<Random> {
  // Workaround due to random being esm only
  // solutions found in https://github.com/TypeStrong/ts-node/discussions/1290
  const r = await dynamicImport('random', module)
  return new r.Random(seedrandom(seed, { global: false }))
}
