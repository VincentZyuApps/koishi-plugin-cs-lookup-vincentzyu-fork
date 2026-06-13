import { Context } from 'koishi'
import * as fs from 'fs'
import * as path from 'path'
import { LOG_LEVELS } from '../types'
import type { PuppeteerLifeCycleEvent } from 'puppeteer-core'

const BASE_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Microsoft YaHei", "PingFang SC", sans-serif'
const CUSTOM_FONT_FAMILY = 'CSLookupCustomFont'

function getFontFormat(ext: string): string {
  if (ext === '.otf') return 'opentype'
  if (ext === '.woff2') return 'woff2'
  if (ext === '.woff') return 'woff'
  return 'truetype'
}

function getFontMimeType(ext: string): string {
  if (ext === '.otf') return 'font/otf'
  if (ext === '.woff2') return 'font/woff2'
  if (ext === '.woff') return 'font/woff'
  return 'font/ttf'
}

export interface CustomFontConfig {
  css: string
  fontFamily: string
}

export function buildCustomFontConfig(ctx: Context, fontPath?: string | null): CustomFontConfig | null {
  if (!fontPath || fontPath.trim() === '') return null

  const resolvedPath = path.isAbsolute(fontPath) ? fontPath : path.resolve(fontPath)
  if (!fs.existsSync(resolvedPath)) {
    ctx.logger.warn(`[src/template/pptr-render-cs-inv.ts] [warn] ⚠️ 🔤 自定义字体文件不存在: ${resolvedPath}`)
    return null
  }

  try {
    const buffer = fs.readFileSync(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const format = getFontFormat(ext)
    const mime = getFontMimeType(ext)

    const css = `@font-face {
      font-family: '${CUSTOM_FONT_FAMILY}';
      src: url('data:${mime};base64,${buffer.toString('base64')}') format('${format}');
      font-weight: normal;
      font-style: normal;
    }`

    ctx.logger.debug(`[src/template/pptr-render-cs-inv.ts] [debug] ✅ 🔤 成功加载自定义字体: ${resolvedPath}`)
    return {
      css,
      fontFamily: `'${CUSTOM_FONT_FAMILY}', ${BASE_FONT_STACK}`
    }
  } catch (e) {
    ctx.logger.warn(`[src/template/pptr-render-cs-inv.ts] [warn] ❌ 🔤 加载自定义字体失败: ${e}`)
    return null
  }
}

export interface GenerateHtmlOptions {
  cardHTML: string
  gridColumns: number
  totalStr: string
  steamId: string
  steamName: string
  playerAvatarUrl: string
  playerLastLogoffTimeStr: string
  darkMode: boolean
  enableAvatarBackground?: boolean
  fontConfig?: CustomFontConfig | null
  showItemCount?: boolean
  itemCountCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  itemNamePosition?: 'top' | 'center' | 'bottom'
  itemNameBgOpacity?: number
  itemImageScale?: number
  footerCustomText?: string
  watermarkEnabled?: boolean
  watermarkText?: string
  watermarkFontSize?: number
  watermarkAngle?: number
  watermarkOpacity?: number
  watermarkRowGap?: number
  watermarkColGap?: number
}

export interface RenderCsInvImageOptions {
  html: string
  imageType?: string
  imageQuality?: number
  waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[]
  viewportWidth: number
  viewportHeight: number
  logLevel?: string
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
  } = options

  const fontFaceCss = fontConfig?.css || ''
  const fontFamily = fontConfig?.fontFamily || BASE_FONT_STACK

  const bgColor = darkMode ? '#1a1a2e' : '#f5f7fa'
  const containerBg = darkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'
  const textColor = darkMode ? '#e0e0e0' : '#333333'
  const mutedColor = darkMode ? '#888888' : '#999999'
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e8e8e8'
  const cardBg = darkMode ? 'rgba(255, 255, 255, 0.03)' : '#fafafa'
  const headerBg = darkMode ? 'rgba(255, 255, 255, 0.08)' : '#ffffff'
  const accentColor = '#1890ff'

  const backgroundBlurDisplay = enableAvatarBackground ? 'block' : 'none'
  const backgroundOpacity = darkMode ? '0.35' : '0.5'

  const CARD_HEIGHT = 150
  const GAP = 8
  const PAGE_PADDING = 16

  const cornerPositions: Record<string, string> = {
    'top-left': 'top: 12px; left: 12px;',
    'top-right': 'top: 12px; right: 12px;',
    'bottom-left': 'bottom: 12px; left: 12px;',
    'bottom-right': 'bottom: 12px; right: 12px;',
  }
  const itemCountPosition = cornerPositions[itemCountCorner] || cornerPositions['top-right']

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
  }
  const nameStyle = namePositionStyles[itemNamePosition] || namePositionStyles['top']

  const nameBgColor = darkMode
    ? `rgba(0, 0, 0, ${itemNameBgOpacity})`
    : `rgba(255, 255, 255, ${itemNameBgOpacity})`

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
        if (!watermarkEnabled) return ''
        const cols = 8
        const rows = 80
        return Array(cols * rows).fill(`<span class="watermark-text">${watermarkText}</span>`).join('')
      })()}
    </div>
  </div>
</body>
</html>`
}

export async function renderCsInvImage(ctx: Context, options: RenderCsInvImageOptions): Promise<string> {
  const {
    html,
    imageType = 'jpeg',
    imageQuality = 60,
    waitUntil = 'domcontentloaded',
    viewportWidth,
    viewportHeight,
    logLevel = 'info',
  } = options

  const page = await ctx.puppeteer.page()

  if (LOG_LEVELS[logLevel] >= LOG_LEVELS.debug) {
    ctx.logger.info('[src/template/pptr-render-cs-inv.ts] [debug] 📄 正在设置页面内容...')
  }

  await page.setContent(html, { waitUntil })

  if (LOG_LEVELS[logLevel] >= LOG_LEVELS.debug) {
    ctx.logger.info('[src/template/pptr-render-cs-inv.ts] [debug] ⏳ 🖼️ 正在等待图片加载...')
  }

  try {
    await page.waitForFunction(() => {
      const allImages = Array.from(document.querySelectorAll('.item-image, .avatar'))
      return allImages.every(img => (img as HTMLImageElement).complete)
    }, { timeout: 15000 })
  } catch (err) {
    ctx.logger.warn('[src/template/pptr-render-cs-inv.ts] [warn] ⏰ 部分图片加载超时，将继续渲染')
  }

  await page.setViewport({ width: viewportWidth, height: viewportHeight })

  const screenshotOptions: any = {
    encoding: 'base64',
    type: imageType,
    omitBackground: true,
    fullPage: true,
  }
  if (imageType !== 'png') {
    screenshotOptions.quality = imageQuality
  }

  if (LOG_LEVELS[logLevel] >= LOG_LEVELS.debug) {
    ctx.logger.info('[src/template/pptr-render-cs-inv.ts] [debug] 📸 正在截取屏幕...')
  }

  const image = await page.screenshot(screenshotOptions)
  return `data:image/${imageType};base64,${image}`
}
