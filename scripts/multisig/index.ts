import { network } from 'hardhat'
import { writeTransactionsToFile } from '../../utils/multisig/files'
import { BatchTransaction } from '../../utils/multisig/tx-builder'
import fs from 'fs'

export async function runMultisigScript(id: string, script: () => Promise<BatchTransaction[]>) {
  const file = `proposals/${network.name}/${id}.json`
  if (fs.existsSync(file)) {
    console.warn(`Overwriting existing file ${file}`)
  }
  await writeTransactionsToFile(await script(), file)
  console.log(`Saving proposals to ${file}`)
}
