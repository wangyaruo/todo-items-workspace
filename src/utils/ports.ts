import type { PortKey } from '@/types'

/** 端口完成进度 */
export interface PortProgress {
  /** 适用的端口总数 */
  total: number
  /** 已完成的端口数 */
  done: number
  /** 尚未完成的端口 */
  pending: PortKey[]
  /** 部分完成：至少一个完成、且未全部完成（这是需要提示的状态） */
  partial: boolean
  /** 全部完成（且至少有一个端口） */
  allDone: boolean
}

export function portProgress(ports: PortKey[], donePorts: PortKey[]): PortProgress {
  const done = ports.filter((p) => donePorts.includes(p))
  const pending = ports.filter((p) => !donePorts.includes(p))
  return {
    total: ports.length,
    done: done.length,
    pending,
    partial: done.length > 0 && pending.length > 0,
    allDone: ports.length > 0 && pending.length === 0,
  }
}

/** 端口号 → 展示文本，如 ['8080','8318'] → '8080、8318' */
export function portText(ports: PortKey[]): string {
  return ports.join('、')
}
