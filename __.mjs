import {FwdScheduler} from "./dist/fwd/core/FwdScheduler";

console.log(fwd);

fwd.onStart = () => {

  console.log(new FwdScheduler())
}
