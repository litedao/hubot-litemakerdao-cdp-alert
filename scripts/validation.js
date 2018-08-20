

class OutcomeObj {
  constructor () {
    this.failureArr = []
    this.watchType = {}
  }

  failure (statement) {
    this.failureArr.push(statement)
  }

  watch (type) {
    this.watchType[type] = true
  }

  getFailures (textOption) {
    if (textOption) {
      let failureMessage = ''
      this.failureArr.forEach(error => failureMessage += `\n :x:${error}`)
      this.failureMessage += `If you need help or additional instruction run the command \`@doge help cdp\``
      return failureMessage
    }

    return this.failureArr
  }

  getWatchType() {
    return this.watchType
  }


}

class Validate {

  static collatRatioStructure (text, outcome) { /^\d+(\.\d{2,2})*%$/i.test(text) ? '' : outcome.failure('invalid collateralization ratio format.')
  }

  static collatRatioHighEnough (text, outcome) {
    const percentToNum = Number(text.substring(0, text.length - 1))
    if (percentToNum < 160) {
      outcome.failure('collateralization ratio is below 160%, that\'s dangerous! Re-run the watch command and make your collateralization ratio percentage higher.')
    }
  }

  static cdpId (text, outcome) { /(^[0-9]*$)/i.test(text) ? '' : outcome.failure('invalid CDP id')
  }

  static cdpForgetReq (incomingCdpId) {
    const outcome = new OutcomeObj
    if (!incomingCdpId) {
      outcome.failure('invalid CDP forget command. No CDP Id was provided.')
    } else {
      this.cdpId(incomingCdpId, outcome)
    }

    return (outcome.getFailures().length === 0) ? // is the expense valid?
    { outcome: true,
      explain: 'The CDP forget request is valid.',
    } : //expense is valid

    { outcome: false,
      explain: outcome.getFailures('text')
    } //expense is not valid

  }

  static cdpWatchReq (array) {
    const outcome = new OutcomeObj
    if (array.length > 2 || !array.length) {
      outcome.failure('invalid CDP watch command')
    } else {
      this.cdpId(array[0], outcome)
      if (array.length > 1) {
        this.collatRatioStructure(array[1], outcome)
        this.collatRatioHighEnough(array[1], outcome)
      }
    }

    return (outcome.getFailures().length === 0) ? // is the expense valid?
    { outcome: true,
      explain: 'The CDP watching request is valid.',
    } : //expense is valid

    { outcome: false,
      explain: outcome.getFailures('text')
    } //expense is not valid

  }

}

module.exports = { Validate }
