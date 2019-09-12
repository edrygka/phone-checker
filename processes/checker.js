'use strict'

const db = require('../db/db').db

process.on('message', msg => {
  if (msg.indexOf('start') !== -1) {
    console.log('Proccess got start with message: ' + msg)

    checkViber()
  }

  if (msg.indexOf('stop') !== -1) {
    console.log('Proccess got stop with message: ' + msg)
  }
})


async function checkViber(){
  const result = await db.query('select phone from phones ' +
    'order by phone_id limit $1 offset $2;', [20, 0])
  const phones = result.rows.map((value) => value.phone + '=')
  const options = {
    method: 'POST',
    headers: {
      'X-Viber-Auth-Token': process.env.VIBER_API_TOKEN
    },
    url: 'https://chatapi.viber.com/pa/get_online',
    body: {
      ids: phones
    },
    json: true
  }
  
  const response = await sendRequest(options)
}

