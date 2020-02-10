# stop-mocking-me
Mock your services.

## Usage examples

`mock-routes.js`
```
module.exports = [
  {
    endpoint: '/api/user',
    responses: {
      GET: './mocks/api/user.json'
    }
  },
  {
    endpoint: '/api/account',
    responses: {
      GET: './mocks/api/account-get.json',
      POST: './mocks/api/account-update.json
    }
  },
  {
    endpoint: '/api/page',
    responses: {
      GET: {
        path: './mocks/api/page.js',
        delay: 500,
        status: 200
      }
    }
  }
];
```

`mocks/api/page.js`
```
module.exports = (req, res) => {
  // ...
};
```

`server.js`
```
const express = require('express');
const app = express();

// Just pass any valid express app and your routes/options.
createMockServer(app, {
  routes: require('./mock-routes'),
  options: {
    disableCaching: true
  }
});
```

## API

#### `createMockServer(app: Express.Application, config: Configuration);`

```
interface Configuration {
  routes: Route[];
  options: {
    disableCaching: boolean;
  }
};

interface Route {
  endpoint: string;
  responses: {
    ['GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE']: string | RouteConfiguration;
  }
};

interface RouteConfiguration {
  path: string;
  delay: number;
  status: number;
};
```