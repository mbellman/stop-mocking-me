import * as path from 'path';
import express, { Application as ExpressApplication } from 'express';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MockResponseDefinition {
  path: string;
  status?: number;
  delay?: number;
}

type MockResponseConfiguration = string | MockResponseDefinition;
type ResponseConfigurationMap = Record<RequestMethod, MockResponseConfiguration>;
type ResponseDefinitionMap = Record<RequestMethod, MockResponseDefinition>;

interface MockRoute {
  endpoint: string;
  responses: ResponseDefinitionMap;
}

interface MockServerOptions {
  disableCaching?: boolean;
}

interface MockServerConfiguration {
  routes: MockRoute[];
  options: MockServerOptions;
}

/**
 * @internal
 */
const CURRENT_WORKING_DIRECTORY = process.cwd();

/**
 * @internal
 */
function log(message) {
  console.log(`${chalk.green('[Stop Mocking Me]')} ${message}`);
}

/**
 * @internal
 */
function warn(message) {
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
 * Normalizes a mock response configuration into a mock response definition.
 *
 * @internal
 */
function getMockResponseDefinition(configuration: MockResponseConfiguration): MockResponseDefinition {
  const {
    path = configuration as string,
    status = 200,
    delay = 0
  } = configuration as MockResponseDefinition;

  return {
    path,
    status,
    delay
  };
}

/**
 * Converts a response configuration map to a response definition map,
 * with each definition path as the absolute path to the mock resource.
 *
 * @internal
 */
function createResponseDefinitionMap(responses: ResponseConfigurationMap): ResponseDefinitionMap {
  return Object.keys(responses).reduce((acc: ResponseDefinitionMap, requestMethod: RequestMethod) => {
    const mockResponseConfiguration = responses[requestMethod];
    const { path: responsePath, status, delay } = getMockResponseDefinition(mockResponseConfiguration);

    acc[requestMethod] = {
      path: path.resolve(CURRENT_WORKING_DIRECTORY, responsePath),
      status,
      delay
    };

    return acc;
  }, {} as ResponseDefinitionMap);
}

/**
 * Creates a route handler for a single mock route, using a provided
 * Express application.
 *
 * @internal
 */
function createMockRoute({ endpoint, responses }: MockRoute, app: ExpressApplication, options: MockServerOptions): void {
  const responseDefinitions = createResponseDefinitionMap(responses);
  const supportedRequestMethods = Object.keys(responseDefinitions);

  app.use(endpoint, async (req, res, next) => {
    const response = responseDefinitions[req.method as RequestMethod];

    if (!response) {
      warn(`Unsupported ${chalk.red(req.method)} call to endpoint: '${chalk.blue(endpoint)}' (supported: ${chalk.yellow(supportedRequestMethods.join(', '))})`);
      next();

      return;
    }

    if (options.disableCaching) {
      bustModuleCache(response.path);
    }

    const { status, delay } = response;
    const responseBody = require(response.path);

    // Tentatively set the response status so it can still be
    // optionally overridden by custom response middleware
    res.status(status);

    const finalResponseBody = typeof responseBody === 'function'
      ? await responseBody(req, res)
      : responseBody;

    log(`${chalk.yellow(req.method)} request made to endpoint '${chalk.blue(endpoint)}' (status: ${res.statusCode})`);

    setTimeout(() => res.send(finalResponseBody), delay);
  });
}

export function createMockServer(app: ExpressApplication, config: MockServerConfiguration): void {
  app.use(express.json());
  app.use(cookieParser());

  const { routes = [], options = {} } = config;

  for (const route of routes) {
    createMockRoute(route, app, options);
  }

  console.log('\n');

  log('Mock routes created!');

  if (options.disableCaching) {
    log('Mock data caching disabled. You can edit and save your mock responses on the fly!');
  }
}
