import * as core from '@actions/core';
import { execBoringCache, pathExists, ensureBoringCache } from './utils';

async function run(): Promise<void> {
  try {
    // Get state from restore phase
    const cliVersion = core.getInput('cli-version') || 'v1.0.0';
    const workspace = core.getState('workspace');
    const rubyKey = core.getState('ruby-key');
    const bundleKey = core.getState('bundle-key');
    const miseDir = core.getState('mise-dir');
    const bundleDir = core.getState('bundle-dir');
    const cacheRuby = core.getState('cache-ruby') === 'true';
    const rubyCacheHit = core.getState('ruby-cache-hit') === 'true';
    const bundleCacheHit = core.getState('bundle-cache-hit') === 'true';
    const exclude = core.getState('exclude');

    if (!workspace) {
      return;
    }

    // Ensure CLI is available
    await ensureBoringCache({ version: cliVersion });

    // Save Ruby cache (if not already cached)
    if (cacheRuby && !rubyCacheHit && await pathExists(miseDir)) {
      const args = ['save', workspace, `${rubyKey}:${miseDir}`];
      await execBoringCache(args, { ignoreReturnCode: true });
    }

    // Save bundle cache (if not already cached)
    if (!bundleCacheHit && await pathExists(bundleDir)) {
      const args = ['save', workspace, `${bundleKey}:${bundleDir}`];
      if (exclude) {
        args.push('--exclude', exclude);
      }
      await execBoringCache(args, { ignoreReturnCode: true });
    }

  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
