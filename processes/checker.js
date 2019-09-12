'use strict'

const db = require('../modules/db')
const sendRequest = require('../request').sendRequest

process.on('message', async msg => {
  if (msg.indexOf('start') !== -1) {
    console.log('Proccess got start with message: ' + msg)

    try {
      await checkViber()
    } catch(error){
      console.log('Catched error' + error)
    }
    
    process.send('finished')
  }

  if (msg.indexOf('stop') !== -1) {
    console.log('Proccess got stop with message: ' + msg)
  }
})

let validViberCount = 0

async function checkViber(){
  const count = (await db.query('SELECT COUNT(*) FROM phones')).rows[0].count
  const limit = 20

  for (let i = 0; i < 10; i++){
    const result = await db.query('SELECT phone FROM phones ' +
      'WHERE valid IS NULL ORDER BY phone_id LIMIT $1;', [limit])

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

    if (response.status !== 0) {
      return process.send(`viber-check-error=${response.status_message}`)
    }
    process.send(`viber-all-count=${i * 20 + 20}`)
    
    await handleResponse(response)
  }
}

async function handleResponse(response) {
  const users = response.users

  for (let i = 0; i < users.length; i++) {
    const phone = users[i].id.substring(0, users[i].id.length - 1)

    if (users[i].online_status === 3 || users[i].online_status === 4) {
      await db.query('UPDATE phones SET valid = FALSE WHERE phone = $1', [phone])
      continue
    }

    await db.query('UPDATE phones SET valid = TRUE, viber = TRUE WHERE phone = $1', [phone])
    validViberCount++
    process.send(`viber-valid-count=${validViberCount}`)
  }
  
}

