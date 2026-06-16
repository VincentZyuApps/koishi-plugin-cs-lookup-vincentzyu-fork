import { Context } from 'koishi';
import { Config } from './config';
import {
  LOG_LEVELS,
  type LogLevel,
} from './types';

export type LogLevelSource = Config | LogLevel | string;

function resolveLogLevel(source: LogLevelSource): LogLevel {
  if (typeof source === 'string') return source as LogLevel;
  return source.logLevel;
}

export function logInfo(
  ctx: Context,
  levelSource: LogLevelSource,
  level: LogLevel,
  filename: string,
  message: string,
): void {
  const configLevel = resolveLogLevel(levelSource);
  if (LOG_LEVELS[configLevel] < LOG_LEVELS[level]) return;

  ctx.logger.info(
    `[${filename}] [${level}] ${message}`,
  );
}
