"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathExists = exports.ensureBoringCache = void 0;
exports.getMiseBinPath = getMiseBinPath;
exports.getMiseDataDir = getMiseDataDir;
exports.execBoringCache = execBoringCache;
exports.getWorkspace = getWorkspace;
exports.getCacheTagPrefix = getCacheTagPrefix;
exports.getRubyVersion = getRubyVersion;
exports.installMise = installMise;
exports.installRuby = installRuby;
exports.activateRuby = activateRuby;
exports.configureBundler = configureBundler;
exports.readBundlerVersion = readBundlerVersion;
exports.installBundler = installBundler;
exports.runBundleInstall = runBundleInstall;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const action_core_1 = require("@boringcache/action-core");
Object.defineProperty(exports, "ensureBoringCache", { enumerable: true, get: function () { return action_core_1.ensureBoringCache; } });
Object.defineProperty(exports, "pathExists", { enumerable: true, get: function () { return action_core_1.pathExists; } });
const isWindows = process.platform === 'win32';
function getMiseBinPath() {
    const homedir = os.homedir();
    return isWindows
        ? path.join(homedir, '.local', 'bin', 'mise.exe')
        : path.join(homedir, '.local', 'bin', 'mise');
}
function getMiseDataDir() {
    if (isWindows) {
        return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'mise');
    }
    return path.join(os.homedir(), '.local', 'share', 'mise');
}
async function execBoringCache(args, options = {}) {
    var _a;
    const code = await (0, action_core_1.execBoringCache)(args, {
        ignoreReturnCode: (_a = options.ignoreReturnCode) !== null && _a !== void 0 ? _a : false,
        silent: true,
        listeners: {
            stdout: (data) => {
                process.stdout.write(data.toString());
            },
            stderr: (data) => {
                process.stderr.write(data.toString());
            }
        }
    });
    return code;
}
function getWorkspace(inputWorkspace) {
    return (0, action_core_1.getWorkspace)(inputWorkspace);
}
function getCacheTagPrefix(inputCacheTag) {
    return (0, action_core_1.getCacheTagPrefix)(inputCacheTag, 'ruby');
}
async function getRubyVersion(inputVersion, workingDir) {
    if (inputVersion) {
        return inputVersion;
    }
    const rubyVersionFile = path.join(workingDir, '.ruby-version');
    try {
        const content = await fs.promises.readFile(rubyVersionFile, 'utf-8');
        return content.trim();
    }
    catch {
    }
    const toolVersionsFile = path.join(workingDir, '.tool-versions');
    try {
        const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
        const rubyLine = content.split('\n').find(line => line.startsWith('ruby '));
        if (rubyLine) {
            return rubyLine.split(' ')[1].trim();
        }
    }
    catch {
    }
    const miseVersion = await readMiseTomlVersion(workingDir, 'ruby');
    if (miseVersion)
        return miseVersion;
    return '3.3';
}
async function readMiseTomlVersion(workingDir, toolName) {
    const miseToml = path.join(workingDir, 'mise.toml');
    try {
        const content = await fs.promises.readFile(miseToml, 'utf-8');
        const toolsMatch = content.match(/\[tools\]([\s\S]*?)(?:\n\[|$)/);
        if (toolsMatch) {
            const versionMatch = toolsMatch[1].match(new RegExp(`^\\s*${toolName}\\s*=\\s*["']([^"']+)["']`, 'm'));
            if (versionMatch)
                return versionMatch[1];
        }
    }
    catch { }
    return null;
}
async function installMise() {
    core.info('Installing mise...');
    if (isWindows) {
        await installMiseWindows();
    }
    else {
        await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
    }
    core.addPath(path.dirname(getMiseBinPath()));
    core.addPath(path.join(getMiseDataDir(), 'shims'));
}
async function installMiseWindows() {
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
        await fs.promises.copyFile(path.join(tempDir, 'mise', 'bin', 'mise.exe'), getMiseBinPath());
    }
    finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
}
async function installRuby(version, compile = true) {
    const misePath = getMiseBinPath();
    const env = { ...process.env };
    if (!compile) {
        env.MISE_RUBY_COMPILE = '0';
        core.info('Using precompiled Ruby binary (falling back to source if unavailable)');
    }
    await exec.exec(misePath, ['install', `ruby@${version}`], { env });
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function activateRuby(version) {
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function configureBundler(workingDir, bundlePath) {
    core.info(`Configuring Bundler path: ${bundlePath}`);
    await exec.exec('bundle', ['config', 'set', '--local', 'path', bundlePath], {
        cwd: workingDir,
        ignoreReturnCode: true,
    });
}
async function readBundlerVersion(workingDir) {
    const lockfile = path.join(workingDir, 'Gemfile.lock');
    try {
        const content = await fs.promises.readFile(lockfile, 'utf-8');
        const match = content.match(/BUNDLED WITH\n\s+(\S+)/);
        return match ? match[1] : null;
    }
    catch {
        return null;
    }
}
async function installBundler(version) {
    core.info(`Installing Bundler ${version}...`);
    await exec.exec('gem', ['install', 'bundler', '-v', version, '--no-document'], {
        ignoreReturnCode: true,
    });
}
async function runBundleInstall(workingDir) {
    core.info('Running bundle install...');
    await exec.exec('bundle', ['install', '--jobs', '4', '--retry', '3'], {
        cwd: workingDir,
    });
}
