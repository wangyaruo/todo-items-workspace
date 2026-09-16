/**
 * 「待验证」前置规则（与前端 src/utils/ports.ts 的 applyVerifyingRule 同语义，两边要保持一致）：
 * - 目标状态为 verifying 时，要求至少一个端口已完成，否则拒绝
 * - 取消最后一个完成标记导致不满足时（未显式指定状态），自动退回 developing
 *
 * 纯函数，不依赖数据库，方便直接 node 跑单测。
 *
 * @param {{ status: string, ports: string[], donePorts: string[] }} current
 * @param {{ status?: string, ports?: string[], donePorts?: string[] }} patch
 * @returns {{ error?: string, status: string, donePorts: string[] }}
 */
export function applyVerifyingRule(current, patch) {
  const ports = patch.ports !== undefined ? patch.ports : current.ports
  const donePorts = (patch.donePorts !== undefined ? patch.donePorts : current.donePorts).filter(
    (p) => ports.includes(p),
  )
  let status = patch.status !== undefined ? patch.status : current.status

  if (status === 'verifying' && donePorts.length === 0) {
    if (patch.status === 'verifying') {
      return {
        error: '至少有一个端口标记完成后，才能改为「待验证」',
        status: current.status,
        donePorts,
      }
    }
    // 完成标记 / 适用端口变化导致不再满足，自动退回开发中
    status = 'developing'
  }
  return { status, donePorts }
}
