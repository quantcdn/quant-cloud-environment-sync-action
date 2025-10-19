import * as core from '@actions/core';

// Mock the modules
jest.mock('@actions/core');

const mockCore = core as jest.Mocked<typeof core>;

describe('Quant Cloud Environment Sync Action', () => {
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

  describe('URL normalisation', () => {
    it('should normalise v3 URLs to new API format', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://dashboard.quantcdn.io/api/v3';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      // Import and run the action
      const { run } = await import('../src/index');
      await run();

      // Verify the action completed successfully
      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should normalise v2 URLs to new API format', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://dashboard.quantcdn.io/api/v2';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should not modify URLs that do not end with v2 or v3', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'base_url') return 'https://custom-api.example.com';
        if (name === 'api_key') return 'test-api-key';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Environment validation', () => {
    it('should successfully sync when both environments exist', async () => {
      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setOutput).toHaveBeenCalledWith('sync_id', expect.any(String));
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should fail when target environment does not exist', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'environment_name') return 'nonexistent-env';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Environment nonexistent-env does not exist');
    });

    it('should fail when source environment does not exist', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'source') return 'nonexistent-source';
        return 'test-value';
      });

      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Source environment nonexistent-source does not exist');
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

    it('should accept filesystem type', async () => {
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

    it('should default to database type when not specified', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          api_key: 'test-api-key',
          app_name: 'test-app',
          organization: 'test-org',
          environment_name: 'staging',
          source: 'production',
          type: '',
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
          base_url: 'http://localhost:4010',
          wait: 'true',
          wait_interval: '1',
          max_retries: '3',
        };
        return inputs[name] || '';
      });
    });

    it('should wait for sync completion when wait is true', async () => {
      const { run } = await import('../src/index');
      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('success', true);
      expect(mockCore.setOutput).toHaveBeenCalledWith('sync_id', expect.any(String));
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
  });

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