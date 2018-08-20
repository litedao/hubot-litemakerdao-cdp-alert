const Maker = require('@makerdao/dai')

const toPercent = (number) => Number((number * 100).toFixed(3))

const maker = Maker.create('mainnet', {
  privateKey: `${process.env.ETH_PRIVATE_KEY}`,
  provider: {
    infuraApiKey: process.env.INFURA_API_KEY
  }
});

async function getCDP(cdpId) {
  try {
    let returnCdp = {}
    const cdp = await maker.getCdp(cdpId)
    returnCdp.id = cdpId
    returnCdp.collateralValueInEth = await cdp.getCollateralValue()
    returnCdp.collateralizationRatio = toPercent(await cdp.getCollateralizationRatio())
    returnCdp.debtValueDai = await cdp.getDebtValue()
    returnCdp.liquidationPriceEthUSD = await cdp.getLiquidationPrice()
    return returnCdp

  } catch (error) {
    console.log(error)
    if (error.toString().substr(7, 19) === 'amount "NaN" is not')
      throw `:x: CDP ${cdpId} has either been closed or does not exist, therefore I am unable to watch it. Please re run the watch command: \`@doge cdp watch <CdpID>\` with an active CDP Id.`

    if (error.toString().substr(7, 22) === "That CDP doesn't exist")
      throw `:x: CDP ${cdpId} has either been closed or does not exist, therefore I am unable to watch it. Please re run the watch command: \`@doge cdp watch <CdpID>\` with an active CDP Id.`
  }
}

module.exports = {
  getCDP
}
