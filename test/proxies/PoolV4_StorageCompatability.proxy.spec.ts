import { parseEther } from '@ethersproject/units'

import { ethers, upgrades } from 'hardhat'
import { MockPoolV3_0, MockPoolV3_1 } from '../../build/typechain'
import { expect } from 'chai'

// TODO: cimplement
describe('PoolV4 - Storage Compatibility', function () {
  it('Storage Compatibility', async function () {
    // const [owner] = await ethers.getSigners()
    // const PoolFactory = await ethers.getContractFactory('MockPoolV3_0', owner)
    // const NewPoolFactory = await ethers.getContractFactory('MockPoolV3_1', owner)
    // const pool = await upgrades.deployProxy(PoolFactory, {})
    // const index = 9876243985
    // await (pool as MockPoolV3_0).setFee(index, parseEther('10000'))
    // const newPool = await upgrades.upgradeProxy(pool, NewPoolFactory, { unsafeSkipStorageCheck: true })
    // const feeAndReserve = await (newPool as MockPoolV3_1).feeAndReserve(index)
    // expect(feeAndReserve.feeCollected).to.eq(parseEther('10000'))
  })
})
