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
        const cliVersion = core.getInput('cli-version') || 'v1.0.0';
        const workspace = core.getState('workspace');
        const rubyTag = core.getState('ruby-tag');
        const bundleTag = core.getState('bundle-tag');
        const miseDir = core.getState('mise-dir');
        const bundleDir = core.getState('bundle-dir');
        const cacheRuby = core.getState('cache-ruby') === 'true';
        const exclude = core.getState('exclude');
        if (!workspace) {
            core.info('No workspace found in state, skipping cache save');
            return;
        }
        await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        core.info('Saving to BoringCache...');
        if (cacheRuby && rubyTag) {
            core.info(`Saving Ruby [${rubyTag}]...`);
            await (0, utils_1.execBoringCache)(['save', workspace, `${rubyTag}:${miseDir}`]);
        }
        if (bundleTag) {
            core.info(`Saving bundle [${bundleTag}]...`);
            const args = ['save', workspace, `${bundleTag}:${bundleDir}`];
            if (exclude) {
                args.push('--exclude', exclude);
            }
            await (0, utils_1.execBoringCache)(args);
        }
        core.info('Save complete');
    }
    catch (error) {
        core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
