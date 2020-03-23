import { FwdLogger } from '../core';

export default interface FwdRunner {
  entryPoint: Function;
  actions: string[];
  logger: FwdLogger;
  sketchModule: any;
}
