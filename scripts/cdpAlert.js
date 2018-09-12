
const cron = require('node-cron');
const Maker = require('./api/maker.js')
const {RBU, FU} = require('hubot-doge-utility-functions')
const newLineJoin = FU.join('\n\n')

const cdpObjectToString = (cdpObj) => {
  console.log('trying to change to string', cdpObj)
  if (cdpObj.collateralizationRatio.toString() != 'Infinity')
    cdpObj.collateralizationRatio = `${cdpObj.collateralizationRatio}%`

  return `Id: ${cdpObj.id}\n Collateralization ratio: ${cdpObj.collateralizationRatio}\n Collateral value: ${cdpObj.collateralValueInEth}\n Debt value: ${cdpObj.debtValueDai}\n Liquidation price: ${cdpObj.liquidationPriceEthUSD}`
}

const cdpTimedList = async (timeDelim, timeDelimString, robot) => {
  const users = robot.brain.users()
  const allWatchedCdps = []
  for (const k in users) {

    if ((robot.brain.get(k) != null) && robot.brain.get(k)[timeDelim] && robot.brain.get(k).cdps && robot.brain.get(k).cdps.length) {
      try {
        const watchedCdpsArr = robot.brain.get(k).cdps
        const arrWatchedCdpPromises = watchedCdpsArr.map( async (cdp) => await Maker.getCDP(Number(cdp.id)))
        const arrWatchedCdps = await Promise.all(arrWatchedCdpPromises)
        const watchedCdpsString = newLineJoin(arrWatchedCdps.map(cdpObj => cdpObjectToString(cdpObj)))

        const sendTimedListMsg = RBU.sendDirectMessage(robot, `Hey here is your ${timeDelimString} list of all of the CDP\'s you are watching:\n\n ${watchedCdpsString}`)

        await sendTimedListMsg(users[k].name)

      } catch (error) {
        console.log('error', error)
      }
    }
  }
}


module.exports = (robot) => {

  // cdp list daily cron job (runs everyday at 12:00 serv time)
  cron.schedule('0 12 * * *', async () => {
  await cdpTimedList('cdpListDaily', 'daily', robot)
  })

  // cdp list weekly cron job (runs every Monday at 12:00 serv time)
  cron.schedule('0 12 * * 1', async () => {
  await cdpTimedList('cdpListWeekly', 'weekly', robot)
  })

  // cdp watch cron job (runs every minute)
  cron.schedule('* * * * *', async () => {
    console.log('running cdp watch check!')
    const users = robot.brain.users()
    const allWatchedCdps = []

    for (const k in users) {
      if ((robot.brain.get(k) != null) && robot.brain.get(k).cdps && robot.brain.get(k).cdps.length) {
        const watchedCdpsArr = robot.brain.get(k).cdps
        for (const cdp in watchedCdpsArr) {
          try {
            const currentCdpCollat = await Maker.getCDP(Number(watchedCdpsArr[cdp].id))
            // if no Dai have been drawn out of the cdp it is always colateralized -> exit
            if (currentCdpCollat.collateralizationRatio.toString() === 'Infinity') return

            // check that collateralizationRatio is less than or equal to the liquidation notify ratio
            if (currentCdpCollat.collateralizationRatio <= watchedCdpsArr[cdp].liqNotifyRatio) {

              const sendUnderColatAlert = RBU.sendDirectMessage(robot, `Warning! CDP ${watchedCdpsArr[cdp].id} currenty has a *collateralization ratio of ${currentCdpCollat.collateralizationRatio}%*. If you would like to kick your CDP please do so at https:\/\/dai.makerdao.com\/`)
              await sendUnderColatAlert(users[k].name)
            }
          } catch (error) {
            console.log('error', error)
          }
        }
      }

      }
  })
}

