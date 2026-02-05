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
exports.setupBoringCache = setupBoringCache;
exports.execBoringCache = execBoringCache;
exports.getWorkspace = getWorkspace;
exports.getRubyVersion = getRubyVersion;
exports.getFileHash = getFileHash;
exports.installMise = installMise;
exports.installRuby = installRuby;
exports.activateRuby = activateRuby;
exports.pathExists = pathExists;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
async function setupBoringCache() {
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
        }
        catch {
            core.warning('Authentication failed');
        }
    }
    else {
        core.warning('BORINGCACHE_API_TOKEN not set, caching will not work');
    }
}
async function execBoringCache(args, options = {}) {
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
        }
        catch {
            continue;
        }
    }
    const exitCode = await core.group('Run Boringcache', async () => {
        var _a;
        return await exec.exec(boringcachePath, args, {
            ignoreReturnCode: (_a = options.ignoreReturnCode) !== null && _a !== void 0 ? _a : false
        });
    });
    return exitCode;
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
async function getFileHash(filePath) {
    try {
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const content = await fs.promises.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    }
    catch {
        return '';
    }
}
async function installMise() {
    await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
    const homedir = os.homedir();
    core.addPath(`${homedir}/.local/bin`);
    core.addPath(`${homedir}/.local/share/mise/shims`);
}
async function installRuby(version) {
    const homedir = os.homedir();
    const misePath = `${homedir}/.local/bin/mise`;
    await exec.exec(misePath, ['install', `ruby@${version}`]);
    await exec.exec(misePath, ['use', '-g', `ruby@${version}`]);
}
async function activateRuby(version) {
    const homedir = os.homedir();
    const misePath = `${homedir}/.local/bin/mise`;
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
