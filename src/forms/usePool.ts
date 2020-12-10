import { UUSD } from "../constants"
import { times, floor, gt, plus } from "../libs/math"
import { format, formatAsset } from "../libs/parse"
import calc from "../helpers/calc"
import { useContract, useContractsAddress, useRefetch } from "../hooks"
import { PriceKey } from "../hooks/contractKeys"
import { parsePairPool } from "../graphql/useNormalize"

export default () => {
  const priceKey = PriceKey.PAIR
  const { getSymbol } = useContractsAddress()
  const { parsed, find } = useContract()
  useRefetch([priceKey])

  /**
   * @param amount - Amount to provide(asset)/withdraw(lp)
   * @param token - Token of the asset to provide/withdraw
   */
  return ({ amount, token }: Asset) => {
    const price = find(priceKey, token)

    /* pair pool */
    const pairPool = parsePairPool(parsed[PriceKey.PAIR][token])

    /* estimate uusd */
    const estimated = gt(amount, 0) ? floor(times(amount, price)) : "0"

    /* to lp */
    const deposits = [
      { amount, pair: pairPool.asset },
      { amount: estimated, pair: pairPool.uusd },
    ]

    const toLP = calc.toLP(deposits, pairPool.total)

    /* from lp */
    const shares = {
      asset: { amount: pairPool.asset, token },
      uusd: { amount: pairPool.uusd, token: UUSD },
    }

    const fromLP = calc.fromLP(amount, shares, pairPool.total)
    const assetValueFromLP = times(find(priceKey, token), fromLP.asset.amount)
    const valueFromLP = plus(assetValueFromLP, fromLP.uusd.amount)

    return {
      toLP: {
        estimated,
        value: toLP,
        text: gt(estimated, 0) ? format(estimated, UUSD) : "-",
      },

      fromLP: {
        ...fromLP,
        value: valueFromLP,
        text: fromLP
          ? [fromLP.asset, fromLP.uusd]
              .map(({ amount, token }) => formatAsset(amount, getSymbol(token)))
              .join(" + ")
          : "-",
      },
    }
  }
}
