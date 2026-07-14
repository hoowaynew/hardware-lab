<template>
  <div class="app" :class="{ 'embed-mode': isEmbed }">
    <!-- 顶部导航 -->
    <header v-if="!isEmbed" class="app-header">
      <div class="header-row">
        <h1>🔬 硬件实验室</h1>
        <div class="header-controls">
          <button class="icon-btn" @click="toggleSound" :title="soundOn ? '关闭音效' : '开启音效'">
            {{ soundOn ? '🔊' : '🔇' }}
          </button>
          <button class="icon-btn" @click="theme.toggle()" :title="theme.mode === 'dark' ? '切换亮色' : '切换暗色'">
            {{ theme.mode === 'dark' ? '☀️' : '🌙' }}
          </button>
          <button class="icon-btn" @click="showSettings = !showSettings" title="设置">
            ⚙️
          </button>
        </div>
      </div>
      <p class="app-subtitle">交互式硬件原理实验平台 · 12个实验 · 11大分类</p>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索实验名称、分类、关键词…"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
        <button class="random-btn" @click="randomExperiment" title="随机实验">🎲</button>
      </div>

      <!-- 设置面板 -->
      <Transition name="settings-slide">
        <div v-if="showSettings" class="settings-panel">
          <div class="settings-item">
            <span class="settings-label">已完成实验</span>
            <span class="settings-value">{{ progress.completedCount }}/{{ allExperiments.length }}</span>
          </div>
          <div class="settings-item">
            <span class="settings-label">总错误次数</span>
            <span class="settings-value">{{ progress.errorCount }}</span>
          </div>
          <button class="reset-btn" @click="confirmReset">
            🗑️ 重置所有进度
          </button>
        </div>
      </Transition>
    </header>

    <!-- 首页：进度面板 + 搜索结果/分类卡片网格 -->
    <div v-if="!store.currentExperiment && !isEmbed && !selectedCategory" class="home-view">
      <!-- 进度统计面板 -->
      <div class="progress-panel">
        <div class="progress-stats">
          <div class="progress-stat">
            <span class="ps-value">{{ progress.completedCount }}/{{ allExperiments.length }}</span>
            <span class="ps-label">已完成实验</span>
          </div>
          <div class="progress-stat">
            <span class="ps-value">{{ progress.totalStars }}/{{ progress.maxStars }}</span>
            <span class="ps-label">总星数</span>
          </div>
          <div class="progress-stat">
            <span class="ps-value">{{ progress.achievements.length }}</span>
            <span class="ps-label">成就解锁</span>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" :style="{ width: progress.progressPercent + '%' }"></div>
          <span class="progress-bar-text">{{ progress.progressPercent }}%</span>
        </div>
        <!-- 成就展示 -->
        <div class="achievement-row" v-if="progress.achievements.length > 0">
          <span
            v-for="achId in progress.achievements"
            :key="achId"
            class="achievement-badge"
          >{{ getAchievementName(achId) }}</span>
        </div>
        <!-- 学习路径入口 -->
        <button class="path-btn" @click="showLearningPath = true">
          🛤️ 学习路径 · {{ pathCompletedCount }}/{{ allExperiments.length }} 步完成
        </button>
      </div>

      <!-- 统计仪表盘 -->
      <StatsDashboard
        v-if="!searchQuery"
        :categories="categories"
        :allExperiments="allExperiments"
        :progress="progress"
        :errorCount="progress.errorCount"
        :errorBySeverity="errorBySeverity"
        @export="exportProgress"
        @import="importProgress"
      />

      <!-- 最近浏览 -->
      <div v-if="!searchQuery && recentExperiments.length > 0" class="quick-row">
        <div class="quick-label">🕐 最近浏览</div>
        <div class="quick-chips">
          <div
            v-for="exp in recentExperiments"
            :key="'r-' + exp.id"
            class="quick-chip"
            @click="loadExperiment(exp.id)"
          >
            <span>{{ exp.icon }}</span>
            <span>{{ exp.shortTitle }}</span>
          </div>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div v-if="!searchQuery && favoriteExperiments.length > 0" class="quick-row">
        <div class="quick-label">⭐ 收藏</div>
        <div class="quick-chips">
          <div
            v-for="exp in favoriteExperiments"
            :key="'f-' + exp.id"
            class="quick-chip fav-chip"
            @click="loadExperiment(exp.id)"
          >
            <span>{{ exp.icon }}</span>
            <span>{{ exp.shortTitle }}</span>
          </div>
        </div>
      </div>

      <!-- 搜索结果列表 -->
      <div v-if="searchQuery" class="search-results">
        <div v-if="filteredExperiments.length === 0" class="search-empty">
          没有找到匹配的实验 😅
        </div>
        <div v-else class="exp-cards">
          <div
            v-for="exp in filteredExperiments"
            :key="exp.id"
            class="exp-card"
            @click="loadExperiment(exp.id)"
          >
            <span class="exp-card-icon">{{ exp.icon }}</span>
            <div class="exp-card-info">
              <span class="exp-card-title">{{ exp.shortTitle }}</span>
              <span class="exp-card-desc">{{ exp.desc }}</span>
            </div>
            <span v-if="progress.completed[exp.id]" class="exp-card-done">✓</span>
          </div>
        </div>
      </div>

      <!-- 难度筛选标签 -->
      <div v-if="!searchQuery" class="difficulty-filter">
        <button
          v-for="d in difficultyFilters"
          :key="d.value"
          class="diff-tab"
          :class="{ active: selectedDifficulty === d.value }"
          @click="selectedDifficulty = d.value"
        >{{ d.label }}</button>
      </div>

      <!-- 分类卡片网格 / 难度筛选结果 -->
      <div v-if="!searchQuery" class="category-grid">
        <template v-if="selectedDifficulty === 'all'">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-card"
            :class="{ 'cat-available': cat.available, 'cat-soon': !cat.available }"
            @click="cat.available && selectCategory(cat)"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.available ? cat.experiments.length + '个实验' : '即将上线' }}</span>
            <span v-if="categoryProgress(cat.id) > 0" class="cat-progress">{{ categoryProgress(cat.id) }}/{{ cat.experiments.length }} ✓</span>
          </div>
        </template>
        <template v-else>
          <div
            v-for="exp in experimentsByDifficulty"
            :key="exp.id"
            class="category-card exp-by-diff"
            @click="loadExperiment(exp.id)"
          >
            <span class="cat-icon">{{ exp.icon }}</span>
            <span class="cat-name">{{ exp.shortTitle }}</span>
            <span class="cat-count">{{ exp.desc }}</span>
            <span class="diff-badge" :class="exp.difficulty || 'beginner'">{{ difficultyShortMap[exp.difficulty || 'beginner'] }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 分类下的实验列表 -->
    <div v-if="selectedCategory && !store.currentExperiment && !isEmbed" class="experiment-list">
      <button class="back-btn" @click="goBackToCategories">← 返回分类</button>
      <h2>{{ selectedCategory.icon }} {{ selectedCategory.name }}</h2>
      <div class="exp-cards">
        <div
          v-for="exp in selectedCategory.experiments"
          :key="exp.id"
          class="exp-card"
          @click="loadExperiment(exp.id)"
        >
          <span class="exp-card-icon">{{ exp.icon }}</span>
          <div class="exp-card-info">
            <span class="exp-card-title">{{ exp.shortTitle }}</span>
            <span class="exp-card-desc">{{ exp.desc }}</span>
          </div>
          <span v-if="progress.completed[exp.id]" class="exp-card-done">✓</span>
        </div>
      </div>
    </div>

    <!-- 实验区域 -->
    <main class="experiment-area" v-if="store.currentExperiment">
      <div class="experiment-header">
        <button v-if="!isEmbed" class="back-btn" @click="exitExperiment">← 返回</button>
        <h2 class="experiment-title">{{ store.currentExperiment.title }}</h2>
        <p class="experiment-desc">{{ store.currentExperiment.description }}</p>
        <div class="experiment-meta">
          <span class="meta-tag">{{ categoryLabel }}</span>
          <span class="meta-tag">{{ difficultyLabel }}</span>
          <button class="share-btn" @click="copyShareLink">🔗 分享</button>
          <button class="share-btn" @click="showShareCard = true">📸 卡片</button>
          <button
            v-if="!isEmbed && hasChallenge"
            class="share-btn challenge-toggle"
            :class="{ active: showChallenge }"
            @click="showChallenge = !showChallenge"
          >🎯 挑战</button>
          <button
            v-if="!isEmbed"
            class="share-btn fav-toggle"
            :class="{ 'is-fav': favorites.isFavorite(currentExpId) }"
            @click="toggleFav"
          >{{ favorites.isFavorite(currentExpId) ? '★ 已收藏' : '☆ 收藏' }}</button>
        </div>
      </div>

      <!-- 知识点面板 -->
      <KnowledgePanel :data="currentKnowledge" />

      <!-- 渐进提示 -->
      <HintButton :hints="currentHints" />

      <!-- LED限流电阻实验布局 -->
      <div v-if="currentExpId === 'led-resistor'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
          @component-click="onComponentClick"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- GPIO实验布局 -->
      <div v-else-if="currentExpId === 'gpio-modes'" class="experiment-content gpio-layout">
        <div class="gpio-display">
          <CircuitCanvas
            :canvas="store.currentExperiment.canvas"
            :simResult="store.simResult"
            :errors="store.errors"
          />
          <WaveformView
            wave-type="gpio"
            :gpioState="gpioWaveState"
          />
        </div>
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          :activeMode="store.userState.gpioMode"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- PWM实验布局 -->
      <div v-else-if="currentExpId === 'pwm-tuner'" class="experiment-content pwm-layout">
        <WaveformView
          wave-type="pwm"
          :frequency="pwmFrequency"
          :dutyCycle="pwmDutyCycle"
        />
        <div class="pwm-load-display">
          <PwmLoadView
            :loadType="pwmLoadType"
            :simResult="store.simResult?.results?.PWM1"
          />
        </div>
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 分压器实验布局 -->
      <div v-else-if="currentExpId === 'voltage-divider'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
          @component-click="onComponentClick"
        />
        <VoltageDividerView
          :simResult="dividerSimResult"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 电容充放电实验布局 -->
      <div v-else-if="currentExpId === 'capacitor-charge'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <CapacitorChargeView
          :simResult="store.simResult?.results?.CC1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 三极管开关实验布局 -->
      <div v-else-if="currentExpId === 'transistor-switch'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <TransistorSwitchView
          :simResult="store.simResult?.results?.TS1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- RC滤波器实验布局 -->
      <div v-else-if="currentExpId === 'rc-filter'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <RCFilterView
          :simResult="store.simResult?.results?.RF1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- I2C时序实验布局 -->
      <div v-else-if="currentExpId === 'i2c-signal'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <I2CView
          :simResult="store.simResult?.results?.I2C1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- NTC测温实验布局 -->
      <div v-else-if="currentExpId === 'ntc-thermistor'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <NTCThermistorView
          :simResult="store.simResult?.results?.NTC1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- PCB走线阻抗实验布局 -->
      <div v-else-if="currentExpId === 'pcb-trace-impedance'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <PCBTraceView
          :simResult="store.simResult?.results?.PCB1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- WiFi信号衰减实验布局 -->
      <div v-else-if="currentExpId === 'wifi-signal-attenuation'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <WifiSignalView
          :simResult="store.simResult?.results?.WIFI1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 逻辑分析仪调试实验布局 -->
      <div v-else-if="currentExpId === 'logic-analyzer-debug'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <LogicAnalyzerView
          :simResult="store.simResult?.results?.LA1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- DC-DC Buck降压实验布局 -->
      <div v-else-if="currentExpId === 'dcdc-buck'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <DCDCBuckView
          :simResult="store.simResult?.results?.BUCK1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 运放比较器实验布局 -->
      <div v-else-if="currentExpId === 'opamp-comparator'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <OpAmpComparatorView
          :simResult="store.simResult?.results?.OPAMP1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- 按键消抖实验布局 -->
      <div v-else-if="currentExpId === 'button-debounce'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <ButtonDebounceView
          :simResult="store.simResult?.results?.BTN1"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>
    </main>

    <!-- 实验笔记 -->
    <ExperimentNote
      v-if="store.currentExperiment && !isEmbed"
      :experimentId="currentExpId"
    />

    <!-- 错误弹窗 -->
    <ErrorPopup
      :visible="showErrorPopup"
      :error="store.currentError"
      @close="showErrorPopup = false"
      @retry="onRetry"
      @read-article="onReadArticle"
    />

    <!-- 成功提示 -->
    <Transition name="toast">
      <div v-if="showSuccessToast" class="success-toast">
        ✅ {{ successMessage }}
      </div>
    </Transition>

    <!-- 首次访问引导 -->
    <Onboarding v-if="!isEmbed" />

    <!-- 挑战模式面板 -->
    <ChallengeMode
      v-if="!isEmbed"
      :visible="showChallenge"
      :experimentId="currentExpId"
      :simResult="store.simResult"
      @close="showChallenge = false"
      @complete="onChallengeComplete"
    />

    <!-- 分享卡片 -->
    <ShareCard
      v-if="!isEmbed"
      :visible="showShareCard"
      :experimentId="currentExpId"
      :experimentTitle="store.currentExperiment?.title || ''"
      :experimentIcon="currentExpMeta?.icon || '🔬'"
      :category="categoryLabel"
      :difficulty="difficultyLabel"
      :stars="progress.completed[currentExpId]?.stars || 0"
      :params="store.userState"
      :statusText="statusText"
      @close="showShareCard = false"
    />

    <!-- 学习路径 -->
    <LearningPath
      v-if="!isEmbed"
      :visible="showLearningPath"
      :completed="progress.completed"
      @close="showLearningPath = false"
      @start="loadExperiment"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useExperimentStore } from './stores/experiment.js'
import { useProgressStore } from './stores/progress.js'
import { useThemeStore } from './stores/theme.js'
import { sfx, setSoundEnabled, isSoundEnabled } from './utils/sound.js'
import CircuitCanvas from './components/CircuitCanvas.vue'
import InteractionPanel from './components/InteractionPanel.vue'
import ErrorPopup from './components/ErrorPopup.vue'
import WaveformView from './components/WaveformView.vue'
import PwmLoadView from './components/PwmLoadView.vue'
import VoltageDividerView from './components/VoltageDividerView.vue'
import CapacitorChargeView from './components/CapacitorChargeView.vue'
import TransistorSwitchView from './components/TransistorSwitchView.vue'
import RCFilterView from './components/RCFilterView.vue'
import I2CView from './components/I2CView.vue'
import NTCThermistorView from './components/NTCThermistorView.vue'
import PCBTraceView from './components/PCBTraceView.vue'
import WifiSignalView from './components/WifiSignalView.vue'
import LogicAnalyzerView from './components/LogicAnalyzerView.vue'
import DCDCBuckView from './components/DCDCBuckView.vue'
import OpAmpComparatorView from './components/OpAmpComparatorView.vue'
import ButtonDebounceView from './components/ButtonDebounceView.vue'
import ChallengeMode from './components/ChallengeMode.vue'
import KnowledgePanel from './components/KnowledgePanel.vue'
import HintButton from './components/HintButton.vue'
import StatsDashboard from './components/StatsDashboard.vue'
import Onboarding from './components/Onboarding.vue'
import ShareCard from './components/ShareCard.vue'
import LearningPath from './components/LearningPath.vue'
import ExperimentNote from './components/ExperimentNote.vue'
import { knowledgeData } from './data/knowledge.js'
import { hintsData } from './data/hints.js'
import { challengeData } from './data/challenges.js'
import { useFavoritesStore } from './stores/favorites.js'

import ledConfig from './experiments/led-resistor.json'
import gpioConfig from './experiments/gpio-modes.json'
import pwmConfig from './experiments/pwm-tuner.json'
import dividerConfig from './experiments/voltage-divider.json'
import capacitorConfig from './experiments/capacitor-charge.json'
import transistorConfig from './experiments/transistor-switch.json'
import rcFilterConfig from './experiments/rc-filter.json'
import i2cConfig from './experiments/i2c-signal.json'
import ntcConfig from './experiments/ntc-thermistor.json'
import pcbConfig from './experiments/pcb-trace-impedance.json'
import wifiConfig from './experiments/wifi-signal-attenuation.json'
import laConfig from './experiments/logic-analyzer-debug.json'
import dcdcConfig from './experiments/dcdc-buck.json'
import opampConfig from './experiments/opamp-comparator.json'
import debounceConfig from './experiments/button-debounce.json'

const store = useExperimentStore()
const progress = useProgressStore()
const theme = useThemeStore()
const favorites = useFavoritesStore()
const soundOn = ref(isSoundEnabled())

const allExperiments = [
  { id: 'led-resistor', icon: '💡', shortTitle: 'LED限流电阻', desc: '计算正确的限流阻值', config: ledConfig },
  { id: 'gpio-modes', icon: '📋', shortTitle: 'GPIO八种模式', desc: '配置STM32引脚模式', config: gpioConfig },
  { id: 'pwm-tuner', icon: '📶', shortTitle: 'PWM调音台', desc: '调节占空比驱动负载', config: pwmConfig },
  { id: 'voltage-divider', icon: '📐', shortTitle: '分压器', desc: 'Vout=Vin×R2/(R1+R2)', config: dividerConfig },
  { id: 'capacitor-charge', icon: '🔋', shortTitle: '电容充放电', desc: 'τ=RC时间常数', config: capacitorConfig },
  { id: 'transistor-switch', icon: '🔘', shortTitle: '三极管开关', desc: '小电流控制大电流', config: transistorConfig },
  { id: 'rc-filter', icon: '〰️', shortTitle: 'RC低通滤波', desc: 'fc=1/(2πRC)', config: rcFilterConfig },
  { id: 'i2c-signal', icon: '🔗', shortTitle: 'I2C时序', desc: 'SDA/SCL协议解析', config: i2cConfig },
  { id: 'ntc-thermistor', icon: '🌡️', shortTitle: 'NTC测温', desc: '温度→阻值→ADC', config: ntcConfig },
  { id: 'pcb-trace-impedance', icon: '🎨', shortTitle: 'PCB走线阻抗', desc: '50Ω阻抗匹配', config: pcbConfig },
  { id: 'wifi-signal-attenuation', icon: '📶', shortTitle: 'WiFi信号衰减', desc: '链路预算计算', config: wifiConfig },
  { id: 'logic-analyzer-debug', icon: '🐛', shortTitle: 'SPI调试', desc: '逻辑分析仪解码', config: laConfig },
  { id: 'dcdc-buck', icon: '⚡', shortTitle: 'DC-DC Buck', desc: '12V→5V降压转换', config: dcdcConfig, difficulty: 'intermediate' },
  { id: 'opamp-comparator', icon: '📐', shortTitle: '运放比较器', desc: '阈值检测+迟滞', config: opampConfig, difficulty: 'intermediate' },
  { id: 'button-debounce', icon: '⏱️', shortTitle: '按键消抖', desc: '硬件vs软件消抖', config: debounceConfig, difficulty: 'beginner' }
]

const categories = [
  { id: 'power', icon: '⚡', name: '电源与供电', available: true, experiments: allExperiments.filter(e => e.config.category === 'power') },
  { id: 'stm32', icon: '📋', name: 'STM32/GPIO', available: true, experiments: allExperiments.filter(e => e.config.category === 'stm32') },
  { id: 'timing', icon: '⏱️', name: '定时与PWM', available: true, experiments: allExperiments.filter(e => e.config.category === 'timing') },
  { id: 'analog', icon: '📊', name: '模拟电路', available: true, experiments: allExperiments.filter(e => e.config.category === 'analog') },
  { id: 'circuit', icon: '🔌', name: '电路基础', available: true, experiments: allExperiments.filter(e => e.config.category === 'circuit') },
  { id: 'signal', icon: '〰️', name: '信号处理', available: true, experiments: allExperiments.filter(e => e.config.category === 'signal') },
  { id: 'comm', icon: '🔗', name: '通信协议', available: true, experiments: allExperiments.filter(e => e.config.category === 'comm') },
  { id: 'sensor', icon: '📡', name: '传感器接口', available: true, experiments: allExperiments.filter(e => e.config.category === 'sensor') },
  { id: 'pcb', icon: '🎨', name: 'PCB设计', available: true, experiments: allExperiments.filter(e => e.config.category === 'pcb') },
  { id: 'wireless', icon: '📡', name: '无线技术', available: true, experiments: allExperiments.filter(e => e.config.category === 'wireless') },
  { id: 'debug', icon: '🐛', name: '调试技巧', available: true, experiments: allExperiments.filter(e => e.config.category === 'debug') }
]

const currentExpId = ref(null)
const selectedCategory = ref(null)
const showErrorPopup = ref(false)
const showSuccessToast = ref(false)
const showChallenge = ref(false)
const successMessage = ref('')
const isEmbed = ref(new URLSearchParams(window.location.search).has('embed'))
const searchQuery = ref('')
const selectedDifficulty = ref('all')
const difficultyFilters = [
  { value: 'all', label: '📋 全部' },
  { value: 'beginner', label: '🟢 入门' },
  { value: 'intermediate', label: '🟡 进阶' },
  { value: 'advanced', label: '🔴 高级' }
]
const difficultyShortMap = { beginner: '入门', intermediate: '进阶', advanced: '高级' }

const experimentsByDifficulty = computed(() => {
  if (selectedDifficulty.value === 'all') return []
  return allExperiments.filter(e => (e.difficulty || 'beginner') === selectedDifficulty.value)
})
const showSettings = ref(false)
const showShareCard = ref(false)
const showLearningPath = ref(false)

// 加载进度
onMounted(() => {
  progress.load()
  favorites.load()
  // embed模式下自动加载指定实验或第一个实验
  if (isEmbed.value) {
    const params = new URLSearchParams(window.location.search)
    const expParam = params.get('exp')
    loadExperiment(expParam || 'led-resistor')
  } else {
    // 深链接：?exp=xxx 直接打开实验
    const params = new URLSearchParams(window.location.search)
    const expParam = params.get('exp')
    if (expParam && allExperiments.find(e => e.id === expParam)) {
      loadExperiment(expParam)
    }
  }

  // 键盘快捷键
  window.addEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  if (e.key === 'Escape' && store.currentExperiment) {
    exitExperiment()
  } else if (e.key === 'ArrowRight' && store.currentExperiment) {
    navigateExperiment(1)
  } else if (e.key === 'ArrowLeft' && store.currentExperiment) {
    navigateExperiment(-1)
  }
}

function navigateExperiment(dir) {
  const idx = allExperiments.findIndex(e => e.id === currentExpId.value)
  if (idx < 0) return
  const next = idx + dir
  if (next >= 0 && next < allExperiments.length) {
    loadExperiment(allExperiments[next].id)
  }
}

// 最近浏览列表
const recentExperiments = computed(() => {
  return favorites.recent
    .map(id => allExperiments.find(e => e.id === id))
    .filter(Boolean)
})

// 收藏列表
const favoriteExperiments = computed(() => {
  return favorites.favorites
    .map(id => allExperiments.find(e => e.id === id))
    .filter(Boolean)
})

// 当前实验元数据
const currentExpMeta = computed(() => {
  return allExperiments.find(e => e.id === currentExpId.value)
})

// 学习路径完成数
const pathCompletedCount = computed(() => {
  return allExperiments.filter(e => progress.completed[e.id]).length
})

// 当前实验的提示数据
const currentHints = computed(() => hintsData[currentExpId.value] || [])

function selectCategory(cat) {
  if (!cat.available) return
  sfx.click()
  selectedCategory.value = cat
}

function goBackToCategories() {
  selectedCategory.value = null
}

function exitExperiment() {
  store.currentExperiment = null
  currentExpId.value = null
  // 清除URL中的exp参数
  const url = new URL(window.location.href)
  url.searchParams.delete('exp')
  window.history.replaceState({}, '', url)
}

function getAchievementName(achId) {
  const ach = progress.achievementList.find(a => a.id === achId)
  return ach ? ach.name : achId
}

// 搜索过滤
const filteredExperiments = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allExperiments
  return allExperiments.filter(exp => {
    const catName = categories.find(c => c.id === exp.config.category)?.name || ''
    return exp.shortTitle.toLowerCase().includes(q) ||
           exp.desc.toLowerCase().includes(q) ||
           catName.toLowerCase().includes(q) ||
           exp.id.toLowerCase().includes(q)
  })
})

// 当前实验的知识点
const currentKnowledge = computed(() => {
  return knowledgeData[currentExpId.value] || null
})

// 挑战模式
const hasChallenge = computed(() => {
  return !!challengeData[currentExpId.value]
})

function onChallengeComplete({ score, time, attempts }) {
  progress.totalScore += Math.round(score)
  successMessage.value = `🎉 挑战通关！得分 ${score.toFixed(0)}，用时 ${time}秒`
  showSuccessToast.value = true
  setTimeout(() => { showSuccessToast.value = false }, 3000)
}

// 分享链接
function copyShareLink() {
  const url = `${window.location.origin}/?exp=${currentExpId.value}`
  navigator.clipboard?.writeText(url).then(() => {
    successMessage.value = '分享链接已复制到剪贴板 🔗'
    showSuccessToast.value = true
    setTimeout(() => { showSuccessToast.value = false }, 2500)
  }).catch(() => {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = url
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    successMessage.value = '分享链接已复制 🔗'
    showSuccessToast.value = true
    setTimeout(() => { showSuccessToast.value = false }, 2500)
  })
}

// 进度重置
function confirmReset() {
  if (confirm('确定要重置所有进度和成就吗？此操作不可撤销。')) {
    progress.reset()
    showSettings.value = false
    successMessage.value = '进度已重置 ✅'
    showSuccessToast.value = true
    sfx.click()
    setTimeout(() => { showSuccessToast.value = false }, 2500)
  }
}

// 随机实验
function randomExperiment() {
  const pool = allExperiments.filter(e => e.id !== currentExpId.value)
  const pick = pool[Math.floor(Math.random() * pool.length)]
  sfx.slide()
  loadExperiment(pick.id)
}

// 导出进度
function exportProgress() {
  const data = {
    completed: progress.completed,
    achievements: progress.achievements,
    totalScore: progress.totalScore,
    errorCount: progress.errorCount,
    favorites: favorites.favorites,
    recent: favorites.recent,
    exportDate: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hardware-lab-progress-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  successMessage.value = '进度已导出 📦'
  showSuccessToast.value = true
  setTimeout(() => { showSuccessToast.value = false }, 2500)
}

// 导入进度
function importProgress() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.completed) progress.completed = data.completed
        if (data.achievements) progress.achievements = data.achievements
        if (data.totalScore !== undefined) progress.totalScore = data.totalScore
        if (data.errorCount !== undefined) progress.errorCount = data.errorCount
        progress.save()
        if (data.favorites) {
          favorites.favorites = data.favorites
          localStorage.setItem('hw-lab-favorites', JSON.stringify(data.favorites))
        }
        if (data.recent) {
          favorites.recent = data.recent
          localStorage.setItem('hw-lab-recent', JSON.stringify(data.recent))
        }
        successMessage.value = '进度导入成功 ✅'
        showSuccessToast.value = true
        setTimeout(() => { showSuccessToast.value = false }, 2500)
      } catch (err) {
        successMessage.value = '导入失败：文件格式错误 ❌'
        showSuccessToast.value = true
        setTimeout(() => { showSuccessToast.value = false }, 2500)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// 错误分布统计
const errorBySeverity = computed(() => {
  let critical = 0
  let warning = 0
  // errorCount tracks total; estimate distribution from completed experiments
  for (const exp of allExperiments) {
    const c = progress.completed[exp.id]
    if (c && !c.firstErrorFree) critical += 1
  }
  warning = Math.max(0, progress.errorCount - critical)
  return { critical, warning }
})

function categoryProgress(catId) {
  const cat = categories.find(c => c.id === catId)
  if (!cat) return 0
  return cat.experiments.filter(e => progress.completed[e.id]).length
}

function loadExperiment(id) {
  const exp = allExperiments.find(e => e.id === id)
  if (!exp) return
  sfx.click()
  currentExpId.value = id
  store.loadExperiment(exp.config)
  showErrorPopup.value = false
  // 更新URL深链接
  if (!isEmbed.value) {
    const url = new URL(window.location.href)
    url.searchParams.set('exp', id)
    window.history.replaceState({}, '', url)
  }
  // 标记开始实验
  progress.startExperiment(id)
  // 记录最近浏览
  favorites.recordVisit(id)
}

// 收藏切换
function toggleFav() {
  favorites.toggleFavorite(currentExpId.value)
  sfx.click()
}

function onUserUpdate(key, value) {
  store.updateUserState(key, value)
  sfx.slide()
  checkSuccess()
}

function onComponentClick(comp) {
  // 点击电阻切换值
  if (comp.type === 'resistor') {
    const interaction = store.currentExperiment.interactions?.find(i => i.target === comp.id)
    if (interaction) {
      const options = interaction.options || [100, 220, 330, 470, 1000, 10000]
      const key = `${comp.id}_${interaction.property}`
      const currentIdx = options.indexOf(store.userState[key] ?? comp.value)
      const nextIdx = (currentIdx + 1) % options.length
      store.updateUserState(key, options[nextIdx])
      sfx.toggle()
      checkSuccess()
    }
  }
}

function onRetry() {
  showErrorPopup.value = false
  // 重置到安全值
  if (currentExpId.value === 'led-resistor') {
    store.updateUserState('R1_value', 330)
  }
}

function onReadArticle(articleRef) {
  // 在嵌入模式下可以跳转到文章
  console.log('Read article:', articleRef)
}

function checkSuccess() {
  if (!store.hasError) {
    const expId = currentExpId.value
    if (!progress.completed[expId]) {
      progress.complete(expId, true)
      successMessage.value = '完美通关！无错误完成实验 ⭐⭐⭐'
      showSuccessToast.value = true
      sfx.success()
      setTimeout(() => { showSuccessToast.value = false }, 2500)
    } else if (!progress.completed[expId]?.firstErrorFree) {
      progress.complete(expId, true)
      successMessage.value = '完美通关！首次无错误 ⭐⭐⭐'
      showSuccessToast.value = true
      sfx.success()
      setTimeout(() => { showSuccessToast.value = false }, 2500)
    }
  }
}

// 监听错误，自动弹窗+音效
watch(() => store.errors, (errors) => {
  if (errors.length > 0) {
    showErrorPopup.value = true
    const prevAchCount = progress.achievements.length
    progress.recordError()
    // 记录进度（有错误也算完成，但只有1星）
    if (!progress.completed[currentExpId.value]) {
      progress.complete(currentExpId.value, false)
    }
    // 错误音效
    const errType = errors[0]?.type || ''
    if (errType.includes('SHORT')) {
      sfx.shortCircuit()
    } else {
      sfx.error()
    }
    // 新成就解锁音效
    if (progress.achievements.length > prevAchCount) {
      setTimeout(() => sfx.achievement(), 500)
    }
  }
}, { deep: true })

function toggleSound() {
  soundOn.value = !soundOn.value
  setSoundEnabled(soundOn.value)
  if (soundOn.value) sfx.click()
}

const categoryLabel = computed(() => {
  const map = {
    power: '⚡ 电源', stm32: '📋 STM32', timing: '⏱️ 定时',
    analog: '📊 模拟', circuit: '🔌 电路',
    signal: '〰️ 信号', comm: '🔗 通信', sensor: '📡 传感器',
    pcb: '🎨 PCB', wireless: '📡 无线', debug: '🐛 调试'
  }
  return map[store.currentExperiment?.category] || ''
})

const difficultyLabel = computed(() => {
  const map = { beginner: '🟢 入门', intermediate: '🟡 进阶', advanced: '🔴 高级' }
  return map[store.currentExperiment?.difficulty] || ''
})

const dividerSimResult = computed(() => {
  if (currentExpId.value !== 'voltage-divider') return null
  const ctx = store.simResult?.context
  if (!ctx) return null
  return {
    vout: ctx.vout || 0,
    vin: store.currentExperiment?.canvas?.components?.find(c => c.type === 'power')?.voltage || 5,
    r1: ctx.r1 || 1000,
    r2: ctx.r2 || 1000,
    current: ctx.current || 0,
    power: ctx.power || 0
  }
})

const statusText = computed(() => {
  if (!store.simResult) return ''
  if (store.hasError) return store.currentError?.title
  const results = store.simResult.results
  if (currentExpId.value === 'led-resistor') {
    const led = results.D1
    if (led?.state === 'on') return `✅ LED正常发光 | 电流 ${led.current?.toFixed(1)}mA | 亮度 ${led.brightness?.toFixed(0)}%`
    if (led?.state === 'dim') return `LED微亮 | 电流 ${led.current?.toFixed(1)}mA`
  }
  if (currentExpId.value === 'gpio-modes') {
    const gpio = results.PA0
    if (gpio?.state === 'unstable') return '⚠️ 引脚电平不稳定'
    return '✅ GPIO配置正常'
  }
  if (currentExpId.value === 'pwm-tuner') {
    const pwm = results.PWM1
    if (pwm?.loadState === 'error') return '⚠️ 负载异常'
    if (pwm?.loadState === 'running') return `✅ ${pwm.loadType} 正常工作`
    return `✅ PWM信号正常`
  }
  if (currentExpId.value === 'voltage-divider') {
    const ctx = store.simResult.context
    return `✅ Vout = ${(ctx?.vout || 0).toFixed(2)}V | I = ${(ctx?.current || 0).toFixed(2)}mA`
  }
  if (currentExpId.value === 'capacitor-charge') {
    const cc = results.CC1
    if (cc?.mode === 'charge') return `✅ 充电中 | τ = ${(cc?.tauMs || 0).toFixed(1)}ms`
    return `✅ 放电中 | τ = ${(cc?.tauMs || 0).toFixed(1)}ms`
  }
  if (currentExpId.value === 'transistor-switch') {
    const ts = results.TS1
    const stateMap = { saturation: '饱和区(ON)', active: '放大区', cutoff: '截止区(OFF)' }
    return `✅ ${stateMap[ts?.state] || '运行中'} | Ic = ${(ts?.collectorCurrent || 0).toFixed(1)}mA`
  }
  if (currentExpId.value === 'rc-filter') {
    const rf = results.RF1
    const fc = rf?.fcHz || '—'
    const att = rf?.attenuationDB?.toFixed(1) || 0
    if (rf?.error) return `⚠️ ${rf.errorTitle || '信号未滤波'}`
    return `✅ fc=${fc}Hz | 衰减${att}dB | 增益${((rf?.gain || 1) * 100).toFixed(0)}%`
  }
  if (currentExpId.value === 'i2c-signal') {
    const i2c = results.I2C1
    const stepMap = { idle: '空闲', start: 'START', address: '发送地址', ack1: '等待ACK', data: '发送数据', ack2: '等待ACK', stop: 'STOP' }
    if (i2c?.error) return `⚠️ ${i2c.errorTitle || 'I2C错误'}`
    return `✅ ${stepMap[i2c?.step] || '运行中'} | ${i2c?.address || '0x50'} → ${i2c?.data || '0xA5'}`
  }
  if (currentExpId.value === 'ntc-thermistor') {
    const ntc = results.NTC1
    if (ntc?.error) return `⚠️ ${ntc.errorTitle || 'ADC异常'}`
    return `✅ ${ntc?.tempC}°C | R=${ntc?.RntcK} | ADC=${ntc?.adcValue}/${ntc?.adcMax} (${ntc?.adcPercent}%)`
  }
  if (currentExpId.value === 'pcb-trace-impedance') {
    const pcb = results.PCB1
    if (pcb?.error) return `⚠️ ${pcb.errorTitle || '阻抗失配'}`
    return `✅ Z₀=${pcb?.impedance}Ω | 偏差${pcb?.deviation}Ω | εeff=${pcb?.effectiveEr}`
  }
  if (currentExpId.value === 'wifi-signal-attenuation') {
    const wifi = results.WIFI1
    if (wifi?.error) return `⚠️ ${wifi.errorTitle || '信号异常'}`
    return `✅ RSSI=${wifi?.rssi}dBm | 余量+${wifi?.margin}dB | ${wifi?.band}`
  }
  if (currentExpId.value === 'logic-analyzer-debug') {
    const la = results.LA1
    if (la?.error) return `⚠️ ${la.errorTitle || 'SPI错误'}`
    return `✅ ${la?.modeName} | TX=${la?.dataHex} → RX=${la?.decodedHex} | ${la?.clockFreq}kHz`
  }
  if (currentExpId.value === 'dcdc-buck') {
    const buck = results.BUCK1
    if (buck?.error) return `⚠️ ${buck.errorTitle || 'Buck异常'}`
    return `✅ Vout=${(buck?.vout || 0).toFixed(2)}V | 纹波${(buck?.ripple || 0).toFixed(0)}mV | η=${(buck?.efficiency || 0).toFixed(1)}%`
  }
  if (currentExpId.value === 'opamp-comparator') {
    const oa = results.OPAMP1
    if (oa?.error) return `⚠️ ${oa.errorTitle || '运放异常'}`
    return `${oa?.outputHigh ? '🚨 报警中(HIGH)' : '✅ 正常(LOW)'} | ΔV=${((oa?.vin || 0) - (oa?.vref || 0)).toFixed(3)}V | 迟滞${oa?.hysteresis || 0}mV`
  }
  if (currentExpId.value === 'button-debounce') {
    const btn = results.BTN1
    if (btn?.error) return `⚠️ ${btn.errorTitle || '消抖异常'}`
    return `${btn?.debounced ? '✅ 消抖成功' : '❌ 仍有抖动'} | ${btn?.mcuTriggerCount || 0}次触发 | 方式: ${{none:'无', rc:'RC', software:'软件'}[btn?.mode] || btn?.mode}`
  }
  return '✅ 实验运行中'
})

const gpioWaveState = computed(() => {
  const gpio = store.simResult?.results?.PA0
  if (!gpio) return 'stable-high'
  const stateMap = {
    unstable: 'unstable',
    'stable-high': 'stable-high',
    'stable-low': 'stable-low',
    analog: 'analog',
    short: 'unstable'
  }
  return stateMap[gpio.state] || 'stable-high'
})

const pwmFrequency = computed(() => {
  const ctx = store.simResult?.context
  return ctx?.pwmFrequency ?? 1000
})

const pwmDutyCycle = computed(() => {
  const ctx = store.simResult?.context
  return ctx?.pwmDutyCycle ?? 50
})

const pwmLoadType = computed(() => {
  const ctx = store.simResult?.context
  return ctx?.pwmLoad ?? 'led'
})
</script>

<style>
:root {
  --bg: #0f0f1e;
  --surface: #1a1a2e;
  --surface-light: #252539;
  --surface-hover: #2a2a3e;
  --primary: #3498db;
  --primary-dark: #2980b9;
  --success: #2ecc71;
  --danger: #e74c3c;
  --warning: #f39c12;
  --text: #e0e0e0;
  --text-dim: #888;
  --border: #333;
  --canvas-bg: #1a1a2e;
  --wave-bg: #0d0d1a;
  --wave-grid: rgba(255,255,255,0.05);
  --wave-axis: rgba(255,255,255,0.1);
  --wave-label: #666;
  --btn-bg: #2a2a3e;
  --btn-text: #aaa;
  --popup-bg: #1e1e30;
  --popup-text: #ddd;
  --popup-code-bg: rgba(0,0,0,0.3);
  --radius: 12px;
}

[data-theme="light"] {
  --bg: #f5f5f0;
  --surface: #ffffff;
  --surface-light: #eaeae4;
  --surface-hover: #e0e0d8;
  --primary: #2980b9;
  --primary-dark: #1a6fa0;
  --success: #27ae60;
  --danger: #c0392b;
  --warning: #e67e22;
  --text: #2c2c2c;
  --text-dim: #777;
  --border: #d0d0c8;
  --canvas-bg: #f8f8f3;
  --wave-bg: #f0f0eb;
  --wave-grid: rgba(0,0,0,0.05);
  --wave-axis: rgba(0,0,0,0.1);
  --wave-label: #999;
  --btn-bg: #e8e8e0;
  --btn-text: #555;
  --popup-bg: #ffffff;
  --popup-text: #333;
  --popup-code-bg: rgba(0,0,0,0.05);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 16px;
}
.app.embed-mode {
  padding: 8px;
}

.app-header {
  text-align: center;
  margin-bottom: 16px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.header-controls {
  display: flex;
  gap: 4px;
}
.icon-btn {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.icon-btn:hover {
  background: var(--surface-hover);
  border-color: var(--primary);
}
.app-header h1 {
  font-size: 20px;
  color: var(--text);
  margin-bottom: 4px;
}
.app-subtitle {
  font-size: 13px;
  color: var(--text-dim);
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}
.search-bar:focus-within {
  border-color: var(--primary);
}
.search-icon {
  font-size: 14px;
  opacity: 0.6;
}
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  outline: none;
}
.search-input::placeholder {
  color: var(--text-dim);
  opacity: 0.6;
}
.search-clear {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
}
.random-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 4px;
  transition: transform 0.2s;
}
.random-btn:hover {
  transform: rotate(180deg);
}

/* 设置面板 */
.settings-panel {
  margin-top: 10px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.settings-label { color: var(--text-dim); }
.settings-value { color: var(--text); font-weight: 600; }
.reset-btn {
  margin-top: 4px;
  background: rgba(192,57,43,0.1);
  border: 1px solid rgba(192,57,43,0.3);
  color: var(--danger);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.reset-btn:hover {
  background: rgba(192,57,43,0.2);
}
.settings-slide-enter-active, .settings-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.settings-slide-enter-from, .settings-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

/* 搜索结果 */
.search-results { margin-top: 4px; }
.search-empty {
  text-align: center;
  color: var(--text-dim);
  padding: 32px;
  font-size: 14px;
}
.exp-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.exp-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.exp-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}
.exp-card-icon { font-size: 24px; }
.exp-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.exp-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.exp-card-desc {
  font-size: 12px;
  color: var(--text-dim);
}
.exp-card-done {
  color: var(--success);
  font-size: 18px;
  font-weight: 700;
}

/* 分享按钮 */
.share-btn {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-dim);
  transition: all 0.2s;
}
.share-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.challenge-toggle.active {
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  color: #fff;
  border-color: transparent;
}
.fav-toggle.is-fav {
  color: var(--warning);
  border-color: var(--warning);
}

/* 最近浏览 + 收藏 */
.quick-row {
  margin-top: 4px;
}
.quick-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.quick-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}
.quick-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}
.quick-chip:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}
.fav-chip {
  border-color: rgba(230,126,34,0.3);
}
.fav-chip:hover {
  border-color: var(--warning);
}

/* 首页视图容器 */
.home-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

/* 进度面板 */
.progress-panel {
  background: var(--surface-light);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.progress-stats {
  display: flex;
  justify-content: space-around;
}
.progress-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.ps-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}
.ps-label {
  font-size: 11px;
  color: var(--text-dim);
}
.progress-bar-wrap {
  position: relative;
  height: 22px;
  background: var(--bg);
  border-radius: 11px;
  overflow: hidden;
}
.progress-bar-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  transition: width 0.4s;
  border-radius: 11px;
}
.progress-bar-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}
.achievement-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.achievement-badge {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(243, 156, 18, 0.15);
  color: var(--warning);
  white-space: nowrap;
}
.path-btn {
  width: 100%;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(52,152,219,0.15), rgba(46,204,113,0.15));
  border: 1px solid rgba(52,152,219,0.3);
  border-radius: 10px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.path-btn:hover {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(52,152,219,0.25), rgba(46,204,113,0.25));
  transform: translateY(-1px);
}

/* 分类网格 */
.difficulty-filter {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.diff-tab {
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface-light);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.diff-tab:hover { border-color: var(--primary); }
.diff-tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.diff-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: bold;
}
.diff-badge.beginner { background: rgba(46,204,113,0.2); color: #2ecc71; }
.diff-badge.intermediate { background: rgba(241,196,15,0.2); color: #f1c40f; }
.diff-badge.advanced { background: rgba(231,76,60,0.2); color: #e74c3c; }
.exp-by-diff { position: relative; }

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 0;
}
.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.cat-progress {
  font-size: 10px;
  color: var(--success);
  margin-top: 2px;
}
.category-card.cat-available {
  background: var(--surface);
  border: 1px solid var(--border);
}
.category-card.cat-available:hover {
  background: var(--surface-light);
  border-color: var(--primary);
  transform: translateY(-2px);
}
.category-card.cat-soon {
  background: var(--surface);
  border: 1px dashed var(--border);
  opacity: 0.4;
  cursor: not-allowed;
}
.cat-icon { font-size: 24px; }
.cat-name { font-size: 13px; font-weight: 600; color: var(--text); }
.cat-count { font-size: 11px; color: var(--text-dim); }
.cat-soon .cat-count { color: var(--warning); }

/* 实验列表 */
.experiment-list h2 {
  font-size: 18px;
  margin-bottom: 12px;
}
.exp-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.exp-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.exp-card:hover {
  background: var(--surface-light);
  border-color: var(--primary);
}
.exp-card-icon { font-size: 24px; }
.exp-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.exp-card-title { font-size: 14px; font-weight: 600; color: var(--text); }
.exp-card-desc { font-size: 12px; color: var(--text-dim); }
.exp-card-done { color: var(--success); font-size: 16px; }

.back-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 8px;
}

.experiment-area {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
}
.experiment-header {
  margin-bottom: 16px;
}
.experiment-title {
  font-size: 18px;
  color: var(--text);
  margin-bottom: 4px;
}
.experiment-desc {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.experiment-meta {
  display: flex;
  gap: 6px;
}
.meta-tag {
  background: var(--surface-light);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-dim);
}

.experiment-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gpio-layout .gpio-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pwm-layout {
  gap: 12px;
}
.pwm-load-display {
  background: rgba(128,128,128,0.05);
  border-radius: 8px;
  padding: 12px;
}

.status-bar {
  background: var(--surface-light);
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
}
.status-text {
  font-size: 13px;
  font-family: monospace;
}
.status-ok { color: var(--success); }
.status-error { color: var(--danger); }

.success-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, var(--success), #27ae60);
  color: #fff;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(46,204,113,0.3);
  z-index: 200;
}
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ===== 移动端体验优化 ===== */
@media (max-width: 600px) {
  .app {
    padding: 8px;
    max-width: 100%;
  }
  .app.embed-mode {
    padding: 4px;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  .share-btn, .back-btn {
    min-height: 40px;
    padding: 8px 14px;
    font-size: 14px;
  }
  .category-card {
    min-height: 88px;
    padding: 10px 6px;
  }
  .cat-icon { font-size: 28px; }
  .cat-name { font-size: 13px; }
  .cat-count { font-size: 11px; }
  .experiment-title {
    font-size: 18px;
  }
  .experiment-desc {
    font-size: 13px;
  }
  .experiment-content {
    gap: 8px;
  }
  .status-bar {
    font-size: 13px;
  }
}

/* 触摸优化：阻止双击缩放 */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
button, .clickable {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* 平滑滚动 */
.experiment-content {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* 安全区域适配 */
@supports (padding: env(safe-area-inset-bottom)) {
  .app {
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
}
</style>
