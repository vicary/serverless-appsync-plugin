import { convertAppSyncSchemas } from 'appsync-schema-converter';
import fs from 'fs';
import globby from 'globby';
import path from 'path';
import { type CfnResources } from '../types/cloudFormation';
import { Api } from './Api';

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

  generateSchema() {
    const schemas = globby
      .sync(this.schemas)
      .flat(Infinity)
      .map((file) => {
        return fs.readFileSync(
          path.join(this.api.plugin.serverless.config.servicePath, file),
          'utf8',
        );
      });

    return convertAppSyncSchemas(schemas);
  }
}
