const mockCore = {
    getInput: jest.fn(),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
};
const mockApi = {
    getEnvironment: jest.fn(),
    syncToEnvironment: jest.fn(),
    listSyncOperations: jest.fn()
};

jest.mock('@actions/core', () => mockCore);
jest.mock('@quantcdn/quant-client', () => ({
    Configuration: jest.fn(),
    EnvironmentsApi: jest.fn(() => mockApi),
    SyncToEnvironmentTypeEnum: {},
    ListSyncOperationsTypeEnum: {}
}));

const flush = () => new Promise(resolve => setTimeout(resolve, 10));

async function runAction(extra: Record<string, string> = {}) {
    const inputs: Record<string, string> = {
        api_key: 'k', organization: 'org', app_name: 'app',
        environment_name: 'dev', source: 'prod', ...extra
    };
    mockCore.getInput.mockImplementation((name: string) => inputs[name] ?? '');
    jest.isolateModules(() => {
        require('./index');
    });
    await flush();
}

describe('HTTP 400 refusal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockApi.getEnvironment.mockResolvedValue({ data: {} });
        mockApi.syncToEnvironment.mockRejectedValue({
            response: { status: 400, data: { message: 'Database not configured', details: 'No RDS' } }
        });
    });

    it('warns with the API message and skips by default', async () => {
        await runAction();
        const warnings = mockCore.warning.mock.calls.map(c => c[0]).join('\n');
        expect(warnings).toContain('skipped');
        expect(warnings).toContain('Database not configured');
        expect(mockCore.setOutput).toHaveBeenCalledWith('skipped', true);
        expect(mockCore.setOutput).toHaveBeenCalledWith('success', false);
        expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('fails the step when fail_on_skip is true', async () => {
        await runAction({ fail_on_skip: 'true' });
        expect(mockCore.setFailed).toHaveBeenCalledWith(expect.stringContaining('Database not configured'));
        expect(mockCore.setOutput).toHaveBeenCalledWith('skipped', true);
    });

    it('does not fail when fail_on_skip is false', async () => {
        await runAction({ fail_on_skip: 'false' });
        expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
});
