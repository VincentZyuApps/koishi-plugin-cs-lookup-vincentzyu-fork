[1mdiff --git a/package.json b/package.json[m
[1mindex e8d1350..0062201 100644[m
[1m--- a/package.json[m
[1m+++ b/package.json[m
[36m@@ -1,7 +1,7 @@[m
 {[m
   "name": "koishi-plugin-cs-lookup-vincentzyu-fork",[m
   "description": "CS:GO/CS2 库存查询",[m
[31m-  "version": "1.0.9-beta.1+20260105",[m
[32m+[m[32m  "version": "1.1.0-beta.1+20260105",[m
   "repository": {[m
     "type": "git",[m
     "url": "git+https://github.com/itzdrli/koishi-plugin-cs-lookup.git"[m
[1mdiff --git a/src/cs-inv.ts b/src/cs-inv.ts[m
[1mindex 115fd26..bbde744 100644[m
[1m--- a/src/cs-inv.ts[m
[1m+++ b/src/cs-inv.ts[m
[36m@@ -482,6 +482,14 @@[m [mexport function inv(ctx: Context, config: any) {[m
           itemNamePosition: config.itemNamePosition || 'top',[m
           itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,[m
           itemImageScale: config.itemImageScale ?? 100,[m
[32m+[m[32m          footerCustomText: config.footerCustomText || '',[m
[32m+[m[32m          watermarkEnabled: config.watermarkEnabled !== false,[m
[32m+[m[32m          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',[m
[32m+[m[32m          watermarkFontSize: config.watermarkFontSize ?? 16,[m
[32m+[m[32m          watermarkAngle: config.watermarkAngle ?? 45,[m
[32m+[m[32m          watermarkOpacity: config.watermarkOpacity ?? 0.6,[m
[32m+[m[32m          watermarkRowGap: config.watermarkRowGap ?? 60,[m
[32m+[m[32m          watermarkColGap: config.watermarkColGap ?? 80,[m
         });[m
         const invPage = await ctx.puppeteer.page();[m
         [m
[36m@@ -595,6 +603,14 @@[m [mexport function inv(ctx: Context, config: any) {[m
           itemNamePosition: config.itemNamePosition || 'top',[m
           itemNameBgOpacity: config.itemNameBgOpacity ?? 0.6,[m
           itemImageScale: config.itemImageScale ?? 100,[m
[32m+[m[32m          footerCustomText: config.footerCustomText || '',[m
[32m+[m[32m          watermarkEnabled: config.watermarkEnabled !== false,[m
[32m+[m[32m          watermarkText: config.watermarkText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',[m
[32m+[m[32m          watermarkFontSize: config.watermarkFontSize ?? 16,[m
[32m+[m[32m          watermarkAngle: config.watermarkAngle ?? 45,[m
[32m+[m[32m          watermarkOpacity: config.watermarkOpacity ?? 0.6,[m
[32m+[m[32m          watermarkRowGap: config.watermarkRowGap ?? 60,[m
[32m+[m[32m          watermarkColGap: config.watermarkColGap ?? 80,[m
         });[m
         const invPage = await ctx.puppeteer.page();[m
         [m
[36m@@ -653,6 +669,14 @@[m [mexport interface GenerateHtmlOptions {[m
   itemNamePosition?: 'top' | 'center' | 'bottom';[m
   itemNameBgOpacity?: number;[m
   itemImageScale?: number;[m
[32m+[m[32m  footerCustomText?: string;[m
[32m+[m[32m  watermarkEnabled?: boolean;[m
[32m+[m[32m  watermarkText?: string;[m
[32m+[m[32m  watermarkFontSize?: number;[m
[32m+[m[32m  watermarkAngle?: number;[m
[32m+[m[32m  watermarkOpacity?: number;[m
[32m+[m[32m  watermarkRowGap?: number;[m
[32m+[m[32m  watermarkColGap?: number;[m
 }[m
 [m
 export function generateHtml(options: GenerateHtmlOptions): string {[m
[36m@@ -672,6 +696,14 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
     itemNamePosition = 'top',[m
     itemNameBgOpacity = 0.6,[m
     itemImageScale = 100,[m
[32m+[m[32m    footerCustomText = '',[m
[32m+[m[32m    watermarkEnabled = true,[m
[32m+[m[32m    watermarkText = 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork',[m
[32m+[m[32m    watermarkFontSize = 16,[m
[32m+[m[32m    watermarkAngle = 45,[m
[32m+[m[32m    watermarkOpacity = 0.6,[m
[32m+[m[32m    watermarkRowGap = 60,[m
[32m+[m[32m    watermarkColGap = 80,[m
   } = options;[m
 [m
   // 字体 CSS[m
[36m@@ -690,7 +722,7 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
 [m
   // 背景样式[m
   const backgroundBlurDisplay = enableAvatarBackground ? 'block' : 'none';[m
[31m-  const backgroundOpacity = darkMode ? '0.15' : '0.3';[m
[32m+[m[32m  const backgroundOpacity = darkMode ? '0.35' : '0.5';[m
 [m
   // 布局参数[m
   const CARD_HEIGHT = 150;[m
[36m@@ -762,7 +794,7 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
       background-image: url('${playerAvatarUrl}');[m
       background-size: cover;[m
       background-position: center;[m
[31m-      filter: blur(15px) saturate(1.3);[m
[32m+[m[32m      filter: blur(8px) saturate(1.5);[m
       z-index: -1;[m
       opacity: ${backgroundOpacity};[m
     }[m
[36m@@ -772,7 +804,6 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
       margin: 0 auto;[m
       background: ${containerBg};[m
       border-radius: 16px;[m
[31m-      overflow: hidden;[m
       border: 1px solid ${borderColor};[m
       box-shadow: 0 8px 32px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'});[m
       position: relative;[m
[36m@@ -952,6 +983,33 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
       border-radius: 12px;[m
       border: 2px dashed ${borderColor};[m
     }[m
[32m+[m[41m    [m
[32m+[m[32m    .watermark-overlay {[m
[32m+[m[32m      display: ${watermarkEnabled ? 'grid' : 'none'};[m
[32m+[m[32m      position: absolute;[m
[32m+[m[32m      top: 0;[m
[32m+[m[32m      left: 0;[m
[32m+[m[32m      width: 100%;[m
[32m+[m[32m      height: 100%;[m
[32m+[m[32m      pointer-events: none;[m
[32m+[m[32m      z-index: 9999;[m
[32m+[m[32m      /* 固定 8 列，行数自动根据内容填充 */[m
[32m+[m[32m      grid-template-columns: repeat(8, 1fr);[m
[32m+[m[32m      grid-auto-rows: ${watermarkRowGap + 30}px;[m
[32m+[m[32m      overflow: hidden;[m
[32m+[m[32m      align-items: center;[m
[32m+[m[32m      justify-items: center;[m
[32m+[m[32m    }[m
[32m+[m[41m    [m
[32m+[m[32m    .watermark-text {[m
[32m+[m[32m      white-space: nowrap;[m
[32m+[m[32m      font-size: ${watermarkFontSize}px;[m
[32m+[m[32m      font-weight: 500;[m
[32m+[m[32m      color: ${darkMode ? `rgba(255, 255, 255, ${watermarkOpacity})` : `rgba(0, 0, 0, ${watermarkOpacity})`};[m
[32m+[m[32m      user-select: none;[m
[32m+[m[32m      font-family: ${fontFamily};[m
[32m+[m[32m      transform: rotate(-${watermarkAngle}deg);[m
[32m+[m[32m    }[m
   </style>[m
 </head>[m
 <body>[m
[36m@@ -977,7 +1035,16 @@[m [mexport function generateHtml(options: GenerateHtmlOptions): string {[m
       ${cardHTML}[m
     </div>[m
     <div class="footer">[m
[31m-      📌 Powered by koishi-plugin-cs-lookup-vincentzyu-fork[m
[32m+[m[32m      ${footerCustomText || 'Powered by koishi-plugin-cs-lookup-vincentzyu-fork'}[m
[32m+[m[32m    </div>[m
[32m+[m[32m    <div class="watermark-overlay">[m
[32m+[m[32m      ${(() => {[m
[32m+[m[32m        if (!watermarkEnabled) return '';[m
[32m+[m[32m        // 动态生成足够多的水印：8列 x 80行 = 640个，足够覆盖超长图片[m
[32m+[m[32m        const cols = 8;[m
[32m+[m[32m        const rows = 80;[m
[32m+[m[32m        return Array(cols * rows).fill(`<span class="watermark-text">${watermarkText}</span>`).join('');[m
[32m+[m[32m      })()}[m
     </div>[m
   </div>[m
 </body>[m
[1mdiff --git a/src/index.ts b/src/index.ts[m
[1mindex 2805164..dcf0286 100644[m
[1m--- a/src/index.ts[m
[1m+++ b/src/index.ts[m
[36m@@ -88,8 +88,39 @@[m [mexport const Config = Schema.intersect([[m
       .min(50).max(300).step(1)[m
       .description('🖼️ 饰品图片大小 (50-300%，默认222%)'),[m
     customFontPath: Schema.string()[m
[32m+[m[32m      .role('textarea', { rows: [2, 5] })[m
       .default('')[m
       .description('🔤 自定义字体文件绝对路径 (如 C:/Fonts/my.ttf，留空使用默认字体)'),[m
[32m+[m[32m    footerCustomText: Schema.string()[m
[32m+[m[32m      .default('📌 Powered by koishi-plugin-cs-lookup-vincentzyu-fork')[m
[32m+[m[32m      .description('📝 底部自定义文字'),[m
[32m+[m[32m    watermarkEnabled: Schema.boolean()[m
[32m+[m[32m      .default(true)[m
[32m+[m[32m      .description('💧 是否启用水印'),[m
[32m+[m[32m    watermarkText: Schema.string()[m
[32m+[m[32m      .default('koishi-plugin-cs-lookup')[m
[32m+[m[32m      .description('💧 水印文字'),[m
[32m+[m[32m    watermarkFontSize: Schema.number()[m
[32m+[m[32m      .default(16)[m
[32m+[m[32m      .min(8).max(72).step(1)[m
[32m+[m[32m      .description('🔠 水印字体大小 (px)'),[m
[32m+[m[32m    watermarkAngle: Schema.number()[m
[32m+[m[32m      .default(45)[m
[32m+[m[32m      .min(0).max(360).step(1)[m
[32m+[m[32m      .description('📐 水印倾斜角度 (0-360)'),[m
[32m+[m[32m    watermarkOpacity: Schema.number()[m
[32m+[m[32m      .default(0.4)[m
[32m+[m[32m      .min(0).max(1).step(0.01)[m
[32m+[m[32m      .role('slider')[m
[32m+[m[32m      .description('👁️ 水印不透明度 (0-1)'),[m
[32m+[m[32m    watermarkRowGap: Schema.number()[m
[32m+[m[32m      .default(30)[m
[32m+[m[32m      .min(1).max(200).step(1)[m
[32m+[m[32m      .description('↕️ 水印行间距 (px)'),[m
[32m+[m[32m    watermarkColGap: Schema.number()[m
[32m+[m[32m      .default(20)[m
[32m+[m[32m      .min(1).max(300).step(1)[m
[32m+[m[32m      .description('↔️ 水印列间距 (px)'),[m
   }).description("🎨 puppeteer网页截图配置"),[m
   [m
   Schema.object({[m
