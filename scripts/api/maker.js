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
    return error
  }
}

module.exports = {
  getCDP
}
