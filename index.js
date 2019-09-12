'use strict'

const bodyParser = require('body-parser')
const express = require('express')
const busboy = require('connect-busboy')
const es = require('event-stream')
const socket = require('./modules/socket')
require('dotenv').config()
const sendRequest = require('./request').sendRequest
const app = express()
var fs = require('fs')
var https = require('https')
const { fork } = require('child_process')
var privateKey  = fs.readFileSync('sslcert/privkey.pem')
var certificate = fs.readFileSync('sslcert/cert.pem')
var ca = fs.readFileSync('sslcert/chain.pem')

var credentials = {key: privateKey, cert: certificate, ca: ca}

var httpsServer = https.createServer(credentials, app)

const port = process.env.PORT
const host = process.env.HOST
const externalHost = process.env.EXTERNAL_HOST
const VIBER_API_TOKEN = process.env.VIBER_API_TOKEN
const setWebhookLink = 'https://chatapi.viber.com/pa/set_webhook'

const db = require('./modules/db')

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

// app.get('/check/viber/stop', async (req, res) => {
  
//   checker.kill('SIGTERM')
//   res.status(200).end('response')
// })

app.post('/check/viber/start/:limit/:delay', async (req, res) => {
  const checker = fork('./processes/checker.js')
  const limit = req.params.limit
  const delay = req.params.delay

  checker.on('message', msg => {
    console.log('Main thread got from child: ' + msg)
    if (msg === 'finished') res.status(200)
    if (msg.indexOf('viber-all-count') !== -1) socket.emit('viber-all-count', msg.substr(16))
    if (msg.indexOf('viber-valid-count') !== -1) socket.emit('viber-valid-count', msg.substr(18))
    if (msg.indexOf('viber-check-error') !== -1) socket.emit('viber-check-error', msg.substr(18))
  })

  checker.send(`start limit=${limit} delay=${delay}`)
})

app.get('/main', (_req, res) => {
  res.sendFile(__dirname + '/views/main.html')
})

app.get('/files', async (req, res) => {
  const files = fs.readdirSync(__dirname + '/files')
  const checkedCount = (await db.query('SELECT COUNT(*) FROM phones WHERE valid IS NOT NULL;')).rows[0].count
  socket.emit('viber-all-count', checkedCount)
  socket.emit('file-to-parse', files[0])
  const result = files.map((value) => {
    return {
      file_name: value.substring(0, value.indexOf('_')) + '.txt',
      file_size: value.substring(value.indexOf('_') + 1, value.indexOf('bytes'))
    }
  })
  return res.status(200).json(result)
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
      if (phone.length === 0) {
        return s.emit('end')
      }
      const p = new Promise((resolve, reject) => {
        db.query(`insert into phones(phone) values (${phone}) on conflict (phone) do nothing;`, (error, results) => {
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
    const f = filename.substring(0, filename.indexOf('.'))
    const s = filename.substr(filename.indexOf('.'))
    const fileName = f + '_' + req.busboy.opts.headers['content-length'] + 'bytes' + s
    fstream = fs.createWriteStream(__dirname + '/files/' + fileName)
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
        url: `https://${externalHost}:${port}/webhook`
      },
      json: true
  }
  await sendRequest(options)
  res.send('ok')
})

httpsServer.listen(port, host, async () => {
  console.log(`Server running https://${externalHost}:${port}`)
})

socket.listen(httpsServer)


