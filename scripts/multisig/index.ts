import { writeBatchFile } from '../../utils/multisig/files'
import { BatchTransaction } from '../../utils/multisig/tx-builder'
import fs from 'fs'
import { isForkedNetwork } from '../../utils'
import { simulate } from '../../utils/multisig/utils'
import { getCurrentNetwork } from '../../types/network'

export async function runScript(
  id: string,
  script: () => Promise<BatchTransaction[]>,
  postCondition = async () => {
    /*no-op*/
  }
) {
  const txns = await script()
  if (isForkedNetwork()) {
    await simulate(txns)
    await postCondition()
    console.log(`Simulation success for id: ${id}`)
    return
  }

  const network = getCurrentNetwork()
  const file = `proposals/${network}/${id}.json`
  if (fs.existsSync(file)) {
    console.warn(`Overwriting existing file ${file}`)
  }
  await writeBatchFile(txns, file)
  console.log(`Saving proposals to ${file}`)
}
