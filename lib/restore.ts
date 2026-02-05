import * as core from '@actions/core';
import * as path from 'path';
import * as os from 'os';
import {
  setupBoringCache,
  execBoringCache,
  getWorkspace,
  getRubyVersion,
  getFileHash,
  installMise,
  installRuby,
  activateRuby,
} from './utils';

async function run(): Promise<void> {
  try {
    const inputs = {
      workspace: core.getInput('workspace'),
      rubyVersion: core.getInput('ruby-version'),
      workingDirectory: core.getInput('working-directory') || '.',
      cacheKeyPrefix: core.getInput('cache-key-prefix') || 'ruby',
      bundlePath: core.getInput('bundle-path') || 'vendor/bundle',
      cacheRuby: core.getBooleanInput('cache-ruby'),
      exclude: core.getInput('exclude'),
    };

    // Setup BoringCache CLI
    await setupBoringCache();

    // Get workspace
    const workspace = getWorkspace(inputs.workspace);
    core.setOutput('workspace', workspace);

    // Get Ruby version
    const workingDir = path.resolve(inputs.workingDirectory);
    const rubyVersion = await getRubyVersion(inputs.rubyVersion, workingDir);
    core.setOutput('ruby-version', rubyVersion);

    // Generate cache keys
    const gemfileLockPath = path.join(workingDir, 'Gemfile.lock');
    const gemfilePath = path.join(workingDir, 'Gemfile');
    let gemfileHash = await getFileHash(gemfileLockPath);
    if (!gemfileHash) {
      gemfileHash = await getFileHash(gemfilePath);
    }

    const rubyKey = `${inputs.cacheKeyPrefix}-ruby-${rubyVersion}`;
    const bundleKey = `${inputs.cacheKeyPrefix}-bundle-${rubyVersion}-${gemfileHash}`;

    core.setOutput('ruby-key', rubyKey);
    core.setOutput('cache-key', bundleKey);

    const homedir = os.homedir();
    const miseDir = `${homedir}/.local/share/mise`;
    const bundleDir = path.join(workingDir, inputs.bundlePath);

    // Restore Ruby cache
    let rubyCacheHit = false;
    if (inputs.cacheRuby) {
      const result = await execBoringCache(
        ['restore', workspace, `${rubyKey}:${miseDir}`],
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
    const bundleResult = await execBoringCache(
      ['restore', workspace, `${bundleKey}:${bundleDir}`],
      { ignoreReturnCode: true }
    );
    const bundleCacheHit = bundleResult === 0;
    core.setOutput('cache-hit', bundleCacheHit.toString());

    // Save state for post-job save
    core.saveState('workspace', workspace);
    core.saveState('ruby-key', rubyKey);
    core.saveState('bundle-key', bundleKey);
    core.saveState('mise-dir', miseDir);
    core.saveState('bundle-dir', bundleDir);
    core.saveState('cache-ruby', inputs.cacheRuby.toString());
    core.saveState('ruby-cache-hit', rubyCacheHit.toString());
    core.saveState('bundle-cache-hit', bundleCacheHit.toString());
    core.saveState('exclude', inputs.exclude);

  } catch (error) {
    core.setFailed(`Ruby setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
