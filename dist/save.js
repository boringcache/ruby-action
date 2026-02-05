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
const utils_1 = require("./utils");
async function run() {
    try {
        // Get state from restore phase
        const cliVersion = core.getInput('cli-version') || 'v1.0.0';
        const workspace = core.getState('workspace');
        const rubyTag = core.getState('ruby-tag');
        const bundleTag = core.getState('bundle-tag');
        const miseDir = core.getState('mise-dir');
        const bundleDir = core.getState('bundle-dir');
        const cacheRuby = core.getState('cache-ruby') === 'true';
        const rubyCacheHit = core.getState('ruby-cache-hit') === 'true';
        const bundleCacheHit = core.getState('bundle-cache-hit') === 'true';
        const exclude = core.getState('exclude');
        if (!workspace) {
            return;
        }
        // Ensure CLI is available
        await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        // Save Ruby cache (if not already cached)
        if (cacheRuby && !rubyCacheHit && await (0, utils_1.pathExists)(miseDir)) {
            const args = ['save', workspace, `${miseDir}:${rubyTag}`];
            await (0, utils_1.execBoringCache)(args, { ignoreReturnCode: true });
        }
        // Save bundle cache (if not already cached)
        if (!bundleCacheHit && await (0, utils_1.pathExists)(bundleDir)) {
            const args = ['save', workspace, `${bundleDir}:${bundleTag}`];
            if (exclude) {
                args.push('--exclude', exclude);
            }
            await (0, utils_1.execBoringCache)(args, { ignoreReturnCode: true });
        }
    }
    catch (error) {
        core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
