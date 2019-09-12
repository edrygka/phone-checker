'use strict'

const request = require('request')

const sendRequest = (options, delay) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      request(options, (err, response, body) => {
        if (err) {
          console.log(err)
          reject(err)
        }
        resolve(body)
      })
    }, delay || 1000)
  })
}

exports.sendRequest = sendRequest
