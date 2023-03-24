import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import beneficiaries from '../beneficiaries.json' // to be filled

const contractName = 'TokenVesting24M'

const deployFunc: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, multisig } = await getNamedAccounts()

  const [owner, user1, user2] = await ethers.getSigners()

  deployments.log(`Step 203. Deploying on : ${hre.network.name} with account : ${deployer}`)
  /// NOTE: This script is used only for initial 2.5% TGE WOM distribution to investors
  return

  // Get deployed WOM token instance
  const womToken = await deployments.get('WombatToken')
  const womTokenContract = await ethers.getContractAt('WombatERC20', womToken.address)
  // const womTokenContract = await ethers.getContractAt('WombatERC20', '0x55d398326f99059fF775485246999027B3197955')

  if (hre.network.name == 'bsc_mainnet') {
    // Check WOM token
    deployments.log(`WOM Token Address is : ${womToken.address}`)
    deployments.log(`Deployer account is: ${deployer}`)

    // send WOM allocation for beneficiaries 2.5% TGE
    const beneficiariesList = beneficiaries['TGE']
    // let totalAmt = 0
    for (let i = 0; i < beneficiariesList.length; i++) {
      const initialUserBalance = await womTokenContract.balanceOf(beneficiariesList[i].address)
      deployments.log(`Beneficiary initial WOM balance is: ${ethers.utils.formatEther(initialUserBalance)}`)
      // totalAmt += +beneficiariesList[i].amount

      const sendBeneficiaryTxn = await womTokenContract
        .connect(owner)
        .transfer(beneficiariesList[i].address, parseUnits(beneficiariesList[i].amount, 18))
      await sendBeneficiaryTxn.wait()
      deployments.log(`Sent Beneficiary ${beneficiariesList[i].address} with amount ${beneficiariesList[i].amount}`)

      const userBalance = await womTokenContract.balanceOf(beneficiariesList[i].address)
      deployments.log(`Beneficiary latest WOM balance is: ${ethers.utils.formatEther(userBalance)}`)
    }
    // deployments.log(32, totalAmt)
  }
}

export default deployFunc
deployFunc.tags = [contractName]
deployFunc.skip = async () => true
