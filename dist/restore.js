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
const core = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
async function run() {
    try {
        const cliVersion = core.getInput('cli-version') || 'v1.0.3';
        const inputs = {
            workspace: core.getInput('workspace'),
            rubyVersion: core.getInput('ruby-version'),
            workingDirectory: core.getInput('working-directory') || '.',
            cacheTagPrefix: core.getInput('cache-tag-prefix') || 'ruby',
            bundlePath: core.getInput('bundle-path') || 'vendor/bundle',
            cacheRuby: core.getBooleanInput('cache-ruby'),
            verbose: core.getInput('verbose') === 'true',
            exclude: core.getInput('exclude'),
        };
        // Setup BoringCache CLI
        await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        // Get workspace
        const workspace = (0, utils_1.getWorkspace)(inputs.workspace);
        core.setOutput('workspace', workspace);
        // Get Ruby version
        const workingDir = path.resolve(inputs.workingDirectory);
        const rubyVersion = await (0, utils_1.getRubyVersion)(inputs.rubyVersion, workingDir);
        core.setOutput('ruby-version', rubyVersion);
        // Generate cache tags (content-addressing handled by CLI)
        const rubyTag = `${inputs.cacheTagPrefix}-ruby-${rubyVersion}`;
        const bundleTag = `${inputs.cacheTagPrefix}-bundle-${rubyVersion}`;
        core.setOutput('ruby-tag', rubyTag);
        core.setOutput('bundle-tag', bundleTag);
        const miseDir = (0, utils_1.getMiseDataDir)();
        const bundleDir = path.join(workingDir, inputs.bundlePath);
        // Restore Ruby cache
        let rubyCacheHit = false;
        if (inputs.cacheRuby) {
            const rubyArgs = ['restore', workspace, `${rubyTag}:${miseDir}`];
            if (inputs.verbose)
                rubyArgs.push('--verbose');
            const result = await (0, utils_1.execBoringCache)(rubyArgs, { ignoreReturnCode: true });
            rubyCacheHit = result === 0;
            core.setOutput('ruby-cache-hit', rubyCacheHit.toString());
        }
        // Install mise
        await (0, utils_1.installMise)();
        // Install or activate Ruby
        if (rubyCacheHit) {
            await (0, utils_1.activateRuby)(rubyVersion);
        }
        else {
            await (0, utils_1.installRuby)(rubyVersion);
        }
        // Restore bundle cache
        const bundleArgs = ['restore', workspace, `${bundleTag}:${bundleDir}`];
        if (inputs.verbose)
            bundleArgs.push('--verbose');
        const bundleResult = await (0, utils_1.execBoringCache)(bundleArgs, { ignoreReturnCode: true });
        const bundleCacheHit = bundleResult === 0;
        core.setOutput('cache-hit', bundleCacheHit.toString());
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
    }
    catch (error) {
        core.setFailed(`Ruby setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
