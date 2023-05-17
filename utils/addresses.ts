import { getAddress } from 'ethers/lib/utils'

export function isSameAddress(left: string, right: string) {
  return toChecksumAddress(left) == toChecksumAddress(right)
}

export function isChecksumAddress(address: string) {
  return address == toChecksumAddress(address)
}

export function toChecksumAddress(address: string) {
  return getAddress(address)
}
