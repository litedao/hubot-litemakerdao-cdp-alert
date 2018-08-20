const {RBU, FU} = require('hubot-doge-utility-functions')

const Maker = require('./api/maker.js')

const {Validate} = require('./validation.js')


const cdpObjectToString = (cdpObj) => {
  if (cdpObj.collateralizationRatio.toString() != 'Infinity')
    cdpObj.collateralizationRatio = `${cdpObj.collateralizationRatio}%`

  return `Id: ${cdpObj.id}\n Collateralization ratio: ${cdpObj.collateralizationRatio}\n Collateral value: ${cdpObj.collateralValueInEth}\n Debt value in dai: ${cdpObj.debtValueDai}\n Liquidation price: ${cdpObj.liquidationPriceEthUSD}`
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

const checkForLiquidRatio = (collatPercent) => {
  if (!collatPercent) {
    return '200%'
  }
  return collatPercent
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

  robot.respond('/cdp watch (.*)$/i', async (msg) => {
    msg.finish()
    let arrayOfCmd = FU.spaceSplit(msg.match[1])
    // arrayOfCmd -> [cdpId, collateralizationRatio] -> [12, '300%']
    arrayOfCmd[1] = checkForLiquidRatio(arrayOfCmd[1])
    const {outcome, explain} = Validate.cdpWatchReq(arrayOfCmd)

    if (!outcome) {
      return msg.reply(explain)
    }

    RBU.newUserCheckAndCreate(robot, msg.message.user.id)

    // Check if CDP is already being tracked by the user
    if (robot.brain.get(msg.message.user.id).cdps && checkForCdp(arrayOfCmd[0], robot.brain.get(msg.message.user.id).cdps)) {
      return msg.reply(`You are already tracking the CDP with the ID of ${arrayOfCmd[0]}`)
    }


    try {
      // get CDP takes the CdpId as an arg
      console.log('cdpID', Number(arrayOfCmd[0]))
      const cdpInfo = await Maker.getCDP(Number(arrayOfCmd[0]))
      const desiredCollatRatio = Number(arrayOfCmd[1].substring(0, arrayOfCmd[1].length - 1))

      //addCDPId and get back userObj
      const addCdpId = FU.modObjArrPushKickBack('cdps', {id: arrayOfCmd[0], liqNotifyRatio: desiredCollatRatio})

      robot.brain.set(msg.message.user.id, addCdpId(robot.brain.get(msg.message.user.id)))
      console.log('cdp we try to track', cdpInfo)
      return msg.reply(`You are now tracking the following CDP and will be notified when the CDP\'s collateralization ratio falls below *${desiredCollatRatio}%*\n ${cdpObjectToString(cdpInfo)}`)
    } catch (error) {
      console.log('in error!', error)
      return msg.reply(`${error}`)
    }
  })

   robot.respond('/cdp list(.*)$/i', async (msg) => {
    if (msg.match[1] === ' daily') {
      msg.finish()
      const outcomeMessage = setupCdpTimedList('cdpListDaily','daily', robot, msg)
      msg.reply(outcomeMessage)

    } else if (msg.match[1] === ' weekly') {
      msg.finish()
      const outcomeMessage = setupCdpTimedList('cdpListWeekly','weekly', robot, msg)
      msg.reply(outcomeMessage)

    } else if (msg.match[1] === '') {
      msg.finish()
      try {
        if (robot.brain.get(msg.message.user.id) && (robot.brain.get(msg.message.user.id).cdps && robot.brain.get(msg.message.user.id).cdps.length)) {
          const trackedBrainCdps = robot.brain.get(msg.message.user.id).cdps
          const arrTrackedCdpPromises = trackedBrainCdps.map( async (cdp) => await Maker.getCDP(Number(cdp.id)))
          const arrTrackedCdps = await Promise.all(arrTrackedCdpPromises)
          const trackedCdpsString = newLineJoin(arrTrackedCdps.map(cdpObj => cdpObjectToString(cdpObj)))
          return msg.reply(`Here are all of the CDPs you are currently tracking:\n ${trackedCdpsString}`)
        } else {
          return msg.reply(`You are not currently watching any CDP\'s and therefore cannot perform \`@doge cdp list\`. To watch a cdp type \`@doge cdp watch <CDPId>\``)
        }
      } catch (err) {
        msg.reply(err)
      }
    } else {
      msg.reply('Command was not recognized. Try the command \`@doge help cdp\` for assistance.')
    }
  })

  robot.respond(/cdp forget(.*)$/i, async (msg) => {
    msg.finish()
    const cdpIdToForget = FU.trim(msg.match[1])
    const {outcome, explain} = Validate.cdpForgetReq(cdpIdToForget)

    if (!outcome) {
      return msg.reply(explain)
    }

    if (checkForCdp(cdpIdToForget, robot.brain.get(msg.message.user.id).cdps)) {
      const forgetCdp = modObjArrRemoveCdpKickBack('cdps', cdpIdToForget)
      robot.brain.set(msg.message.user.id, forgetCdp(robot.brain.get(msg.message.user.id)))
      return msg.reply(`CDP ${cdpIdToForget} has now been forgotten and will no longer be watched.`)
    }

    return msg.reply(`You were not watching CDP ${cdpIdToForget} and therefore can\'t forget it. If you would like to see a full list of the CDP\'s you are watching, run the command \`@doge cdp list\`.`)
  })

  robot.listen( msg => {
    if (msg.message && (msg.message.text.substr(0,9) ==='@doge cdp')) {
      return true
    }
  }, msg => {
    return msg.reply(`I did not recognize \`${msg.message.message.text}\`as a command. Be sure to remove all trailing spaces when running a command. Additionally, If you need to see a list of commands that I can run, type \`@doge help cdp\`.`)
  })

}
