import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ensureBoringCache,
  execBoringCache as execBoringCacheCore,
  getWorkspace as getWorkspaceCore,
  getCacheTagPrefix as getCacheTagPrefixCore,
  pathExists,
} from '@boringcache/action-core';

export { ensureBoringCache, pathExists };

const isWindows = process.platform === 'win32';

export function getMiseBinPath(): string {
  const homedir = os.homedir();
  return isWindows
    ? path.join(homedir, '.local', 'bin', 'mise.exe')
    : path.join(homedir, '.local', 'bin', 'mise');
}

export function getMiseDataDir(): string {
  if (isWindows) {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'mise');
  }
  return path.join(os.homedir(), '.local', 'share', 'mise');
}

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
  return getWorkspaceCore(inputWorkspace);
}

export function getCacheTagPrefix(inputCacheTag: string): string {
  return getCacheTagPrefixCore(inputCacheTag, 'ruby');
}

export async function getRubyVersion(inputVersion: string, workingDir: string): Promise<string> {
  if (inputVersion) {
    return inputVersion;
  }

  const rubyVersionFile = path.join(workingDir, '.ruby-version');
  try {
    const content = await fs.promises.readFile(rubyVersionFile, 'utf-8');
    return content.trim();
  } catch {
  }

  const toolVersionsFile = path.join(workingDir, '.tool-versions');
  try {
    const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
    const rubyLine = content.split('\n').find(line => line.startsWith('ruby '));
    if (rubyLine) {
      return rubyLine.split(' ')[1].trim();
    }
  } catch {
  }

  return '3.3';
}

export async function installMise(): Promise<void> {
  core.info('Installing mise...');
  if (isWindows) {
    await installMiseWindows();
  } else {
    await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
  }

  core.addPath(path.dirname(getMiseBinPath()));
  core.addPath(path.join(getMiseDataDir(), 'shims'));
}

async function installMiseWindows(): Promise<void> {
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  const miseVersion = process.env.MISE_VERSION || 'v2026.2.8';
  const url = `https://github.com/jdx/mise/releases/download/${miseVersion}/mise-${miseVersion}-windows-${arch}.zip`;

  const binDir = path.dirname(getMiseBinPath());
  await fs.promises.mkdir(binDir, { recursive: true });

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mise-'));
  try {
    const zipPath = path.join(tempDir, 'mise.zip');
    await exec.exec('curl', ['-fsSL', '-o', zipPath, url]);
    await exec.exec('tar', ['-xf', zipPath, '-C', tempDir]);
    await fs.promises.copyFile(
      path.join(tempDir, 'mise', 'bin', 'mise.exe'),
      getMiseBinPath(),
    );
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

export async function installRuby(version: string): Promise<void> {
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['install', `ruby@${version}`]);
  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}

export async function activateRuby(version: string): Promise<void> {
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
