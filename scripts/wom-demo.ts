import { deployments, ethers } from 'hardhat'
import { parseUnits } from '@ethersproject/units'
import { signERC2612Permit } from '../contracts/wombat-peripheral/permit/eth-permit' // https://github.com/dmihal/eth-permit
import secrets from '../secrets.json' // BSC TESTNET ONLY!

async function run() {
  // Wait for all deployments to finish
  await deployments.all()

  console.log('WOM Token Demo running...')

  // Setup deployed address constant
  const womTokenAddress = await (await deployments.get('WOM')).address

  // Get Signers
  const [owner, user1, user2] = await ethers.getSigners()
  const wallet = new ethers.Wallet(secrets.deployer.privateKey, ethers.provider)
  const senderAddress = await wallet.getAddress()

  // Get WOM token deployed instances
  const womTokenContract = await ethers.getContractAt('WombatERC20', womTokenAddress, owner)

  const result = await signERC2612Permit(
    wallet,
    womTokenContract.address,
    senderAddress,
    user1.address,
    parseUnits('10000', 18).toString()
  )

  // Permit tokens to be spent by owner
  await (
    await womTokenContract
      .connect(user1)
      .permit(
        senderAddress,
        user1.address,
        parseUnits('10000', 18).toString(),
        result.deadline,
        result.v,
        result.r,
        result.s
      )
  ).wait()

  console.log(`WOM Allowance of User1 : ${await womTokenContract.allowance(senderAddress, user1.address)}`)

  // Transferfrom owner to user2 of 3300 WOM tokens
  await (
    await womTokenContract.connect(user1).transferFrom(senderAddress, user2.address, parseUnits('3300', 18))
  ).wait()

  console.log(
    `WOM Balance of Owner : ${ethers.utils.formatUnits((await womTokenContract.balanceOf(owner.address)).toString())}`
  )

  console.log(
    `WOM Balance of User2 : ${ethers.utils.formatUnits((await womTokenContract.balanceOf(user2.address)).toString())}`
  )

  console.log('WOM Token Demo complete.')
}

// Run the script
run()
