import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { JsResolver } from '../construct/js-resolver';

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class AppsyncJsResolverCdkSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // appsync api
    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'sample_js_resolver_cdk',
      schema: appsync.SchemaFile.fromAsset('./lib/schema.graphql')
    });

    // iam role for http datasource
    const httpDsRole = new iam.Role(this, 'sample_httpDS_IoTEvents_role', {
      roleName: 'sample_httpDS_IoTEvents_role',
      assumedBy: new iam.ServicePrincipal('appsync.amazonaws.com'),
      inlinePolicies: {
        sampleHttpDSIoTEventsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'iotevents:ListDetectors',
                'iotevents:DescribeDetector',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // httpデータソース
    const dataSource = api.addHttpDataSource('httpDS_IoTEvents', 'https://data.iotevents.ap-northeast-1.amazonaws.com', {
      name: 'httpDS_IoTEvents',
      description: 'http data source for IoT Events Data',
      authorizationConfig: {
        signingRegion: 'ap-northeast-1',
        signingServiceName: 'ioteventsdata',
      },
      // serviceRoleArn: httpDsRole.roleArn, // CDKでは指定出来ないので後で書き換える
    });
    // httpデータソースのIAMロールを書き換える
    dataSource.ds.serviceRoleArn = httpDsRole.roleArn;

    // JS Resolver
    const jsResolver = new JsResolver(this, 'getTaskList_js_resolver', {
      typeName: 'Query',
      fieldName: 'getTaskList',
      dataSource,
      source: path.join(__dirname, "functionSource/getTaskList.ts"),
    });
  }
}
