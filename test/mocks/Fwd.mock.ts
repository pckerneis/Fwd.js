
export const mockScheduler = jest.fn().mockImplementation(() => {
  return {
    clockFunction: jest.fn(),
  };
});

export const mockError = jest.fn();

export const mockFwd = jest.fn().mockImplementation(() => {
  return {
    err: mockError,
    scheduler: mockScheduler(),
    performanceListeners: [],
    now: jest.fn(),
  };
});

