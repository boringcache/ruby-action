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

  const miseVersion = await readMiseTomlVersion(workingDir, 'ruby');
  if (miseVersion) return miseVersion;

  return '3.3';
}

async function readMiseTomlVersion(workingDir: string, toolName: string): Promise<string | null> {
  const miseToml = path.join(workingDir, 'mise.toml');
  try {
    const content = await fs.promises.readFile(miseToml, 'utf-8');
    const toolsMatch = content.match(/\[tools\]([\s\S]*?)(?:\n\[|$)/);
    if (toolsMatch) {
      const versionMatch = toolsMatch[1].match(
        new RegExp(`^\\s*${toolName}\\s*=\\s*["']([^"']+)["']`, 'm')
      );
      if (versionMatch) return versionMatch[1];
    }
  } catch {}
  return null;
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

export async function installRuby(version: string, compile: boolean = true): Promise<void> {
  const misePath = getMiseBinPath();
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (!compile) {
    env.MISE_RUBY_COMPILE = '0';
    core.info('Using precompiled Ruby binary (falling back to source if unavailable)');
  }

  await exec.exec(misePath, ['install', `ruby@${version}`], { env });
  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}

export async function activateRuby(version: string): Promise<void> {
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}

export async function configureBundler(workingDir: string, bundlePath: string): Promise<void> {
  core.info(`Configuring Bundler path: ${bundlePath}`);
  await exec.exec('bundle', ['config', 'set', '--local', 'path', bundlePath], {
    cwd: workingDir,
    ignoreReturnCode: true,
  });
}

export async function readBundlerVersion(workingDir: string): Promise<string | null> {
  const lockfile = path.join(workingDir, 'Gemfile.lock');
  try {
    const content = await fs.promises.readFile(lockfile, 'utf-8');
    const match = content.match(/BUNDLED WITH\n\s+(\S+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function installBundler(version: string): Promise<void> {
  core.info(`Installing Bundler ${version}...`);
  await exec.exec('gem', ['install', 'bundler', '-v', version, '--no-document'], {
    ignoreReturnCode: true,
  });
}

export async function runBundleInstall(workingDir: string): Promise<void> {
  core.info('Running bundle install...');
  await exec.exec('bundle', ['install', '--jobs', '4', '--retry', '3'], {
    cwd: workingDir,
  });
}
