export interface PolicyOption {
  region: string;
  apiId: string;
  stage: string;
}
export class Policy {
  principalId: string;
  policyDocument: PolicyDocument;
}
export class PolicyDocument {
  Version: string;
  Statement: Statement[];
}
export class Statement {
  Action: string;
  Effect: string;
  Condition: string[];
  Resource: string[];
}
export class Method {
  conditions: string[];
  resourceArn: string;
}
export class AuthPolicy {
  awsAccountId: string;
  principalId: string;
  apiId: string;
  region: string;
  stage: string;
  version = '2012-10-17';
  apiPathRegex = new RegExp('^[/.a-zA-Z0-9-*]+$');
  allowMethods: Method[] = [];
  denyMethods: Method[] = [];
  singleMethodArnAllow: string; //this is for single method ARN such as websocket
  HttpVerb = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    DELETE: 'DELETE',
    OPTIONS: 'OPTIONS',
    ALL: '*',
  };
  constructor(principalId: string, awsAccountId: string, options) {
    this.awsAccountId = awsAccountId;
    this.principalId = principalId;
    if (!options || !options.apiId) {
      throw new Error('ApiId is missing on the request');
    } else {
      this.apiId = options.apiId;
    }
    if (!options.region) {
      throw new Error('region is missing on the request');
    } else {
      this.region = options.region;
    }
    if (!options.stage) {
      throw new Error('stage is missing on the request');
    } else {
      this.stage = options.stage;
    }
  }
  allowMethod(verb: string, resource: string) {
    this.addMethod('allow', verb, resource, null);
  }
  allowAllMethods() {
    this.addMethod('allow', '*', '*', null);
  }
  denyMethod(verb, resource) {
    this.addMethod('deny', verb, resource, null);
  }
  denyAllMethods() {
    this.addMethod('deny', '*', '*', null);
  }

  allowMethodWithConditions(verb, resource, conditions) {
    this.addMethod('allow', verb, resource, conditions);
  }
  denyMethodWithConditions(verb, resource, conditions) {
    this.addMethod('deny', verb, resource, conditions);
  }
  build() {
    if ((!this.allowMethods || this.allowMethods.length === 0) && (!this.denyMethods || this.denyMethods.length === 0) && !this.singleMethodArnAllow) {
      throw new Error('No statements defined for the policy');
    }

    const policy = new Policy();
    policy.principalId = this.principalId;
    const doc = new PolicyDocument();
    doc.Version = this.version;
    doc.Statement = [];
    if (this.singleMethodArnAllow) {
      doc.Statement = this.generateStatementForSingleMethodArn('Allow', this.singleMethodArnAllow);
    } else {
      if (this.allowMethods.length) doc.Statement = doc.Statement.concat(this.generateStatementsForEffect('Allow', this.allowMethods));
      if (this.denyMethods.length) doc.Statement = doc.Statement.concat(this.generateStatementsForEffect('Deny', this.denyMethods));
    }
    policy.policyDocument = doc;
    return policy;
  }

  generateStatementForSingleMethodArn(effect: string, arn: string): Statement[] {
    let statements: Statement[] = [];
    let statement = this.generateEmptyStatement(effect);
    statement.Resource.push(arn);
    statements.push(statement);
    return statements;
  }

  generateStatementsForEffect(effect: string, methods: Method[]): Statement[] {
    let statements: Statement[] = [];

    if (methods.length > 0) {
      var statement = this.generateEmptyStatement(effect);

      for (var i = 0; i < methods.length; i++) {
        var curMethod = methods[i];

        if (curMethod.conditions === null || curMethod.conditions.length === 0) {
          statement.Resource.push(curMethod.resourceArn);
        } else {
          var conditionalStatement = this.generateEmptyStatement(effect);
          conditionalStatement.Resource.push(curMethod.resourceArn);
          conditionalStatement.Condition = curMethod.conditions;
          statements.push(conditionalStatement);
        }
      }

      if (statement.Resource !== null && statement.Resource.length > 0) {
        statements.push(statement);
      }

      return statements;
    }
  }

  generateEmptyStatement(effect): Statement {
    effect = effect.substring(0, 1).toUpperCase() + effect.substring(1, effect.length).toLowerCase();
    let statement = new Statement();
    statement.Action = 'execute-api:Invoke';
    statement.Effect = effect;
    statement.Resource = [];

    return statement;
  }

  addMethod(effect: string, verb: string, resource: string, conditions) {
    if (verb != '*' && !this.HttpVerb.hasOwnProperty(verb.toUpperCase())) {
      throw new Error(`Invalid HTTP verb ${verb}. Allowed verbs  ${JSON.stringify(this.HttpVerb)}`);
    }

    if (!this.apiPathRegex.test(resource)) {
      throw new Error('Invalid resource path: ' + resource + '. Path should match ' + this.apiPathRegex);
    }

    var cleanedResource = resource;
    if (resource.substring(0, 1) == '/') {
      cleanedResource = resource.substring(1, resource.length);
    }
    var resourceArn = 'arn:aws:execute-api:' + this.region + ':' + this.awsAccountId + ':' + this.apiId + '/' + this.stage + '/' + verb + '/' + cleanedResource;

    if (effect.toLowerCase() == 'allow') {
      this.allowMethods.push({
        resourceArn: resourceArn,
        conditions: conditions,
      });
    } else if (effect.toLowerCase() == 'deny') {
      this.denyMethods.push({
        resourceArn: resourceArn,
        conditions: conditions,
      });
    } else {
      this.denyMethods.push({
        resourceArn: resourceArn,
        conditions: conditions,
      });
    }
  }
}
