import { formatEther } from 'ethers/lib/utils'

const hre = require('hardhat')
// import
const ethers = hre.ethers

const poolAddr = '0x76F3378F13c6e9c5F477d1D9dE2A21151E883D71'
const assetsAddr = [
  '0x11c5361A9565cd64dfCe0cbF0E6304A19ee7D905',
  '0x237B91Cd01df061FC45ff20f35a784a1653C7e0e',
  '0xAe9104a4944807BCdB6C77f19Abfaf7e8D335044',
  '0xF981edeb91D158c9BF9c9C86800743E4947e5883',
  '0x37b33051CCC5B0bCA6b496F654B2444436440607',
  '0xDc7ed8B3c2fc8992a7246Af2a7dcdcA64F82804f',
]

const main = async () => {
  // npx hardhat node --no-deploy --fork https://data-seed-prebsc-1-s1.binance.org:8545 --fork-block-number 17585791
  // npx hardhat run scripts/poolSatus.ts

  const pool = await ethers.getContractAt('Pool', poolAddr)

  const promises = assetsAddr.map(async (addr: string) => {
    const asset = await ethers.getContractAt('Asset', addr)
    const symbol = await asset.symbol()
    const cash = formatEther(await asset.cash())
    const liability = formatEther(await asset.liability())
    const exchangeRate = formatEther(await pool.exchangeRate(await asset.underlyingToken()))
    const r = Number(cash) / Number(liability)

    return { symbol, cash, liability, exchangeRate, r }
  })

  const result = await Promise.all(promises)
  console.log(result)

  const [equilCovRatio, invariant] = await pool.globalEquilCovRatio()
  console.log(formatEther(equilCovRatio), formatEther(invariant))
}

main()
