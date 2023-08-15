import { Construct } from 'constructs'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import { buildSync } from 'esbuild'

export interface JsResolverProps {
  dataSource: appsync.BaseDataSource // AppSyncのデータソース
  typeName: 'Query' | 'Mutation'
  fieldName: string // AppSyncのスキーマのフィールド名
  source: string // AppSyncの関数定義のソースコード(TS)
}

export class JsResolver extends Construct {
  public readonly resolver: appsync.Resolver

  constructor(scope: Construct, id: string, props: JsResolverProps) {
    super(scope, id)

    // データソースからAPIを取得
    const api = appsync.GraphqlApi.fromGraphqlApiAttributes(this, 'GraphqlApi', {
      graphqlApiId: props.dataSource.ds.apiId,
    })

    // 関数のソースコード(TS)をJSにビルド
    const buildResult = buildSync({
      entryPoints: [props.source],
      bundle: true,
      write: false,
      external: ['@aws-appsync/utils'],
      format: 'esm',
      target: 'es2022',
      sourcemap: 'inline',
      sourcesContent: false,
    })

    if (buildResult.errors.length > 0) {
      throw new Error(`Failed to build ${props.source}: ${buildResult.errors[0].text}`)
    }
    if (buildResult.outputFiles.length === 0) {
      throw new Error(`Failed to build ${props.source}: no output files`)
    }

    // ビルドしたJSをAppSyncの関数として登録
    const runtime = appsync.FunctionRuntime.JS_1_0_0
    const func = new appsync.AppsyncFunction(this, 'Func', {
      api,
      dataSource: props.dataSource,
      name: props.fieldName + props.typeName,
      code: appsync.Code.fromInline(buildResult.outputFiles[0].text),
      runtime,
    })

    // pipeline resolverを作成し、関数を登録
    this.resolver = new appsync.Resolver(this, 'Resolver', {
      api,
      typeName: props.typeName,
      fieldName: props.fieldName,
      pipelineConfig: [func],
      // prettier-ignore
      code: appsync.Code.fromInline(
        [
          'export function request(ctx)  { return {} }',
          'export function response(ctx) { return ctx.prev.result }'
        ].join('\n')
      ),
      runtime,
    })
  }
}