import * as core from '@actions/core';
import { execBoringCache, pathExists, ensureBoringCache } from './utils';

async function run(): Promise<void> {
  try {
    // Get state from restore phase
    const cliVersion = core.getInput('cli-version') || 'v1.0.0';
    const workspace = core.getState('workspace');
    const rubyTag = core.getState('ruby-tag');
    const bundleTag = core.getState('bundle-tag');
    const miseDir = core.getState('mise-dir');
    const bundleDir = core.getState('bundle-dir');
    const cacheRuby = core.getState('cache-ruby') === 'true';
    const rubyCacheHit = core.getState('ruby-cache-hit') === 'true';
    const bundleCacheHit = core.getState('bundle-cache-hit') === 'true';
    const exclude = core.getState('exclude');

    core.info('BoringCache Ruby - Post job save');
    core.debug(`State: workspace=${workspace}, rubyTag=${rubyTag}, bundleTag=${bundleTag}`);
    core.debug(`State: miseDir=${miseDir}, bundleDir=${bundleDir}`);
    core.debug(`State: cacheRuby=${cacheRuby}, rubyCacheHit=${rubyCacheHit}, bundleCacheHit=${bundleCacheHit}`);

    if (!workspace) {
      core.info('No workspace found in state, skipping cache save');
      return;
    }

    // Ensure CLI is available
    await ensureBoringCache({ version: cliVersion });

    // Save Ruby cache (if not already cached)
    if (cacheRuby && !rubyCacheHit && await pathExists(miseDir)) {
      core.info(`Saving Ruby cache: ${miseDir} -> ${rubyTag}`);
      const args = ['save', workspace, `${miseDir}:${rubyTag}`];
      await execBoringCache(args, { ignoreReturnCode: true });
    } else if (cacheRuby && rubyCacheHit) {
      core.info('Ruby cache already exists, skipping save');
    } else if (!cacheRuby) {
      core.info('Ruby caching disabled');
    }

    // Save bundle cache (if not already cached)
    if (!bundleCacheHit && await pathExists(bundleDir)) {
      core.info(`Saving bundle cache: ${bundleDir} -> ${bundleTag}`);
      const args = ['save', workspace, `${bundleDir}:${bundleTag}`];
      if (exclude) {
        args.push('--exclude', exclude);
      }
      await execBoringCache(args, { ignoreReturnCode: true });
    } else if (bundleCacheHit) {
      core.info('Bundle cache already exists, skipping save');
    } else {
      core.info(`Bundle dir not found: ${bundleDir}`);
    }

    core.info('Cache save complete');
  } catch (error) {
    core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
