import { Context } from 'koishi';
import { Config } from './config';
import {
  LOG_LEVELS,
  type LogLevel,
} from './types';
import path from 'path';
import { fileURLToPath } from 'url';

export type LogLevelSource = Config | LogLevel | string;

function resolveLogLevel(source: LogLevelSource): LogLevel {
  if (typeof source === 'string') return source as LogLevel;
  return source.logLevel;
}

function resolveFilename(input: string): string {
  if (input.startsWith('file://')) {
    return path.basename(fileURLToPath(input)).replace(/\.js$/, '.ts');
  }
  return path.basename(input).replace(/\.js$/, '.ts');
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
    `[${resolveFilename(filename)}] [${level}] ${message}`,
  );
}
