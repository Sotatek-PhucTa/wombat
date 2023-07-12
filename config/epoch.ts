const first_epoch = 1673416500 // 2023-01-11T05:55:00.000Z
export const epoch_duration_seconds = 7 * 24 * 3600 // 7 days

export enum Epochs {
  Apr12 = atEpochStart('2023-04-12T05:55Z'),
  Apr19 = atEpochStart('2023-04-19T05:55Z'),
  May03 = atEpochStart('2023-05-03T05:55Z'),
  May10 = atEpochStart('2023-05-10T05:55Z'),
  May17 = atEpochStart('2023-05-17T05:55Z'),
  Jul05 = atEpochStart('2023-07-05T05:55Z'),
  Jul12 = atEpochStart('2023-07-12T05:55Z'),
}

// Utility to create timestamp in seconds at the start of the epoch given by the iso string
// e.g. atEpochStart('2023-04-12T05:55:00Z') => 1681278900
// REQUIRES: isoString is exactly at the second an epoch starts.
export function atEpochStart(isoString: string): number {
  const epochMillis = new Date(isoString).getTime()
  if (epochMillis % 1000 != 0) {
    throw new Error(`Date ${isoString} is not a whole second`)
  }
  const epochSeconds = epochMillis / 1000
  const n = Math.floor((epochSeconds - first_epoch) / epoch_duration_seconds)
  if (epochSeconds != first_epoch + n * epoch_duration_seconds) {
    throw new Error(`Date ${isoString} is not at the start of an epoch`)
  }
  return epochSeconds
}
