import { FwdLogger } from '../core/FwdLogger';

export default interface FwdRunner {
  entryPoint: Function;
  actions: string[];
  logger: FwdLogger;
  sketchModule: any;
}
