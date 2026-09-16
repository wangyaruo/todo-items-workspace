import type { PortKey, StatusKey } from '@/types'

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

/**
 * 「待验证」前置规则：
 * - 目标状态为 verifying 时，要求至少一个端口已完成，否则拒绝
 * - 取消最后一个完成标记导致不满足时（未显式指定状态），自动退回 developing
 * 服务端 server/src/verifying-rule.js 有一份同语义实现，两边要保持一致。
 */
export interface VerifyingRuleInput {
  current: { status: StatusKey; ports: PortKey[]; donePorts: PortKey[] }
  patch: { status?: StatusKey; ports?: PortKey[]; donePorts?: PortKey[] }
}

export interface VerifyingRuleResult {
  error?: string
  status: StatusKey
  donePorts: PortKey[]
}

export function applyVerifyingRule(
  current: VerifyingRuleInput['current'],
  patch: VerifyingRuleInput['patch'],
): VerifyingRuleResult {
  const ports = patch.ports !== undefined ? patch.ports : current.ports
  const donePorts = (patch.donePorts !== undefined ? patch.donePorts : current.donePorts).filter(
    (p) => ports.includes(p),
  )
  let status = patch.status !== undefined ? patch.status : current.status

  if (status === 'verifying' && donePorts.length === 0) {
    if (patch.status === 'verifying') {
      return {
        error: '至少有一个端口标记完成后，才能改为「待验证」。',
        status: current.status,
        donePorts,
      }
    }
    // 完成标记 / 适用端口变化导致不再满足，自动退回开发中
    status = 'developing'
  }
  return { status, donePorts }
}
