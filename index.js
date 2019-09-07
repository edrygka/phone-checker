'use strict'

const bodyParser = require('body-parser')
const express = require('express')
const Pool = require('pg').Pool
const sendRequest = require('./request').sendRequest
const app = express()
var fs = require('fs')
var https = require('https')
var privateKey  = fs.readFileSync('sslcert/privkey.pem', 'utf8');
var certificate = fs.readFileSync('sslcert/cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};

// your express configuration here

var httpsServer = https.createServer(credentials, app);


const PORT = 3000
const VIBER_API = '4a4051bb8fe7d12f-c5546735a11b689b-7dbc384f693d817c'
const viberLink = 'https://chatapi.viber.com/pa/get_online'
const setWebhookLink = 'https://chatapi.viber.com/pa/set_webhook'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'phones',
  password: '1111',
  port: 5432,
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/triger', async (req, res) => {
  pool.query(`select phone from phones limit 100;`, async (err, result) => {
    const phones = result.rows.map((value, index) => {
      return value.phone + '='
    })
    const options = {
      method: 'POST',
      headers: {
        'X-Viber-Auth-Token': VIBER_API
      },
      url: viberLink,
      body: {
        ids: phones
      },
      json: true
    }
    // for (let i = 0; i < 100; i++) {
      await sendRequest(options)
    //}
  })
})
app.post('/file', (req, res) => {

})

httpsServer.listen(PORT, async () => {
  const options = {
    method: 'POST',
      headers: {
        'X-Viber-Auth-Token': VIBER_API
      },
      url: setWebhookLink,
      body: {
        url: "https://localhost:3000",
        event_types: [
          "delivered",
          "seen",
          "failed",
          "subscribed",
          "unsubscribed",
          "conversation_started"
        ],
        send_name: true,
        send_photo: true
      },
      json: true
  }
  await sendRequest(options)
  console.log(`Server running http://localhost:${PORT}`)
})

const es = require('event-stream');

var lineNr = 0;

// var s = fs.createReadStream('050.txt')
//     .pipe(es.split())
//     .pipe(es.mapSync(async function(line){

//         // pause the readstream
//         s.pause();

//         lineNr += 1;
//         line = line.replace(/\s/g, '')
//         const p = new Promise((resolve, reject) => {
//           pool.query(`insert into phones(phone) values (${line});`, (error, results) => {
//             if (error) reject(error)
//             console.log(lineNr, results.rows)
//             resolve(results)
//           })
//         })
//         try {
//           await p
//         } catch(err){
//           console.log(err)
//         }

//         // process line here and call s.resume() when rdy
//         // function below was for logging memory usage
//         //logMemoryUsage(lineNr);

//         // resume the readstream, possibly from a callback
//         s.resume();
//     })
//     .on('error', function(err){
//         console.log('Error while reading file.', err);
//     })
//     .on('end', function(){
//         console.log('Read entire file.')
//     })
// );


