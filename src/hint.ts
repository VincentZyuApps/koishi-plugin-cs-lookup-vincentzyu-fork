export interface InventoryErrorDescription {
  status?: number;
  statusText?: string;
  code?: string;
  possibleReason: string;
  suggestion: string;
  originalMessage: string;
}

function normalizeStatus(status: unknown): number | undefined {
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  if (typeof status === 'string') {
    const parsed = Number(status);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractResponseText(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const value = data as Record<string, unknown>;
    return [
      value.detail,
      value.error,
      value.message,
      value.msg,
    ]
      .map((item) => typeof item === 'string' ? item : '')
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function getStatusExplanation(status: number | undefined, responseText: string) {
  const lowerText = responseText.toLowerCase();

  if (lowerText.includes('unauthorized')) {
    return {
      possibleReason: 'Steam 或上游接口可能认为当前请求未授权；也可能是目标库存未公开、请求缺少有效登录态/Cookie，或访问被风控拦截。',
      suggestion: '可以先让该用户确认 Steam 个人资料与库存可公开访问；必要时配置有效 Cookie、切换代理节点，或换一个用户测试。',
    };
  }

  switch (status) {
    case 400:
      return {
        possibleReason: 'Steam 库存接口可能认为请求参数不合法，例如 SteamID64、appid/contextid、语言参数或缓存中的库存请求信息异常。',
        suggestion: '确认 SteamID 是纯数字的 SteamID64；换一个用户测试，或清理缓存后重新查询。',
      };
    case 401:
      return {
        possibleReason: 'Steam 或上游接口可能认为当前请求未登录或未授权，常见于需要登录态/Cookie 的访问场景。',
        suggestion: '检查自定义 Cookie 是否有效；也可以先关闭 Cookie、切换代理节点，或稍后重试。',
      };
    case 402:
      return {
        possibleReason: '第三方接口可能触发了付费、配额或计费限制；如果错误来自 steamwebapi.com，通常表示额度不足。',
        suggestion: '检查 steamwebapi.com API Key 与配额；如果只是查询库存，可以优先使用 Steam 官方接口和缓存策略。',
      };
    case 403:
      return {
        possibleReason: '该用户可能隐藏了 Steam 库存、个人资料或游戏详情；也可能是 Steam 暂时拒绝了库存接口访问，或当前 IP / 代理 / Cookie 被风控。',
        suggestion: '可以尝试让该用户打开 Steam 库存公开显示；也可以换一个用户测试、在浏览器直接访问库存链接确认、切换代理节点或稍后重试。',
      };
    case 404:
      return {
        possibleReason: 'SteamID 可能不存在、目标用户没有该游戏库存、库存接口路径不可用，或 Steam 对该用户暂时返回了空资源。',
        suggestion: '确认 SteamID64 是否正确；换一个用户或用浏览器打开库存链接验证。',
      };
    case 408:
      return {
        possibleReason: '请求可能在 Steam、代理或本机网络链路上超时。',
        suggestion: '稍后重试；检查代理连通性，必要时切换代理节点或提高网络稳定性。',
      };
    case 409:
      return {
        possibleReason: 'Steam 或中间服务可能认为当前请求状态冲突，例如接口状态短暂不一致或缓存状态异常。',
        suggestion: '稍后重试；如果启用了库存缓存，可以尝试强制刷新。',
      };
    case 410:
      return {
        possibleReason: 'Steam 或上游接口可能认为该资源已经不可用或不再提供。',
        suggestion: '确认目标用户和游戏库存仍然存在；换一个用户测试，或稍后重试。',
      };
    case 418:
      return {
        possibleReason: '上游服务可能返回了非标准拦截响应，通常更像是风控、代理或网关行为。',
        suggestion: '切换代理节点、关闭异常 Cookie，或稍后重试。',
      };
    case 423:
      return {
        possibleReason: '资源可能被上游临时锁定，或当前访问被安全策略暂时限制。',
        suggestion: '稍后重试；如果频繁出现，建议降低查询频率并检查代理出口。',
      };
    case 429:
      return {
        possibleReason: 'Steam 库存接口或中间代理可能触发了访问频率限制；同一 IP、同一 Cookie 或短时间重复查询都可能导致限流。',
        suggestion: '等待一段时间后重试；降低查询频率、启用数据库缓存，必要时切换代理节点或更换 Cookie。',
      };
    case 451:
      return {
        possibleReason: '访问可能受到地区、网络策略、代理出口或上游合规限制影响。',
        suggestion: '尝试切换代理地区或网络出口；也可以用浏览器直接访问库存链接确认是否可打开。',
      };
    case 500:
      return {
        possibleReason: 'Steam 或上游服务内部可能暂时异常，通常不是本插件参数本身导致。',
        suggestion: '稍后重试；如果长期复现，可以换代理节点并检查 Steam 服务状态。',
      };
    case 502:
      return {
        possibleReason: 'Steam、代理或中间网关可能返回了错误响应。',
        suggestion: '稍后重试；检查代理节点是否稳定，必要时切换代理。',
      };
    case 503:
      return {
        possibleReason: 'Steam 库存服务可能临时不可用、维护中或被短时限流。',
        suggestion: '等待一段时间后重试；可以换用户验证是否是全局服务异常。',
      };
    case 504:
      return {
        possibleReason: 'Steam、代理或中间网关可能等待上游响应超时。',
        suggestion: '稍后重试；检查代理延迟和出口质量，必要时切换节点。',
      };
    case 520:
    case 521:
    case 522:
    case 523:
    case 524:
      return {
        possibleReason: '上游 CDN 或网关可能连接 Steam 源站失败、超时或被临时拦截。',
        suggestion: '稍后重试；切换代理节点，或用浏览器直接打开库存链接确认是否是上游网络问题。',
      };
    default:
      if (status && status >= 400 && status < 500) {
        return {
          possibleReason: 'Steam 或上游接口拒绝了本次请求，可能与目标库存权限、请求参数、Cookie、代理出口或风控有关。',
          suggestion: '确认目标库存公开、SteamID 正确；换一个用户测试，并检查代理 / Cookie 后重试。',
        };
      }
      if (status && status >= 500) {
        return {
          possibleReason: 'Steam、代理或上游服务可能暂时异常。',
          suggestion: '稍后重试；必要时切换代理节点，并检查 Steam 服务是否稳定。',
        };
      }
      return {
        possibleReason: '请求没有返回明确 HTTP 状态码，可能是网络、DNS、代理、TLS 或连接中断导致。',
        suggestion: '检查代理与网络连通性；稍后重试，必要时切换代理节点或关闭异常 Cookie。',
      };
  }
}

function getCodeExplanation(code: string | undefined) {
  switch (code) {
    case 'ECONNABORTED':
    case 'ETIMEDOUT':
    case 'ESOCKETTIMEDOUT':
      return {
        possibleReason: '请求超时，可能是 Steam、代理节点或本机网络响应太慢。',
        suggestion: '稍后重试；检查代理延迟，必要时切换节点或提高超时时间。',
      };
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return {
        possibleReason: 'DNS 解析可能失败，当前网络或代理可能无法解析 Steam 相关域名。',
        suggestion: '检查 DNS 和代理设置；切换网络或代理节点后重试。',
      };
    case 'ECONNRESET':
    case 'EPIPE':
      return {
        possibleReason: '连接被远端、代理或本机网络中途断开。',
        suggestion: '稍后重试；检查代理稳定性，必要时切换节点。',
      };
    case 'ECONNREFUSED':
      return {
        possibleReason: '目标服务或本地代理拒绝连接，可能是代理端口不可用或上游连接被拒绝。',
        suggestion: '检查代理地址和端口是否正确；确认代理程序正在运行。',
      };
    default:
      return null;
  }
}

export function describeInventoryError(error: unknown): InventoryErrorDescription {
  const err = error as any;
  const response = err?.response;
  const status = normalizeStatus(response?.status ?? err?.status ?? err?.statusCode);
  const statusText = normalizeString(response?.statusText ?? err?.statusText);
  const code = normalizeString(err?.code);
  const responseText = extractResponseText(response?.data);
  const originalMessage = normalizeString(err?.message)
    || normalizeString(responseText)
    || String(error);
  const statusExplanation = getStatusExplanation(status, responseText);
  const codeExplanation = status ? null : getCodeExplanation(code);

  return {
    status,
    statusText,
    code,
    originalMessage,
    possibleReason: codeExplanation?.possibleReason || statusExplanation.possibleReason,
    suggestion: codeExplanation?.suggestion || statusExplanation.suggestion,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatInventoryErrorHtml(description: InventoryErrorDescription): string {
  const statusLine = description.status
    ? `HTTP ${description.status}${description.statusText ? ` ${description.statusText}` : ''}`
    : description.code
      ? `错误代码：${description.code}`
      : '未取得明确 HTTP 状态码';
  return [
    '❌ 发生未知错误',
    statusLine,
    `可能原因：${description.possibleReason}`,
    `建议：${description.suggestion}`,
    `原始错误：${description.originalMessage}`,
  ].map((line) => escapeHtml(line)).join('<br>');
}

export function formatInventoryErrorLog(description: InventoryErrorDescription): string {
  const statusPart = description.status
    ? `status=${description.status}${description.statusText ? ` ${description.statusText}` : ''}`
    : 'status=unknown';
  const codePart = description.code ? `code=${description.code}` : 'code=unknown';
  return [
    statusPart,
    codePart,
    `possible=${description.possibleReason}`,
    `suggestion=${description.suggestion}`,
    `raw=${description.originalMessage}`,
  ].join(' | ');
}
