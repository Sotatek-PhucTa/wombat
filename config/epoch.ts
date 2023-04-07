const first_epoch = 1673416500 // 2023-01-11T05:55:00.000Z
const epoch_duration = 7 * 24 * 3600 // 7 days

// Utility to create timestamp in seconds at the start of the epoch given by the iso string
// e.g. atEpochStart('2023-04-12T05:55:00Z') => 1681278900
// REQUIRES: isoString is exactly at the second an epoch starts.
export function atEpochStart(isoString: string): number {
  const epochMillis = new Date(isoString).getTime()
  if (epochMillis % 1000 != 0) {
    throw new Error(`Date ${isoString} is not a whole second`)
  }
  const epochSeconds = epochMillis / 1000
  const n = Math.floor((epochSeconds - first_epoch) / epoch_duration)
  if (epochSeconds != first_epoch + n * epoch_duration) {
    throw new Error(`Date ${isoString} is not at the start of an epoch`)
  }
  return epochSeconds
}
