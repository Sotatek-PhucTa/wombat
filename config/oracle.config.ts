import { Network, PartialRecord } from '../types'
import { Token } from './token'
import { injectForkNetwork } from './tokens.config'

type Feed = string

// https://docs.chain.link/data-feeds/price-feeds/addresses/
export const CHAINLINK_PRICE_FEEDS = injectForkNetwork<PartialRecord<Token, Feed>>({
  [Network.BSC_TESTNET]: {
    [Token.BUSD]: '0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa',
    [Token.BTC]: '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    [Token.ETH]: '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
  },
})

// maximum age of the price feed until it is considered stale
export const CHAINLINK_MAX_PRICE_AGE = injectForkNetwork<number>({
  [Network.BSC_TESTNET]: 3600,
})

type PriceId = string

// https://pyth.network/developers/price-feed-ids
export const PYTH_PRICE_IDS = injectForkNetwork<PartialRecord<Token, PriceId>>({
  [Network.BSC_TESTNET]: {
    [Token.ETH]: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    [Token.USDT]: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
    [Token.WBNB]: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  },
})

// maximum age of the price feed until it is considered stale
export const PYTH_MAX_PRICE_AGE = injectForkNetwork<number>({
  [Network.BSC_TESTNET]: 3600,
})
