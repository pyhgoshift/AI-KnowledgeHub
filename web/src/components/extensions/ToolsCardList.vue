<template>
  <div class="tools-cards-page extension-page-root">
    <PageShoulder search-placeholder="도구 검색..." v-model:search="searchQuery">
      <template #filters>
        <a-select
          v-model:value="selectedCategory"
          style="width: 120px"
          placeholder="모든 분류"
          allow-clear
        >
          <a-select-option value="">모든 분류</a-select-option>
          <a-select-option v-for="cat in categories" :key="cat" :value="cat">
            {{ categoryLabels[cat] || cat }}
          </a-select-option>
        </a-select>
      </template>
      <template #actions>
        <a-tooltip title="도구 새로고침" placement="bottom">
          <a-button class="lucide-icon-btn" :disabled="loading" @click="fetchTools">
            <RefreshCw :size="14" />
          </a-button>
        </a-tooltip>
      </template>
    </PageShoulder>

    <div v-if="filteredTools.length === 0" class="extension-card-grid-empty-state">
      <a-empty :image="false" :description="searchQuery ? '일치하는 도구가 없습니다' : '도구가 없습니다'" />
    </div>

    <ExtensionCardGrid v-else>
      <InfoCard
        v-for="tool in filteredTools"
        :key="getToolSlug(tool)"
        :title="formatExtensionCardTitle(tool.name)"
        :subtitle="getToolSlug(tool)"
        :description="tool.description || '설명이 없습니다'"
        :default-icon="getToolIcon(getToolSlug(tool)) || WrenchIcon"
        :tags="toolTags(tool)"
        @click="selectTool(tool)"
      >
      </InfoCard>
    </ExtensionCardGrid>

    <a-modal
      v-model:open="detailVisible"
      :title="currentTool?.name || '도구 상세'"
      :footer="null"
      width="640px"
    >
      <template v-if="currentTool">
        <div class="tool-detail-content detail-section-container">
          <div class="detail-section">
            <div class="section-content description">
              {{ currentTool.description || '설명이 없습니다' }}
            </div>
          </div>

          <div class="detail-section" v-if="currentTool.config_guide">
            <div class="section-header">
              <FileText :size="14" />
              <span>설정 안내</span>
            </div>
            <div class="section-content description config-guide">
              {{ currentTool.config_guide }}
            </div>
          </div>

          <div class="detail-section">
            <div class="section-header">
              <Tag :size="14" />
              <span>분류</span>
            </div>
            <div class="section-content">
              <a-tag :color="categoryColors[currentTool.category] || 'default'">
                {{ categoryLabels[currentTool.category] || currentTool.category }}
              </a-tag>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-header">
              <Tags :size="14" />
              <span>태그</span>
            </div>
            <div class="section-content">
              <a-tag v-for="tag in currentTool.tags" :key="tag">{{ tag }}</a-tag>
              <span v-if="!currentTool.tags?.length" class="text-muted">없음</span>
            </div>
          </div>

          <div class="detail-section" v-if="currentTool.args?.length">
            <div class="section-header">
              <List :size="14" />
              <span>매개변수</span>
            </div>
            <div class="section-content">
              <a-table
                :dataSource="currentTool.args"
                :columns="argColumns"
                size="small"
                :pagination="false"
                bordered
                class="args-table"
              />
            </div>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { Wrench, RefreshCw, FileText, Tag, Tags, List } from 'lucide-vue-next'
import { toolApi } from '@/apis/tool_api'
import { getToolIcon } from '@/components/ToolCallingResult/toolRegistry'
import ExtensionCardGrid from './ExtensionCardGrid.vue'
import InfoCard from '@/components/shared/InfoCard.vue'
import PageShoulder from '@/components/shared/PageShoulder.vue'
import { formatExtensionCardTitle } from '@/utils/extensionDisplayName'

const WrenchIcon = Wrench

const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const tools = ref([])
const currentTool = ref(null)
const detailVisible = ref(false)

const categories = ['buildin', 'knowledge', 'mysql', 'debug']
const categoryLabels = { buildin: '내장 도구', knowledge: '지식베이스', mysql: 'MySQL', debug: '디버그' }
const categoryColors = { buildin: 'blue', knowledge: 'purple', mysql: 'green', debug: 'orange' }

const getToolSlug = (tool) => tool?.slug || tool?.id || ''

const toolTags = (tool) => {
  const tags = []
  if (tool.category) {
    tags.push({
      name: categoryLabels[tool.category] || tool.category,
      color: categoryColors[tool.category] || 'blue'
    })
  }
  ;(tool.tags || []).slice(0, 2).forEach((t) => tags.push(t))
  return tags
}

const argColumns = [
  { title: '매개변수명', dataIndex: 'name', key: 'name' },
  { title: '유형', dataIndex: 'type', key: 'type', width: 80 },
  { title: '설명', dataIndex: 'description', key: 'description' }
]

const filteredTools = computed(() => {
  let result = tools.value
  if (selectedCategory.value) {
    result = result.filter((t) => t.category === selectedCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        getToolSlug(t).toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.config_guide?.toLowerCase().includes(q)
    )
  }
  return result
})

const selectTool = (tool) => {
  currentTool.value = tool
  detailVisible.value = true
}

const fetchTools = async () => {
  loading.value = true
  try {
    const result = await toolApi.getTools()
    tools.value = result?.data || []
  } catch {
    message.error('도구를 불러오지 못했습니다')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTools)

defineExpose({ fetchTools, loading })
</script>

<style lang="less" scoped>
@import '@/assets/css/extensions.less';

.tool-detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding: 0;
}

.args-table {
  :deep(.ant-table) {
    font-size: 12px;
  }
}

.config-guide {
  white-space: pre-line;
}
</style>
