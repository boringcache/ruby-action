import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function setupBoringCache(): Promise<void> {
  const token = process.env.BORINGCACHE_API_TOKEN;

  // Install CLI
  await exec.exec('sh', ['-c', 'curl -sSL https://install.boringcache.com/install.sh | sh']);

  // Add to PATH
  const homedir = os.homedir();
  core.addPath(`${homedir}/.local/bin`);
  core.addPath(`${homedir}/.boringcache/bin`);

  // Authenticate if token provided
  if (token) {
    try {
      await execBoringCache(['auth', '--token', token]);
    } catch {
      core.warning('Authentication failed');
    }
  } else {
    core.warning('BORINGCACHE_API_TOKEN not set, caching will not work');
  }
}

export async function execBoringCache(args: string[], options: { ignoreReturnCode?: boolean } = {}): Promise<number> {
  const homedir = os.homedir();
  const paths = [
    `${homedir}/.local/bin/boringcache`,
    `${homedir}/.boringcache/bin/boringcache`,
    'boringcache'
  ];

  let boringcachePath = 'boringcache';
  for (const p of paths) {
    try {
      await fs.promises.access(p, fs.constants.X_OK);
      boringcachePath = p;
      break;
    } catch {
      continue;
    }
  }

  const exitCode = await core.group('Run Boringcache', async () => {
    return await exec.exec(boringcachePath, args, {
      ignoreReturnCode: options.ignoreReturnCode ?? false
    });
  });

  return exitCode;
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

export async function getFileHash(filePath: string): Promise<string> {
  try {
    const crypto = await import('crypto');
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
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
