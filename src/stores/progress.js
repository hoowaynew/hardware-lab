import { defineStore } from 'pinia'

const STORAGE_KEY = 'hw-lab-progress'
const TOTAL_EXPERIMENTS = 12

export const useProgressStore = defineStore('progress', {
  state: () => ({
    completed: {},     // experimentId -> { stars, firstErrorFree, completions }
    achievements: [],  // unlocked achievement ids
    totalScore: 0,
    errorCount: 0      // 总触发错误次数
  }),

  getters: {
    completedCount: (state) => Object.keys(state.completed).length,
    hasAchievement: (state) => (id) => state.achievements.includes(id),
    perfectCount: (state) => {
      return Object.values(state.completed).filter(c => c.firstErrorFree).length
    },
    totalCompletions: (state) => {
      return Object.values(state.completed).reduce((sum, c) => sum + (c.completions || 0), 0)
    },
    progressPercent: (state) => {
      return Math.round(Object.keys(state.completed).length / TOTAL_EXPERIMENTS * 100)
    },
    totalStars: (state) => {
      return Object.values(state.completed).reduce((sum, c) => sum + (c.stars || 0), 0)
    },
    maxStars: () => TOTAL_EXPERIMENTS * 3,
    achievementList: () => [
      { id: 'first-error', name: '🔥 纵火犯', desc: '第一次触发错误警告' },
      { id: 'first-complete', name: '💡 亮灯人', desc: '完成第一个实验' },
      { id: 'three-done', name: '🔧 初出茅庐', desc: '完成3个实验' },
      { id: 'six-done', name: '⚙️ 小有所成', desc: '完成6个实验' },
      { id: 'all-done', name: '🏆 硬件达人', desc: '完成全部12个实验' },
      { id: 'perfect-three', name: '⭐ 完美主义', desc: '3个实验无错误通关' },
      { id: 'perfect-six', name: '✨ 精益求精', desc: '6个实验无错误通关' },
      { id: 'perfect-all', name: '👑 零失误大师', desc: '全部12个实验无错误通关' }
    ]
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
          this.errorCount = data.errorCount || 0
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

    recordError() {
      this.errorCount++
      this.checkAchievements(null, false)
      this.save()
    },

    checkAchievements(experimentId, errorFree) {
      const conditions = {
        'first-error': () => this.errorCount >= 1,
        'first-complete': () => this.completedCount >= 1,
        'three-done': () => this.completedCount >= 3,
        'six-done': () => this.completedCount >= 6,
        'all-done': () => this.completedCount >= TOTAL_EXPERIMENTS,
        'perfect-three': () => this.perfectCount >= 3,
        'perfect-six': () => this.perfectCount >= 6,
        'perfect-all': () => this.perfectCount >= TOTAL_EXPERIMENTS
      }

      for (const [id, cond] of Object.entries(conditions)) {
        if (!this.achievements.includes(id) && cond()) {
          this.achievements.push(id)
        }
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          completed: this.completed,
          achievements: this.achievements,
          totalScore: this.totalScore,
          errorCount: this.errorCount
        }))
      } catch (e) {
        console.warn('Failed to save progress:', e)
      }
    },

    reset() {
      this.completed = {}
      this.achievements = []
      this.totalScore = 0
      this.errorCount = 0
      this.save()
    },

    startExperiment(experimentId) {
      // 可选：记录开始时间等，目前仅用于扩展接口
    }
  }
})
