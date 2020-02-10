const path = require('path');
const express = require('express');
const { createMockServer } = require('../lib');
const app = express();

const mockRoutes = [
  {
    endpoint: '/message',
    responses: {
      GET: './mock-services/getMessage.js',
      POST: './mock-services/postMessage.js'
    }
  },
  {
    endpoint: '/data',
    responses: {
      GET: './mock-services/data.json',
      POST: {
        path: './mock-services/data.json',
        status: 403,
        delay: 500
      }
    }
  },
  {
    endpoint: '/res',
    responses: {
      POST: './mock-services/res.js'
    }
  },
  {
    endpoint: '/async',
    responses: {
      GET: './mock-services/async.js'
    }
  },
  {
    endpoint: '/cache',
    responses: {
      GET: './mock-services/cache.js'
    }
  }
];

app.get('/demo', (_, res) => {
  res.sendFile(path.resolve('./testbed/index.html'));
});

app.listen(1234, () => {
  console.log('http://localhost:1234/demo');

  createMockServer(app, {
    routes: mockRoutes,
    options: {
      disableCaching: true
    }
  });
});
