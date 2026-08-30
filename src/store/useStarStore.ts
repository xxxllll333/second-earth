// 全局状态：收藏的行星（持久化到浏览器 localStorage）
// 回访机制原型：收藏某颗行星后，若该行星有"新数据更新"，我的星表页会显示提示横幅

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StarStore {
  favorites: string[]
  toggleFavorite: (name: string) => void
  isFavorite: (name: string) => boolean
}

export const useStarStore = create<StarStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (name: string) => {
        const { favorites } = get()
        if (favorites.includes(name)) {
          set({ favorites: favorites.filter(n => n !== name) })
        } else {
          set({ favorites: [...favorites, name] })
        }
      },
      isFavorite: (name: string) => get().favorites.includes(name),
    }),
    { name: 'second-earth-favorites' },
  ),
)
