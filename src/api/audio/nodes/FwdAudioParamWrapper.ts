import { Logger, LoggerLevel } from '../../../utils/Logger';
import { Time } from '../../core/EventQueue/EventQueue';
import { FwdAudio } from '../FwdAudio';
import parentLogger from '../logger.audio';

const DBG = new Logger('FwdAudioParamWrapper', parentLogger, LoggerLevel.error);

interface LinearRamp {
  startTime: number,
  startValue: number,
  endTime: number,
  endValue: number,
}

export class FwdAudioParamWrapper {
  private _latestRamp: LinearRamp;

  constructor(readonly fwdAudio: FwdAudio, private _param: AudioParam) {
  }

  public get nativeParam(): AudioParam {
    return this._param;
  }

  /**
   * Sets the value at the current FwdScheduler's time position.
   * @param newValue the value the param should take. This value is not checked against the validity range of the underlying
   * AudioParam.
   */
  public set value(newValue: number) {
    // Still process the event as a ramp to have a consistent 'getValueAtTime' behaviour.
    this.rampTo(newValue, 0);
  }

  /**
   * Gets the value at the current audio context time.
   */
  // TODO: should we take into account the currently scheduled ramps like in 'getValueAtTime' ?
  public get value(): number {
    return this._param.value
  }

  /**
   * Starts a ramp from the FWD scheduler's time position to a time position in the future (current time + rampTime).
   * This is a deferred action: the automation will be effectively scheduled 'later', based on the FwdScheduler's settings.
   *
   * @param value the target value
   * @param rampTime the duration for the ramp
   */
  public rampTo(value: number, rampTime: number): void {
    const audioNow = this.fwdAudio.now();
    const holdValue = this.cancelAndHoldAtTime(audioNow);
    this._param.linearRampToValueAtTime(value, audioNow + rampTime);

    this.registerRamp(holdValue, audioNow, value, audioNow + rampTime);
  }

  private cancelAndHoldAtTime(when: Time): number {
    const holdValue = this.getValueAtTime(when);
    DBG.debug('holdValue : ' + holdValue);
    this._param.setValueAtTime(holdValue, when);
    return holdValue;
  }

  private registerRamp(startValue: number, startTime: Time, endValue: number, endTime: Time): void {
    this._latestRamp = {
      startTime, startValue, endTime, endValue,
    };
  }

  private getValueAtTime(when: Time): number {
    // If no ramp was ever scheduled, just return the current native AudioParam's value.
    if (this._latestRamp == null) {
      DBG.debug('no ramp');
      return this._param.value;
    }

    if (when < this._latestRamp.startTime) {
      DBG.debug('before');
      return this._latestRamp.startValue;
    } else if (when > this._latestRamp.endTime) {
      DBG.debug('after');
      return this._latestRamp.endValue;
    } else {
      // Linear interpolation
      const t1 = this._latestRamp.startTime;
      const t2 = this._latestRamp.endTime;
      const v1 = this._latestRamp.startValue;
      const v2 = this._latestRamp.endValue;

      if (t1 === t2) {
        return v2;
      }

      const linearInterpolation = ((v1 - v2) / (t1 - t2)) * when + ((t1 * v2 - t2 * v1) / (t1 - t2));
      DBG.debug('linear interp :' + linearInterpolation);
      return linearInterpolation;
    }
  }
}
