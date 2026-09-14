/**
 * 下拉选择器的导航计算。
 *
 * 抽成纯函数是为了能在无浏览器环境下断言——键盘导航的取模与定位
 * 这类边界（首项向上、末项向下、外部改值后重新定位）在界面上手点很难复现。
 */

/** 在选项列表中循环移动高亮下标，处理负数与空列表 */
export function stepIndex(current: number, step: number, length: number): number {
  if (length <= 0) return 0
  return (((current + step) % length) + length) % length
}

/** 按 key 定位下标，找不到时回到第一项 */
export function indexOfKey(options: readonly { key: string }[], key: string): number {
  const i = options.findIndex((o) => o.key === key)
  return i < 0 ? 0 : i
}
