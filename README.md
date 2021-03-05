# stop-mocking-me
Mock your services.

## Usage examples

`mock-routes.js`
```
module.exports = {
  '/api/user': {
    GET: './mocks/api/user.json'
  },
  '/api/account': {
    GET: './mocks/api/account-get.json',
    POST: './mocks/api/account-update.json
  },
  '/api/page': {
    GET: {
      path: './mocks/api/page.js',
      delay: 500,
      status: 200
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

// Just pass any valid express app and your routes.
createMockServer(app, require('./mock-routes'));
```

## API

#### `createMockServer(app: Express.Application, routes: MockRoutesMap);`

```
type MockRoutesMap = Record<string, MockRouteConfig>;

type MockRouteConfig = Record<RequestMethod, string | RequestHandler | MockRequestConfig>;

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestHandler = (req: Express.Request, res: Express.Response) => any;

interface MockRequestConfig {
  /**
   * A mock data file import path, or a request handler function.
   */
  serve: string | RequestHandler;
  /**
   * An optional response status code. Defaults to 200.
   */
  status?: number;
  /**
   * An optional response delay. Defaults to 0.
   */
  delay?: number;
  /**
   * Determines whether the mock data for a given route/request method
   * is cached, i.e. does not change on file changes. Defaults to false,
   * enabling mock responses to be updated without a dev server restart.
   */
  cached?: boolean;
}
```