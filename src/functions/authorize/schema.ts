export default {
  type: 'object',
  properties: {
    refreshToken: {type: 'string', minLength: 10},
  },
  required: ['refreshToken'],
} as const;
