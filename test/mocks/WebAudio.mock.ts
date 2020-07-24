import Mock = jest.Mock;

export const mockAudioParam = jest.fn().mockImplementation(() => {
  return {
    value: 42,
    setValueAtTime: jest.fn(),
    cancelAndHoldAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
  };
});

export const mockAudioNode = jest.fn().mockImplementation(() => {
  return {
    channelCount: 1,
    channelCountMode: '',
    channelInterpretation: '',
    context: null,       // We can't use mockAudioContext here because that would lead to a stack overflow
    numberOfInputs: 1,
    numberOfOutputs: 1,
    start: jest.fn(),   // Only for scheduled nodes...
    stop: jest.fn(),    // Only for scheduled nodes...
    connect: jest.fn().mockImplementation(() => {
      return mockAudioNode();
    }),
    disconnect: jest.fn(),
  }
});

export function mockAudioNodeWithAudioParams(...audioParams: string[]): Mock {
  const audioNode = mockAudioNode();

  audioParams.forEach(param => {
    audioNode[param] = mockAudioParam()
  });

  return audioNode;
}

export function createAudioNodeFactoryMock(...audioParams: string[]): Mock {
  const audioNode = mockAudioNodeWithAudioParams(...audioParams);

  return jest.fn().mockImplementation(() => {
    return audioNode;
  });
}

export const mockAudioContext = jest.fn().mockImplementation(() => {
  return {
    currentTime: 42,
    sampleRate: 44000,
    createGain: createAudioNodeFactoryMock('gain'),
    createOscillator: createAudioNodeFactoryMock('frequency'),
    createBufferSource: createAudioNodeFactoryMock(),
    createConstantSource: createAudioNodeFactoryMock(),
    createStereoPanner: createAudioNodeFactoryMock('pan'),
    createBuffer: jest.fn().mockImplementation(() => ({
        getChannelData: jest.fn().mockImplementation(() => []),
    })),
    createDelay: createAudioNodeFactoryMock('delayTime'),
    createAnalyser: createAudioNodeFactoryMock(),
    createWaveShaper: createAudioNodeFactoryMock(),
    createDynamicsCompressor: createAudioNodeFactoryMock('threshold', 'knee', 'ratio', 'attack', 'release'),
    createConvolver: createAudioNodeFactoryMock(),
    createBiquadFilter: createAudioNodeFactoryMock('frequency', 'Q'),
    // This method is only defined for OfflineAudioContext...
    startRendering: jest.fn().mockImplementation(() => ({
      then: jest.fn().mockImplementation((cb) => cb()),
    })),
  }
});
