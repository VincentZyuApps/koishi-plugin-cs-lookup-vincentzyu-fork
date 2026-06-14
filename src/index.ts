import { Context } from 'koishi';
import { inv } from './commands/cs-inv';
import { apply as getId } from './commands/getid';
import { bind } from './commands/cs-bind';
import { myid } from './commands/cs-myid';
import { startRestServer } from './rest-server';
import type { Config as CsLookupConfig } from './config';
import { Config as ConfigSchema } from './config';
export { usage } from './usage';

export const name = 'cs-lookup-vincentzyu-fork';
export const Config = ConfigSchema;

export const inject = {
  required: ['puppeteer', 'database'],
};

declare module 'koishi' {
  interface Tables {
    cs_lookup_vincentzyu_fork: CsLookup;
    cs_inv_cache_vincentzyu_fork: CsInvCache;
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

export function apply(ctx: Context, config: CsLookupConfig) {
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
  inv(ctx, config);
  getId(ctx, config);
  bind(ctx, config);
  myid(ctx, config);

  // 启动 REST 服务器
  let restServer;
  if (config.enableRestServer) {
    restServer = startRestServer(ctx, config);
  }

  // 在插件 dispose 时关闭 REST 服务器
  ctx.on('dispose', () => {
    if (restServer) {
      ctx.logger.info('[src/index.ts] [info] 🛑 🌐 正在关闭 REST 服务器...');
      restServer.close((err) => {
        if (err) {
          ctx.logger.error(
            `[src/index.ts] [error] ❌ 🌐 REST 服务器关闭失败: ${err}`,
          );
        } else {
          ctx.logger.info('[src/index.ts] [info] ✅ 🌐 REST 服务器已关闭');
        }
      });
    }
  });
}
