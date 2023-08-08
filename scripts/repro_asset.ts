import { ethers } from 'hardhat'
import { impersonateAsMultisig } from '../utils'
import assert from 'assert'
import { toChecksumAddress } from '../utils/addresses'

/*
 * Context: subgraph empty asset bug. See https://app.clickup.com/t/85ztq8q7j
 *
 * Instructions
 * 1. FORK_NETWORK=bsc_mainnet hh node --no-deploy --fork-block-number 30523599
 * 2. FORK_NETWORK=bsc_mainnet hh run scripts/repro_asset.ts --network localhost
 * Or,
 * 1. FORK_NETWORK=bsc_mainnet FORK_BLOCK_NUMBER=30523599 hh run scripts/repro_asset.ts
 */

run()

async function run() {
  const smart_hay_pool = toChecksumAddress('0x0520451b19ad0bb00ed35ef391086a692cfc74b2')
  const busd = toChecksumAddress('0xe9e7cea3dedca5984780bafc599bd69add087d56')
  const lpBusd = toChecksumAddress('0xa649be04619a8f3b3475498e1ac15c90c9661c1a')

  const pool = await ethers.getContractAt('Pool', smart_hay_pool)
  {
    const tokens = await pool.getTokens()
    console.log('before', tokens)
    assert(!tokens.includes(busd))
  }

  await impersonateAsMultisig((multisig) => {
    return pool.connect(multisig).addAsset(busd, lpBusd)
  })

  {
    const tokens = await pool.getTokens()
    console.log('after', tokens)
    console.log('after', await pool.addressOfAsset(busd))
    assert(tokens.includes(busd))
  }
}
