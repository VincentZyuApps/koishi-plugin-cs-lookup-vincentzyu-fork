import { Context } from 'koishi';
import { registerCsHelpCommand } from './commands/cs-help';
import { inv } from './commands/cs-inv';
import { registerSteamGetIdCommand } from './commands/steam-getid';
import { registerSteamBindCommand } from './commands/steam-bind';
import { registerSteamMyIdCommand } from './commands/steam-myid';
import { startRestServer } from './server';
import type { Config as CsLookupConfig } from './config';
import { Config as ConfigSchema } from './config';
import { logInfo } from './logger';
import { checkAndDownloadFonts } from './font';
export { usage } from './usage';

export const name = 'cs-lookup-vincentzyu-fork';
const PLUGIN_NAME = name;
export const Config = ConfigSchema;

export const inject = {
  required: ['puppeteer', 'database', 'http'],
};

declare module 'koishi' {
  interface Tables {
    cs_lookup_vincentzyu_fork: CsLookup;
    cs_inv_cache_vincentzyu_fork: CsInvCache;
    cs_steam_getid_cache_vincentzyu_fork: CsSteamGetIdCache;
  }
}

export interface CsLookup {
  id: string;
  steamId: string;
  userid: string;
  platform: string;
}

export interface CsInvCache {
  steamid: string;
  inv_json: string;
  cached_at: number;
}

export interface CsSteamGetIdCache {
  url: string;
  steamId: string;
  personaName: string;
  cached_at: number;
}

export function apply(ctx: Context, config: CsLookupConfig) {
  checkAndDownloadFonts(ctx, PLUGIN_NAME).catch((error) => {
    ctx.logger.warn(`⚠️ apply 阶段默认字体预检查失败，将在指令执行时重试: ${error?.message || error}`);
  });

  ctx.model.extend(
    'cs_lookup_vincentzyu_fork',
    {
      id: 'string',
      steamId: 'string',
      userid: 'string',
      platform: 'string',
    },
    {},
  );
  ctx.model.extend(
    'cs_inv_cache_vincentzyu_fork',
    {
      steamid: 'string',
      inv_json: 'string',
      cached_at: 'integer',
    },
    { primary: 'steamid' },
  );
  ctx.model.extend(
    'cs_steam_getid_cache_vincentzyu_fork',
    {
      url: 'string',
      steamId: 'string',
      personaName: 'string',
      cached_at: 'integer',
    },
    { primary: 'url' },
  );
  registerCsHelpCommand(ctx, config);
  inv(ctx, config);
  registerSteamGetIdCommand(ctx, config);
  registerSteamBindCommand(ctx, config);
  registerSteamMyIdCommand(ctx, config);

  // 启动 REST 服务器
  let restServer;
  if (config.enableRestServer) {
    restServer = startRestServer(ctx, config);
  }

  // 在插件 dispose 时关闭 REST 服务器
  ctx.on('dispose', () => {
    if (restServer) {
      logInfo(ctx, config, 'info', 'src/index.ts', '⛔ 🛑 🌐 正在关闭 REST 服务器...');
      restServer.close((err) => {
        if (err) {
          logInfo(ctx, config, 'error', 'src/index.ts', `⛔ ⚡ ❌ 🌐 REST 服务器关闭失败: ${err}`);
        } else {
          logInfo(ctx, config, 'info', 'src/index.ts', '⛔ ✔️ ✅ 🌐 REST 服务器已关闭');
        }
      });
    }
  });
}
