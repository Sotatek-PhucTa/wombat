import fs from 'fs'
import hardhatConfig from '../hardhat.config'
import assert from 'assert'
import { toChecksumAddress } from '../utils/addresses'

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
  const signers: Partial<Entry>[] = [
    { name: 'Cherie', address: '0xa407185af4ef6f92de90d159626aa8c58eb5a2e3' },
    { name: 'Shinji', address: '0x9e031064ce7c3e9b6dda1ffcf9e5d41afbbdfeea' },
    { name: 'Alex', address: '0x14ba0d857c496c03a8c8d5fcc6c92d30df804775' },
    { name: 'Raymond', address: '0x96bcab9abb56cb94e4a43b009487e37390522350' },
    { name: 'Jack', address: '0xcb3bb767104e0b3235520fafb182e005d7efd045' },
    { name: 'Oscar', address: '0xc92b4cef4bfa0eefe16eda4689da10df9fe9e801' },
    { name: 'Kate', address: '0x08b37669337af0484aaf9c58f240e50ee8d928ec' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const config = hardhatConfig.namedAccounts!.multisig as { [network: string]: string }
  const networks = Object.keys(config).filter((network) => network.includes('mainnet'))
  return networks.flatMap((network) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const chainId = hardhatConfig.networks![network]!.chainId!.toString()
    const address = config[network]
    return signers
      .map(
        (e) =>
          ({
            name: e.name,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            address: toChecksumAddress(e.address!),
            chainId,
          } as Entry)
      )
      .concat({
        address,
        chainId,
        name: `Wombat-Multisig-${network}`,
      } as Entry)
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
