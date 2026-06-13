export const PROXY_PROTOCOL = {
  HTTP: 'http',
  HTTPS: 'https',
  SOCKS4: 'socks4',
  SOCKS5: 'socks5',
  SOCKS5H: 'socks5h',
} as const;
export type ProxyProtocolType = typeof PROXY_PROTOCOL[keyof typeof PROXY_PROTOCOL];

export const IMAGE_TYPES = {
  PNG: 'png',
  JPEG: 'jpeg',
  WEBP: 'webp',
} as const;
export type ImageType = typeof IMAGE_TYPES[keyof typeof IMAGE_TYPES];

export const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const
export type LogLevel = keyof typeof LOG_LEVELS
