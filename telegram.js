'use strict'

const tg = require('telegram-api-js/dist/telegramApi.js')

tg.setConfig({
  app: {
    id: 1165641, /* App ID */
    hash: 'ebbac2245a1cd2e81a9f1b4cab9f4bbd', /* App hash */
    version: '0.0.0' /* App version */
  }
})

tg.getUserInfo()
