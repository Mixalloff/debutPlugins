import { DebutMeta, DebutOptions } from '@debut/types';
import path from 'path';
import { readFile } from './file';

/**
 * API tokens data
 */
export const token = process.env['API_TOKEN'];

/**
 * Cache free require.
 * For easy working in runtime imports after recompyle
 */
export function requireUncached<T extends Record<string, unknown>>(module: string): T {
    delete require.cache[require.resolve(module)];
    return require(module);
}

/**
 * Information data about bot.
 * Readed from schema.json file
 */
export type BotDataInfo = { name: string; path: string; src: string };

/**
 * Bot meta information e.g. configs, working directories
 */
export type BotData = {
    configs: Record<string, DebutOptions>;
    meta: DebutMeta;
    dir: string;
    src: string;
};

/**
 * Read schema file from working dir
 */
export function getBotsSchema() {
    return JSON.parse(readFile(`${process.cwd()}/schema.json`)!);
}

/**
 * Collect bot meta information
 */
export async function getBotData(name: string, schema = getBotsSchema()): Promise<BotData | null> {
    const botData: BotDataInfo = schema.find((bot: BotDataInfo) => bot.name === name);

    if (!schema) {
        process.stdout.write(`[ERROR] File schema.json not found\n`);
        return null;
    }

    if (!botData) {
        process.stdout.write(`[ERROR] Bot data in schema.json not found\n`);
        return null;
    }

    const dir = path.resolve(botData.path);
    const src = path.resolve(botData.src);

    try {
        const botModule = await requireUncached(`${dir}/bot.js`);
        const botCfgModule = await requireUncached<Record<string, DebutOptions>>(`${dir}/cfgs.js`);
        const { default: meta } = await requireUncached<{ default: DebutMeta }>(`${dir}/meta.js`);

        if (!botCfgModule) {
            process.stdout.write(`[ERROR] No configs for bot\n`);
            return null;
        }

        if (!(name in botModule)) {
            process.stdout.write(`[ERROR] ${name} is incorrect bot constructor name\n`);
            return null;
        }

        return { configs: botCfgModule, meta, dir, src };
    } catch (e) {
        console.log('Error strategy data loading', e);
        return null;
    }
}

/**
 * Get arguments from command line
 */
export function getArgs<T extends any>(): T {
    const args: Record<string, string | boolean> = {};
    process.argv.slice(2, process.argv.length).forEach((arg) => {
        // long arg
        if (arg.slice(0, 2) === '--') {
            const longArg = arg.split('=');
            const longArgFlag = longArg[0].slice(2, longArg[0].length);
            const longArgValue = longArg.length > 1 ? longArg[1] : true;
            args[longArgFlag] = longArgValue;
        }
        // flags
        else if (arg[0] === '-') {
            const flags = arg.slice(1, arg.length).split('');
            flags.forEach((flag) => {
                args[flag] = true;
            });
        }
    });

    return args as T;
}

export function getTokens(): Record<string, string> {
    return JSON.parse(readFile(`${process.cwd()}/.tokens.json`)!);
}
