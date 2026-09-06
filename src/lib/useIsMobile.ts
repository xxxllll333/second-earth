import { useEffect, useState } from 'react'

/**
 * 视口断点 hook：返回当前是否为窄屏（移动端）。
 * 全站布局为内联 style，CSS media query 无法覆盖内联样式，
 * 故用 JS 检测视口宽度，在组件内按 isMobile 切换布局值。
 */
export function useIsMobile(breakpoint = 820): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])

  return isMobile
}
