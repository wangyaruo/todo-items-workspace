interface ImportMetaEnv {
  /** local = 浏览器本地存储；其它值 / 未设置 = 调后端接口 */
  readonly VITE_API_MODE?: string
  /** 后端地址。留空则走相对路径（开发由 Vite 代理，生产同源部署） */
  readonly VITE_API_BASE?: string
}
