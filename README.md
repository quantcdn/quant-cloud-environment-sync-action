# Quant Cloud Environment

Sync data between existing environments in Quant Cloud. This action requires both source and target environments to already exist.

## Usage

```yaml
- uses: quantcdn/quant-cloud-environment-action@v1
  with:
    api_key: ${{ secrets.QUANT_API_KEY }}
    organization: your-org-id
    app_name: my-app
    environment_name: my-environment
    source: my-source-environment
    type: database
    wait: true  # Wait for sync to complete
    wait_interval: 10  # Check every 10 seconds
    max_retries: 30  # Timeout after 30 retries (5 minutes)
    base_url: https://dashboard.quantcdn.io/api/v3  # Optional
```

## Inputs

* `api_key`: Quant API key (required)
* `organization`: Quant organisation ID (required)
* `app_name`: Name of your application (required)
* `environment_name`: Name for the target environment (required)
* `source`: Name of the source environment (required)
* `type`: Type of data to sync - 'database' or 'filesystem' (optional, default: 'database')
* `wait`: Whether to wait for the sync to complete (optional, default: 'false')
* `wait_interval`: Interval in seconds between status checks (optional, default: '10')
* `max_retries`: Maximum number of retries before timing out (optional, default: '30')
* `base_url`: Quant Cloud API URL (optional, default: 'https://dashboard.quantcdn.io/api/v3')

## Outputs

* `success`: Whether the sync was successful (boolean)
* `sync_id`: ID of the sync operation

## Wait Functionality

When `wait` is set to `true`, the action will monitor the sync operation status and wait for completion:

- Checks sync status every `wait_interval` seconds
- Times out after `max_retries` attempts 
- Provides detailed logging of sync progress
- Handles API errors gracefully with retry logic
- Default timeout: 30 retries × 10 seconds = 5 minutes

The action will succeed when the sync completes successfully, or fail if the sync fails or times out.