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
    return '3.3';
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
async function installRuby(version) {
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['install', `ruby@${version}`]);
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function activateRuby(version) {
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
