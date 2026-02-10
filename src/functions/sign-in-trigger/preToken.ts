import {middyfy} from '@libs/lambda';
import {logger} from '@libs/logger-service';
import * as AWS from 'aws-sdk';
const sns = new AWS.SNS();
const pretoken = async (event) => {
  logger.info('pretoken lamda triggered');

  //publish message to SNS so it can fetch data.

  let params = {
    Message: JSON.stringify(event, null, 2),
    Subject: 'new user signed in',
    TopicArn: process.env.SNS_SIGNIN_TOPIC,
  };
  const snsResults = await sns
    .publish(params)
    .promise()
    .then((resp) => logger.info(resp, 'message successfully published to sns'))
    .catch((e) => logger.error(e, ' error on publish to SNS'));

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        type: 'message',
        message: JSON.stringify(snsResults),
      },
    },
  };

  logger.info(event);
  return event;
};
export const main = middyfy(pretoken);
