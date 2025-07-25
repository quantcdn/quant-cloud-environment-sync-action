import * as core from '@actions/core';
import {
    Environment,
    EnvironmentsApi,
    SyncToEnvironmentRequest
} from 'quant-ts-client';

const apiOpts = (apiKey: string) => {
    return {
        applyToRequest: (requestOptions: any) => {
            if (requestOptions && requestOptions.headers) {
                requestOptions.headers["Authorization"] = `Bearer ${apiKey}`;
            }
        }
    }
}

function removeNullValues(obj: any): any {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeNullValues).filter(x => x !== undefined);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleaned = removeNullValues(value);
            if (cleaned !== undefined) {
                result[key] = cleaned;
            }
        }
        return Object.keys(result).length ? result : undefined;
    }
    return obj;
}

interface ApiError {
    statusCode?: number;
    body?: {
        message?: string;
    }
}

/**
 * This action creates a new environment in Quant Cloud.
 * 
 * @returns The name of the created environment.
 */
async function run(): Promise<void> {    
    try {
        const apiKey = core.getInput('api_key', { required: true });
        const appName = core.getInput('app_name', { required: true });
        const organisation = core.getInput('organization', { required: true });
        const environmentName = core.getInput('environment_name', { required: true });

        const baseUrl = core.getInput('base_url') || 'https://dashboard.quantcdn.io/api/v3';

        const sourceEnvironmentName = core.getInput('source', { required: true });
        const type = core.getInput('type', { required: false }) || 'database';

        const client = new EnvironmentsApi(baseUrl);
        client.setDefaultAuthentication(apiOpts(apiKey));

        core.info('Quant Cloud Environment Sync Action');

        if (type !== 'database' && type !== 'filesystem') {
            throw new Error(`Invalid type: ${type}`);
        }

        let environment: Environment;
        let sourceEnvironment: Environment;

        try {
            environment = (await client.getEnvironment(organisation, appName, environmentName)).body;
            core.info(`Environment ${environmentName} exists`);
        } catch (error) {
            throw new Error(`Environment ${environmentName} does not exist`);
        }

        try {
            sourceEnvironment = (await client.getEnvironment(organisation, appName, sourceEnvironmentName)).body;
            core.info(`Source environment ${sourceEnvironmentName} exists`);
        } catch (error) {
            throw new Error(`Source environment ${sourceEnvironmentName} does not exist`);
        }

        core.info(`Syncing ${type} from ${sourceEnvironmentName} to ${environmentName}`);

        const request: SyncToEnvironmentRequest = {
            sourceEnvironment: sourceEnvironmentName,
        }

        await client.syncToEnvironment(organisation, appName, environmentName, type, request);

        core.info(`Synced ${type} from ${sourceEnvironmentName} to ${environmentName}`);

        core.setOutput('success', true);

    } catch (error) {
        const apiError = error as Error & ApiError;
        core.setFailed(apiError.body?.message != null ? apiError.body?.message : error instanceof Error ? error.message : 'Unknown error');
    }

    return;
}

run(); 