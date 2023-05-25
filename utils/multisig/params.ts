import assert from 'assert'

// BatchTransaction expects contractInputsValues to be a string read from the UI.
// To support complex types like arrays and tuples, we encode them to string and decode them from string.
// See encodeToHexData in https://github.com/safe-global/safe-react-apps/blob/9cb1d593acaafedaacfd9f11ac8384aeb37e3fe2/apps/tx-builder/src/utils.ts#L208
// See parseInputValue in https://github.com/safe-global/safe-react-apps/blob/9cb1d593acaafedaacfd9f11ac8384aeb37e3fe2/apps/tx-builder/src/utils.ts#L145
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encodeParam(baseType: string, value: any): string {
  if (baseType == 'array') {
    assert(Array.isArray(value), 'Expected array')
    if (value.length > 0 && Array.isArray(value[0])) {
      // If we need to support more complex types, I'd rather rely on
      // JSON.stringify for encode. This means creating an interface similar to
      // BatchTransaction but accepts non-string values. Then, ethersjs can work
      // transparently. And only when we save a BatchFile, do we need to encode
      // to string.
      throw new Error('Not implemented for 2-d arrays')
    }

    // Strings are unquoted on the UI. For example, the input of two addresses
    // would be "[0xf39Fd6...b92266, 0x88F6F4...ce6aB8]"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return `[${value.join(',')}]`
  }

  if (baseType == 'tuple') {
    throw new Error('Not implemented')
  }

  return value.toString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeParam(type: string, value: string): any {
  if (type.slice(-2) == '[]') {
    return value.slice(1, -1).split(',')
  }

  if (type == 'tuple') {
    throw new Error('Not implemented')
  }

  return value
}
