import { convertAppSyncSchemas } from 'appsync-schema-converter';
import fs from 'fs';
import globby from 'globby';
import { parse } from 'graphql';
import { validateSDL } from 'graphql/validation/validate';
import { flatten } from 'lodash';
import path from 'path';
import ServerlessError from 'serverless/lib/serverless-error';
import { CfnResources } from '../types/cloudFormation';
import { Api } from './Api';

const AWS_TYPES = `
directive @aws_iam on FIELD_DEFINITION | OBJECT
directive @aws_oidc on FIELD_DEFINITION | OBJECT
directive @aws_api_key on FIELD_DEFINITION | OBJECT
directive @aws_lambda on FIELD_DEFINITION | OBJECT
directive @aws_auth(cognito_groups: [String]) on FIELD_DEFINITION | OBJECT
directive @aws_cognito_user_pools(
  cognito_groups: [String]
) on FIELD_DEFINITION | OBJECT
directive @aws_subscribe(mutations: [String]) on FIELD_DEFINITION
scalar AWSDate
scalar AWSTime
scalar AWSDateTime
scalar AWSTimestamp
scalar AWSEmail
scalar AWSJSON
scalar AWSURL
scalar AWSPhone
scalar AWSIPAddress
`;

export class Schema {
  constructor(private api: Api, private schemas: string[]) {}

  compile(): CfnResources {
    const logicalId = this.api.naming.getSchemaLogicalId();

    return {
      [logicalId]: {
        Type: 'AWS::AppSync::GraphQLSchema',
        Properties: {
          Definition: this.generateSchema(),
          ApiId: this.api.getApiId(),
        },
      },
    };
  }

  valdiateSchema(schema: string) {
    const errors = validateSDL(parse(schema));
    if (errors.length > 0) {
      throw new ServerlessError(
        'Invalid GraphQL schema:\n' +
          errors.map((error) => `     ${error.message}`).join('\n'),
      );
    }
  }

  generateSchema() {
    const schemaFiles = flatten(globby.sync(this.schemas));

    const schemas = schemaFiles.map((file) => {
      return fs.readFileSync(
        path.join(this.api.plugin.serverless.config.servicePath, file),
        'utf8',
      );
    });

    this.valdiateSchema(AWS_TYPES + '\n' + schemas.join('\n'));

    return convertAppSyncSchemas(schemas);
  }
}
