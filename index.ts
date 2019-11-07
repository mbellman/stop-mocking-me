import * as path from 'path';
import express, { Application as ExpressApplication } from 'express';
import chalk from 'chalk';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface IMockResponseDefinition {
	path: string;
	status?: number;
	delay?: number;
}

type ResponseDefinitionMap = Record<RequestMethod, string | IMockResponseDefinition>;

interface IMockRoute {
	endpoint: string;
	responses: ResponseDefinitionMap;
}

interface IMockResponse {
	mock: any;
	status: number;
	delay: number;
}

type ResponseMap = Record<RequestMethod, IMockResponse>;

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
 * Returns a normalized mock response definition either from
 * a response path string, or an already-valid mock response
 * definition.
 *
 * @internal
 */
function normalizeResponseDefinition(definition: string | IMockResponseDefinition): IMockResponseDefinition {
	const {
		path = definition,
		status = 200,
		delay = 0
	} = definition as IMockResponseDefinition;

	return {
		path: path as string,
		status,
		delay
	};
}

/**
 * Converts a response definition map to a mock response map.
 *
 * @internal
 */
function createResponseMap(responses: ResponseDefinitionMap): Record<RequestMethod, IMockResponse> {
	return Object.keys(responses).reduce((acc: ResponseMap, requestMethod: RequestMethod) => {
		const mockResponseDefinition = responses[requestMethod];
		const { path: responsePath, status, delay } = normalizeResponseDefinition(mockResponseDefinition);
		const mock = require(path.resolve(CURRENT_WORKING_DIRECTORY, responsePath));

		acc[requestMethod] = {
			mock,
			status,
			delay
		};

		return acc;
	}, {} as ResponseMap);
}

/**
 * Creates a route handler for a single mock route, using
 * a provided Express application.
 *
 * @internal
 */
function createMockRoute({ endpoint, responses }: IMockRoute, app: ExpressApplication): void {
	const responseMap = createResponseMap(responses);
	const supportedRequestMethods = Object.keys(responseMap);

	app.use(endpoint, (req, res) => {
		const response = responseMap[req.method];

		if (!response) {
			warn(`Unsupported ${chalk.red(req.method)} call to endpoint: '${chalk.blue(endpoint)}' (supported: ${chalk.yellow(supportedRequestMethods.join(', '))})`);

			return;
		}

		const { mock, status, delay } = response;
		const data = typeof mock === 'function' ? mock(req) : mock;

		log(`${chalk.yellow(req.method)} request made to endpoint '${chalk.blue(endpoint)}' (status: ${status})`);

		setTimeout(() => res.status(status).send(data), delay);
	});
}

export function createMockRoutes(mockRoutes: IMockRoute[], app: ExpressApplication): void {
	app.use(express.json());

	for (const route of mockRoutes) {
		createMockRoute(route, app);
	}

	log('Mock routes created!');
}
