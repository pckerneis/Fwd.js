export const mockScheduler = jest.fn().mockImplementation(() => {
  return {
    clock: jest.fn(),
    now: jest.fn(),
    schedule: jest.fn(),
    scheduleNow: jest.fn(),
    scheduleAhead: jest.fn(),
  };
});

export const mockError = jest.fn();

export const mockEditor = jest.fn().mockImplementation(() => ({
  root: {
    htmlElement: {},
  },
}));

export const mockFwd = jest.fn().mockImplementation(() => {
  return {
    err: mockError,
    scheduler: mockScheduler(),
    editor: mockEditor(),
  };
});

