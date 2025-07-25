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
    base_url: https://dashboard.quantcdn.io/api/v3  # Optional
```

## Inputs

* `api_key`: Quant API key (required)
* `organization`: Quant organisation ID (required)
* `app_name`: Name of your application (required)
* `environment_name`: Name for the environment (required)
* `source`: Name of the source environment (required)
* `type`: Type of data to sync (optional, must be 'database' or 'filesystem', default 'database')
* `base_url`: Quant Cloud API URL (optional, defaults to https://dashboard.quantcdn.io/api/v3)

## Outputs

* `success`: Whether the sync was successful (boolean)