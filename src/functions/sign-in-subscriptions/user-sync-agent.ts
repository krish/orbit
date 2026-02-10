import middy from '@middy/core';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import {findUserOrSave} from '@functions/me/user-service';
import {logger} from '@libs/logger-service';

const profile = async (event, context) => {
  process.env.postgresdb_hostname = context.hostname;
  process.env.postgresdb_password = context.password;

  //const username: string = event.requestContext.authorizer.username;

  for (let element of event.Records) {
    let message = JSON.parse(element.Sns.Message);
    logger.debug(message, ' event message');
    let username: string = message?.request?.userAttributes?.email;
    let cognitoId: string = message?.userName;
    let name: string = `${message?.request?.userAttributes?.name} ${message?.request?.userAttributes?.family_name}`;
    await findUserOrSave(username, cognitoId, name).catch((e) => {
      logger.error(e, 'user find or save failed');
    });
  }

  return;
};

export const main = middy(profile)
  .use(middyJsonBodyParser())
  .use(
    ssm({
      fetchData: {
        hostname: `/codelabs/${process.env.STAGE}/auth-service/database/pg/hostname`,
        password: `/codelabs/${process.env.STAGE}/auth-service/database/pg/password`,
      },
      setToContext: true,
      cacheExpiry: 60 * 60 * 1000, //though it set to 60 max time would be container time
      cacheKey: 'codelabs-ssm-authservice',
    }),
  );
