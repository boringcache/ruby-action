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
exports.ensureBoringCache = void 0;
exports.getMiseBinPath = getMiseBinPath;
exports.getMiseDataDir = getMiseDataDir;
exports.execBoringCache = execBoringCache;
exports.getWorkspace = getWorkspace;
exports.getCacheTagPrefix = getCacheTagPrefix;
exports.getRubyVersion = getRubyVersion;
exports.installMise = installMise;
exports.installRuby = installRuby;
exports.activateRuby = activateRuby;
exports.pathExists = pathExists;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const action_core_1 = require("@boringcache/action-core");
Object.defineProperty(exports, "ensureBoringCache", { enumerable: true, get: function () { return action_core_1.ensureBoringCache; } });
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
function getCacheTagPrefix(inputCacheTag) {
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
async function getRubyVersion(inputVersion, workingDir) {
    if (inputVersion) {
        return inputVersion;
    }
    // Check .ruby-version
    const rubyVersionFile = path.join(workingDir, '.ruby-version');
    try {
        const content = await fs.promises.readFile(rubyVersionFile, 'utf-8');
        return content.trim();
    }
    catch {
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
    }
    catch {
        // Not found, continue
    }
    // Default
    return '3.3';
}
async function installMise() {
    if (isWindows) {
        await exec.exec('powershell', ['-c', 'irm https://mise.jdx.dev/install.ps1 | iex']);
    }
    else {
        await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
    }
    const homedir = os.homedir();
    core.addPath(path.join(homedir, '.local', 'bin'));
    core.addPath(path.join(getMiseDataDir(), 'shims'));
}
async function installRuby(version) {
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['install', `ruby@${version}`]);
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function activateRuby(version) {
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function pathExists(p) {
    try {
        await fs.promises.access(p);
        return true;
    }
    catch {
        return false;
    }
}
