import { Context } from 'koishi';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createAxiosInstance, requestWithRetry } from './proxy';
import { LOG_LEVELS } from './types';
import { logInfo } from './logger';
import sharp from 'sharp';

// 验证请求的安全性
function validateRequest(request: any, config: any): boolean {
  const token = request.query.token;
  const secret = request.headers['x-secret'];

  return token === config.restServerToken && secret === config.restServerSecret;
}

// 压缩图片
async function compressImage(buffer: Buffer, quality: number): Promise<Buffer> {
  try {
    const meta = await sharp(buffer).metadata();
    if (meta.hasAlpha) {
      return await sharp(buffer).png({ compressionLevel: 7 }).toBuffer();
    }
    return await sharp(buffer).jpeg({ quality }).toBuffer();
  } catch (error) {
    return buffer;
  }
}

export function startRestServer(ctx: Context, config: any) {
  const fastify = Fastify({
    logger: LOG_LEVELS[config.logLevel] >= LOG_LEVELS.info || false, });

  // 注册 CORS 中间件
  fastify.register(cors as any, {
    origin: true, // 允许所有来源
    methods: ['GET', 'POST'], allowedHeaders: ['X-Secret', 'Content-Type'], });

  const axiosWithProxy = createAxiosInstance(config, ctx);

  // 中间件：验证请求安全性
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!validateRequest(request, config)) {
      reply.status(401).header('Content-Type', 'application/json').send({
        success: false, error: 'Unauthorized: Invalid token or secret', });
      return;
    }
    done();
  });

  // 处理 /cs-bind/query 接口 - 查询用户绑定的 steamid
  fastify.get('/cs-bind/query', async (request, reply) => {
    const { platform, userid } = request.query as any;
    if (!platform || !userid) {
      return reply
        .status(400)
        .send({ success: false, error: 'Missing platform or userid' });
    }
    const res = await ctx.database.get('cs_lookup_vincentzyu_fork', {
      userid, platform, });
    if (res.length) {
      return { bound: true, steamid: res[0].steamId };
    }
    return { bound: false, steamid: null };
  });

  // 处理 /cs-inv 接口
  fastify.get('/cs-inv', async (request, reply) => {
    logInfo(ctx, config, 'info', 'src/rest-server.ts', `🌐 📥 REST /cs-inv 收到请求: steamid=${(request.query as any).steamid} refresh=${(request.query as any).refresh} ip=${request.ip}`);
    try {
      const { steamid, refresh } = request.query as any;

      if (!steamid) {
        return reply.status(400).send({
          success: false, error: 'Missing steamid parameter', });
      }

      // 验证 steamid 是否为纯数字
      if (!/^\d+$/.test(steamid)) {
        return reply.status(400).send({
          success: false, error: 'Invalid steamid format', });
      }

      // 优先使用 www.steamwebapi.com 的接口获取玩家信息，配额用尽则回退到官方 API
      const steamWebApiUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&steam_id=${steamid}`;
      const officialApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.officialSteamApiKey}&steamids=${steamid}`;
      const invUrl = `https://steamcommunity.com/inventory/${steamid}/730/2?l=schinese`;

      // 辅助函数：使用官方 Steam API 获取玩家信息
      async function fetchFromOfficialApi() {
        if (!config.officialSteamApiKey) return null;
        try {
          const officialRes = await requestWithRetry(
            () => axiosWithProxy.get(officialApiUrl), { label: 'Steam官方API', ctx });
          const players = officialRes?.data?.response?.players;
          if (players && players.length > 0) {
            const player = players[0];
            return {
              avatarfull: player.avatarfull || '', personaname: player.personaname || '未知用户', lastlogoff: player.lastlogoff, };
          }
        } catch (e) {
          logInfo(ctx, config, 'warn', 'src/rest-server.ts', `⚡ 🔌 ❌ 🎮 官方 Steam API 请求失败: ${e.message}`);
        }
        return null;
      }

      // 辅助函数：使用 steamwebapi.com 获取玩家信息
      async function fetchFromSteamWebApi() {
        if (!config.steamWebApiKey) return null;
        try {
          const userRes = await requestWithRetry(
            () => axiosWithProxy.get(steamWebApiUrl), { label: 'steamwebapi.com', ctx });
          const playerData = userRes?.data;
          return {
            avatarfull:
              playerData?.avatarfull || playerData?.player?.avatarfull || '', personaname:
              playerData?.personaname ||
              playerData?.player?.personaname ||
              '未知用户', lastlogoff:
              playerData?.lastlogoff || playerData?.player?.lastlogoff, };
        } catch (e) {
          const status = e.response?.status;
          if (status === 402) {
            logInfo(ctx, config, 'warn', 'src/rest-server.ts', '🔌 🌍 ⚠️ 💸 steamwebapi.com 配额已用尽 (402)');
          } else {
            logInfo(ctx, config, 'warn', 'src/rest-server.ts', `⚡ 🔌 ❌ 🌐 steamwebapi.com 请求失败 (${status || e.message})`);
          }
        }
        return null;
      }

      // 辅助函数：获取玩家信息（带回退逻辑，根据 preferOfficialSteamApi 决定优先级）
      async function fetchPlayerInfo() {
        const preferOfficial = config.preferOfficialSteamApi !== false; // 默认为 true

        if (preferOfficial) {
          // 优先官方 API，steamwebapi.com 作为回退
          logInfo(ctx, config, 'info', 'src/rest-server.ts', '🔌 🎮 优先使用官方 Steam API...');
          let result = await fetchFromOfficialApi();
          if (result) return result;

          logInfo(ctx, config, 'info', 'src/rest-server.ts', '⚡ 🔌 ⚠️ 🔀 官方 API 失败，回退到 steamwebapi.com...');
          result = await fetchFromSteamWebApi();
          if (result) return result;
        } else {
          // 优先 steamwebapi.com，官方 API 作为回退
          logInfo(ctx, config, 'info', 'src/rest-server.ts', '🔌 🌍 🌐 优先使用 steamwebapi.com...');
          let result = await fetchFromSteamWebApi();
          if (result) return result;

          logInfo(ctx, config, 'info', 'src/rest-server.ts', '⚡ 🔌 ⚠️ 🔀 steamwebapi.com 失败，回退到官方 Steam API...');
          result = await fetchFromOfficialApi();
          if (result) return result;
        }

        // 两个 API 都失败
        if (!config.steamWebApiKey && !config.officialSteamApiKey) {
          throw new Error(
            '未配置任何 Steam API Key，请在插件设置中至少填写一个 Key。\n• officialSteamApiKey: 官方免费 (steamcommunity.com/dev/apikey)\n• steamWebApiKey: 付费 (steamwebapi.com)');
        }
        throw new Error(
          '所有 Steam API 请求都失败，可能是网络问题或配额用尽。');
      }

      // 获取玩家信息
      logInfo(ctx, config, 'info', 'src/rest-server.ts', '🎮 👤 开始获取玩家信息...');
      const playerInfo = await fetchPlayerInfo();
      logInfo(ctx, config, 'info', 'src/rest-server.ts', `✔️ 🎮 ✅ 👤 玩家信息获取成功: ${playerInfo.personaname}`);

      // 获取库存数据（支持缓存）
      const useCache = config.enableInvDbCache && config.invDbCacheDays > 0 && refresh !== 'true';
      let invData: any;
      let usedCache = false;
      if (useCache) {
        const cached = await ctx.database.get('cs_inv_cache_vincentzyu_fork', {
          steamid, });
        if (cached.length) {
          const age = (Date.now() - cached[0].cached_at) / 86400000;
          if (age < config.invDbCacheDays) {
            invData = JSON.parse(cached[0].inv_json);
            usedCache = true;
            logInfo(ctx, config, 'info', 'src/rest-server.ts', `💿 🗄️ 💾 ✅ REST: 使用数据库缓存: ${steamid}`);
          }
        }
      }
      if (!usedCache) {
        logInfo(ctx, config, 'info', 'src/rest-server.ts', '🎒 📦 开始获取库存数据...');
        const invRes = await requestWithRetry(
          () => axiosWithProxy.get(invUrl), { label: 'Steam库存数据', ctx });
        invData = invRes.data;
        logInfo(ctx, config, 'info', 'src/rest-server.ts', `✔️ 🎒 ✅ 📦 库存数据获取成功，物品数量: ${invData.total_inventory_count || 0}`);
        if (config.enableInvDbCache && config.invDbCacheDays > 0) {
          await ctx.database.upsert('cs_inv_cache_vincentzyu_fork', [
            {
              steamid, inv_json: JSON.stringify(invData), cached_at: Date.now(), }, ]);
        }
      }

      // 包装返回数据
      const responseData = {
        success: true, metadata: {
          steamid, timestamp: Date.now(), api: 'Steam Inventory API', player: {
            name: playerInfo.personaname, avatar: playerInfo.avatarfull, }, }, data: invData, };

      logInfo(ctx, config, 'info', 'src/rest-server.ts', '📥 📡 ✅ 准备返回响应...');
      return responseData;
    } catch (error) {
      logInfo(ctx, config, 'error', 'src/rest-server.ts', `⚡ 🔌 ❌ 💥 REST API 错误: ${error.stack || error}`);
      // 确保返回有效的 JSON 响应
      try {
        return reply.status(500).send({
          success: false, error: error.message || 'Internal server error', });
      } catch (replyError) {
        logInfo(ctx, config, 'error', 'src/rest-server.ts', `⚡ 📥 ❌ 💥 响应错误: ${replyError.stack || replyError}`);
        // 作为最后的尝试，返回一个简单的错误响应
        return {
          success: false, error: 'Internal server error', };
      }
    }
  });

  // 处理 /cs-inv/image 接口
  fastify.get('/cs-inv/image', async (request, reply) => {
    try {
      const { icon_url, quality } = request.query as any;

      if (!icon_url) {
        return reply.status(400).send({
          success: false, error: 'Missing icon_url parameter', });
      }

      // 构建完整的饰品图片 URL
      const imageUrl = `https://community.cloudflare.steamstatic.com/economy/image/${icon_url}`;
      const compressionQuality = quality
        ? parseInt(quality)
        : config.imageCompressionQuality || 80;

      // 获取图片
      const response = await requestWithRetry(
        () => axiosWithProxy.get(imageUrl, { responseType: 'arraybuffer' }), { label: `cs-inv-image(${icon_url})`, ctx });

      // 压缩图片
      const rawBuffer = Buffer.from(response.data);
      const meta = await sharp(rawBuffer).metadata();
      const hasAlpha = !!meta.hasAlpha;
      const compressedBuffer = await compressImage(
        rawBuffer, compressionQuality);

      // 返回图片
      reply.header('Content-Type', hasAlpha ? 'image/png' : 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400'); // 缓存1天
      return compressedBuffer;
    } catch (error) {
      logInfo(ctx, config, 'error', 'src/rest-server.ts', `⚡ ❌ 🖼️ REST API 图片代理错误: ${error.stack || error}`);
      return reply.status(500).send({
        success: false, error: error.message || 'Internal server error', });
    }
  });

  // 处理 /steam-player/image 接口
  fastify.get('/steam-player/image', async (request, reply) => {
    try {
      const { url, quality } = request.query as any;

      if (!url) {
        return reply.status(400).send({
          success: false, error: 'Missing url parameter', });
      }

      const compressionQuality = quality
        ? parseInt(quality)
        : config.imageCompressionQuality || 80;

      // 获取图片
      const response = await requestWithRetry(
        () => axiosWithProxy.get(url, { responseType: 'arraybuffer' }), { label: `steam-player-image(${url})`, ctx });

      // 压缩图片
      const compressedBuffer = await compressImage(
        Buffer.from(response.data), compressionQuality);

      // 返回图片
      reply.header('Content-Type', 'image/jpeg');
      reply.header('Cache-Control', 'public, max-age=86400'); // 缓存1天
      return compressedBuffer;
    } catch (error) {
      logInfo(ctx, config, 'error', 'src/rest-server.ts', `⚡ 🔗 ❌ 👤 REST API 玩家头像代理错误: ${error.stack || error}`);
      return reply.status(500).send({
        success: false, error: error.message || 'Internal server error', });
    }
  });

  // 启动服务器
  fastify.listen(
    {
      host: config.restServerHost || '0.0.0.0', port: config.restServerPort || 60730, }, (err, address) => {
      if (err) {
        logInfo(ctx, config, 'error', 'src/rest-server.ts', `🚀 ⚡ ❌ 🌐 REST 服务器启动失败: ${err}`);
        return;
      }
      logInfo(ctx, config, 'info', 'src/rest-server.ts', `🚀 ✔️ ✅ 🌐 REST 服务器已启动: ${address}`);
    });

  // 返回 Fastify 实例，以便在插件 dispose 时关闭
  return fastify;
}
