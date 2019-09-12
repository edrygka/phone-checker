'use strict'

const request = require('request')

const sendRequest = (options) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      request(options, (err, response, body) => {
        if (err) {
          console.log(err)
          reject(err)
        }
        console.log(body)
        resolve(body)
      })
    }, 60000) // set delay 1 min
  })
}

exports.sendRequest = sendRequest
