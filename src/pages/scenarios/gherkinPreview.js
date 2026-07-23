// Builds a client-side Gherkin preview from a scenario's real apiTestData.
// Pure, no side effects — consumed by the Steps tab for display only, never sent anywhere.

const keyword = (text) => ({ cls: 'gk', text });
const value = (text) => ({ cls: 'gv', text });
const placeholder = (text) => ({ cls: 'gp', text });
const comment = (text) => ({ cls: 'gc', text });
const plain = (text) => ({ cls: '', text });

export function buildGherkinLines(scenario) {
  if (!scenario) return [];

  const atd = scenario.apiTestData || {};
  const method = scenario.httpMethod || atd.endpoint?.httpMethod || 'GET';
  const path = scenario.endpoint || atd.endpoint?.path || '';
  const headers = atd.headers && typeof atd.headers === 'object' ? atd.headers : {};
  const pathOrQueryParams = atd.pathOrQueryParams && typeof atd.pathOrQueryParams === 'object' ? atd.pathOrQueryParams : {};
  const requestBodyValues = atd.requestBodyValues && typeof atd.requestBodyValues === 'object' ? atd.requestBodyValues : null;
  const expectedStatusCode = atd.expectedStatusCode;
  const expectedResponseBody = atd.expectedResponseBody;

  const lines = [];
  lines.push([keyword('Scenario:'), plain(` ${scenario.name || 'Untitled scenario'}`)]);

  if (path) {
    lines.push([keyword('Given'), plain(' the API endpoint '), value(`${method} ${path}`), plain(' is available')]);
  } else {
    lines.push([comment('# No endpoint captured for this scenario')]);
  }

  Object.keys(headers).forEach((name) => {
    lines.push([keyword('And'), plain(' the request header '), value(`"${name}"`), plain(' is set to '), placeholder(String(headers[name]))]);
  });

  Object.keys(pathOrQueryParams).forEach((name) => {
    lines.push([keyword('And'), plain(' the path/query parameter '), value(`"${name}"`), plain(' is set to '), placeholder(String(pathOrQueryParams[name]))]);
  });

  if (requestBodyValues) {
    Object.keys(requestBodyValues).forEach((name) => {
      lines.push([keyword('And'), plain(' the request body field '), value(`"${name}"`), plain(' is set to '), placeholder(String(requestBodyValues[name]))]);
    });
  }

  lines.push([keyword('When'), plain(' the request is sent')]);

  if (expectedStatusCode != null && expectedStatusCode !== '') {
    lines.push([keyword('Then'), plain(' the response status code should be '), value(String(expectedStatusCode))]);
  }
  if (expectedResponseBody) {
    lines.push([keyword('And'), plain(' the response body should contain '), value(String(expectedResponseBody))]);
  }
  if ((expectedStatusCode == null || expectedStatusCode === '') && !expectedResponseBody) {
    lines.push([comment('# No expected status code or response body captured for this scenario')]);
  }

  return lines;
}
