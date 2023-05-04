import { printDeployedPoolsArgs } from '../utils'

/**
 * hh run scripts/poolStatus.ts --network arb_mainnet
 */
const main = async () => {
  await printDeployedPoolsArgs()
}

main()
