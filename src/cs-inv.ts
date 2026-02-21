import { Context, h } from 'koishi';
import { Config, umami } from './index';
import { createAxiosInstance, requestWithRetry } from './proxy';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-umami-statistics-service';
import * as fs from 'fs';
import * as path from 'path';

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export const light = ['#81a1c1', '#2e3440', '#5e81ac']; // Changed font color to a dark gray
export const dark = ['#2e3440', '#ffffff', '#434c5e'];

// 缓存目录路径
const CACHE_DIR = path.join(__dirname, '..', 'cache', 'inv_image');
const INV_DATA_DIR = path.join(__dirname, '..', 'cache', 'inv_data');

// 字体相关常量
const BASE_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Microsoft YaHei", "PingFang SC", sans-serif';
const CUSTOM_FONT_FAMILY = 'CSLookupCustomFont';

/**
 * 获取字体格式
 */
function getFontFormat(ext: string): string {
  if (ext === '.otf') return 'opentype';
  if (ext === '.woff2') return 'woff2';
  if (ext === '.woff') return 'woff';
  return 'truetype';
}

/**
 * 获取字体 MIME 类型
 */
function getFontMimeType(ext: string): string {
  if (ext === '.otf') return 'font/otf';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.woff') return 'font/woff';
  return 'font/ttf';
}

interface CustomFontConfig {
  css: string;
  fontFamily: string;
}

/**
 * 构建自定义字体配置
 */
function buildCustomFontConfig(ctx: Context, fontPath?: string | null): CustomFontConfig | null {
  if (!fontPath || fontPath.trim() === '') return null;
  
  const resolvedPath = path.isAbsolute(fontPath) ? fontPath : path.resolve(fontPath);
  if (!fs.existsSync(resolvedPath)) {
    ctx.logger.warn(`[cs-lookup] 自定义字体文件不存在: ${resolvedPath}`);
    return null;
  }

  try {
    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const format = getFontFormat(ext);
    const mime = getFontMimeType(ext);
    
    const css = `@font-face {
      font-family: '${CUSTOM_FONT_FAMILY}';
      src: url('data:${mime};base64,${buffer.toString('base64')}') format('${format}');
      font-weight: normal;
      font-style: normal;
    }`;
    
    ctx.logger.debug(`[cs-lookup] 成功加载自定义字体: ${resolvedPath}`);
    return {
      css,
      fontFamily: `'${CUSTOM_FONT_FAMILY}', ${BASE_FONT_STACK}`
    };
  } catch (e) {
    ctx.logger.warn(`[cs-lookup] 加载自定义字体失败: ${e}`);
    return null;
  }
}

/**
 * 确保缓存目录存在
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 根据 classid 和 instanceid 生成缓存文件路径
 */
function getCacheFilePath(classid: string, instanceid: string): string {
  return path.join(CACHE_DIR, `item_class_${classid}_instance_${instanceid}.b64`);
}

/**
 * 从缓存读取 Base64 图片
 */
function readFromCache(classid: string, instanceid: string): string | null {
  const filePath = getCacheFilePath(classid, instanceid);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 写入缓存
 */
function writeToCache(classid: string, instanceid: string, base64Data: string): void {
  try {
    const filePath = getCacheFilePath(classid, instanceid);
    fs.writeFileSync(filePath, base64Data, 'utf-8');
  } catch (e) {
    // 写入失败静默忽略
  }
}

/**
 * 确保 inv_data 目录存在
 */
function ensureInvDataDir(): void {
  if (!fs.existsSync(INV_DATA_DIR)) {
    fs.mkdirSync(INV_DATA_DIR, { recursive: true });
  }
}

/**
 * 将 invData 写入文件
 */
function writeInvDataToFile(data: any): void {
  ensureInvDataDir();
  const filePath = path.join(INV_DATA_DIR, 'res.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取图片的 Base64 编码
 */
async function getImageBase64(ctx: Context, axiosInstance: any, url: string): Promise<string> {
  if (!url) return '';
  try {
    const response = await requestWithRetry(
      () => axiosInstance.get(url, { responseType: 'arraybuffer' }),
      { label: `getImageBase64(${url})`, ctx }
    );
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    ctx.logger.warn(`[cs-lookup] 转换图片为Base64失败: ${url}, error: ${e.message}`);
    return url; // 回退到原始 URL
  }
}

/**
 * 获取饰品图片的 Base64 编码（带缓存）
 * @returns { base64: string, fromCache: boolean }
 */
async function getItemImageBase64(
  ctx: Context, 
  axiosInstance: any, 
  iconUrl: string, 
  classid: string, 
  instanceid: string,
  enableCache: boolean,
  verboseLog: boolean
): Promise<{ base64: string; fromCache: boolean }> {
  const imageUrl = "https://community.cloudflare.steamstatic.com/economy/image/" + iconUrl;
  
  // 尝试从缓存读取
  if (enableCache) {
    const cached = readFromCache(classid, instanceid);
    if (cached) {
      if (verboseLog) {
        ctx.logger.info(`[cs-lookup] 📦 缓存命中: class_${classid}_instance_${instanceid}`);
      }
      return { base64: cached, fromCache: true };
    }
  }
  
  // 缓存未命中，从网络获取
  const base64Data = await getImageBase64(ctx, axiosInstance, imageUrl);
  
  // 写入缓存（仅当成功获取且不是回退URL时）
  if (enableCache && base64Data.startsWith('data:')) {
    writeToCache(classid, instanceid, base64Data);
  }
  
  return { base64: base64Data, fromCache: false };
}

export function inv(ctx: Context, config: any) {
  const axiosWithProxy = createAxiosInstance(config, ctx);

  const umamiD = umami;
  ctx.command('cs-inv [targetUser:text]', '查看CS背包', { authority: 0 })
    .option('steamid', '-s, --steamid <steamid:string> 直接指定steam的id')
    .action(async ({ session, options }, targetUser) => {
      // ========== 时间统计 ==========
      const timingEnabled = config.verboseConsoleLog;
      const startTime = Date.now();
      const timing: { [key: string]: number } = {};
      
      const logTiming = (label: string) => {
        if (timingEnabled) {
          const elapsed = Date.now() - startTime;
          timing[label] = elapsed;
          ctx.logger.info(`[cs-lookup] ⏱️ ${label}: ${elapsed}ms`);
        }
      };
      // ==============================

      if (config.data_collect) {
        ctx.umamiStatisticsService.send({
          dataHostUrl: umamiD[1],
          website: umamiD[0],
          url: '/cs-inv',
          urlSearchParams: {
            args: session.argv.args?.join(', '),
            ...(session.argv.options || {}),
          },
        });
      }

      let PLATFORM = session.platform;
      let USERID = session.userId;
      let STEAMID;

      // 处理 targetUser 参数（可以是 @用户 或者 userid）
      if (targetUser) {
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = targetUser.match(userIdRegex);
        if (match) {
          // 是艾特格式
          USERID = match[1];
          ctx.logger.info(`[cs-lookup] 解析到艾特用户: ${USERID}`);
        } else {
          // 不是艾特，当作 userid 处理
          USERID = targetUser.trim();
          ctx.logger.info(`[cs-lookup] 使用 userid: ${USERID}`);
        }
      }

      // 如果通过 -s 指定了 steamid，直接使用
      if (options.steamid) {
        STEAMID = options.steamid;
        ctx.logger.info(`[cs-lookup] 使用 -s 指定的 steamid: ${STEAMID}`);
      } else {
        // 否则从数据库查询绑定的 steamid
        const res = await ctx.database.get('cs_lookup', { userid: USERID, platform: PLATFORM });
        if (res.length) {
          STEAMID = res[0].steamId;
          ctx.logger.info(`[cs-lookup] 从数据库查询到 steamid: ${STEAMID}`);
        } else {
          const replyPrefixNoSteamId = config.replyToUser ? h.quote(session.messageId) : '';
          return `${replyPrefixNoSteamId}请提供 steamID 或者使用 \`getid\` 命令获取或者使用 \`cs-bind <steamID>\` 进行绑定\n(查询的用户: ${USERID})`;
        }
      }

      ctx.logger.info(`STEAMID = ${STEAMID}, USERID = ${USERID}`);
      const replyPrefix = config.replyToUser ? h.quote(session.messageId) : '';
      const waitMsgId = await session.send(`${replyPrefix}正在获取steam库存... \n\t steamId = ${STEAMID}\n\t 渲染图片中....`);

      if (!isOnlyDigits(STEAMID)) {
        return `${replyPrefix}无效steamID, 若不知道steamID请使用指令 \`getid Steam个人资料页链接\` 获取`;
      }

      // 优先使用 www.steamwebapi.com 的接口获取玩家信息，配额用尽则回退到官方 API
      const steamWebApiUrl = `https://www.steamwebapi.com/steam/api/profile?key=${config.steamWebApiKey}&steam_id=${STEAMID}`;
      const officialApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config.officialSteamApiKey}&steamids=${STEAMID}`;
      const invUrl = `https://steamcommunity.com/inventory/${STEAMID}/730/2?l=schinese`;
      
      const currentColorArr = config.enableDarkTheme ? dark : light;

      // 辅助函数：使用官方 Steam API 获取玩家信息
      async function fetchFromOfficialApi(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number } | null> {
        if (!config.officialSteamApiKey) return null;
        try {
          const officialRes = await requestWithRetry(
            () => axiosWithProxy.get(officialApiUrl),
            { label: 'Steam官方API', ctx }
          );
          const players = officialRes?.data?.response?.players;
          if (players && players.length > 0) {
            const player = players[0];
            return {
              avatarfull: player.avatarfull || '',
              personaname: player.personaname || '未知用户',
              lastlogoff: player.lastlogoff,
            };
          }
        } catch (e) {
          ctx.logger.warn(`[cs-lookup] 官方 Steam API 请求失败: ${e.message}`);
        }
        return null;
      }

      // 辅助函数：使用 steamwebapi.com 获取玩家信息
      async function fetchFromSteamWebApi(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number } | null> {
        if (!config.steamWebApiKey) return null;
        try {
          const userRes = await requestWithRetry(
            () => axiosWithProxy.get(steamWebApiUrl),
            { label: 'steamwebapi.com', ctx }
          );
          const playerData = userRes?.data;
          return {
            avatarfull: playerData?.avatarfull || playerData?.player?.avatarfull || '',
            personaname: playerData?.personaname || playerData?.player?.personaname || '未知用户',
            lastlogoff: playerData?.lastlogoff || playerData?.player?.lastlogoff,
          };
        } catch (e) {
          const status = e.response?.status;
          if (status === 402) {
            ctx.logger.warn(`[cs-lookup] steamwebapi.com 配额已用尽 (402)`);
          } else {
            ctx.logger.warn(`[cs-lookup] steamwebapi.com 请求失败 (${status || e.message})`);
          }
        }
        return null;
      }

      // 辅助函数：获取玩家信息（带回退逻辑，根据 preferOfficialSteamApi 决定优先级）
      async function fetchPlayerInfo(): Promise<{ avatarfull: string; personaname: string; lastlogoff?: number }> {
        const preferOfficial = config.preferOfficialSteamApi !== false; // 默认为 true
        
        if (preferOfficial) {
          // 优先官方 API，steamwebapi.com 作为回退
          ctx.logger.info(`[cs-lookup] 优先使用官方 Steam API...`);
          let result = await fetchFromOfficialApi();
          if (result) return result;
          
          ctx.logger.info(`[cs-lookup] 官方 API 失败，回退到 steamwebapi.com...`);
          result = await fetchFromSteamWebApi();
          if (result) return result;
        } else {
          // 优先 steamwebapi.com，官方 API 作为回退
          ctx.logger.info(`[cs-lookup] 优先使用 steamwebapi.com...`);
          let result = await fetchFromSteamWebApi();
          if (result) return result;
          
          ctx.logger.info(`[cs-lookup] steamwebapi.com 失败，回退到官方 Steam API...`);
          result = await fetchFromOfficialApi();
          if (result) return result;
        }

        // 两个 API 都失败
        if (!config.steamWebApiKey && !config.officialSteamApiKey) {
          throw new Error('未配置任何 Steam API Key，请在插件设置中至少填写一个 Key。\n• officialSteamApiKey: 官方免费 (steamcommunity.com/dev/apikey)\n• steamWebApiKey: 付费 (steamwebapi.com)');
        }
        throw new Error('所有 Steam API 请求都失败，可能是网络问题或配额用尽。');
      }

      try {
        const playerInfo = await fetchPlayerInfo();
        logTiming('获取玩家信息');
        
        const playerAvatarFullUrl = playerInfo.avatarfull;
        
        // 将头像转为 Base64
        const proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
        logTiming('转换头像为Base64');
        
        ctx.logger.info(`playerAvatarFullUrl = ${playerAvatarFullUrl}`);
        const playerPersonName = playerInfo.personaname;
        const playerLastLogoff = playerInfo.lastlogoff;
        const playerLastLogoffTimeStr = playerLastLogoff ? (new Date(playerLastLogoff * 1000)).toLocaleString() : '未知';

        const invRes = await requestWithRetry(
          () => axiosWithProxy.get(invUrl),
          { label: 'Steam库存数据', ctx }
        );
        const invData = invRes.data;
        logTiming('获取库存数据');

        ctx.logger.info(`[debug] invData = ${JSON.stringify(invData).slice(0, 1000)}[end]`);

        // 如果开启 verboseFileLog，将完整 invData 写入文件
        if (config.verboseFileLog) {
          try {
            writeInvDataToFile(invData);
            ctx.logger.info(`[cs-lookup] 📝 已将库存数据写入: ${path.join(INV_DATA_DIR, 'res.json')}`);
          } catch (e) {
            ctx.logger.warn(`[cs-lookup] 写入库存数据文件失败: ${e.message}`);
          }
        }

        let cardHtml = ``;
        let gridColumns = config.gridColumns || 4;
        let totalStr = '';
        let pageHeight = 500;

        if (!invData.descriptions || invData.descriptions.length === 0) {
          // 如果没有库存，显示一个醒目的提示
          ctx.logger.info(`invData没有descriptions字段。`);
          gridColumns = 1;
          totalStr = `总物品数: 0`;
          cardHtml = `
            <div class="empty-message">📦 该用户没有CS2库存</div>
          `;
          pageHeight = 400;
        } else {
          // 否则，正常处理库存数据
          ctx.logger.info(`invData有有descriptions字段。`);
          
          // 确保缓存目录存在
          if (config.enableImageCache !== false) {
            ensureCacheDir();
          }
          
          const itemMap = new Map<string, { count: number, imageUrl: string }>();
          let cacheHitCount = 0;
          let cacheMissCount = 0;
          
          for (const item of invData.descriptions) {
            const itemName = item.market_name;
            const classid = item.classid || '';
            const instanceid = item.instanceid || '0';
            
            if (!itemMap.has(itemName)) {
              // 将饰品图片转为 Base64（带缓存）
              const result = await getItemImageBase64(
                ctx, 
                axiosWithProxy, 
                item.icon_url, 
                classid, 
                instanceid,
                config.enableImageCache !== false,
                config.verboseConsoleLog
              );
              
              // 统计缓存命中情况
              if (result.fromCache) {
                cacheHitCount++;
              } else {
                cacheMissCount++;
              }
              
              itemMap.set(itemName, { count: 0, imageUrl: result.base64 });
            }
            let itemInfo = itemMap.get(itemName);
            itemInfo.count += 1;
          }
          
          if (timingEnabled && config.enableImageCache !== false) {
            ctx.logger.info(`[cs-lookup] 📊 缓存统计: 命中 ${cacheHitCount}, 未命中 ${cacheMissCount}`);
          }
          logTiming('转换饰品图片为Base64');

          for (const [itemName, itemInfo] of itemMap.entries()) {
            const countBadge = itemInfo.count > 1 ? `<span class="item-count">x${itemInfo.count}</span>` : '';
            cardHtml += `
              <div class="item-card">
                ${countBadge}
                <div class="item-image-wrapper">
                  <img src="${itemInfo.imageUrl}" alt="${itemName}" class="item-image">
                </div>
                <div class="item-name">${itemName}</div>
              </div>
            `;
          }

          totalStr = `总物品数: ${invData.total_inventory_count}`;
          const CARD_HEIGHT_CALC = 150; // 与样式中卡片高度保持一致
          const GAP_CALC = 8;           // 与网格间距保持一致
          const rowCount = Math.ceil(itemMap.size / gridColumns);
          pageHeight = 150 + rowCount * (CARD_HEIGHT_CALC + GAP_CALC) + 40;
        }

        // 构建自定义字体配置
        const fontConfig = buildCustomFontConfig(ctx, config.customFontPath);
        
        const html = generateHtml({
          cardHTML: cardHtml,
          gridColumns,
          totalStr,
          steamId: STEAMID,
          steamName: playerPersonName,
          playerAvatarUrl: proxiedPlayerAvatarFullUrl,
          playerLastLogoffTimeStr,
          darkMode: config.enableDarkTheme,
          enableAvatarBackground: config.enableAvatarBackground,
          fontConfig,
          showItemCount: config.showItemCount !== false,
          itemCountCorner: config.itemCountCorner || 'top-right',
          itemNamePosition: config.itemNamePosition || 'top',
          itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,
          itemImageScale: config.itemImageScale ?? 100,
          footerCustomText: config.footerCustomText || '',
          watermarkEnabled: config.watermarkEnabled !== false,
          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',
          watermarkFontSize: config.watermarkFontSize ?? 16,
          watermarkAngle: config.watermarkAngle ?? 45,
          watermarkOpacity: config.watermarkOpacity ?? 0.6,
          watermarkRowGap: config.watermarkRowGap ?? 60,
          watermarkColGap: config.watermarkColGap ?? 80,
        });
        const invPage = await ctx.puppeteer.page();
        
        if (config.verboseConsoleLog) {
          ctx.logger.info(`[debug] 正在设置页面内容...`);
        }
        
        await invPage.setContent(html, {
          waitUntil: config.waitUntil || 'domcontentloaded'
        });
        logTiming('Pptr设置页面内容');

        if (config.verboseConsoleLog) {
          ctx.logger.info(`[debug] 正在等待图片加载...`);
        }

        // 等待图片加载，最多等待 15 秒
        try {
          await invPage.waitForFunction(() => {
            const allImages = Array.from(document.querySelectorAll('.item-image, .avatar'));
            return allImages.every(img => (img as HTMLImageElement).complete);
          }, { timeout: 15000 });
        } catch (err) {
          ctx.logger.warn(`[debug] 部分图片加载超时，将继续渲染`);
        }
        logTiming('Pptr等待图片加载');

        await invPage.setViewport({ width: 1500, height: pageHeight });

        const screenshotOptions: any = {
          encoding: 'base64',
          type: config.imageType || 'jpeg',
          omitBackground: true,
          fullPage: true,
        };
        if (config.imageType !== 'png') {
          screenshotOptions.quality = config.imageQuality || 60;
        }
        
        if (config.verboseConsoleLog) {
          ctx.logger.info(`[debug] 正在截取屏幕...`);
        }
        
        const invImageRes = await invPage.screenshot(screenshotOptions);
        logTiming('Pptr截图完成');
        
        const invImageBase64 = `data:image/${config.imageType || 'jpeg'};base64,${invImageRes}`;
        const replyPrefixResult = config.replyToUser ? h.quote(session.messageId) : '';
        await session.send(`${replyPrefixResult}查询结果:${h.image(invImageBase64)}`);
        logTiming('图片发送完成');
        
        // 输出时间统计汇总
        if (timingEnabled) {
          const totalTime = Date.now() - startTime;
          ctx.logger.info(`[cs-lookup] ========== 时间统计汇总 ==========`);
          for (const [label, time] of Object.entries(timing)) {
            ctx.logger.info(`[cs-lookup]   ${label}:\t${time}ms`);
          }
          ctx.logger.info(`[cs-lookup]   总耗时: ${totalTime}ms`);
          ctx.logger.info(`[cs-lookup] ====================================`);
        }

      } catch (e) {
        ctx.logger.error(`[cs-lookup] 发生错误: ${e.stack || e}`);
        let cardHtml = '';

        let errorMessage = "发生未知错误";
        if (e.response && e.response.data && e.response.data.detail) {
          const detail = e.response.data.detail;
          if (detail.includes('Unauthorized')) {
            errorMessage = `\n\t获取CS2库存失败，可能是对方未公开库存。`;
          }
        }
        errorMessage += ` err = ${e.message || e}`;
        
        cardHtml = `
            <div class="empty-message">
                ❌ ${errorMessage}
            </div>
        `;

        // 尝试获取用户信息以渲染错误页面（复用回退逻辑）
        let playerPersonName = '未知用户';
        let proxiedPlayerAvatarFullUrl = '';
        let playerLastLogoffTimeStr = '未知';

        try {
          const playerInfo = await fetchPlayerInfo();
          const playerAvatarFullUrl = playerInfo.avatarfull;
          proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
          playerPersonName = playerInfo.personaname;
          if (playerInfo.lastlogoff) {
            playerLastLogoffTimeStr = (new Date(playerInfo.lastlogoff * 1000)).toLocaleString();
          }
        } catch (err) {
          ctx.logger.warn(`[cs-lookup] 渲染错误页面时获取用户信息失败: ${err.message}`);
        }

        const fontConfig = buildCustomFontConfig(ctx, config.customFontPath);
        const invHtml = generateHtml({
          cardHTML: cardHtml,
          gridColumns: 1,
          totalStr: '总物品数: ??',
          steamId: STEAMID,
          steamName: playerPersonName,
          playerAvatarUrl: proxiedPlayerAvatarFullUrl,
          playerLastLogoffTimeStr,
          darkMode: config.enableDarkTheme,
          enableAvatarBackground: config.enableAvatarBackground,
          fontConfig,
          showItemCount: false,
          itemNamePosition: config.itemNamePosition || 'top',
          itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,
          itemImageScale: config.itemImageScale ?? 100,
          footerCustomText: config.footerCustomText || '',
          watermarkEnabled: config.watermarkEnabled !== false,
          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',
          watermarkFontSize: config.watermarkFontSize ?? 16,
          watermarkAngle: config.watermarkAngle ?? 45,
          watermarkOpacity: config.watermarkOpacity ?? 0.6,
          watermarkRowGap: config.watermarkRowGap ?? 60,
          watermarkColGap: config.watermarkColGap ?? 80,
        });
        const invPage = await ctx.puppeteer.page();
        
        await invPage.setContent(invHtml, {
            waitUntil: config.waitUntil || 'domcontentloaded'
        });

        try {
          await invPage.waitForFunction(() => {
              const allImages = Array.from(document.querySelectorAll('.item-image, .avatar'));
              return allImages.every(img => (img as HTMLImageElement).complete);
          }, { timeout: 5000 });
        } catch (err) {
          // 忽略错误页面的图片加载超时
        }
        
        await invPage.setViewport({ width: 1666, height: 500 });

        const screenshotOptionsErr: any = {
          encoding: 'base64',
          type: config.imageType || 'jpeg',
          omitBackground: true,
          fullPage: true,
        };
        if (config.imageType !== 'png') {
          screenshotOptionsErr.quality = config.imageQuality || 60;
        }
        const invImageRes = await invPage.screenshot(screenshotOptionsErr);
        const invImageBase64 = `data:image/${config.imageType || 'jpeg'};base64,${invImageRes}`;
        const replyPrefixErr = config.replyToUser ? h.quote(session.messageId) : '';
        await session.send(`${replyPrefixErr}查询结果:${h.image(invImageBase64)}`);
        
      } finally {
        try {
          await session.bot.deleteMessage(session.guildId, String(waitMsgId));
        } catch (err) {
          ctx.logger.info(`消息撤回失败，有可能是过太久了导致qq无法撤回。 err: ${err}`);
        }
      }

    });
}

export interface GenerateHtmlOptions {
  cardHTML: string;
  gridColumns: number;
  totalStr: string;
  steamId: string;
  steamName: string;
  playerAvatarUrl: string;
  playerLastLogoffTimeStr: string;
  darkMode: boolean;
  enableAvatarBackground?: boolean;
  fontConfig?: CustomFontConfig | null;
  showItemCount?: boolean;
  itemCountCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  itemNamePosition?: 'top' | 'center' | 'bottom';
  itemNameBgOpacity?: number;
  itemImageScale?: number;
  footerCustomText?: string;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkFontSize?: number;
  watermarkAngle?: number;
  watermarkOpacity?: number;
  watermarkRowGap?: number;
  watermarkColGap?: number;
}

export function generateHtml(options: GenerateHtmlOptions): string {
  const {
    cardHTML,
    gridColumns,
    totalStr,
    steamId,
    steamName,
    playerAvatarUrl,
    playerLastLogoffTimeStr,
    darkMode,
    enableAvatarBackground = false,
    fontConfig = null,
    showItemCount = true,
    itemCountCorner = 'top-right',
    itemNamePosition = 'top',
    itemNameBgOpacity = 0.6,
    itemImageScale = 100,
    footerCustomText = '',
    watermarkEnabled = true,
    watermarkText = 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',
    watermarkFontSize = 16,
    watermarkAngle = 45,
    watermarkOpacity = 0.6,
    watermarkRowGap = 60,
    watermarkColGap = 80,
  } = options;

  // 字体 CSS
  const fontFaceCss = fontConfig?.css || '';
  const fontFamily = fontConfig?.fontFamily || BASE_FONT_STACK;

  // 主题颜色
  const bgColor = darkMode ? '#1a1a2e' : '#f5f7fa';
  const containerBg = darkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff';
  const textColor = darkMode ? '#e0e0e0' : '#333333';
  const mutedColor = darkMode ? '#888888' : '#999999';
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e8e8e8';
  const cardBg = darkMode ? 'rgba(255, 255, 255, 0.03)' : '#fafafa';
  const headerBg = darkMode ? 'rgba(255, 255, 255, 0.08)' : '#ffffff';
  const accentColor = '#1890ff';

  // 背景样式
  const backgroundBlurDisplay = enableAvatarBackground ? 'block' : 'none';
  const backgroundOpacity = darkMode ? '0.35' : '0.5';

  // 布局参数
  const CARD_HEIGHT = 150;
  const GAP = 8;
  const PAGE_PADDING = 16;

  // 物品数量角落位置
  const cornerPositions: Record<string, string> = {
    'top-left': 'top: 12px; left: 12px;',
    'top-right': 'top: 12px; right: 12px;',
    'bottom-left': 'bottom: 12px; left: 12px;',
    'bottom-right': 'bottom: 12px; right: 12px;',
  };
  const itemCountPosition = cornerPositions[itemCountCorner] || cornerPositions['top-right'];

  // 饰品名称位置样式
  const namePositionStyles: Record<string, { wrapper: string; justify: string }> = {
    'top': { 
      wrapper: 'top: 4px; left: 4px; right: 4px;', 
      justify: 'flex-start' 
    },
    'center': { 
      wrapper: 'top: 50%; left: 4px; right: 4px; transform: translateY(-50%);', 
      justify: 'center' 
    },
    'bottom': { 
      wrapper: 'bottom: 4px; left: 4px; right: 4px;', 
      justify: 'flex-end' 
    },
  };
  const nameStyle = namePositionStyles[itemNamePosition] || namePositionStyles['top'];

  // 饰品名称背景透明度
  const nameBgColor = darkMode 
    ? `rgba(0, 0, 0, ${itemNameBgOpacity})` 
    : `rgba(255, 255, 255, ${itemNameBgOpacity})`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CS2 库存查询</title>
  <style>
    ${fontFaceCss}
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${fontFamily};
      background: ${bgColor};
      color: ${textColor};
      padding: ${PAGE_PADDING}px;
      min-width: 900px;
      position: relative;
    }
    
    .background-blur {
      display: ${backgroundBlurDisplay};
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${playerAvatarUrl}');
      background-size: cover;
      background-position: center;
      filter: blur(8px) saturate(1.5);
      z-index: -1;
      opacity: ${backgroundOpacity};
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: ${containerBg};
      border-radius: 16px;
      border: 1px solid ${borderColor};
      box-shadow: 0 8px 32px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});
      position: relative;
    }
    
    .header {
      padding: 20px 24px;
      border-bottom: 1px solid ${borderColor};
      display: flex;
      align-items: center;
      gap: 18px;
      background: ${headerBg};
    }
    
    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid ${accentColor};
      box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
      flex-shrink: 0;
    }
    
    .header-info {
      flex: 1;
    }
    
    .header-title {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 12px;
      line-height: 1.2;
    }
    
    .header-title .icon {
      font-size: 52px;
    }
    
    .header-subtitle {
      font-size: 28px;
      color: ${mutedColor};
      margin-bottom: 4px;
      line-height: 1.2;
    }
    
    .header-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .meta-item {
      font-size: 26px;
      color: ${mutedColor};
      display: flex;
      align-items: center;
      gap: 6px;
      line-height: 1.2;
    }
    
    .item-count-badge {
      display: ${showItemCount ? 'flex' : 'none'};
      position: absolute;
      ${itemCountPosition}
      background: linear-gradient(135deg, ${accentColor}, #40a9ff);
      color: white;
      font-size: 32px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 24px;
      box-shadow: 0 4px 14px rgba(24, 144, 255, 0.4);
      z-index: 10;
    }
    
    .items-grid {
      display: grid;
      grid-template-columns: repeat(${gridColumns}, 1fr);
      gap: ${GAP}px;
      padding: 12px;
    }
    
    .item-card {
      background: ${cardBg};
      border-radius: 10px;
      border: 1px solid ${borderColor};
      height: ${CARD_HEIGHT}px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .item-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.12'});
    }
    
    .item-image-wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(${itemImageScale / 100});
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    
    .item-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }
    
    .item-name {
      position: absolute;
      ${nameStyle.wrapper}
      z-index: 2;
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      line-height: 1.25;
      max-height: 2.5em;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      text-shadow: ${darkMode ? '0 1px 3px rgba(0,0,0,0.9)' : '0 1px 2px rgba(0,0,0,0.4)'};
      padding: 4px 6px;
      background: ${nameBgColor};
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }
    
    .item-count {
      position: absolute;
      top: 4px;
      right: 4px;
      background: ${darkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.95)'};
      color: ${textColor};
      font-size: 14px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 8px;
      z-index: 3;
      border: 1px solid ${borderColor};
      line-height: 1.2;
    }
    
    .footer {
      padding: 16px 24px;
      border-top: 1px solid ${borderColor};
      text-align: center;
      font-size: 28px;
      color: ${mutedColor};
      background: ${headerBg};
    }
    
    .footer a {
      color: ${accentColor};
      text-decoration: none;
    }
    
    .empty-message {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      font-size: 20px;
      color: ${mutedColor};
      background: ${cardBg};
      border-radius: 12px;
      border: 2px dashed ${borderColor};
    }
    
    .watermark-overlay {
      display: ${watermarkEnabled ? 'grid' : 'none'};
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      /* 固定 8 列，行数自动根据内容填充 */
      grid-template-columns: repeat(8, 1fr);
      grid-auto-rows: ${watermarkRowGap + 30}px;
      overflow: hidden;
      align-items: center;
      justify-items: center;
    }
    
    .watermark-text {
      white-space: nowrap;
      font-size: ${watermarkFontSize}px;
      font-weight: 500;
      color: ${darkMode ? `rgba(255, 255, 255, ${watermarkOpacity})` : `rgba(0, 0, 0, ${watermarkOpacity})`};
      user-select: none;
      font-family: ${fontFamily};
      transform: rotate(-${watermarkAngle}deg);
    }
  </style>
</head>
<body>
  <div class="background-blur"></div>
  <div class="container">
    <div class="item-count-badge">
      📦 ${totalStr}
    </div>
    <div class="header">
      <img src="${playerAvatarUrl}" alt="Avatar" class="avatar">
      <div class="header-info">
        <div class="header-title">
          <span class="icon">🎮</span>
          ${steamName}
        </div>
        <div class="header-subtitle">Steam ID: ${steamId}</div>
        <div class="header-meta">
          <span class="meta-item">🕐 最后在线: ${playerLastLogoffTimeStr}</span>
        </div>
      </div>
    </div>
    <div class="items-grid">
      ${cardHTML}
    </div>
    <div class="footer">
      ${footerCustomText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork'}
    </div>
    <div class="watermark-overlay">
      ${(() => {
        if (!watermarkEnabled) return '';
        // 动态生成足够多的水印：8列 x 80行 = 640个，足够覆盖超长图片
        const cols = 8;
        const rows = 80;
        return Array(cols * rows).fill(`<span class="watermark-text">${watermarkText}</span>`).join('');
      })()}
    </div>
  </div>
</body>
</html>`;
}