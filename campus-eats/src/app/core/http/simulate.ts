import { HttpParams } from '@angular/common/http';
import { ParamMap } from '@angular/router';

/** Test switches the API understands: ?delay=3000 and ?fail=true. */
export interface SimulateOptions {
  delay?: string | null;
  fail?: string | null;
}

/** Read ?delay= and ?fail= from the page URL. */
export function simulateFrom(query: ParamMap): SimulateOptions {
  return { delay: query.get('delay'), fail: query.get('fail') };
}

/** Turn the switches into HTTP query params for the API. */
export function simulateParams(options: SimulateOptions = {}): HttpParams {
  let params = new HttpParams();
  if (options.delay) params = params.set('delay', options.delay);
  if (options.fail) params = params.set('fail', options.fail);
  return params;
}
