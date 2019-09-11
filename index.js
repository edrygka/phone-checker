'use strict'

const bodyParser = require('body-parser')
const express = require('express')
const busboy = require('connect-busboy')
const es = require('event-stream')
const io = require('socket.io')
const socket = io()
require('dotenv').config()
const Pool = require('pg').Pool
const sendRequest = require('./request').sendRequest
const app = express()
var fs = require('fs')
var https = require('https')
var privateKey  = fs.readFileSync('sslcert/privkey.pem')
var certificate = fs.readFileSync('sslcert/cert.pem')
var ca = fs.readFileSync('sslcert/chain.pem')

var credentials = {key: privateKey, cert: certificate, ca: ca}

var httpsServer = https.createServer(credentials, app)

const port = process.env.PORT
const host = process.env.HOST
const VIBER_API_TOKEN = process.env.VIBER_API_TOKEN
const viberLink = 'https://chatapi.viber.com/pa/get_online'
const setWebhookLink = 'https://chatapi.viber.com/pa/set_webhook'

const pool = new Pool({
  user: process.env.USER_DB,
  host: process.env.HOST_DB,
  database: process.env.NAME_DB,
  password: process.env.PASSWORD_DB,
  port: process.env.PORT_DB,
})

app.use(busboy())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('views'))

app.get('/webhook', (req, res) => {
  res.status(200).end('test viber api server')
})

app.post('/webhook', (req, res) => {
  res.status(200).end()
})

app.get('/', (req, res) => {
  res.redirect('/main')
})

app.get('/check/viber', async (req, res) => {
  pool.query(`select phone from phones limit 100;`, async (err, result) => {
    const phones = result.rows.map((value, index) => {
      return value.phone + '='
    })
    const options = {
      method: 'POST',
      headers: {
        'X-Viber-Auth-Token': VIBER_API_TOKEN
      },
      url: viberLink,
      body: {
        ids: phones
      },
      json: true
    }
    // for (let i = 0; i < 100; i++) {
      const response = await sendRequest(options)
    //}
    res.status(200).end(response)
  })
})

app.get('/main', (_req, res) => {
  res.sendFile(__dirname + '/views/main.html')
})

app.post('/file/parse', (req, res) => {
  const files = fs.readdirSync(__dirname + '/files')
  var lineNr = 0
  var s = fs.createReadStream('files/' + files[0])
    .pipe(es.split())
    .pipe(es.mapSync(async function(line){
      // pause the readstream
      s.pause()

      lineNr += 1
      const phone = line.replace(/\s/g, '')
      const p = new Promise((resolve, reject) => {
        pool.query(`insert into phones(phone) values (${phone}) on conflict (phone) do nothing;`, (error, results) => {
          if (error) reject(error)

          resolve(results)
        })
      })
      try {
        await p
      } catch(err){
        console.log(err)

        return res.send({
          status: 1,
          message: err.message
        })
      }
      socket.emit('parsing-status', lineNr)

      s.resume()
    })
    .on('error', function(err){
        console.log('Error while reading file.', err)
        return res.send({
          status: 1,
          message: err.message
        })
    })
    .on('end', function(){
        console.log('Read entire file.')
        return res.send({
          status: 0
        })
    }))
})

app.post('/file/upload', (req, res) => {
  var fstream
  req.pipe(req.busboy)
  req.busboy.on('file', function (_fieldname, file, filename) {
    console.log("Uploading: " + filename)
    fstream = fs.createWriteStream(__dirname + '/files/' + filename)
    file.pipe(fstream)
    fstream.on('close', function () {
      console.log('File uploaded')
      res.send({
        file_size: req.busboy.opts.headers['content-length']
      })
    })
  })
})

app.get('/turn', async (req, res) => {
  const options = {
    method: 'POST',
      headers: {
        'X-Viber-Auth-Token': VIBER_API_TOKEN
      },
      url: setWebhookLink,
      body: {
        url: `https://${host}:${port}/webhook`
      },
      json: true
  }
  await sendRequest(options)
  res.send('ok')
})

httpsServer.listen(port, host, async () => {
  console.log(`Server running https://${host}:${port}`)
})

socket.listen(httpsServer)


