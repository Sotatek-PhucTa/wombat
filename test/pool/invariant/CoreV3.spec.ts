import { Contract } from "ethers"
import { deployments, ethers, getNamedAccounts } from "hardhat"
import { deployContract } from "../../../utils/deploy"

describe('CoreV3', function() {
    let core: Contract
    beforeEach(async function () {
        core = await ethers.deployContract('CoreV3')
    })

    it('runs', async function() {
        // no op
    })
})