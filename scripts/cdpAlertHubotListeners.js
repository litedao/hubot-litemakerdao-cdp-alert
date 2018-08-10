const {RBU, FU} = require('hubot-doge-utility-functions')

const Maker = require('./api/maker.js')

const {Validate} = require('./validation.js')


const cdpObjectToString = (cdpObj) => {
  if (cdpObj.collateralizationRatio.toString() != 'Infinity')
    cdpObj.collateralizationRatio = `${cdpObj.collateralizationRatio}%`

  return `Id: ${cdpObj.id}\n Collateralization ratio: ${cdpObj.collateralizationRatio}\n Collateral value: ${cdpObj.collateralValueInEth}\n Debt value: ${cdpObj.debtValueDai}\n Liquidation price: ${cdpObj.liquidationPriceEthUSD}`
}

const newLineJoin = FU.join('\n\n')

const modObjArrRemoveCdpKickBack = (prop, value) => object => {
  let newObj = FU.purify(object)
  let finalCDPArr = []
  newObj[prop].forEach( cdp => {
    if (cdp.id === value) return
    finalCDPArr.push(cdp)
  })
  newObj[prop] = finalCDPArr
  return newObj
}

const checkForCdp = (cdpId, cdpArr) => {
  return cdpArr.filter(cdp =>{
    if (cdp.id === cdpId) return cdp
  })[0]
}

const checkForLiquidRate = (arrayOfCmd) => {
  if (arrayOfCmd.length === 1) {
    arrayOfCmd = [arrayOfCmd[0], '200%']
  }
  return arrayOfCmd
}

const setupCdpTimedList = (timeDelin, timeDelinString, robot, msg) => {

  RBU.newUserCheckAndCreate(robot, msg.message.user.id)

  // Check if CDP is already being tracked by the user
  if (robot.brain.get(msg.message.user.id).cdps && robot.brain.get(msg.message.user.id).cdps.length) {

    const activCdpList = FU.modObjKickBack(timeDelin, true)
    const deActivCdpList = FU.modObjKickBack(timeDelin, false)


    // User 'toggles' cdp list timeDelin flipping it to 'true' || 'false'
    if (robot.brain.get(msg.message.user.id)[timeDelin]) {

      robot.brain.set(msg.message.user.id, deActivCdpList(robot.brain.get(msg.message.user.id)))
      return `You have *opted out* of the automatic ${timeDelinString} listing of your watched CDP\'s`
    } else {

      robot.brain.set(msg.message.user.id, activCdpList(robot.brain.get(msg.message.user.id)))
      return `You have *opted in* for an automatic ${timeDelinString} list of your watched CDP\'s`
    }
  }
  return 'We can\'t list your watched CDP\'s if you don\'t have any. To start watching a CDP run the command \`@doge cdp watch <cdpId>[, <collateralizationRatio percent>]\`.'
}



module.exports = (robot) => {

  robot.respond(/cdp watch/i, async (msg) => {

    // removes the '@doge channels join' command
    const removeCdpWatchCmd = FU.replace(`@${process.env.ROCKETCHAT_USER} cdp watch`,'')

    // cleans up and retreives the Cdp Id and the optional collat ratio
    // arrayOfCmd -> [cdpId, collateralizationRatio] -> [12, '300%']
    let arrayOfCmd = FU.compose(FU.spaceSplit, FU.trim, removeCdpWatchCmd)(msg.message.text)

    arrayOfCmd = checkForLiquidRate(arrayOfCmd)

    const {outcome, explain} = Validate.cdpWatchReq(arrayOfCmd)

    if (!outcome) {
      return msg.reply(explain)
    }


    RBU.newUserCheckAndCreate(robot, msg.message.user.id)

    // Check if CDP is already being tracked by the user
    if (robot.brain.get(msg.message.user.id).cdps && checkForCdp(arrayOfCmd[0], robot.brain.get(msg.message.user.id).cdps)) {
      return msg.reply(`You are already tracking the CDP with the ID of ${arrayOfCmd[0]}`)
    }

    // get CDP takes the CdpId as an arg
    const cdpInfo = await Maker.getCDP(Number(arrayOfCmd[0]))

    const desiredCollatRatio = Number(arrayOfCmd[1].substring(0, arrayOfCmd[1].length - 1))
    console.log('this is the desired ratio', desiredCollatRatio)
    //addCDPId and get back userObj
    const addCdpId = FU.modObjArrPushKickBack('cdps', {id: arrayOfCmd[0], liqNotifyRatio: desiredCollatRatio})

    robot.brain.set(msg.message.user.id, addCdpId(robot.brain.get(msg.message.user.id)))

    msg.reply(`You are now tracking the following CDP and will be notified when the CDP\'s collateralization ratio falls below *${desiredCollatRatio}%*\n ${cdpObjectToString(cdpInfo)}`)
  })

  robot.respond('/cdp list weekly$/', async (msg) => {
    const outcomeMessage = setupCdpTimedList('cdpListWeekly','weekly', robot, msg)
    msg.reply(outcomeMessage)
  })

  robot.respond('/cdp list daily$/', async (msg) => {
    const outcomeMessage = setupCdpTimedList('cdpListDaily','daily', robot, msg)
    msg.reply(outcomeMessage)
  })

  robot.respond(/cdp list$/i, async (msg) => {
    try {
      const trackedBrainCdps = robot.brain.get(msg.message.user.id).cdps
      const arrTrackedCdpPromises = trackedBrainCdps.map( async (cdp) => await Maker.getCDP(Number(cdp.id)))
      const arrTrackedCdps = await Promise.all(arrTrackedCdpPromises)
      const trackedCdpsString = newLineJoin(arrTrackedCdps.map(cdpObj => cdpObjectToString(cdpObj)))

      msg.reply(`Here are all of the CDPs you are currently tracking:\n ${trackedCdpsString}`)
    } catch (err) {
      msg.reply(err)
    }
  })


  robot.respond(/cdp forget/i, async (msg) => {

    const removeCdpForgetCmd = FU.replace(`@${process.env.ROCKETCHAT_USER} cdp forget`,'')
    const cdpIdToForget = FU.trim(removeCdpForgetCmd(msg.message.text))

    if (checkForCdp(cdpIdToForget, robot.brain.get(msg.message.user.id).cdps)) {
      const forgetCdp = modObjArrRemoveCdpKickBack('cdps', cdpIdToForget)
      robot.brain.set(msg.message.user.id, forgetCdp(robot.brain.get(msg.message.user.id)))
      return msg.reply(`CDP ${cdpIdToForget} has now been forgotten and will no longer be watched.`)
    }

    return msg.reply(`You were not tracking CDP ${cdpIdToForget} and therefore can\'t forget it. If you would like to see a full list of the CDP\'s you are watching, run the command \`@doge cdp list\`.`)

  })



}
