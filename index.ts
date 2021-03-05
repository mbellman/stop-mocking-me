import * as path from 'path';
import express, { Application as ExpressApplication, Request, Response } from 'express';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestHandler = (request: Request, response: Response) => any;

interface MockRequestConfig {
  serve: string | RequestHandler;
  status?: number;
  delay?: number;
  cached?: boolean;
}

type MockResponseConfig = Required<MockRequestConfig>;
type MockResponseConfigMap = Record<RequestMethod, MockResponseConfig>;
type MockRouteConfig = Record<RequestMethod, string | RequestHandler | MockRequestConfig>;
type MockRoutesMap = Record<string, MockRouteConfig>;

/**
 * @internal
 */
const CURRENT_WORKING_DIRECTORY = process.cwd();

/**
 * @internal
 */
function log(message: string) {
  console.log(`${chalk.green('[Stop Mocking Me]')} ${message}`);
}

/**
 * @internal
 */
function warn(message: string) {
  console.log(`${chalk.red('[Stop Mocking Me]')} ${message}`);
}

/**
 * Deeply clears the require cache for a specific module.
 *
 * @internal
 */
function bustModuleCache(id: string): void {
  const moduleId = require.resolve(id);
  const { children: modules = [] } = require.cache[moduleId] || {};

  modules.forEach(({ id }) => bustModuleCache(id));

  delete require.cache[moduleId];
}

/**
 * Normalizes a mock route request, which can be a relative path to
 * a mock data file, handler function, or partial configuration, into
 * a mock response config with defaults for omitted options.
 *
 * @internal
 */
function createMockResponseConfig(mockRouteRequest: string | RequestHandler | MockRequestConfig): MockResponseConfig {
  const {
    serve = mockRouteRequest as string | RequestHandler,
    status = 200,
    delay = 0,
    cached = false
  } = mockRouteRequest as MockResponseConfig;

  return {
    serve: typeof serve === 'string'
      ? path.resolve(CURRENT_WORKING_DIRECTORY, serve)
      : serve,
    status,
    delay,
    cached
  };
}

/**
 * Normalizes a mock route configuration, which may contain shorthand
 * or partial mock request configurations, into a response configuration
 * map, which explictly defines response configs for each request method.
 *
 * @internal
 */
function createMockResponseConfigMap(config: MockRouteConfig): MockResponseConfigMap {
  return Object.keys(config).reduce((acc: MockResponseConfigMap, requestMethod: RequestMethod) => {
    const mockRouteRequest = config[requestMethod];

    acc[requestMethod] = createMockResponseConfig(mockRouteRequest);

    return acc;
  }, {} as MockResponseConfigMap);
}

/**
 * Creates a route handler for a single mock route, using a provided
 * Express application.
 *
 * @internal
 */
function createMockRoute(app: ExpressApplication, endpoint: string, routeConfig: MockRouteConfig): void {
  const responseConfigs = createMockResponseConfigMap(routeConfig);
  const supportedRequestMethods = Object.keys(responseConfigs);

  app.use(endpoint, async (req, res, next) => {
    const responseConfig = responseConfigs[req.method as RequestMethod];

    if (!responseConfig) {
      warn(`Unsupported ${chalk.red(req.method)} call to endpoint: '${chalk.blue(endpoint)}' (supported: ${chalk.yellow(supportedRequestMethods.join(', '))})`);
      next();

      return;
    }

    const { cached, delay, serve, status } = responseConfig;

    if (typeof serve === 'string' && !cached) {
      bustModuleCache(serve);
    }

    // If 'serve' is a request handler function, don't do anything
    // with it yet. If otherwise a string, import it.
    const response = typeof serve === 'function'
      ? serve
      : require(serve);

    // Tentatively set the response status so it can still be
    // optionally overridden by custom response middleware
    res.status(status);

    // If 'response' is still a function, invoke it as middleware,
    // passing the Express request/response objects through. Otherwise,
    // treat it as the final response body.
    const responseBody = typeof response === 'function'
      ? await response(req, res)
      : response;

    log(`${chalk.yellow(req.method)} request made to endpoint '${chalk.blue(endpoint)}' (status: ${res.statusCode})`);

    setTimeout(() => res.send(responseBody), delay);
  });
}

export function createMockServer(app: ExpressApplication, routes: MockRoutesMap): void {
  app.use(express.json());
  app.use(cookieParser());

  const routeEntries = Object.entries(routes);

  for (const [ endpoint, routeConfig ] of routeEntries) {
    createMockRoute(app, endpoint, routeConfig);
  }

  console.log('\n');

  log('Mock routes created!');
}
