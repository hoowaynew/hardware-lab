import { defineStore } from 'pinia'

const STORAGE_KEY = 'hw-lab-theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'dark' // 'dark' | 'light'
  }),

  actions: {
    init() {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') {
        this.mode = saved
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.mode = 'light'
      }
      this.apply()
    },

    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark'
      this.save()
      this.apply()
    },

    apply() {
      document.documentElement.setAttribute('data-theme', this.mode)
    },

    save() {
      localStorage.setItem(STORAGE_KEY, this.mode)
    }
  }
})
