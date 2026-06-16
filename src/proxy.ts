import axios, { AxiosInstance } from 'axios';
import { Context } from 'koishi';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { PROXY_PROTOCOL, LOG_LEVELS } from './types';
import { logInfo } from './logger';

// 可重试的瞬态网络错误码
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EPIPE', 'EAI_AGAIN', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH',
]);

// 可重试的错误消息关键词
const RETRYABLE_ERROR_MESSAGES = [
  'socket disconnected', 'socket hang up', 'ECONNRESET', 'Client network socket disconnected',
];

function isRetryableError(e: any): boolean {
  if (RETRYABLE_ERROR_CODES.has(e.code)) return true;
  const msg = e.message || '';
  return RETRYABLE_ERROR_MESSAGES.some((keyword) => msg.includes(keyword));
}

/**
 * 添加 verbose 模式的 axios 拦截器，输出请求/响应/错误的详细信息
 */
function addVerboseInterceptors(
  instance: AxiosInstance, ctx: Context, proxyInfo: string,
) {
  instance.interceptors.request.use((reqConfig: any) => {
    reqConfig._startTime = Date.now();
    logInfo(ctx, ctx.config, 'debug', 'src/proxy.ts', `📤 ⚙️ 🌐 REQUEST ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
    if (proxyInfo) {
      logInfo(ctx, ctx.config, 'debug', 'src/proxy.ts', `🔗 🔌 via proxy: ${proxyInfo}`);
    }
    return reqConfig;
  });

  instance.interceptors.response.use(
    (response) => {
      const elapsed = Date.now() - ((response.config as any)._startTime || 0);
      const dataLen = response.data
        ? typeof response.data === 'string'
          ? response.data.length
          : Buffer.isBuffer(response.data)
            ? response.data.length
            : JSON.stringify(response.data).length
        : 0;
      logInfo(ctx, ctx.config, 'debug', 'src/proxy.ts', `📥 ✅ RESPONSE ${response.status} ${response.statusText} | ` +
          `${response.config.url} | ${elapsed}ms | ~${(dataLen / 1024).toFixed(1)}KB`);
      return response;
    }, (error) => {
      const elapsed = Date.now() - ((error.config as any)?._startTime || 0);
      const info: string[] = [];
      if (error.code) info.push(`code=${error.code}`);
      if (error.response?.status) info.push(`status=${error.response.status}`);
      if (error.message) info.push(`msg=${error.message}`);
      logInfo(ctx, ctx.config, 'error', 'src/proxy.ts', `❌ REQUEST FAILED | ${error.config?.method?.toUpperCase()} ${error.config?.url} | ${elapsed}ms | ${info.join(' | ')}`);
      return Promise.reject(error);
    });
}

export function createAxiosInstance(config: any, ctx?: any): AxiosInstance {
  const verbose = !!(LOG_LEVELS[config.logLevel] >= LOG_LEVELS.debug && ctx);

  const headers: any = {
    Accept: 'application/json', };

  if (config.useUserAgent && config.userAgent) {
    headers['User-Agent'] = config.userAgent;
  }

  if (config.useCookie && config.cookie) {
    headers['Cookie'] = config.cookie;
  }

  if (!config.proxy?.enabled) {
    if (verbose) {
      logInfo(ctx, config, 'debug', 'src/proxy.ts', '🔗 🔌 代理未启用，使用直连模式');
      logInfo(ctx, config, 'debug', 'src/proxy.ts', `📋 请求头: ${JSON.stringify(headers, null, 2)}`);
    }
    const instance = axios.create({
      timeout: 15000, headers, });
    if (verbose) addVerboseInterceptors(instance, ctx, '');
    return instance;
  }

  const { protocol, host, port } = config.proxy;
  const proxyUrl = `${protocol}://${host}:${port}`;

  if (verbose) {
    logInfo(ctx, config, 'debug', 'src/proxy.ts', `🔗 🔌 代理已启用: ${proxyUrl}`);
    logInfo(ctx, config, 'debug', 'src/proxy.ts', `📋 请求头: ${JSON.stringify(headers, null, 2)}`);
  }

  let agent;
  switch (protocol) {
    case PROXY_PROTOCOL.HTTP:
      agent = new HttpProxyAgent(proxyUrl);
      break;
    case PROXY_PROTOCOL.HTTPS:
      agent = new HttpsProxyAgent(proxyUrl);
      break;
    case PROXY_PROTOCOL.SOCKS4:
    case PROXY_PROTOCOL.SOCKS5:
    case PROXY_PROTOCOL.SOCKS5H:
      agent = new SocksProxyAgent(proxyUrl);
      break;
    default:
      if (verbose) {
        logInfo(ctx, config, 'warn', 'src/proxy.ts', `🔗 ❓ ⚠️ 未知代理协议: ${protocol}，不使用代理`);
      } else {
        console.warn(`Unknown proxy protocol: ${protocol}. Not using proxy.`);
      }
      const inst = axios.create({ timeout: 15000, headers });
      if (verbose) addVerboseInterceptors(inst, ctx, '');
      return inst;
  }

  const instance = axios.create({
    httpAgent: agent, httpsAgent: agent, timeout: 15000, headers, });

  if (verbose) addVerboseInterceptors(instance, ctx, proxyUrl);
  return instance;
}

/**
 * 带重试的请求封装，用于应对 ECONNRESET / TLS 断连等瞬态网络错误
 */
export async function requestWithRetry<T>(
  fn: () => Promise<T>, options?: { retries?: number; label?: string; ctx?: any },
): Promise<T> {
  const maxRetries = options?.retries ?? 2;
  const label = options?.label ?? 'request';
  const ctx = options?.ctx;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryableError(e) || attempt >= maxRetries) {
        throw e;
      }
      const delay = 1000 * (attempt + 1);
      if (ctx) {
        logInfo(ctx, ctx.config, 'warn', 'src/proxy.ts', `🔄 ${label} 第${attempt + 1}次失败 (${e.code || e.message})，` +
            `${delay}ms 后重试 (剩余 ${maxRetries - attempt - 1} 次)...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`[src/proxy.ts] ${label} 超过最大重试次数`);
}
