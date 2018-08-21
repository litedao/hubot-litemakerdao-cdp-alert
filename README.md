# hubot-makerdao-cdp-alert
A cdp alert bot that allows users to watch and list their CDP's by id.

## getting started
This cdp alert bot is written ontop of the hubot framework (you can check out Hubot here). This version supports Rocket.chat currently but we have plans to expand support to Signal and Slack.

To install make sure you have NPM installed, then run `npm install --save hubot-makerdao-cdp-alert`

Once you have installed the package be sure to add it to your `external-scripts.json` file (hubot checks this file upon start):
```
["hubot-makerdao-cdp-alert"]
```

Since the CDP alert bot relys on the Maker.js library we need an Infura API key to interact with the Ethereum blockchain. To get an Infura API key visit their website[https://infura.io/] and select 'SIGN UP'  

Additionally Maker.js requires that each user / project interacting with the library use an Ethereum private key. Although this library doesn't utilize any of Maker.js methods that would need the private key it's required to do simple read requests (which is all we are doing essentially). So plug both of those into your environment variables like so:
```
export ETH_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export INFURA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Great! Your all setup, if you run your hubot you should have access to the following commands!

## commands
Here are the current commands you can run via Rocket.Chat
- `BOTNAME cdp watch <cdpId> [collateralizationPercetange]`
- `BOTNAME cdp list [daily || weekly]`
- `BOTNAME cdp forget <cdpId>`
