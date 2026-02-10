export default {
  type: 'object',
  properties: {
    clientId: {type: 'string', minLength: 5},
    clientSecret: {type: 'string', minLength: 5},
    username: {type: 'string', minLength: 5},
    password: {type: 'string', minLength: 5},
  },
  required: ['clientId', 'clientSecret', 'username', 'password'],
} as const;
