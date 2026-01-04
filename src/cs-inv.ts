import { Context, h } from 'koishi';
import { Config, umami } from './index';
import { createAxiosInstance } from './proxy';
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
    const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
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
  const axiosWithProxy = createAxiosInstance(config);

  const umamiD = umami;
  ctx.command('cs-inv', '查看CS背包', { authority: 0 })
    .option('arg1_steamid', '-s, --steamid <arg1_steamid:string> steam的id')
    .action(async ({ session, options }) => {
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

      ctx.logger.info(`options.arg1_steamId = ${options.arg1_steamid}`);
      const first_at_user = h.parse(session.content).find(e => e.type === 'at') ?? null;
      ctx.logger.info(`first_at_user = ${JSON.stringify(first_at_user)}`);

      let PLATFORM = session.platform;
      let USERID;
      let STEAMID;

      if (first_at_user) {
        USERID = first_at_user.attrs.id;
      } else {
        USERID = session.userId;
      }

      if (options.arg1_steamid) {
        STEAMID = options.arg1_steamid;
      } else if (!options.arg1_steamid) {
        const res = await ctx.database.get('cs_lookup', { userid: USERID, platform: PLATFORM });
        if (res.length) {
          STEAMID = res[0].steamId;
        } else {
          return "请提供 steamID 或者使用 `getid` 命令获取或者使用 `csBind <steamID>` 进行绑定";
        }
      }

      ctx.logger.info(`STEAMID = ${STEAMID}, USERID = ${USERID}`);
      const waitMsgId = await session.send(`${h.quote(session.messageId)}正在获取steam库存... \n\t steamId = ${STEAMID}\n\t 渲染图片中....`);

      if (!isOnlyDigits(STEAMID)) {
        return "无效steamID, 若不知道steamID请使用指令 `getid Steam个人资料页链接` 获取";
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
          const officialRes = await axiosWithProxy.get(officialApiUrl);
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
          const userRes = await axiosWithProxy.get(steamWebApiUrl);
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

        const invRes = await axiosWithProxy.get(invUrl);
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
            <div style="text-align: center; padding: 50px; font-size: 24px; font-weight: bold; color: ${currentColorArr[1]}; background-color: rgba(255, 255, 255, 0.15); border-radius: 20px;">该用户没有CS2库存</div>
          `;
          pageHeight = 500;
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
            cardHtml += `
              <div class="card-item">
                <h2 class="card-item-title">${itemName}</h2>
                <div class="card-image-container">
                  <img src="${itemInfo.imageUrl}" alt="${itemName}" class="card-item-image">
                </div>
              </div>
            `;
          }

          totalStr = `总物品数: ${invData.total_inventory_count}`;
          const CARD_HEIGHT_CALC = 130; // 与样式中卡片高度保持一致
          const GAP_CALC = 16;          // 与网格间距保持一致
          // 动态计算高度：
          // PAGE_PADDING=32*2=64，MAIN_CARD_PADDING=28*2=56，HEADER=120，GAP=16
          // 网格高度 = rowCount * CARD_HEIGHT + (rowCount - 1) * GAP
          // 总高度 = 64 + 56 + 120 + rowCount*(CARD_HEIGHT+GAP) - GAP = 240 + rowCount*(CARD_HEIGHT+GAP) - GAP
          const rowCount = Math.ceil(itemMap.size / gridColumns);
          pageHeight = 240 + rowCount * (CARD_HEIGHT_CALC + GAP_CALC) - GAP_CALC;
        }

        const html = generateHtml(cardHtml, gridColumns, totalStr, STEAMID, playerPersonName, proxiedPlayerAvatarFullUrl, playerLastLogoffTimeStr, config.enableDarkTheme, config.enableAvatarBackground);
        const invPage = await ctx.puppeteer.page();
        
        if (config.verboseConsoleLog) {
          ctx.logger.info(`[debug] 正在设置页面内容...`);
        }
        
        await invPage.setContent(html, {
          waitUntil: config.waitUntil || 'domcontentloaded'
        });
        logTiming('Puppeteer设置页面内容');

        if (config.verboseConsoleLog) {
          ctx.logger.info(`[debug] 正在等待图片加载...`);
        }

        // 等待图片加载，最多等待 15 秒
        try {
          await invPage.waitForFunction(() => {
            const allImages = Array.from(document.querySelectorAll('.card-item-image, .avatar'));
            return allImages.every(img => (img as HTMLImageElement).complete);
          }, { timeout: 15000 });
        } catch (err) {
          ctx.logger.warn(`[debug] 部分图片加载超时，将继续渲染`);
        }
        logTiming('Puppeteer等待图片加载');

        await invPage.setViewport({ width: 1666, height: pageHeight });

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
        logTiming('Puppeteer截图完成');
        
        const invImageBase64 = `data:image/${config.imageType || 'jpeg'};base64,${invImageRes}`;
        await session.send(`${h.quote(session.messageId)}查询结果:${h.image(invImageBase64)}`);
        logTiming('图片发送完成');
        
        // 输出时间统计汇总
        if (timingEnabled) {
          const totalTime = Date.now() - startTime;
          ctx.logger.info(`[cs-lookup] ========== 时间统计汇总 ==========`);
          for (const [label, time] of Object.entries(timing)) {
            ctx.logger.info(`[cs-lookup]   ${label}: ${time}ms`);
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
            <div style="text-align: center; padding: 50px; font-size: 20px; font-weight: bold; color: ${currentColorArr[1]}; background-color: rgba(255, 255, 255, 0.15); border-radius: 20px;">
                ${errorMessage}
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

        const invHtml = generateHtml(cardHtml, 1, '总物品数: ??', STEAMID, playerPersonName, proxiedPlayerAvatarFullUrl, playerLastLogoffTimeStr, config.enableDarkTheme, config.enableAvatarBackground);
        const invPage = await ctx.puppeteer.page();
        
        await invPage.setContent(invHtml, {
            waitUntil: config.waitUntil || 'domcontentloaded'
        });

        try {
          await invPage.waitForFunction(() => {
              const allImages = Array.from(document.querySelectorAll('.card-item-image, .avatar'));
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
        await session.send(`${h.quote(session.messageId)}查询结果:${h.image(invImageBase64)}`);
        
      } finally {
        try {
          await session.bot.deleteMessage(session.guildId, String(waitMsgId));
        } catch (err) {
          ctx.logger.info(`消息撤回失败，有可能是过太久了导致qq无法撤回。 err: ${err}`);
        }
      }

    });
}

export function generateHtml(cardHTML, grid_columns: number, totalStr, steamId, steamName, playerAvatarUrl, playerLastLogoffTimeStr, theme: boolean, enableAvatarBackground: boolean = false): string {
  const current = theme ? dark : light;
  const opacity = theme ? '0.2' : '0.7';
  const backgroundColor = theme ? '#000000' : '#ffffff';
  const fontColor = theme ? '#ffffff' : '#2e3440';

  // 背景样式：如果启用头像背景则显示模糊头像，否则隐藏
  const backgroundBlurDisplay = enableAvatarBackground ? 'block' : 'none';
  // 磨砂玻璃效果：如果启用头像背景则增强模糊效果
  const mainCardBlur = enableAvatarBackground ? 'blur(20px)' : 'blur(5px)';
  const mainCardBg = enableAvatarBackground ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)';
  const headerCardBg = enableAvatarBackground ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.2)';
  const headerCardBlur = enableAvatarBackground ? 'blur(15px)' : 'blur(10px)';
  const cardItemBg = enableAvatarBackground ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)';
  const cardItemBlur = enableAvatarBackground ? 'blur(12px)' : 'blur(10px)';

  // ========== 核心布局参数 ==========
  const CARD_HEIGHT = 130;      // 每个卡片的固定高度（放大 1.3x）
  const GAP = 16;               // 网格间距
  const PAGE_PADDING = 32;      // 页面上下内边距
  const MAIN_CARD_PADDING = 28; // 主卡片内边距
  const HEADER_HEIGHT = 120;    // header 区域高度（包含 margin-bottom）

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CS 库存查询</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Noto Sans SC', sans-serif;
          background-color: ${current[0]};
          color: ${fontColor};
          padding: ${PAGE_PADDING}px 24px;
          min-height: 100vh;
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
          filter: blur(30px);
          z-index: -1;
          opacity: ${opacity};
          background-blend-mode: overlay;
          background-color: ${backgroundColor};
        }
        
        .main-card {
          background-color: ${mainCardBg};
          border-radius: 20px;
          padding: ${MAIN_CARD_PADDING}px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: ${mainCardBlur};
          -webkit-backdrop-filter: ${mainCardBlur};
          max-width: 1500px;
          margin: 0 auto;
        }
        
        .header-card {
          background-color: ${headerCardBg};
          backdrop-filter: ${headerCardBlur};
          -webkit-backdrop-filter: ${headerCardBlur};
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .header-card h1 {
          font-size: 26px;
          font-weight: bold;
          margin-bottom: 4px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        
        .header-card .subtitle {
          font-size: 14px;
          color: ${fontColor};
          opacity: 0.9;
        }
        
        .header-card .last-logoff {
          font-size: 13px;
          color: ${fontColor};
          opacity: 0.8;
          margin-top: 4px;
        }
        
        .avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 3px solid ${fontColor};
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          flex-shrink: 0;
        }
        
        .grid-container {
          display: grid;
          grid-template-columns: repeat(${grid_columns}, 1fr);
          gap: ${GAP}px;
        }
        
        .card-item {
          background-color: ${cardItemBg};
          backdrop-filter: ${cardItemBlur};
          -webkit-backdrop-filter: ${cardItemBlur};
          border-radius: 12px;
          padding: 12px 10px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          position: relative;
          height: ${CARD_HEIGHT}px;
        }
        
        .card-item-title {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.35;
          word-wrap: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          max-width: 100%;
          position: relative;
          z-index: 2;
          margin: 0;
        }
        
        .card-image-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 182%;
          height: 182%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          pointer-events: none;
        }
        
        .card-item-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.5;
        }
      </style>
    </head>
    <body>
      <div class="background-blur"></div>
      <div class="main-card">
        <div class="header-card">
          <img src="${playerAvatarUrl}" alt="Player Avatar" class="avatar" id="avatar-image">
          <div>
            <h1>CS 库存查询 - ${steamName}</h1>
            <div class="subtitle">(${steamId})</div>
            <div class="subtitle">${totalStr}</div>
            <div class="last-logoff">最后在线时间: ${playerLastLogoffTimeStr}</div>
          </div>
        </div>
        <div class="grid-container">
          ${cardHTML}
        </div>
      </div>
    </body>
    </html>
  `;
}