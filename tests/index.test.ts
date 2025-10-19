import * as core from '@actions/core';

// Mock the modules
jest.mock('@actions/core');

const mockCore = core as jest.Mocked<typeof core>;

describe('Quant Cloud Environment Sync Action - Integration Tests', () => {
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
        base_url: 'http://localhost:4010',
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
  });

  describe('Integration with Mock API', () => {
    it('should successfully sync when both environments exist', async () => {
      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setOutput).toHaveBeenCalledWith('sync_id', expect.any(String));
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle database sync type', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'database',
          base_url: 'http://localhost:4010',
          wait: 'false',
        };
        return inputs[name] || '';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle filesystem sync type', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'filesystem',
          base_url: 'http://localhost:4010',
          wait: 'false',
        };
        return inputs[name] || '';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
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

    it('should handle wait functionality', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: 'database',
          base_url: 'http://localhost:4010',
          wait: 'true',
          wait_interval: '1',
          max_retries: '3',
        };
        return inputs[name] || '';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setOutput).toHaveBeenCalledWith('sync_id', expect.any(String));
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
  });
});