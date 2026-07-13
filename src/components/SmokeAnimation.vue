<template>
  <g class="smoke" :transform="`translate(${x}, ${y})`">
    <!-- 烟雾粒子 -->
    <circle v-for="i in 5" :key="i" :cx="0" :cy="0" :r="3 + i" fill="#666" :opacity="0.6 - i * 0.1">
      <animate
        :attributeName="`cy`"
        :values="`0;${-30 - i * 8}`"
        :dur="`${1 + i * 0.2}s`"
        repeatCount="indefinite"
      />
      <animate
        :attributeName="`opacity`"
        :values="`0.6;0`"
        :dur="`${1 + i * 0.2}s`"
        repeatCount="indefinite"
      />
      <animate
        :attributeName="`cx`"
        :values="`0;${(i % 2 ? 1 : -1) * (5 + i * 3)}`"
        :dur="`${1 + i * 0.2}s`"
        repeatCount="indefinite"
      />
    </circle>
    <!-- 火花 -->
    <circle cx="0" cy="0" r="8" fill="#ff6b00" opacity="0.4">
      <animate attributeName="r" values="4;10;4" dur="0.3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.3s" repeatCount="indefinite"/>
    </circle>
  </g>
</template>

<script setup>
defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
})
</script>
