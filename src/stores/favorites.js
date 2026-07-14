import { defineStore } from 'pinia'

const FAV_KEY = 'hw-lab-favorites'
const RECENT_KEY = 'hw-lab-recent'
const MAX_RECENT = 6

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    favorites: [],   // experiment ids
    recent: []       // experiment ids, most recent first
  }),

  getters: {
    isFavorite: (state) => (id) => state.favorites.includes(id),
    favoriteCount: (state) => state.favorites.length
  },

  actions: {
    load() {
      try {
        this.favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
        this.recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      } catch (e) {
        this.favorites = []
        this.recent = []
      }
    },

    toggleFavorite(id) {
      const idx = this.favorites.indexOf(id)
      if (idx >= 0) {
        this.favorites.splice(idx, 1)
      } else {
        this.favorites.push(id)
      }
      localStorage.setItem(FAV_KEY, JSON.stringify(this.favorites))
    },

    recordVisit(id) {
      // remove if exists, then prepend
      const idx = this.recent.indexOf(id)
      if (idx >= 0) this.recent.splice(idx, 1)
      this.recent.unshift(id)
      if (this.recent.length > MAX_RECENT) this.recent.pop()
      localStorage.setItem(RECENT_KEY, JSON.stringify(this.recent))
    }
  }
})
