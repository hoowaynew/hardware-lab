import { defineStore } from 'pinia'

const STORAGE_KEY = 'hw-lab-progress'

export const useProgressStore = defineStore('progress', {
  state: () => ({
    completed: {},     // experimentId -> { stars, firstErrorFree, completions }
    achievements: [],  // unlocked achievement ids
    totalScore: 0
  }),

  getters: {
    completedCount: (state) => Object.keys(state.completed).length,
    hasAchievement: (state) => (id) => state.achievements.includes(id)
  },

  actions: {
    load() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const data = JSON.parse(saved)
          this.completed = data.completed || {}
          this.achievements = data.achievements || []
          this.totalScore = data.totalScore || 0
        }
      } catch (e) {
        console.warn('Failed to load progress:', e)
      }
    },

    complete(experimentId, errorFree = false) {
      const existing = this.completed[experimentId] || { stars: 0, completions: 0 }
      const stars = errorFree ? 3 : (existing.stars > 0 ? existing.stars : 1)

      this.completed[experimentId] = {
        stars: Math.max(existing.stars, stars),
        firstErrorFree: existing.firstErrorFree || errorFree,
        completions: existing.completions + 1,
        lastCompleted: Date.now()
      }

      this.checkAchievements(experimentId, errorFree)
      this.save()
    },

    checkAchievements(experimentId, errorFree) {
      const achievements = [
        { id: 'first-burn', condition: () => this.totalCompletions >= 1, name: '🔥 纵火犯', desc: '第一次触发烧毁' },
        { id: 'first-complete', condition: () => this.completedCount >= 1, name: '💡 亮灯人', desc: '完成第一个实验' },
        { id: 'perfect-three', condition: () => this.perfectCount >= 3, name: '⭐ 完美主义', desc: '3个实验无错误通关' },
        { id: 'all-done', condition: () => this.completedCount >= 3, name: '🏆 初出茅庐', desc: '完成全部3个实验' }
      ]

      for (const ach of achievements) {
        if (!this.achievements.includes(ach.id) && ach.condition()) {
          this.achievements.push(ach.id)
        }
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          completed: this.completed,
          achievements: this.achievements,
          totalScore: this.totalScore
        }))
      } catch (e) {
        console.warn('Failed to save progress:', e)
      }
    }
  }
})
