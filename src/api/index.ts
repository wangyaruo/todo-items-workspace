import { httpApi } from './http'
import { localApi } from './local'
import type { BoardApi } from './types'

export type { BoardApi, ItemPatch, NewComment } from './types'

/**
 * 数据源切换（通过环境变量控制）：
 *   VITE_API_MODE=local  浏览器本地存储，离线可用，但两人数据不互通
 *   未设置 / 其它        调后端接口（默认）
 *
 * 详见 README 的「后端」一节。
 */
export const apiMode: 'local' | 'http' = import.meta.env.VITE_API_MODE === 'local' ? 'local' : 'http'

export const api: BoardApi = apiMode === 'local' ? localApi : httpApi
