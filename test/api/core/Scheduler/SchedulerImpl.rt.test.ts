import { SchedulerImpl } from "../../../../src/api/core/Scheduler/SchedulerImpl";
import { Logger, LoggerLevel } from "../../../../src/utils/Logger";
import { seconds } from "../../../test-utils";

Logger.runtimeLevel = LoggerLevel.none;

describe('SchedulerImpl real time', () => {
  it ('starts counting time', async () => {
    const scheduler = new SchedulerImpl(1, 3);
    expect(scheduler.now()).toBe(0);
    scheduler.start(0);

    await seconds(0.001);

    expect(scheduler.now()).toBeGreaterThan(0);
    expect(scheduler.now()).toBeLessThan(0.010);
  });
});
