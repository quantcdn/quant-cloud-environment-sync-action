export const mockEnvironment = {
  id: 'env-123',
  name: 'test-environment',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockSyncResponse = {
  body: {
    syncId: 'sync-123',
    status: 'initiated',
    createdAt: '2024-01-01T00:00:00Z',
  },
};

export const mockSyncOperation = {
  syncId: 'sync-123',
  status: 'completed',
  createdAt: '2024-01-01T00:00:00Z',
  completedAt: '2024-01-01T00:01:00Z',
};

export const mockSyncOperationsResponse = {
  body: [mockSyncOperation],
};

export const mockEnvironmentsApi = {
  getEnvironment: jest.fn(),
  syncToEnvironment: jest.fn(),
  listSyncOperations: jest.fn(),
};

export const mockConfiguration = jest.fn();

// Mock the actual classes
export const Configuration = jest.fn().mockImplementation(() => ({}));
export const EnvironmentsApi = jest.fn().mockImplementation(() => mockEnvironmentsApi);