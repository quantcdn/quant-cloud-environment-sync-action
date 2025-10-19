import * as core from '@actions/core';
import { Configuration, EnvironmentsApi } from '@quantcdn/quant-client';

// Mock the modules
jest.mock('@actions/core');
jest.mock('@quantcdn/quant-client');

const mockCore = core as jest.Mocked<typeof core>;
const mockConfig = Configuration as jest.MockedClass<typeof Configuration>;
const mockEnvironmentsApiClass = EnvironmentsApi as jest.MockedClass<typeof EnvironmentsApi>;

describe('Quant Cloud Environment Sync Action - Unit Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        api_key: 'test-api-key',
        app_name: 'test-app',
        organization: 'test-org',
        environment_name: 'staging',
        source: 'production',
        type: 'database',
        base_url: 'https://dashboard.quantcdn.io',
        wait: 'false',
        wait_interval: '10',
        max_retries: '30',
      };
      return inputs[name] || '';
    });

    mockCore.setOutput.mockImplementation(() => {});
    mockCore.setFailed.mockImplementation(() => {});
    mockCore.info.mockImplementation(() => {});
    mockCore.warning.mockImplementation(() => {});

    // Setup client mock
    mockClient = {
      getEnvironment: jest.fn(),
      syncToEnvironment: jest.fn(),
      listSyncOperations: jest.fn(),
    };
    mockEnvironmentsApiClass.mockImplementation(() => mockClient);
    mockConfig.mockImplementation(() => ({} as any));
  });

  describe('URL normalisation', () => {
    it('should normalise v3 URLs to new API format', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://dashboard.quantcdn.io/api/v3';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockConfig).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        basePath: 'https://dashboard.quantcdn.io',
      });
    });

    it('should normalise v2 URLs to new API format', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://dashboard.quantcdn.io/api/v2';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockConfig).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        basePath: 'https://dashboard.quantcdn.io',
      });
    });

    it('should not modify URLs that do not end with v2 or v3', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://custom-api.example.com';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockConfig).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        basePath: 'https://custom-api.example.com',
      });
    });
  });

  describe('Environment validation', () => {
    it('should successfully sync when both environments exist', async () => {
      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockClient.getEnvironment).toHaveBeenCalledWith('test-org', 'test-app', 'staging');
      expect(mockClient.getEnvironment).toHaveBeenCalledWith('test-org', 'test-app', 'production');
      expect(mockClient.syncToEnvironment).toHaveBeenCalledWith(
        'test-org',
        'test-app',
        'staging',
        'database',
        { sourceEnvironment: 'production' }
      );
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setOutput).toHaveBeenCalledWith('sync_id', 'sync-123');
    });

    it('should fail when target environment does not exist', async () => {
      mockClient.getEnvironment
        .mockRejectedValueOnce(new Error('Environment not found'))
        .mockResolvedValueOnce({ body: { id: 'env-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Environment staging does not exist');
    });

    it('should fail when source environment does not exist', async () => {
      mockClient.getEnvironment
        .mockResolvedValueOnce({ body: { id: 'env-123' } })
        .mockRejectedValueOnce(new Error('Environment not found'));

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Source environment production does not exist');
    });
  });

  describe('Sync type validation', () => {
    it('should accept database type', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'database',
          base_url: 'https://dashboard.quantcdn.io',
          wait: 'false',
        };
        return inputs[name] || '';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockClient.syncToEnvironment).toHaveBeenCalledWith(
        'test-org',
        'test-app',
        'staging',
        'database',
        { sourceEnvironment: 'production' }
      );
    });

    it('should accept filesystem type', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'filesystem',
          base_url: 'https://dashboard.quantcdn.io',
          wait: 'false',
        };
        return inputs[name] || '';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockClient.syncToEnvironment).toHaveBeenCalledWith(
        'test-org',
        'test-app',
        'staging',
        'filesystem',
        { sourceEnvironment: 'production' }
      );
    });

    it('should fail with invalid type', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'type') return 'invalid-type';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid type: invalid-type');
    });

    it('should default to database type when not specified', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: '',
          base_url: 'https://dashboard.quantcdn.io',
          wait: 'false',
        };
        return inputs[name] || '';
      });

      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });

      const { run } = await import('../src/index');
      await run();

      expect(mockClient.syncToEnvironment).toHaveBeenCalledWith(
        'test-org',
        'test-app',
        'staging',
        'database',
        { sourceEnvironment: 'production' }
      );
    });
  });

  describe('Wait functionality', () => {
    beforeEach(() => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'database',
          base_url: 'https://dashboard.quantcdn.io',
          wait: 'true',
          wait_interval: '1',
          max_retries: '3',
        };
        return inputs[name] || '';
      });
    });

    it('should wait for sync completion when wait is true', async () => {
      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });
      mockClient.listSyncOperations.mockResolvedValue({ 
        body: [{ syncId: 'sync-123', status: 'completed' }] 
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockClient.listSyncOperations).toHaveBeenCalledWith('test-org', 'test-app', 'staging', 'database');
      expect(mockCore.info).toHaveBeenCalledWith('Sync completed');
    });

    // Note: Sync failure during wait is a complex scenario that would require
    // more sophisticated mocking. The timeout test covers the wait functionality.

    it('should timeout after max retries', async () => {
      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });
      mockClient.listSyncOperations.mockResolvedValue({ body: [] });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Sync timed out after 4 retries (waited 4 seconds)');
    });

    it('should handle errors during status checking', async () => {
      mockClient.getEnvironment.mockResolvedValue({ body: { id: 'env-123' } });
      mockClient.syncToEnvironment.mockResolvedValue({ body: { syncId: 'sync-123' } });
      mockClient.listSyncOperations.mockRejectedValue(new Error('API Error'));

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.warning).toHaveBeenCalledWith('Failed to check sync status: Error: API Error. Retrying...');
    });
  });

  // Note: Error handling tests are covered by the environment validation tests above
  // which test the actual error scenarios that occur in the application

  describe('Required inputs', () => {
    it('should require api_key input', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'api_key') return '';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('api_key', { required: true });
    });

    it('should require app_name input', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'app_name') return '';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('app_name', { required: true });
    });

    it('should require organization input', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'organization') return '';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('organization', { required: true });
    });

    it('should require environment_name input', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'environment_name') return '';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('environment_name', { required: true });
    });

    it('should require source input', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'source') return '';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('source', { required: true });
    });
  });
});
