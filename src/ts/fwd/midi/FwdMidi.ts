type DOMString = string;

enum MIDIPortType {
  "input",
  "output",
};

enum MIDIPortDeviceState {
  "disconnected",
  "connected",
};

enum MIDIPortConnectionState {
  "open",
  "closed",
  "pending",
};

interface MIDIPort {
  readonly id: DOMString;
  readonly manufacturer?: DOMString;
  readonly name?: DOMString;
  readonly type: MIDIPortType;
  readonly version?: DOMString;
  readonly state: MIDIPortDeviceState;
  readonly connection: MIDIPortConnectionState;
  onstatechange: Function;

  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

export interface MIDIInput extends MIDIPort {
  onmidimessage: Function;
}

export interface MIDIOutput extends MIDIPort {
  onmidimessage: Function;
}

interface ReadonlyDeviceMap<T, K> {
  readonly size: number;
  
  entries(): Iterator<T>;
  forEach(callback: (item: T) => void, thisArg?: any): void;
  get(key: K): T;
  has(key: K): boolean;
  keys(): K[];
  values(): T[];
}

type MIDIInputMap = ReadonlyDeviceMap<MIDIInput, DOMString>;
type MIDIOutputMap = ReadonlyDeviceMap<MIDIOutput, DOMString>;

export interface MIDIAccess {
  readonly inputs: MIDIInputMap;
  readonly outputs: MIDIOutputMap;
  readonly sysexEnabled: boolean

  onstatechange: any;
}

export function requestMIDIAccess(): Promise<MIDIAccess> {
  return (navigator as any).requestMIDIAccess();
}