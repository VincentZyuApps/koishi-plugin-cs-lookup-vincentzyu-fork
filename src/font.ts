import path from 'path';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { Context } from 'koishi';

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
