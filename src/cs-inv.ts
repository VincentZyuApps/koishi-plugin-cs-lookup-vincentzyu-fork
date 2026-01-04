import { Context, h } from 'koishi';
import { Config, umami } from './index';
import { createAxiosInstance } from './proxy';
import { } from 'koishi-plugin-puppeteer';
import { } from 'koishi-plugin-umami-statistics-service';

export function isOnlyDigits(str: string): boolean {
  return /^\d+$/.test(str);
}

export const light = ['#81a1c1', '#2e3440', '#5e81ac']; // Changed font color to a dark gray
export const dark = ['#2e3440', '#ffffff', '#434c5e'];

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

export function inv(ctx: Context, config: any) {
  const axiosWithProxy = createAxiosInstance(config);

  const umamiD = umami;
  ctx.command('cs-inv', '查看CS背包', { authority: 0 })
    .option('arg1_steamid', '-s, --steamid <arg1_steamid:string> steam的id')
    .action(async ({ session, options }) => {

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

      // 使用官方 Steam API 替换原有的 us-cc 代理
      const playerUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steamWebApiKey}&steamids=${STEAMID}`;
      const invUrl = `https://steamcommunity.com/inventory/${STEAMID}/730/2?l=schinese`;
      
      const currentColorArr = config.enableDarkTheme ? dark : light;


      try {
        if (!config.steamWebApiKey) {
          throw new Error('未配置 Steam Web API Key，请在插件设置中填写。');
        }

        const userRes = await axiosWithProxy.get(playerUrl);
        const playerAvatarFullUrl = userRes?.data?.response?.players[0]?.avatarfull;
        
        // 将头像转为 Base64
        const proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
        
        ctx.logger.info(`playerAvatarFullUrl = ${playerAvatarFullUrl}`);
        const playerPersonName = userRes?.data?.response?.players[0]?.personaname || '未知用户';
        const playerLastLogoff = userRes?.data?.response?.players[0]?.lastlogoff;
        const playerLastLogoffTimeStr = playerLastLogoff ? (new Date(playerLastLogoff * 1000)).toLocaleString() : '未知';

        const invRes = await axiosWithProxy.get(invUrl);
        const invData = invRes.data;

        ctx.logger.info(`[debug] invData = ${JSON.stringify(invData).slice(0, 1000)}[end]`);

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
          const itemMap = new Map<string, { count: number, imageUrl: string }>();
          for (const item of invData.descriptions) {
            const itemName = item.market_name;
            const imageUrl = "https://community.cloudflare.steamstatic.com/economy/image/" + item.icon_url;
            if (!itemMap.has(itemName)) {
              // 将饰品图片转为 Base64
              const base64Image = await getImageBase64(ctx, axiosWithProxy, imageUrl);
              itemMap.set(itemName, { count: 0, imageUrl: base64Image });
            }
            let itemInfo = itemMap.get(itemName);
            itemInfo.count += 1;
          }

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
        const invImageBase64 = `data:image/${config.imageType || 'jpeg'};base64,${invImageRes}`;
        await session.send(`${h.quote(session.messageId)}查询结果:${h.image(invImageBase64)}`);

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

        // 尝试获取用户信息以渲染错误页面
        let playerPersonName = '未知用户';
        let proxiedPlayerAvatarFullUrl = '';
        let playerLastLogoffTimeStr = '未知';

        try {
          if (config.steamWebApiKey) {
            const userRes = await axiosWithProxy.get(playerUrl);
            const playerAvatarFullUrl = userRes?.data?.response?.players[0]?.avatarfull;
            proxiedPlayerAvatarFullUrl = await getImageBase64(ctx, axiosWithProxy, playerAvatarFullUrl);
            playerPersonName = userRes?.data?.response?.players[0]?.personaname || '未知用户';
            const playerLastLogoff = userRes?.data?.response?.players[0]?.lastlogoff;
            if (playerLastLogoff) {
              playerLastLogoffTimeStr = (new Date(playerLastLogoff * 1000)).toLocaleString();
            }
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