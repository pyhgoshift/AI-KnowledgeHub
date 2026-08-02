<template>
  <div class="source-section">
    <div class="section-title">웹 검색 출처 ({{ sources.length }})</div>
    <WebSearchResultList :results="sources" empty-text="웹 검색 출처를 찾지 못했습니다" />
  </div>
</template>

<script setup>
import WebSearchResultList from '@/components/sources/WebSearchResultList.vue'

defineProps({
  sources: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped lang="less">
.source-section {
  .section-title {
    font-size: 12px;
    color: var(--gray-700);
    margin-bottom: 8px;
    font-weight: 600;
  }
}
</style>
