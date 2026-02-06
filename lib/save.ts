import * as core from '@actions/core';
import { execBoringCache, pathExists, ensureBoringCache } from './utils';

async function run(): Promise<void> {
  try {
    const cliVersion = core.getInput('cli-version') || 'v1.0.0';
    const workspace = core.getState('workspace');
    const rubyTag = core.getState('ruby-tag');
    const bundleTag = core.getState('bundle-tag');
    const miseDir = core.getState('mise-dir');
    const bundleDir = core.getState('bundle-dir');
    const cacheRuby = core.getState('cache-ruby') === 'true';
    const exclude = core.getState('exclude');

    if (!workspace) {
      core.info('No workspace found in state, skipping cache save');
      return;
    }

    await ensureBoringCache({ version: cliVersion });

    core.info('Saving to BoringCache...');

    // Save Ruby cache
    if (cacheRuby && rubyTag) {
      if (await pathExists(miseDir)) {
        core.info(`Saving Ruby [${rubyTag}]...`);
        await execBoringCache(['save', workspace, `${rubyTag}:${miseDir}`], { ignoreReturnCode: true });
      } else {
        core.debug(`Skipping Ruby: ${miseDir} does not exist`);
      }
    }

    // Save bundle cache
    if (bundleTag) {
      if (await pathExists(bundleDir)) {
        core.info(`Saving bundle [${bundleTag}]...`);
        const args = ['save', workspace, `${bundleTag}:${bundleDir}`];
        if (exclude) {
          args.push('--exclude', exclude);
        }
        await execBoringCache(args, { ignoreReturnCode: true });
      } else {
        core.debug(`Skipping bundle: ${bundleDir} does not exist`);
      }
    }

    core.info('Save complete');
  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
