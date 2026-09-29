import path from 'path';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import type { Context } from 'koishi';
import { FONT_MODE, type Config } from './config';

export const LXGW_WENKAI_FILE_NAME = 'LXGWWenKaiMono-Regular.ttf';

const GITEE_RELEASE_BASE =
  'https://gitee.com/vincent-zyu/koishi-plugin-awa-quote-image/releases/download/fonts';
const GITHUB_RELEASE_BASE =
  'https://github.com/VincentZyuApps/koishi-plugin-awa-quote-image/releases/download/fonts';

export const LXGW_WENKAI_URL = `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}`;

interface FontIntegrity {
  size: number;
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

const LXGW_WENKAI_INTEGRITY: FontIntegrity = {
  size: 24755236,
  md5: '90e75a25cca0e8868977b880352c6a53',
  sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
  sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
  sha512:
    '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
};

const LXGW_WENKAI_DOWNLOAD_URLS = [
  { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
  { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${LXGW_WENKAI_FILE_NAME}` },
];

export function getFontDirByBaseDir(baseDir: string) {
  return path.join(baseDir, 'data', 'fonts');
}

export function getLxgwWenKaiPathByBaseDir(baseDir: string) {
  return path.join(getFontDirByBaseDir(baseDir), LXGW_WENKAI_FILE_NAME);
}

// Schema 默认值无法拿到 ctx.baseDir，只能用 cwd 作为展示 fallback。
// 运行时必须优先使用 ctx.baseDir，见 resolveRuntimeFontPath()。
export const DEFAULT_LXGW_WENKAI_PATH =
  getLxgwWenKaiPathByBaseDir(process.cwd());

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  };
}

function verifyFontBuffer(buffer: Buffer, expected: FontIntegrity): boolean {
  if (buffer.length !== expected.size) return false;
  const hashes = calculateFontHashes(buffer);
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512;
}

async function verifyFontIntegrity(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) return false;

  try {
    const buffer = await readFile(filePath);
    return verifyFontBuffer(buffer, LXGW_WENKAI_INTEGRITY);
  } catch {
    return false;
  }
}

function getCrossPlatformBasename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath;
}

export function resolveRuntimeFontPath(ctx: Context, filePath: string): string {
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir);

  if (!filePath) return lxgwWenKaiPath;

  const fileName = getCrossPlatformBasename(filePath);
  if (fileName === LXGW_WENKAI_FILE_NAME) {
    return lxgwWenKaiPath;
  }

  if (filePath === DEFAULT_LXGW_WENKAI_PATH || filePath === lxgwWenKaiPath) {
    return lxgwWenKaiPath;
  }

  return filePath;
}

export async function checkAndDownloadFonts(ctx: Context, pluginName: string) {
  const fontDir = getFontDirByBaseDir(ctx.baseDir);
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir);
  const lxgwWenKaiReady = await verifyFontIntegrity(lxgwWenKaiPath);

  if (lxgwWenKaiReady) {
    ctx.logger.info('✅ LXGW WenKai 字体文件已存在且 hash 校验通过，跳过下载');
    return true;
  }

  if (existsSync(lxgwWenKaiPath)) {
    ctx.logger.warn('⚠️ LXGWWenKaiMono-Regular.ttf hash 校验失败，将重新下载');
  }

  try {
    await mkdir(fontDir, { recursive: true });
  } catch (error) {
    ctx.logger.error(`❌ 创建字体目录失败: ${error?.message || error}`);
    return false;
  }

  try {
    await downloadFont(ctx, pluginName, lxgwWenKaiPath);
    return true;
  } catch (error) {
    ctx.logger.error(`❌ LXGWWenKaiMono-Regular.ttf 下载失败: ${error?.message || error}`);
    return false;
  }
}

export async function downloadFont(
  ctx: Context,
  pluginName: string,
  filePath: string,
): Promise<void> {
  let lastError: unknown = null;

  for (const candidate of LXGW_WENKAI_DOWNLOAD_URLS) {
    try {
      ctx.logger.info(
        `📥 开始下载 ${pluginName} 默认字体: ${LXGW_WENKAI_FILE_NAME} (${candidate.source})`,
      );
      const response = await ctx.http.get(candidate.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      const buffer = Buffer.from(response);
      if (!verifyFontBuffer(buffer, LXGW_WENKAI_INTEGRITY)) {
        throw new Error(`字体 hash 校验失败: ${LXGW_WENKAI_FILE_NAME}`);
      }
      await writeFile(filePath, buffer);
      if (!(await verifyFontIntegrity(filePath))) {
        throw new Error(`字体写入后 hash 校验失败: ${LXGW_WENKAI_FILE_NAME}`);
      }
      ctx.logger.info(
        `✅ 默认字体下载成功且 hash 校验通过: ${LXGW_WENKAI_FILE_NAME} (${candidate.source})`,
      );
      return;
    } catch (error) {
      lastError = error;
      ctx.logger.warn(
        `⚠️ ${candidate.source} 下载默认字体失败 ${LXGW_WENKAI_FILE_NAME}: ${error?.message || error}`,
      );
    }
  }

  throw new Error(
    `字体文件下载失败 ${LXGW_WENKAI_FILE_NAME}，Gitee / GitHub 均不可用或校验失败: ${lastError instanceof Error ? lastError.message : lastError}`,
  );
}

export class FontLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FontLoadError';
  }
}

export interface CustomFontConfig {
  css: string;
  fontFamily: string;
}

export const BASE_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Microsoft YaHei", "PingFang SC", sans-serif';

const cssCache = new Map<string, string>();
const woff2Base64Cache = new Map<string, string>();

function rangeIncludes(range: string, point: number): boolean {
  return range.split(',').some((item) => {
    const [fromText, toText] = item.trim().replace(/^U\+/i, '').split('-');
    const from = Number.parseInt(fromText, 16);
    const to = Number.parseInt(toText || fromText, 16);
    return point >= from && point <= to;
  });
}

function resolveNpmLxgwFontConfig(content: string): CustomFontConfig {
  let cssPath: string;
  try {
    const req = typeof require !== 'undefined' ? require : createRequire(__filename);
    cssPath = req.resolve('@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css');
  } catch (err: any) {
    throw new FontLoadError(`无法解析 @chinese-fonts/lxgwwenkai npm 依赖包: ${err?.message || err}`);
  }

  if (!existsSync(cssPath)) {
    throw new FontLoadError(`@chinese-fonts/lxgwwenkai 样式文件不存在: ${cssPath}`);
  }

  let source: string;
  try {
    source = readFileSync(cssPath, 'utf8');
  } catch (err: any) {
    throw new FontLoadError(`读取 @chinese-fonts/lxgwwenkai 样式文件失败: ${err?.message || err}`);
  }

  const faces: string[] = source.match(/@font-face\{[^}]+\}/g) || [];
  const points = [...new Set(Array.from(content).map((char) => char.codePointAt(0)!))];
  const selected = points.length
    ? faces.filter((face) => {
        const range = face.match(/unicode-range:([^;]+);/)?.[1];
        return range && points.some((point) => rangeIncludes(range, point));
      })
    : faces;

  const key = `${cssPath}:${selected.join('')}`;
  const cached = cssCache.get(key);
  if (cached) {
    return {
      css: cached,
      fontFamily: `'LXGW WenKai', ${BASE_FONT_STACK}`,
    };
  }

  const directory = path.dirname(cssPath);
  try {
    const css = selected
      .map((face) =>
        face
          .replace(/local\("LXGW WenKai"\),/g, '')
          .replace(/font-display:swap/g, 'font-display:block')
          .replace(/url\((['"]?)(\.\/[^)'"]+)\1\)/g, (_all, _quote, relativePath) => {
            const file = path.resolve(directory, relativePath);
            let b64 = woff2Base64Cache.get(file);
            if (!b64) {
              if (!existsSync(file)) {
                throw new FontLoadError(`字体分片文件不存在: ${file}`);
              }
              b64 = readFileSync(file).toString('base64');
              woff2Base64Cache.set(file, b64);
            }
            return `url('data:font/woff2;base64,${b64}')`;
          }),
      )
      .join('\n');

    cssCache.set(key, css);
    return {
      css,
      fontFamily: `'LXGW WenKai', ${BASE_FONT_STACK}`,
    };
  } catch (err: any) {
    if (err instanceof FontLoadError) throw err;
    throw new FontLoadError(`处理 @chinese-fonts/lxgwwenkai 字体分片失败: ${err?.message || err}`);
  }
}

function resolveGitReleaseFontConfig(ctx: Context): CustomFontConfig {
  const lxgwWenKaiPath = getLxgwWenKaiPathByBaseDir(ctx.baseDir);
  if (!existsSync(lxgwWenKaiPath)) {
    throw new FontLoadError(`Git Release 字体文件不存在 (${lxgwWenKaiPath})，请确认网络畅通或重启插件以触发自动下载`);
  }
  let buffer: Buffer;
  try {
    buffer = readFileSync(lxgwWenKaiPath);
  } catch (err: any) {
    throw new FontLoadError(`读取 Git Release 字体文件失败: ${err?.message || err}`);
  }
  if (!verifyFontBuffer(buffer, LXGW_WENKAI_INTEGRITY)) {
    throw new FontLoadError(`Git Release 字体文件哈希校验失败 (${lxgwWenKaiPath})，可能文件损坏，请删除后重启插件重新下载`);
  }
  const css = `@font-face {
  font-family: 'CSLookupGitReleaseFont';
  src: url('data:font/ttf;base64,${buffer.toString('base64')}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}`;
  return {
    css,
    fontFamily: `'CSLookupGitReleaseFont', ${BASE_FONT_STACK}`,
  };
}

const SUPPORTED_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function getFontFormat(ext: string): string {
  if (ext === '.otf') return 'opentype';
  if (ext === '.woff2') return 'woff2';
  if (ext === '.woff') return 'woff';
  return 'truetype';
}

function getFontMimeType(ext: string): string {
  if (ext === '.otf') return 'font/otf';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.woff') return 'font/woff';
  return 'font/ttf';
}

function resolveCustomPathFontConfig(ctx: Context, customFontPath?: string): CustomFontConfig {
  const rawPath = customFontPath?.trim() || '';
  if (!rawPath) {
    throw new FontLoadError('已选择指定自定义字体绝对路径，但未填写字体路径');
  }
  const runtimePath = resolveRuntimeFontPath(ctx, rawPath);
  if (!path.isAbsolute(runtimePath)) {
    throw new FontLoadError(`自定义字体路径必须为绝对路径: ${runtimePath}`);
  }
  if (!existsSync(runtimePath)) {
    throw new FontLoadError(`自定义字体文件不存在: ${runtimePath}`);
  }
  const ext = path.extname(runtimePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new FontLoadError(`自定义字体格式不支持 (${ext})，仅支持 .ttf, .otf, .woff, .woff2`);
  }

  try {
    const buffer = readFileSync(runtimePath);
    const format = getFontFormat(ext);
    const mime = getFontMimeType(ext);
    const css = `@font-face {
  font-family: 'CSLookupCustomFont';
  src: url('data:${mime};base64,${buffer.toString('base64')}') format('${format}');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}`;
    return {
      css,
      fontFamily: `'CSLookupCustomFont', ${BASE_FONT_STACK}`,
    };
  } catch (err: any) {
    throw new FontLoadError(`读取自定义字体文件失败 (${runtimePath}): ${err?.message || err}`);
  }
}

function resolveSystemDefaultFontConfig(): CustomFontConfig {
  return {
    css: '',
    fontFamily: BASE_FONT_STACK,
  };
}

export function resolveFontConfig(
  ctx: Context,
  config: Config,
  contentText: string = '',
): CustomFontConfig {
  const mode = config.fontMode || FONT_MODE.NPM_LXGW;
  switch (mode) {
    case FONT_MODE.NPM_LXGW:
      return resolveNpmLxgwFontConfig(contentText);
    case FONT_MODE.GIT_RELEASE:
      return resolveGitReleaseFontConfig(ctx);
    case FONT_MODE.CUSTOM_PATH:
      return resolveCustomPathFontConfig(ctx, config.customFontPath);
    case FONT_MODE.SYSTEM_DEFAULT:
      return resolveSystemDefaultFontConfig();
    default:
      throw new FontLoadError(`未知的字体模式配置: ${mode}`);
  }
}

