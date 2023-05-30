import fs from 'fs'
import hardhatConfig from '../hardhat.config'
import assert from 'assert'

// Generate address book for gnosis safe
// Format is csv with header address,name,chainId
interface Entry {
  address: string
  chainId: string
  name: string
}

function readDeployments(): Entry[] {
  return fs
    .readdirSync('./deployments')
    .filter((network) => network.includes('mainnet'))
    .flatMap((network) => {
      const chainId = fs.readFileSync(`./deployments/${network}/.chainId`).toString()
      const deployments = fs.readdirSync(`./deployments/${network}`).filter((f) => f.endsWith('.json'))
      return deployments.map((deployment) => {
        const json = JSON.parse(fs.readFileSync(`./deployments/${network}/${deployment}`).toString())
        return {
          address: json.address,
          chainId,
          name: deployment.slice(0, -5), // remove .json
        }
      })
    })
}

function readMultisig(): Entry[] {
  const config = hardhatConfig.namedAccounts.multisig
  const networks = Object.keys(config).filter((network) => network.includes('mainnet'))
  return networks.map((network) => {
    const chainId = hardhatConfig.networks[network].chainId?.toString()
    const address = config[network].toString()
    return {
      address,
      chainId,
      name: `Wombat-Multisig-${network}`,
    } as Entry
  })
}

function generateCsv(entries: Entry[]): string {
  const header = 'address,name,chainId\n'
  const body = entries.map((entry) => `${entry.address},${entry.name},${entry.chainId}`).join('\n')
  return header + body
}

async function run() {
  fs.writeFileSync('./address-book.csv', generateCsv(readDeployments().concat(readMultisig())))
}

run()
