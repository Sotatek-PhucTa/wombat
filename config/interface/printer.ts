import { Arg, InterfaceArg } from './types'
import _ from 'lodash'

export function printInterface(arg: InterfaceArg): string {
  if (arg.constructor.length > 0 && arg.initialize.length > 0) {
    throw new Error(`Cannot generate code for both constructor and initialize`)
  }

  const args = arg.constructor
    .concat(arg.initialize)
    .map((arg) => printArg(arg))
    .join('\n  ')
  return `export interface ${arg.contract} {\n  ` + args + '\n}'
}

function printArg(arg: Arg): string {
  // trim leading and trailing underscore
  const name = _.trim(arg.name, '_')
  const type = typeOf(arg.type)
  return `${name}: ${type}`
}

function typeOf(solidityType: string): string {
  if (solidityType.includes('int')) {
    return 'BigNumberish'
  } else if (solidityType == 'address') {
    return 'DeploymentOrAddress'
  } else if (solidityType == 'string') {
    return 'string'
  } else {
    throw new Error(`Unknown solidity type: ${solidityType}}`)
  }
}
