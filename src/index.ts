import * as core from '@actions/core';
import {
    EnvironmentsApi,
    SyncToEnvironmentRequest,
    SyncToEnvironmentTypeEnum,
    ListSyncOperationsTypeEnum,
    Configuration
} from '@quantcdn/quant-client';

interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
            details?: string;
        };
    };
    message?: string;
}

async function run(): Promise<void> {
    try {
        const apiKey = core.getInput('api_key', { required: true });
        const appName = core.getInput('app_name', { required: true });
        const organisation = core.getInput('organization', { required: true });
        const environmentName = core.getInput('environment_name', { required: true });

        let baseUrl = core.getInput('base_url') || 'https://dashboard.quantcdn.io';
        baseUrl = baseUrl.replace(/\/api\/v3\/?$/, '');

        const sourceEnvironmentName = core.getInput('source', { required: true });
        const type = core.getInput('type', { required: false }) || 'database';

        const config = new Configuration({
            basePath: baseUrl,
            accessToken: apiKey
        });
        const client = new EnvironmentsApi(config);

        core.info('Quant Cloud Environment Sync Action');

        if (type !== 'database' && type !== 'filesystem') {
            throw new Error(`Invalid type: ${type}`);
        }

        try {
            await client.getEnvironment(organisation, appName, environmentName);
            core.info(`Environment ${environmentName} exists`);
        } catch (error) {
            throw new Error(`Environment ${environmentName} does not exist`);
        }

        try {
            await client.getEnvironment(organisation, appName, sourceEnvironmentName);
            core.info(`Source environment ${sourceEnvironmentName} exists`);
        } catch (error) {
            throw new Error(`Source environment ${sourceEnvironmentName} does not exist`);
        }

        core.info(`Syncing ${type} from ${sourceEnvironmentName} to ${environmentName}`);

        const request: SyncToEnvironmentRequest = {
            sourceEnvironment: sourceEnvironmentName,
        };

        let sync;
        try {
            sync = await client.syncToEnvironment(organisation, appName, environmentName, type as SyncToEnvironmentTypeEnum, request);
            core.info(`Synced ${type} from ${sourceEnvironmentName} to ${environmentName}`);
        } catch (error) {
            const apiError = error as Error & ApiError;
            if (apiError.response?.status === 400) {
                const message = apiError.response?.data?.message || 'Bad Request';
                const details = apiError.response?.data?.details;
                core.warning(`Sync operation not available: ${message}`);
                if (details) {
                    core.warning(`Details: ${details}`);
                }
                core.setOutput('success', false);
                core.setOutput('skipped', true);
                return;
            }
            throw error;
        }

        if (core.getInput('wait') === 'true') {
            core.info(`Waiting for sync to complete`);
            let loop = true;
            let retries = 0;
            const waitInterval = parseInt(core.getInput('wait_interval') || '10');
            const maxRetries = parseInt(core.getInput('max_retries') || '30');
            while (loop) {
                try {
                    const operations = await client.listSyncOperations(organisation, appName, environmentName, type as ListSyncOperationsTypeEnum);
                    let operationFound = false;
                    for (const operation of operations.data) {
                        if (operation.syncId !== sync.data.syncId) {
                            continue;
                        }
                        operationFound = true;
                        switch (operation.status) {
                            case 'completed':
                                core.info(`Sync completed`);
                                loop = false;
                                break;
                            case 'failed':
                                throw new Error(`Sync failed`);
                            default:
                                core.info(`Sync in progress`);
                                break;
                        }
                        break;
                    }

                    if (!operationFound) {
                        core.info(`Sync operation not found yet, retrying...`);
                    }
                } catch (error) {
                    if (error instanceof Error && error.message === 'Sync failed') {
                        throw error;
                    }
                    core.warning(`Failed to check sync status: ${error}. Retrying...`);
                }

                retries++;
                if (retries > maxRetries) {
                    throw new Error(`Sync timed out after ${retries} retries (waited ${retries * waitInterval} seconds)`);
                }

                if (loop) {
                    await new Promise(resolve => setTimeout(resolve, waitInterval * 1000));
                }
            }
        }

        core.setOutput('success', true);
        core.setOutput('sync_id', sync.data.syncId);

    } catch (error) {
        const apiError = error as Error & ApiError;
        core.setFailed(apiError.response?.data?.message ?? (error instanceof Error ? error.message : 'Unknown error'));
    }

    return;
}

run();
