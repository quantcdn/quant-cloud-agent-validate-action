import * as core from '@actions/core';
import * as fs from 'fs';

const DEFAULT_BASE_URL = 'https://dashboard.quantcdn.io/api/v3';

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput('quant_api_key', { required: true });
    const organization = core.getInput('quant_organization', { required: true });
    const agentId = core.getInput('agent_id', { required: true });
    const agentOutputRaw = core.getInput('agent_output', { required: true });
    const conversationContextRaw = core.getInput('conversation_context') || '{}';
    const testFixturesPath = core.getInput('test_fixtures');
    const thresholdOverride = core.getInput('threshold_override');
    const gitSha = core.getInput('git_sha') || process.env.GITHUB_SHA || '';
    const baseUrl = core.getInput('base_url') || DEFAULT_BASE_URL;

    let agentOutput: Record<string, any>;
    let conversationContext: Record<string, any>;
    let testFixtures: Record<string, any> = {};

    try {
      agentOutput = JSON.parse(agentOutputRaw);
    } catch {
      core.setFailed('Failed to parse agent_output as JSON');
      return;
    }

    try {
      conversationContext = JSON.parse(conversationContextRaw);
    } catch {
      conversationContext = {};
    }

    if (testFixturesPath) {
      try {
        const fixtureContent = fs.readFileSync(testFixturesPath, 'utf-8');
        testFixtures = JSON.parse(fixtureContent);
      } catch (err) {
        core.warning(`Failed to read test fixtures from ${testFixturesPath}: ${err}`);
      }
    }

    const body: Record<string, any> = {
      agent_output: agentOutput,
      conversation_context: conversationContext,
      test_fixtures: testFixtures,
      git_sha: gitSha,
    };

    if (thresholdOverride) {
      body.threshold_override = parseFloat(thresholdOverride);
    }

    const url = `${baseUrl}/organizations/${organization}/agents/${agentId}/validate`;
    core.info(`Calling validation API: POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      core.setFailed(`Validation API returned ${response.status}: ${errorBody}`);
      return;
    }

    const report = await response.json() as {
      score: number;
      passed: boolean;
      summary: string;
      checks: Array<{ id: string; category: string; weight: number; passed: boolean; detail: string }>;
      suggestions: Array<{ check_id: string; type: string; description: string }>;
    };

    core.setOutput('score', report.score.toString());
    core.setOutput('passed', report.passed.toString());
    core.setOutput('report', JSON.stringify(report));
    core.setOutput('summary', report.summary);

    core.info(`\n${report.summary}\n`);
    for (const check of report.checks) {
      const icon = check.passed ? '✓' : '✗';
      core.info(`  [${icon}] [${Math.round(check.weight * 100)}%] ${check.id}: ${check.detail}`);
    }

    if (report.suggestions.length > 0) {
      core.info('\nSuggestions:');
      for (const s of report.suggestions) {
        core.info(`  - ${s.description}`);
      }
    }

    if (!report.passed) {
      core.setFailed(`Agent validation failed: ${report.summary}`);
    }
  } catch (error) {
    core.setFailed(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
