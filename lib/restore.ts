import * as core from '@actions/core';
import * as path from 'path';
import {
  ensureBoringCache,
  execBoringCache,
  getWorkspace,
  getRubyVersion,
  installMise,
  installRuby,
  activateRuby,
  getMiseDataDir,
} from './utils';

async function run(): Promise<void> {
  try {
    const cliVersion = core.getInput('cli-version') || 'v1.0.2';
    const inputs = {
      workspace: core.getInput('workspace'),
      rubyVersion: core.getInput('ruby-version'),
      workingDirectory: core.getInput('working-directory') || '.',
      cacheTagPrefix: core.getInput('cache-tag-prefix') || 'ruby',
      bundlePath: core.getInput('bundle-path') || 'vendor/bundle',
      cacheRuby: core.getBooleanInput('cache-ruby'),
      verbose: core.getInput('verbose') === 'true',
      exclude: core.getInput('exclude'),
    };

    // Setup BoringCache CLI
    await ensureBoringCache({ version: cliVersion });

    // Get workspace
    const workspace = getWorkspace(inputs.workspace);
    core.setOutput('workspace', workspace);

    // Get Ruby version
    const workingDir = path.resolve(inputs.workingDirectory);
    const rubyVersion = await getRubyVersion(inputs.rubyVersion, workingDir);
    core.setOutput('ruby-version', rubyVersion);

    // Generate cache tags (content-addressing handled by CLI)
    const rubyTag = `${inputs.cacheTagPrefix}-ruby-${rubyVersion}`;
    const bundleTag = `${inputs.cacheTagPrefix}-bundle-${rubyVersion}`;

    core.setOutput('ruby-tag', rubyTag);
    core.setOutput('bundle-tag', bundleTag);

    const miseDir = getMiseDataDir();
    const bundleDir = path.join(workingDir, inputs.bundlePath);

    // Restore Ruby cache
    let rubyCacheHit = false;
    if (inputs.cacheRuby) {
      const rubyArgs = ['restore', workspace, `${rubyTag}:${miseDir}`];
      if (inputs.verbose) rubyArgs.push('--verbose');
      const result = await execBoringCache(
        rubyArgs,
        { ignoreReturnCode: true }
      );
      rubyCacheHit = result === 0;
      core.setOutput('ruby-cache-hit', rubyCacheHit.toString());
    }

    // Install mise
    await installMise();

    // Install or activate Ruby
    if (rubyCacheHit) {
      await activateRuby(rubyVersion);
    } else {
      await installRuby(rubyVersion);
    }

    // Restore bundle cache
    const bundleArgs = ['restore', workspace, `${bundleTag}:${bundleDir}`];
    if (inputs.verbose) bundleArgs.push('--verbose');
    const bundleResult = await execBoringCache(
      bundleArgs,
      { ignoreReturnCode: true }
    );
    const bundleCacheHit = bundleResult === 0;
    core.setOutput('cache-hit', bundleCacheHit.toString());

    // Save state for post-job save
    core.saveState('workspace', workspace);
    core.saveState('ruby-tag', rubyTag);
    core.saveState('bundle-tag', bundleTag);
    core.saveState('mise-dir', miseDir);
    core.saveState('bundle-dir', bundleDir);
    core.saveState('cache-ruby', inputs.cacheRuby.toString());
    core.saveState('ruby-cache-hit', rubyCacheHit.toString());
    core.saveState('bundle-cache-hit', bundleCacheHit.toString());
    core.saveState('verbose', inputs.verbose.toString());
    core.saveState('exclude', inputs.exclude);

  } catch (error) {
    core.setFailed(`Ruby setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
