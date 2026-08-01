<template>
  <div class="graph-section" v-if="isGraphSupported">
    <div class="graph-container-compact">
      <div v-if="!isGraphSupported" class="graph-disabled">
        <div class="disabled-content">
          <h4>지식 그래프를 사용할 수 없습니다</h4>
          <p>현재 지식베이스 유형 "{{ kbTypeLabel }}"은(는) 지식 그래프를 지원하지 않습니다.</p>
          <p>Milvus 유형의 지식베이스만 지식 그래프를 지원합니다.</p>
        </div>
      </div>
      <div v-else class="graph-wrapper">
        <GraphCanvas
          ref="graphRef"
          :graph-data="graph.graphData"
          @node-click="graph.handleNodeClick"
          @edge-click="graph.handleEdgeClick"
          @canvas-click="graph.handleCanvasClick"
        >
          <template #top>
            <div class="compact-actions">
              <div class="actions-left">
                <a-input
                  v-model:value="searchInput"
                  placeholder="엔터티 검색"
                  style="width: 240px"
                  @keydown.enter="onSearch"
                  allow-clear
                >
                  <template #suffix>
                    <component
                      :is="graph.fetching ? Loader2 : Search"
                      :size="14"
                      class="search-suffix-icon"
                      @click="onSearch"
                    />
                  </template>
                </a-input>
                <a-button class="action-btn" @click="loadGraph" title="새로고침">
                  <RefreshCw :size="16" :class="{ spin: graph.fetching }" />
                </a-button>
              </div>
              <div class="actions-right">
                <a-button
                  v-if="isMilvus"
                  class="action-btn index-action-btn"
                  :class="{ 'has-index-label': hasPendingGraphChunks }"
                  @click="toggleBuildPanel"
                  :title="graphIndexButtonTitle"
                  :aria-label="graphIndexButtonTitle"
                >
                  <Database :size="16" />
                  <span v-if="hasPendingGraphChunks" class="index-status-label"
                    >색인 대기 {{ pendingGraphChunks }}개</span
                  >
                  <span
                    v-if="graphIndexDotStatus"
                    class="status-dot"
                    :class="`status-dot--${graphIndexDotStatus}`"
                  ></span>
                </a-button>
                <a-button class="action-btn" @click="toggleSettingsPanel" title="설정">
                  <Settings :size="16" />
                </a-button>
              </div>
            </div>
          </template>
        </GraphCanvas>
        <ResourceEmptyState
          v-if="showGraphConfigEmpty"
          class="graph-empty-state"
          title="지식 그래프가 없습니다"
          description="추출기를 설정하면 현재 지식베이스에서 엔터티와 관계를 구성할 수 있습니다."
          :icon="Network"
          full-height
        >
          <template #actions>
            <a-button type="primary" class="lucide-icon-btn" @click="openGraphConfig">
              <Settings :size="16" />
              추출기 설정
            </a-button>
          </template>
        </ResourceEmptyState>
        <ResourceEmptyState
          v-else-if="showGraphDataEmpty"
          class="graph-empty-state"
          :title="graphDataEmptyTitle"
          :description="graphDataEmptyDescription"
          :icon="Network"
          full-height
        >
          <template #actions>
            <a-button v-if="searchInput.trim()" class="lucide-icon-btn" @click="clearGraphSearch">
              <Search :size="16" />
              검색 지우기
            </a-button>
            <a-button
              v-else-if="hasPendingGraphChunks && !isBuildActive"
              type="primary"
              class="lucide-icon-btn"
              @click="startGraphBuild"
            >
              <Database :size="16" />
              색인 시작
            </a-button>
            <a-button v-else class="lucide-icon-btn" @click="loadGraph">
              <RefreshCw :size="16" :class="{ spin: graph.fetching }" />
              그래프 새로고침
            </a-button>
          </template>
        </ResourceEmptyState>

        <!-- 详情浮动卡片 -->
        <GraphDetailPanel
          :visible="graph.showDetailDrawer"
          :item="graph.selectedItem"
          :type="graph.selectedItemType"
          @close="graph.handleCanvasClick"
        />

        <!-- 设置浮动面板 -->
        <transition name="slide-fade">
          <div v-if="showSettings" class="floating-panel settings-panel">
            <div class="panel-header">
              <span class="panel-title">그래프 설정</span>
            </div>
            <div class="panel-body">
              <a-form layout="vertical">
                <a-form-item label="최대 노드 수 (limit)">
                  <a-input-number
                    v-model:value="subgraphParams.maxNodes"
                    :min="10"
                    :max="1000"
                    :step="10"
                    style="width: 100%"
                  />
                </a-form-item>
                <a-form-item label="검색 깊이 (depth)">
                  <a-input-number
                    v-model:value="subgraphParams.maxDepth"
                    :min="1"
                    :max="5"
                    :step="1"
                    style="width: 100%"
                  />
                </a-form-item>
                <a-form-item label="청크 노드 제외">
                  <a-switch v-model:checked="subgraphParams.excludeChunk" />
                </a-form-item>
                <a-form-item>
                  <a-button type="primary" @click="applySettings" style="width: 100%">
                    적용
                  </a-button>
                </a-form-item>
              </a-form>
            </div>
          </div>
        </transition>

        <!-- 索引管理浮动面板 -->
        <transition name="slide-fade">
          <div v-if="isMilvus && showBuildPanel" class="floating-panel build-panel">
            <div class="panel-header">
              <span class="panel-title">색인 관리</span>
              <a-button
                size="small"
                type="text"
                :disabled="graphBuildLoading"
                @click="loadGraphBuildStatus"
                class="panel-refresh-btn"
              >
                <RefreshCw :size="14" :class="{ spin: graphBuildLoading }" />
              </a-button>
            </div>
            <div class="panel-body">
              <div class="status-row">
                <span class="status-label">상태</span>
                <a-tag v-if="isBuildActive" color="blue" size="small">구성 중</a-tag>
                <a-tag v-else-if="isBuildFailed" color="red" size="small">구성 실패</a-tag>
                <a-tag v-else-if="graphBuildStatus?.locked" color="green" size="small"
                  >설정됨</a-tag
                >
                <a-tag v-else color="orange" size="small">미설정</a-tag>
              </div>
              <a-progress
                v-if="isBuildActive"
                :percent="graphBuildStatus?.build_task_progress ?? 0"
                :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
                size="small"
                style="margin-bottom: 10px"
              />
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-value">{{ graphBuildStatus?.total_chunks ?? '-' }}</span>
                  <span class="stat-label">전체 청크</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ graphBuildStatus?.pending_chunks ?? '-' }}</span>
                  <span class="stat-label">구성 대기</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ graphBuildStatus?.indexed_chunks ?? '-' }}</span>
                  <span class="stat-label">구성 완료</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ graphBuildStatus?.entity_count ?? '-' }}</span>
                  <span class="stat-label">엔터티</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ graphBuildStatus?.relationship_count ?? '-' }}</span>
                  <span class="stat-label">관계</span>
                </div>
              </div>
              <div class="build-actions">
                <a-button
                  v-if="!graphBuildStatus?.locked"
                  type="primary"
                  block
                  @click="openGraphConfig"
                >
                  추출기 설정
                </a-button>
                <a-button v-else-if="isBuildActive" type="primary" block disabled>
                  구성 중 {{ graphBuildStatus?.build_task_progress ?? 0 }}%
                </a-button>
                <a-button
                  v-else-if="isBuildFailed"
                  type="primary"
                  block
                  :disabled="!graphBuildStatus?.pending_chunks"
                  @click="startGraphBuild"
                >
                  색인 재시도
                </a-button>
                <a-button
                  v-else
                  type="primary"
                  block
                  :disabled="!graphBuildStatus?.pending_chunks"
                  @click="startGraphBuild"
                >
                  색인 시작
                </a-button>
                <div class="actions-secondary">
                  <a-button
                    v-if="graphBuildStatus?.locked && !isBuildActive"
                    size="small"
                    type="text"
                    @click="openGraphConfig"
                  >
                    설정 변경
                  </a-button>
                  <a-button
                    size="small"
                    type="text"
                    danger
                    v-if="graphBuildStatus?.locked && !isBuildActive"
                    @click="confirmResetGraph"
                    >초기화</a-button
                  >
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <a-modal
      v-model:open="showGraphConfig"
      :title="graphConfigTitle"
      width="640px"
      @ok="configureGraphBuild"
    >
      <a-form layout="vertical">
        <a-alert
          v-if="isEditingGraphConfig"
          class="config-warning"
          type="warning"
          show-icon
          message="설정 변경은 이후 구성에만 적용됩니다. 이미 만든 그래프는 자동으로 다시 계산되지 않으므로, 일관된 결과가 필요하면 초기화 후 다시 추출하세요. 추출기 유형은 만든 뒤 변경할 수 없습니다."
        />
        <a-form-item label="추출기 유형">
          <div class="extractor-type-cards" role="radiogroup" aria-label="추출기 유형">
            <div
              v-for="option in extractorTypeOptions"
              :key="option.value"
              class="extractor-type-card"
              :class="{
                active: graphConfigForm.extractor_type === option.value,
                disabled: isEditingGraphConfig || option.disabled
              }"
              role="radio"
              :aria-checked="graphConfigForm.extractor_type === option.value"
              :aria-disabled="isEditingGraphConfig || option.disabled"
              :tabindex="isEditingGraphConfig || option.disabled ? -1 : 0"
              @click="selectExtractorType(option)"
              @keydown.enter.prevent="selectExtractorType(option)"
              @keydown.space.prevent="selectExtractorType(option)"
            >
              <div class="card-header">
                <component :is="option.icon" class="type-icon" />
                <span class="type-title">{{ option.label }}</span>
              </div>
              <div class="card-description">{{ option.description }}</div>
              <div v-if="option.helper" class="card-helper" :class="{ warning: option.disabled }">
                {{ option.helper }}
              </div>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="모델">
          <ModelSelectorComponent
            :model_spec="graphConfigForm.model_spec"
            placeholder="추출 모델 선택"
            @select-model="(spec) => (graphConfigForm.model_spec = spec)"
          />
        </a-form-item>
        <a-form-item label="Schema">
          <a-textarea
            v-model:value="graphConfigForm.schema"
            :rows="6"
            placeholder="엔터티·관계 유형과 속성 제약을 설명하세요. 서버가 스키마를 기본 추출 프롬프트에 추가합니다."
          />
        </a-form-item>
        <div class="form-grid two-columns">
          <a-form-item label="동시 처리 큐 수">
            <a-input-number
              v-model:value="graphConfigForm.concurrency_count"
              :min="1"
              :max="1000"
              :step="1"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item label="모델 매개변수 JSON">
            <a-input
              v-model:value="graphConfigForm.model_params_text"
              placeholder='예: {"temperature":0.1}'
            />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted, reactive } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useTaskerStore } from '@/stores/tasker'
import { useConfigStore } from '@/stores/config'
import {
  RefreshCw,
  Settings,
  Search,
  Loader2,
  Database,
  Network,
  BrainCircuit,
  ScanText
} from 'lucide-vue-next'
import GraphCanvas from '@/components/GraphCanvas.vue'
import GraphDetailPanel from '@/components/GraphDetailPanel.vue'
import ResourceEmptyState from '@/components/shared/ResourceEmptyState.vue'
import { getKbTypeLabel } from '@/utils/kb_utils'
import { unifiedApi } from '@/apis/graph_api'
import { graphBuildApi } from '@/apis/knowledge_api'
import { Modal, message } from 'ant-design-vue'
import ModelSelectorComponent from '@/components/ModelSelectorComponent.vue'
import { useGraph } from '@/composables/useGraph'

const GRAPH_BUILD_TASK_TYPE = 'knowledge_graph_index'
const MILVUS_KB_TYPE = 'milvus'
const GRAPH_SUPPORTED_KB_TYPES = new Set([MILVUS_KB_TYPE])

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
})

const store = useDatabaseStore()
const taskerStore = useTaskerStore()
const configStore = useConfigStore()

const kbId = computed(() => store.kbId)
const kbType = computed(() => store.database.kb_type)
const kbTypeLabel = computed(() => getKbTypeLabel(kbType.value || 'milvus'))
const isMilvus = computed(() => kbType.value?.toLowerCase() === MILVUS_KB_TYPE)

const graphRef = ref(null)
const showSettings = ref(false)
const showBuildPanel = ref(false)
const subgraphParams = reactive({
  maxNodes: 100,
  maxDepth: 2,
  excludeChunk: true
})
const searchInput = ref('')
const graphBuildStatus = ref(null)
const graphBuildLoading = ref(false)
const showGraphConfig = ref(false)
let buildStatusPollTimer = null

const extractorTypeOptions = [
  {
    value: 'llm',
    label: 'LLM',
    description: '대규모 언어 모델로 스키마에 따라 엔터티와 관계를 추출합니다',
    helper: '현재 지원되는 유일한 그래프 추출 방식입니다',
    icon: BrainCircuit,
    disabled: false
  },
  {
    value: 'more',
    label: '추가 방식',
    description: '추가 추출 방식을 확장하고 있습니다',
    helper: '준비 중',
    icon: ScanText,
    disabled: true
  }
]

const isBuildActive = computed(() => {
  const s = graphBuildStatus.value?.build_task_status
  return s === 'pending' || s === 'running'
})

const isBuildFailed = computed(() => {
  return graphBuildStatus.value?.build_task_status === 'failed'
})

const pendingGraphChunks = computed(() => {
  return Number(graphBuildStatus.value?.pending_chunks ?? 0)
})

const hasPendingGraphChunks = computed(() => pendingGraphChunks.value > 0)

const isGraphIndexComplete = computed(() => {
  return (
    Boolean(graphBuildStatus.value?.locked) &&
    !isBuildActive.value &&
    pendingGraphChunks.value === 0
  )
})

const graphIndexDotStatus = computed(() => {
  if (isBuildActive.value) return 'active'
  if (hasPendingGraphChunks.value) return 'pending'
  if (isGraphIndexComplete.value) return 'complete'
  return ''
})

const graphIndexButtonTitle = computed(() => {
  if (hasPendingGraphChunks.value) return `인덱스 관리, ${pendingGraphChunks.value}개 대기 중`
  if (isGraphIndexComplete.value) return '색인 관리, 전체 색인 완료'
  if (isBuildActive.value) return '색인 관리, 색인 중'
  return '색인 관리'
})

const toggleBuildPanel = () => {
  showBuildPanel.value = !showBuildPanel.value
  showSettings.value = false
}

const toggleSettingsPanel = () => {
  showSettings.value = !showSettings.value
  showBuildPanel.value = false
}

const isEditingGraphConfig = computed(() => Boolean(graphBuildStatus.value?.locked))

const graphConfigTitle = computed(() =>
  isEditingGraphConfig.value ? '그래프 추출 설정 변경' : '그래프 추출기 설정'
)

const stopBuildStatusPoll = () => {
  if (buildStatusPollTimer) {
    clearInterval(buildStatusPollTimer)
    buildStatusPollTimer = null
  }
}

const startBuildStatusPoll = () => {
  stopBuildStatusPoll()
  buildStatusPollTimer = setInterval(() => {
    loadGraphBuildStatus()
  }, 5000)
}

watch(
  isBuildActive,
  (active) => {
    if (active) {
      startBuildStatusPoll()
    } else {
      stopBuildStatusPoll()
    }
  },
  { immediate: true }
)
const graphConfigForm = reactive({
  extractor_type: 'llm',
  model_spec: '',
  schema: '',
  concurrency_count: 50,
  model_params_text: ''
})

const graph = reactive(useGraph(graphRef))
const graphLoaded = ref(false)

// 计算属性：是否支持知识图谱
const isGraphSupported = computed(() => GRAPH_SUPPORTED_KB_TYPES.has(kbType.value?.toLowerCase()))
const hasGraphNodes = computed(() => graph.graphData.nodes.length > 0)
const showGraphConfigEmpty = computed(
  () => isMilvus.value && !graphBuildStatus.value?.locked && !graphBuildLoading.value
)
const showGraphDataEmpty = computed(
  () =>
    isMilvus.value &&
    Boolean(graphBuildStatus.value?.locked) &&
    graphLoaded.value &&
    !graph.fetching &&
    !hasGraphNodes.value
)
const graphDataEmptyTitle = computed(() =>
  searchInput.value.trim() ? '일치하는 엔터티가 없습니다' : '지식 그래프가 없습니다'
)
const graphDataEmptyDescription = computed(() => {
  if (searchInput.value.trim()) return '다른 검색어를 사용하거나 그래프 설정을 조정한 뒤 다시 검색하세요.'
  if (isBuildActive.value) return '그래프 색인이 진행 중입니다. 완료되면 엔터티와 관계가 표시됩니다.'
  if (hasPendingGraphChunks.value) return '아직 색인 대기 청크가 있습니다. 색인 완료 후 엔터티와 관계가 표시됩니다.'
  return '현재 지식베이스에 표시할 엔터티와 관계가 없습니다.'
})

let pendingLoadTimer = null
let graphStatusRequestSeq = 0
let graphLoadRequestSeq = 0

const getErrorDetail = (e, fallback) => {
  return e?.response?.data?.detail || e?.response?.data?.message || e?.message || fallback
}

const loadGraphBuildStatus = async () => {
  if (!kbId.value || !isMilvus.value) return
  const requestSeq = ++graphStatusRequestSeq
  const currentDatabaseId = kbId.value
  graphBuildLoading.value = true
  try {
    const status = await graphBuildApi.getStatus(currentDatabaseId)
    if (requestSeq === graphStatusRequestSeq && currentDatabaseId === kbId.value) {
      graphBuildStatus.value = status
    }
  } catch (e) {
    console.error('Failed to load graph build status:', e)
    message.error('그래프 구성 상태를 불러오지 못했습니다')
  } finally {
    if (requestSeq === graphStatusRequestSeq) {
      graphBuildLoading.value = false
    }
  }
}

const parseModelParams = () => {
  const text = graphConfigForm.model_params_text.trim()
  if (!text) return {}
  let params
  try {
    params = JSON.parse(text)
  } catch {
    throw new Error('모델 매개변수는 올바른 JSON 객체여야 합니다')
  }
  if (!params || Array.isArray(params) || typeof params !== 'object') {
    throw new Error('모델 매개변수는 JSON 객체여야 합니다')
  }
  return params
}

const fillGraphConfigForm = () => {
  const config = graphBuildStatus.value?.config
  const options = config?.extractor_options || {}
  graphConfigForm.extractor_type = 'llm'
  graphConfigForm.model_spec = options.model_spec || configStore.config?.default_model || ''
  graphConfigForm.schema = options.schema || ''
  graphConfigForm.concurrency_count = Number(options.concurrency_count || 50)
  graphConfigForm.model_params_text = options.model_params
    ? JSON.stringify(options.model_params)
    : ''
}

const openGraphConfig = () => {
  fillGraphConfigForm()
  showGraphConfig.value = true
}

const selectExtractorType = (option) => {
  if (isEditingGraphConfig.value || option.disabled) return
  graphConfigForm.extractor_type = option.value
}

const buildExtractorOptions = () => {
  return {
    model_spec: graphConfigForm.model_spec,
    schema: graphConfigForm.schema.trim(),
    concurrency_count: graphConfigForm.concurrency_count || 50,
    model_params: parseModelParams()
  }
}

const configureGraphBuild = async () => {
  try {
    document.activeElement?.blur()
    await nextTick()
    await graphBuildApi.configure(kbId.value, {
      extractor_type: 'llm',
      extractor_options: buildExtractorOptions()
    })
    message.success(isEditingGraphConfig.value ? '그래프 추출 설정을 업데이트했습니다' : '그래프 추출 설정을 저장했습니다')
    showGraphConfig.value = false
    await loadGraphBuildStatus()
  } catch (e) {
    console.error('Failed to configure graph build:', e)
    message.error(getErrorDetail(e, '그래프 추출 설정에 실패했습니다'))
  }
}

const startGraphBuild = async () => {
  try {
    const data = await graphBuildApi.startIndex(kbId.value, 20)
    message.success(data.message || '그래프 구성 작업을 등록했습니다')
    if (data.task_id) {
      taskerStore.registerQueuedTask({
        task_id: data.task_id,
        name: `그래프 생성 (${kbId.value})`,
        task_type: GRAPH_BUILD_TASK_TYPE,
        message: data.message,
        payload: { kb_id: kbId.value }
      })
    }
    await loadGraphBuildStatus()
  } catch (e) {
    console.error('Failed to start graph build:', e)
    message.error(getErrorDetail(e, '그래프 구성 작업 등록에 실패했습니다'))
  }
}

const confirmResetGraph = () => {
  Modal.confirm({
    title: '그래프 초기화 및 재구성',
    content: '이 지식베이스의 Neo4j 그래프, 청크 그래프 상태, 추출 결과와 설정을 모두 초기화합니다.',
    okText: '초기화 확인',
    cancelText: '취소',
    onOk: resetGraphBuild
  })
}

const resetGraphBuild = async () => {
  try {
    await graphBuildApi.reset(kbId.value, {
      clear_extraction_result: true,
      clear_config: true
    })
    message.success('그래프 구성 상태를 초기화했습니다')
    graphLoaded.value = false
    graph.clearGraph()
    await loadGraphBuildStatus()
  } catch (e) {
    console.error('Failed to reset graph build:', e)
    message.error(getErrorDetail(e, '그래프 구성 상태 초기화에 실패했습니다'))
  }
}

const loadGraph = async () => {
  if (!kbId.value || !isGraphSupported.value) return

  const requestSeq = ++graphLoadRequestSeq
  const currentDatabaseId = kbId.value
  graph.fetching = true
  if (!hasGraphNodes.value) {
    graphLoaded.value = false
  }
  try {
    const res = await unifiedApi.getSubgraph({
      kb_id: currentDatabaseId,
      node_label: searchInput.value || '*',
      max_nodes: subgraphParams.maxNodes,
      max_depth: subgraphParams.maxDepth,
      exclude_chunk: subgraphParams.excludeChunk
    })

    if (
      requestSeq === graphLoadRequestSeq &&
      currentDatabaseId === kbId.value &&
      res.success &&
      res.data
    ) {
      graph.updateGraphData(res.data.nodes, res.data.edges)
    }
  } catch (e) {
    console.error('Failed to load graph:', e)
    message.error('그래프를 불러오지 못했습니다')
  } finally {
    if (requestSeq === graphLoadRequestSeq) {
      graph.fetching = false
      graphLoaded.value = true
    }
  }
}

const applySettings = () => {
  showSettings.value = false
  loadGraph()
}

const onSearch = () => {
  loadGraph()
}

const clearGraphSearch = () => {
  searchInput.value = ''
  loadGraph()
}

const scheduleGraphLoad = (delay = 200) => {
  if (!props.active || !isGraphSupported.value || !kbId.value) {
    return
  }

  if (pendingLoadTimer) {
    clearTimeout(pendingLoadTimer)
  }
  pendingLoadTimer = setTimeout(async () => {
    pendingLoadTimer = null
    await nextTick()
    if (props.active && isGraphSupported.value && kbId.value) {
      await loadGraph()
    }
  }, delay)
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      if (isMilvus.value) {
        loadGraphBuildStatus()
      }
      scheduleGraphLoad()
    }
  },
  { immediate: true }
)

watch(kbId, () => {
  graphStatusRequestSeq += 1
  graphLoadRequestSeq += 1
  graphLoaded.value = false
  graph.clearGraph()
  graphBuildStatus.value = null
  if (isMilvus.value) {
    loadGraphBuildStatus()
  }
  if (isGraphSupported.value) {
    scheduleGraphLoad(300)
  }
})

watch(isGraphSupported, (supported) => {
  if (!supported) {
    graphLoaded.value = false
    graph.clearGraph()
    graphBuildStatus.value = null
    return
  }
  if (isMilvus.value) {
    loadGraphBuildStatus()
  }
  scheduleGraphLoad(200)
})

onUnmounted(() => {
  if (pendingLoadTimer) {
    clearTimeout(pendingLoadTimer)
    pendingLoadTimer = null
  }
  stopBuildStatusPoll()
})
</script>

<style scoped lang="less">
.graph-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  user-select: none;
}

.graph-container-compact {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.graph-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
}

.graph-empty-state {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;

  :deep(.resource-empty-state__actions) {
    pointer-events: auto;
  }
}

.compact-actions {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none; /* Let clicks pass through empty areas */

  .actions-left,
  .actions-right {
    pointer-events: auto; /* Re-enable clicks for buttons/inputs */
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--color-trans-light);
    backdrop-filter: blur(12px);
    padding: 2px;
    border-radius: 8px;
    box-shadow: 0 0 4px 0px var(--shadow-2);
    border: 1px solid var(--gray-100);
  }

  :deep(.ant-input-affix-wrapper) {
    padding: 4px 11px;
    border-radius: 6px;
    border-color: transparent;
    box-shadow: none;
    background: var(--color-trans-light);

    &:hover,
    &:focus,
    &-focused {
      background: var(--main-0);
      border-color: var(--primary-color);
    }

    input {
      background: transparent;
    }
  }

  .action-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-600);
    border-radius: 6px;
    box-shadow: none;
    position: relative;

    &:hover {
      background: var(--shadow-1);
      color: var(--primary-color);
    }
  }

  .index-action-btn {
    gap: 6px;
    overflow: visible;

    &.has-index-label {
      width: auto;
      min-width: 84px;
      padding: 0 22px 0 8px;
      justify-content: flex-start;
    }

    .index-status-label {
      font-size: 12px;
      line-height: 1;
      color: var(--gray-700);
      white-space: nowrap;
    }
  }

  .status-dot {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--color-trans-light);
  }

  .status-dot--pending {
    background: var(--color-warning-500);
  }

  .status-dot--active {
    background: var(--color-warning-500);
    animation: blink 1.2s ease-in-out infinite;
  }

  .status-dot--complete {
    background: var(--color-success-500);
  }

  .search-suffix-icon {
    cursor: pointer;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

.graph-disabled {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.disabled-content {
  text-align: center;
  color: var(--gray-400);

  h4 {
    margin-bottom: 8px;
  }
}

.floating-panel {
  position: absolute;
  top: 60px;
  right: 10px;
  width: 300px;
  max-height: calc(100% - 60px);
  overflow-y: auto;
  z-index: 100;
  background: var(--color-trans-light);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 8px;
  border: 1px solid var(--gray-100);
  box-shadow: 0 0 4px 0px var(--shadow-2);
  font-size: 13px;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--gray-200);

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--gray-1000);
    }

    .panel-refresh-btn {
      padding: 2px 6px;
    }
  }

  .panel-body {
    padding: 10px 14px;
  }
}

.build-panel {
  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    .status-label {
      color: var(--gray-600);
      font-size: 12px;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    border-radius: 4px;
    background: var(--gray-50);

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--gray-1000);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 11px;
      color: var(--gray-500);
      margin-top: 2px;
    }
  }

  .build-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .actions-secondary {
    display: flex;
    justify-content: space-between;
  }
}

.config-warning {
  margin-bottom: 16px;
}

.extractor-type-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  .extractor-type-card {
    border: 1px solid var(--gray-150);
    border-radius: 8px;
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--gray-0);

    &:hover {
      border-color: var(--main-color);
    }

    &.active {
      border-color: var(--main-color);
      background: var(--main-10);
      box-shadow: 0 0 0 1px var(--main-20);

      .type-icon {
        color: var(--main-color);
      }
    }

    &.disabled {
      cursor: not-allowed;
      opacity: 0.72;
      background: var(--gray-50);

      &:hover {
        border-color: var(--gray-150);
      }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .type-icon {
      width: 20px;
      height: 20px;
      color: var(--main-color);
      flex-shrink: 0;
    }

    .type-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--gray-800);
    }

    .card-description {
      font-size: 13px;
      color: var(--gray-600);
      line-height: 1.5;
    }

    .card-helper {
      margin-top: 8px;
      font-size: 12px;
      color: var(--gray-500);

      &.warning {
        color: var(--color-warning-500);
      }
    }
  }
}

.form-grid.two-columns {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
