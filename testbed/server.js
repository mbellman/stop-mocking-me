const path = require('path');
const express = require('express');
const { createMockServer } = require('../lib');
const app = express();

const routes = {
  '/message': {
    GET: './mock-services/getMessage.js',
    POST: './mock-services/postMessage.js'
  },
  '/data': {
    GET: './mock-services/data.json',
    POST: {
      serve: './mock-services/data.json',
      status: 403,
      delay: 500
    }
  },
  '/res': {
    POST: './mock-services/res.js'
  },
  '/async': {
    GET: './mock-services/async.js'
  },
  '/cache': {
    GET: './mock-services/cache.js'
  }
};

app.get('/demo', (_, res) => {
  res.sendFile(path.resolve('./testbed/index.html'));
});

app.listen(1234, () => {
  console.log('http://localhost:1234/demo');

  createMockServer(app, routes);
});
