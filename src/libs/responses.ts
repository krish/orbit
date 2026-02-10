export const successResponse = (response: Record<string, unknown> | {}) => {
  return {
    statusCode: 200,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};
export const acceptedResponse = (response: Record<string, unknown> | {}) => {
  return {
    statusCode: 202,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};

export const clientErrorResponse = (response: Record<string, unknown>) => {
  return {
    statusCode: 400,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};

export const serverErrorResponse = (response: Record<string, unknown> | {}) => {
  return {
    statusCode: 500,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};
export const forbiddenResponse = (response: Record<string, unknown>) => {
  return {
    statusCode: 403,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};
export const unauthorizedResponse = (response: Record<string, unknown>) => {
  return {
    statusCode: 401,
    headers: {
      'X-Requested-With': '*',
      'Access-Control-Allow-Headers': 'Accept,Content-Type,Content-Length,x-api-key',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    },
    isBase64Encoded: false,
    body: JSON.stringify(response),
  };
};
