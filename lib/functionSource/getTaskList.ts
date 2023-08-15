import { util, Context, HTTPRequest, } from '@aws-appsync/utils'
import { ListDetectorsResponse, DetectorSummary } from '@aws-sdk/client-iot-events-data'

export function request(ctx: Context): HTTPRequest {
  return {
    method: "GET",
    resourcePath: "/detectors/sample_task_detector_model",
    params: {
      headers: {
        "Content-Type": "application/json"
      },
      query: {},
      body: JSON.stringify({})
    }
  }
}

export function response(ctx: Context): any {
  const { error, result, stash } = ctx;

  if (error) {
    stash.errors = stash.errors ?? [];
    stash.errors.push(error);
    return util.appendError(error.message, error.type, result);
  }
  if (result.statusCode != 200) {
    return util.appendError(result.body, result.statusCode, result);
  }

  const body = JSON.parse(result.body) as ListDetectorsResponse;
  return body.detectorSummaries?.map((d: DetectorSummary) => {
    return {
      id: d.keyValue,
      done: (d.state?.stateName == 'done')
    }
  });

}