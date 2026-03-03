# Quant Agent Validate Action

A GitHub Action for validating AI agent output against a quality spec using the Quant validation API. Runs behavioral, constraint, and quality checks to produce a scored quality report.

## Features

- **Quality Scoring**: Weighted scoring across behavioral, constraint, and quality check categories
- **Threshold Enforcement**: Configurable pass/fail threshold with optional override
- **Detailed Reports**: Returns full quality report with per-check results and suggestions
- **CI Integration**: Automatically fails the workflow step if validation does not pass

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `quant_api_key` | Yes | Quant API key |
| `quant_organization` | Yes | Quant organisation name |
| `agent_id` | Yes | Agent UUID to validate |
| `agent_output` | Yes | JSON string of the agent tool call output |
| `conversation_context` | No | JSON string of conversation context (tool calls, message count) |
| `test_fixtures` | No | Path to JSON file with test fixture state |
| `threshold_override` | No | Override the default threshold from the registered spec |
| `git_sha` | No | Git SHA that triggered this validation (auto-detected if not set) |
| `base_url` | No | Quant API base URL |

## Outputs

| Output | Description |
|--------|-------------|
| `score` | Quality score (0.0-1.0) |
| `passed` | Whether validation passed (`true`/`false`) |
| `report` | Full QualityReport JSON |
| `summary` | Human-readable summary string |

## Usage

### Basic Usage

```yaml
- name: Validate Agent Output
  uses: quantcdn/quant-cloud-agent-validate-action@v1
  with:
    quant_api_key: ${{ secrets.QUANT_API_KEY }}
    quant_organization: ${{ secrets.QUANT_ORGANIZATION }}
    agent_id: ${{ vars.AGENT_ID }}
    agent_output: ${{ steps.dispatch.outputs.agent_output }}
```

### With Conversation Context and Fixtures

```yaml
- name: Validate Agent Output
  uses: quantcdn/quant-cloud-agent-validate-action@v1
  with:
    quant_api_key: ${{ secrets.QUANT_API_KEY }}
    quant_organization: ${{ secrets.QUANT_ORGANIZATION }}
    agent_id: ${{ vars.AGENT_ID }}
    agent_output: ${{ steps.dispatch.outputs.agent_output }}
    conversation_context: ${{ steps.dispatch.outputs.conversation_context }}
    test_fixtures: agents/my-agent/fixtures.json
    threshold_override: '0.8'
```

### Complete Pipeline Example

```yaml
name: Agent Validation Pipeline
on:
  push:
    branches: [main]
    paths: ['agents/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Agent Specs
        uses: quantcdn/quant-cloud-agent-deploy-action@v1
        with:
          quant_api_key: ${{ secrets.QUANT_API_KEY }}
          quant_organization: ${{ secrets.QUANT_ORGANIZATION }}
          agents_dir: agents/

      - name: Dispatch Agent
        uses: quantcdn/quant-cloud-agent-dispatch-action@v1
        id: dispatch
        with:
          quant_api_key: ${{ secrets.QUANT_API_KEY }}
          quant_organization: ${{ secrets.QUANT_ORGANIZATION }}
          agent_id: ${{ vars.AGENT_ID }}
          test_fixtures: agents/my-agent/fixtures.json

      - name: Validate Agent Output
        uses: quantcdn/quant-cloud-agent-validate-action@v1
        id: validate
        with:
          quant_api_key: ${{ secrets.QUANT_API_KEY }}
          quant_organization: ${{ secrets.QUANT_ORGANIZATION }}
          agent_id: ${{ vars.AGENT_ID }}
          agent_output: ${{ steps.dispatch.outputs.agent_output }}
          conversation_context: ${{ steps.dispatch.outputs.conversation_context }}
          test_fixtures: agents/my-agent/fixtures.json

      - name: Validation Summary
        if: always()
        run: |
          echo "Score: ${{ steps.validate.outputs.score }}"
          echo "Passed: ${{ steps.validate.outputs.passed }}"
          echo "Summary: ${{ steps.validate.outputs.summary }}"
```

## Error Handling

The action will fail if:
- The API key or organization is invalid
- The agent ID does not have a registered validation spec
- The agent output is not valid JSON
- The validation score falls below the threshold
- The API returns an unexpected error

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

## License

This project is licensed under the MIT License.
