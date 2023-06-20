import { Network, PartialRecord } from '../types'
import { Token } from './token'
import { injectForkNetwork } from './pools.config'

export interface ChainlinkFeed {
  contract: string
  maxPriceAge: number
}

// https://docs.chain.link/data-feeds/price-feeds/addresses/
export const CHAINLINK_PRICE_FEEDS = injectForkNetwork<PartialRecord<Token, ChainlinkFeed>>({
  [Network.BSC_TESTNET]: {
    [Token.BUSD]: {
      contract: '0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa',
      maxPriceAge: 86400,
    },
    [Token.BTC]: {
      contract: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
      maxPriceAge: 86400,
    },
    [Token.ETH]: {
      contract: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
      maxPriceAge: 86400,
    },
  },
})

// maximum age of the price feed until it is considered stale
export const CHAINLINK_MAX_PRICE_AGE_BOUND = injectForkNetwork<number>({
  [Network.BSC_MAINNET]: 86400,
  [Network.BSC_TESTNET]: 86400,
})

export interface PythFeed {
  priceId: string
  maxPriceAge: number
}

// https://pyth.network/developers/price-feed-ids
// Note: Price IDs are the same for all EVM, but we may not update price IDs unless nessasary
export const PYTH_PRICE_IDS = injectForkNetwork<PartialRecord<Token, PythFeed>>({
  [Network.BSC_TESTNET]: {
    [Token.ETH]: {
      priceId: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      maxPriceAge: 86400,
    },
    [Token.USDT]: {
      priceId: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
      maxPriceAge: 86400,
    },
    [Token.WBNB]: {
      priceId: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
      maxPriceAge: 86400,
    },
  },
})

// maximum age of the price feed until it is considered stale
export const PYTH_MAX_PRICE_AGE_BOUND = injectForkNetwork<number>({
  [Network.BSC_MAINNET]: 86400,
  [Network.BSC_TESTNET]: 86400,
})
