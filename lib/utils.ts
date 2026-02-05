import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ensureBoringCache, execBoringCache as execBoringCacheCore } from '@boringcache/action-core';

export { ensureBoringCache };

export async function execBoringCache(args: string[], options: { ignoreReturnCode?: boolean } = {}): Promise<number> {
  const code = await execBoringCacheCore(args, {
    ignoreReturnCode: options.ignoreReturnCode ?? false,
    silent: true,
    listeners: {
      stdout: (data: Buffer) => {
        process.stdout.write(data.toString());
      },
      stderr: (data: Buffer) => {
        process.stderr.write(data.toString());
      }
    }
  });
  return code;
}

export function getWorkspace(inputWorkspace: string): string {
  let workspace = inputWorkspace || process.env.BORINGCACHE_DEFAULT_WORKSPACE || '';

  if (!workspace) {
    core.setFailed('Workspace is required. Set workspace input or BORINGCACHE_DEFAULT_WORKSPACE env var.');
    throw new Error('Workspace required');
  }

  // Ensure namespace/workspace format
  if (!workspace.includes('/')) {
    workspace = `default/${workspace}`;
  }

  return workspace;
}

export function getCacheTagPrefix(inputCacheTag: string): string {
  if (inputCacheTag) {
    return inputCacheTag;
  }

  const repo = process.env.GITHUB_REPOSITORY || '';
  if (repo) {
    const repoName = repo.split('/')[1] || repo;
    return repoName;
  }

  return 'ruby';
}

export async function getRubyVersion(inputVersion: string, workingDir: string): Promise<string> {
  if (inputVersion) {
    return inputVersion;
  }

  // Check .ruby-version
  const rubyVersionFile = path.join(workingDir, '.ruby-version');
  try {
    const content = await fs.promises.readFile(rubyVersionFile, 'utf-8');
    return content.trim();
  } catch {
    // Not found, continue
  }

  // Check .tool-versions
  const toolVersionsFile = path.join(workingDir, '.tool-versions');
  try {
    const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
    const rubyLine = content.split('\n').find(line => line.startsWith('ruby '));
    if (rubyLine) {
      return rubyLine.split(' ')[1].trim();
    }
  } catch {
    // Not found, continue
  }

  // Default
  return '3.3';
}

export async function installMise(): Promise<void> {
  await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);

  const homedir = os.homedir();
  core.addPath(`${homedir}/.local/bin`);
  core.addPath(`${homedir}/.local/share/mise/shims`);
}

export async function installRuby(version: string): Promise<void> {
  const homedir = os.homedir();
  const misePath = `${homedir}/.local/bin/mise`;

  await exec.exec(misePath, ['install', `ruby@${version}`]);
  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}

export async function activateRuby(version: string): Promise<void> {
  const homedir = os.homedir();
  const misePath = `${homedir}/.local/bin/mise`;

  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
