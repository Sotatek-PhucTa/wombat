import { Fragment, FunctionFragment } from '@ethersproject/abi/lib/fragments'
import { ethers } from 'hardhat'

export interface InterfaceArg {
  contract: string
  constructor: Arg[]
  initialize: Arg[]
}

export interface Arg {
  name: string
  type: string
}

export async function toInterfaceArg(contract: string): Promise<InterfaceArg> {
  const contractFactory = await ethers.getContractFactory(contract)
  const constructorFragment = contractFactory.interface.deploy
  const initializeFragments = Object.entries(contractFactory.interface.functions).filter(([key]) =>
    key.startsWith('initialize')
  )
  switch (initializeFragments.length) {
    case 0: {
      return {
        contract,
        constructor: getArgs(constructorFragment),
        initialize: [],
      }
    }
    case 1: {
      return {
        contract,
        constructor: getArgs(constructorFragment),
        initialize: getArgs(initializeFragments[0][1] as FunctionFragment),
      }
    }
    default: {
      throw new Error(`Too many initialize methods: ${initializeFragments}`)
    }
  }
}

function getArgs(fragment: Fragment): Arg[] {
  return fragment.inputs.map((input) => {
    return { name: input.name, type: input.type }
  })
}
