import * as path from 'path';
import express, { Application as ExpressApplication } from 'express';
import chalk from 'chalk';

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
  console.log(`${chalk.green('[SMM]')} ${message}`);
}

/**
 * @internal
 */
function warn(message) {
  console.log(`${chalk.red('[SMM]')} ${message}`);
}

/**
 * Cleares the require cache for a specific mock response.
 *
 * @internal
 */
function bustCachedMockResponse(responsePath: string): void {
  delete require.cache[require.resolve(responsePath)];
}

/**
 * Converts a mock response configuration into a mock response definition.
 *
 * @internal
 */
function getMockResponseDefinition(definition: MockResponseConfiguration): MockResponseDefinition {
  const {
    path = definition as string,
    status = 200,
    delay = 0
  } = definition as MockResponseDefinition;

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

  app.use(endpoint, (req, res) => {
    const response = responseDefinitions[req.method as RequestMethod];

    if (!response) {
      warn(`Unsupported ${chalk.red(req.method)} call to endpoint: '${chalk.blue(endpoint)}' (supported: ${chalk.yellow(supportedRequestMethods.join(', '))})`);

      return;
    }

    if (options.disableCaching) {
      bustCachedMockResponse(response.path);
    }

    const { status, delay } = response;
    const responseBody = require(response.path);

    const finalResponseBody = typeof responseBody === 'function'
      ? responseBody(req)
      : responseBody;

    log(`${chalk.yellow(req.method)} request made to endpoint '${chalk.blue(endpoint)}' (status: ${status})`);

    setTimeout(() => res.status(status).send(finalResponseBody), delay);
  });
}

export function createMockServer(app: ExpressApplication, config: MockServerConfiguration): void {
  app.use(express.json());

  const { routes = [], options = {} } = config;

  for (const route of routes) {
    createMockRoute(route, app, options);
  }

  log('Mock routes created!');

  if (options.disableCaching) {
    log('Mock data caching disabled. You can edit and save your mock responses on the fly!');
  }
}
