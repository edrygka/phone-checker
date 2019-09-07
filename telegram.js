'use strict'

const express = require('express');
const app = express();

app.use((req, res) => {
  console.log(`${req.method}: ${req.url}`);
  res.send('OK');
});

app.listen(8000, '0.0.0.0', () => {
  console.log('Listen on *:8000');
});