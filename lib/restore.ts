import * as core from '@actions/core';
import * as path from 'path';
import {
  ensureBoringCache,
  execBoringCache,
  getWorkspace,
  getCacheTagPrefix,
  getRubyVersion,
  installMise,
  installRuby,
  activateRuby,
  getMiseDataDir,
  configureBundler,
  readBundlerVersion,
  installBundler,
  runBundleInstall,
} from './utils';

async function run(): Promise<void> {
  try {
    const cliVersion = core.getInput('cli-version');
    const inputs = {
      workspace: core.getInput('workspace'),
      rubyVersion: core.getInput('ruby-version'),
      workingDirectory: core.getInput('working-directory') || '.',
      cacheTagPrefix: core.getInput('cache-tag') || '',
      bundlePath: core.getInput('bundle-path') || 'vendor/bundle',
      cacheRuby: core.getInput('cache-ruby') !== 'false',
      compile: core.getInput('compile') === 'true',
      bundlerCache: core.getInput('bundler-cache') === 'true',
      bundlerVersion: core.getInput('bundler-version') || '',
      verbose: core.getInput('verbose') === 'true',
      exclude: core.getInput('exclude'),
    };

    if (cliVersion.toLowerCase() !== 'skip') {
      await ensureBoringCache({ version: cliVersion });
    }

    // Get workspace
    const workspace = getWorkspace(inputs.workspace);
    core.setOutput('workspace', workspace);

    const cacheTagPrefix = getCacheTagPrefix(inputs.cacheTagPrefix);

    const workingDir = path.resolve(inputs.workingDirectory);
    const rubyVersion = await getRubyVersion(inputs.rubyVersion, workingDir);
    core.setOutput('ruby-version', rubyVersion);

    const rubyTag = `${cacheTagPrefix}-ruby-${rubyVersion}`;
    const bundleTag = `${cacheTagPrefix}-bundle-${rubyVersion}`;

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
      await installRuby(rubyVersion, inputs.compile);
    }

    // Configure Bundler path and version
    await configureBundler(workingDir, inputs.bundlePath);

    const bundlerVersion = inputs.bundlerVersion || await readBundlerVersion(workingDir);
    if (bundlerVersion) {
      await installBundler(bundlerVersion);
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

    // Auto-run bundle install if opted in
    if (inputs.bundlerCache) {
      await runBundleInstall(workingDir);
    }

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
