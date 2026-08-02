<template>
  <div class="search-config-panel">
    <div v-if="loading" class="config-loading">
      <a-spin />
      <p>설정 매개변수를 불러오는 중...</p>
    </div>

    <a-result v-else-if="error" status="error" title="설정을 불러오지 못했습니다" :sub-title="error">
      <template #extra>
        <a-button type="primary" @click="loadQueryParams">다시 불러오기</a-button>
      </template>
    </a-result>

    <template v-else>
      <a-empty v-if="visibleQueryParams.length === 0" description="설정할 수 있는 매개변수가 없습니다" />
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12" v-for="param in visibleQueryParams" :key="param.key">
            <a-form-item :label="param.label">
              <template #extra v-if="param.description">
                <div class="param-description">{{ param.description }}</div>
              </template>
              <a-select
                v-if="param.type === 'select'"
                v-model:value="meta[param.key]"
                style="width: 100%"
              >
                <a-select-option
                  v-for="option in param.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-select-option>
              </a-select>
              <a-select
                v-else-if="param.type === 'boolean'"
                :value="computedMeta[param.key]"
                @update:value="(value) => updateMeta(param.key, value)"
                style="width: 100%"
              >
                <a-select-option value="true">사용</a-select-option>
                <a-select-option value="false">사용 안 함</a-select-option>
              </a-select>
              <a-input-number
                v-else-if="param.type === 'number'"
                v-model:value="meta[param.key]"
                style="width: 100%"
                :min="param.min || 0"
                :max="param.max || 100"
                :step="param.step"
              />
              <a-input v-else v-model:value="meta[param.key]" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { message } from 'ant-design-vue'
import { queryApi } from '@/apis/knowledge_api'

const props = defineProps({
  kbId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['save'])

const store = useDatabaseStore()

const loading = ref(false)
const error = ref('')
const queryParams = ref([])
const meta = reactive({})

const isDependencySatisfied = (param) => {
  const dependency = param.depend_on
  if (!dependency || dependency.length < 2) return true
  const [key, expectedValue] = dependency
  return meta[key] === expectedValue
}

const visibleQueryParams = computed(() => queryParams.value.filter(isDependencySatisfied))

const computedMeta = computed(() => {
  const result = {}
  for (const key in meta) {
    const param = queryParams.value.find((p) => p.key === key)
    if (param?.type === 'boolean') {
      result[key] = meta[key].toString()
    } else {
      result[key] = meta[key]
    }
  }
  return result
})

const updateMeta = (key, value) => {
  const param = queryParams.value.find((p) => p.key === key)
  if (param?.type === 'boolean') {
    meta[key] = value === 'true'
  } else {
    meta[key] = value
  }
}

const loadQueryParams = async () => {
  if (!props.kbId) {
    queryParams.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    const response = await queryApi.getKnowledgeBaseQueryParams(props.kbId)
    queryParams.value = (response.params?.options || []).filter(
      (param) => param.key !== 'include_distances'
    )

    const supportedKeys = new Set(queryParams.value.map((param) => param.key))
    for (const key in meta) {
      if (key !== 'include_distances' && !supportedKeys.has(key)) {
        delete meta[key]
      }
    }
    for (const param of queryParams.value) {
      if (param.default !== undefined) {
        meta[param.key] = param.type === 'boolean' ? Boolean(param.default) : param.default
      }
    }
    meta.include_distances = true

    loadSavedConfig()
  } catch (err) {
    console.error('Failed to load query params:', err)
    error.value = err.message || '검색 매개변수를 불러오지 못했습니다'
  } finally {
    loading.value = false
  }
}

const loadSavedConfig = () => {
  if (!props.kbId) return

  const saved = localStorage.getItem(`search-config-${props.kbId}`)
  if (saved) {
    try {
      const savedConfig = JSON.parse(saved)
      queryParams.value.forEach((param) => {
        if (param.type === 'boolean' && savedConfig[param.key] !== undefined) {
          if (typeof savedConfig[param.key] === 'string') {
            savedConfig[param.key] = savedConfig[param.key] === 'true'
          }
        }
      })
      Object.assign(meta, savedConfig)
    } catch (e) {
      console.warn('Failed to parse saved config:', e)
    }
  }
  meta.include_distances = true
}

const save = async () => {
  if (!props.kbId) {
    message.error('설정을 저장할 수 없습니다. 지식베이스 ID가 없습니다')
    return false
  }

  meta.include_distances = true

  try {
    const response = await queryApi.updateKnowledgeBaseQueryParams(props.kbId, { ...meta })
    if (response.message === 'success') {
      localStorage.setItem(`search-config-${props.kbId}`, JSON.stringify(meta))
      Object.assign(store.meta, meta)
      message.success('설정을 저장했습니다')
      emit('save', { ...meta })
      return true
    } else {
      throw new Error(response.message || '저장하지 못했습니다')
    }
  } catch (err) {
    console.error('保存配置到知识库失败:', err)
    message.error('설정을 저장하지 못했습니다: ' + (err.message || '알 수 없는 오류'))
    return false
  }
}

const resetToDefaults = () => {
  queryParams.value.forEach((param) => {
    if (param.default !== undefined) {
      meta[param.key] = param.default
    }
  })
  meta.include_distances = true
  message.success('기본 설정으로 재설정했습니다')
}

watch(
  () => props.kbId,
  (newId) => {
    if (newId) {
      loadQueryParams()
    }
  },
  { immediate: true }
)

defineExpose({ save, resetToDefaults, loadQueryParams })
</script>

<style lang="less" scoped>
.search-config-panel {
  .config-loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    color: var(--gray-500);

    p {
      margin-top: 16px;
      font-size: 14px;
    }
  }

  .param-description {
    font-size: 12px;
    color: var(--gray-500);
    line-height: 1.5;
    margin-top: 4px;
  }

  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-form-item-label > label) {
    font-weight: 500;
    color: var(--gray-700);
  }

  :deep(.ant-input),
  :deep(.ant-select-selector) {
    border-radius: 6px;
  }
}
</style>
