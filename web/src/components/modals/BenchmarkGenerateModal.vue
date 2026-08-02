<template>
  <a-modal
    v-model:open="visible"
    title="평가 기준 자동 생성"
    width="600px"
    :mask-closable="!generating"
    :closable="!generating"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
      <a-form-item label="기준 이름" name="name">
        <a-input v-model:value="formState.name" placeholder="평가 기준 이름을 입력하세요" />
      </a-form-item>

      <a-form-item label="설명" name="description">
        <a-textarea
          v-model:value="formState.description"
          placeholder="평가 기준 설명을 입력하세요(선택 사항)"
          :rows="3"
        />
      </a-form-item>

      <a-form-item label="구축 방식" name="generation_mode">
        <div class="generation-mode-cards" role="radiogroup" aria-label="구축 방식">
          <div
            v-for="option in generationModeOptions"
            :key="option.value"
            class="generation-mode-card"
            :class="{
              active: formState.generation_mode === option.value,
              disabled: option.disabled
            }"
            role="radio"
            :aria-checked="formState.generation_mode === option.value"
            :aria-disabled="option.disabled"
            :tabindex="option.disabled ? -1 : 0"
            @click="selectGenerationMode(option)"
            @keydown.enter.prevent="selectGenerationMode(option)"
            @keydown.space.prevent="selectGenerationMode(option)"
          >
            <div class="card-header">
              <component :is="option.icon" class="mode-icon" />
              <span class="mode-title">{{ option.label }}</span>
              <a-tag v-if="option.tag" class="mode-tag" size="small">{{ option.tag }}</a-tag>
            </div>
            <div class="card-description">{{ option.description }}</div>
            <div v-if="option.helper" class="card-helper" :class="{ warning: option.disabled }">
              {{ option.helper }}
            </div>
          </div>
        </div>
      </a-form-item>

      <a-form-item
        label="LLM 모델 설정"
        name="llm_model_spec"
        :rules="[{ required: true, message: 'LLM 모델을 선택하세요' }]"
      >
        <ModelSelectorComponent
          :model_spec="formState.llm_model_spec"
          placeholder="질문 생성에 사용할 LLM 모델을 선택하세요"
          @select-model="handleSelectLLMModel"
        />
      </a-form-item>

      <a-form-item label="생성 매개변수" name="params">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="질문 수"
              name="count"
              :labelCol="{ span: 24 }"
              :wrapperCol="{ span: 24 }"
            >
              <a-input-number
                v-model:value="formState.count"
                :min="1"
                :max="100"
                style="width: 100%"
                placeholder="생성할 질문 수"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item name="neighbors_count" :labelCol="{ span: 24 }" :wrapperCol="{ span: 24 }">
              <template #label>
                <span class="field-label-with-help">
                  후보 청크 수
                  <a-tooltip title="질문을 생성할 때 참고하는 후보 청크의 전체 수입니다">
                    <CircleHelp class="help-icon" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="formState.neighbors_count"
                :min="0"
                :max="10"
                style="width: 100%"
                placeholder="기본값 1"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              name="concurrency_count"
              :labelCol="{ span: 24 }"
              :wrapperCol="{ span: 24 }"
            >
              <template #label>
                <span class="field-label-with-help">
                  구축 동시 실행 수
                  <a-tooltip title="평가 질문을 동시에 생성하는 워커 수입니다. 너무 높으면 모델 서비스의 속도 제한이 걸릴 수 있습니다">
                    <CircleHelp class="help-icon" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="formState.concurrency_count"
                :min="1"
                :max="20"
                style="width: 100%"
                placeholder="기본값 10"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="formState.generation_mode === 'graph_enhanced'" :span="12">
            <a-form-item
              name="graph_expand_top_k"
              :labelCol="{ span: 24 }"
              :wrapperCol="{ span: 24 }"
            >
              <template #label>
                <span class="field-label-with-help">
                  라운드별 확장 청크 수
                  <a-tooltip title="PPR 확산 후 각 라운드에 추가할 최고 점수 청크 수입니다">
                    <CircleHelp class="help-icon" />
                  </a-tooltip>
                </span>
              </template>
              <a-input-number
                v-model:value="formState.graph_expand_top_k"
                :min="1"
                :max="3"
                style="width: 100%"
                placeholder="默认 1"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form-item>
    </a-form>
    <template #footer>
      <div class="benchmark-modal-footer">
        <div class="benchmark-help-text">
          평가 기준 생성 원리를 알고 싶으신가요? 다음을 확인하세요
          <a
            class="benchmark-help-link"
            href="https://xerrors.github.io/Yuxi/intro/evaluation.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            사용 안내
          </a>
        </div>
        <div class="footer-actions">
          <a-button :disabled="generating" @click="handleCancel">취소</a-button>
          <a-button
            type="primary"
            :loading="generating"
            :disabled="generating"
            @click="handleGenerate"
          >
            확인
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CircleHelp, Database, Network } from 'lucide-vue-next'
import { evaluationApi, graphBuildApi } from '@/apis/knowledge_api'
import { useConfigStore } from '@/stores/config'
import ModelSelectorComponent from '@/components/ModelSelectorComponent.vue'

const configStore = useConfigStore()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  kbId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 默认基准名称
const defaultBenchmarkName = () => {
  const today = new Date().toISOString().slice(0, 10)
  const suffix = Array.from(
    { length: 4 },
    () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]
  ).join('')
  return `Test-${today}-${suffix}`
}

// 响应式数据
const formRef = ref()
const generating = ref(false)
const graphIndexedChunks = ref(0)

const formState = reactive({
  name: defaultBenchmarkName(),
  description: '',
  count: 10,
  neighbors_count: 1,
  concurrency_count: 10,
  generation_mode: 'vector',
  graph_expand_top_k: 1,
  llm_model_spec: configStore.config?.default_model || ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '벤치마크 이름을 입력하세요', trigger: 'blur' },
    { min: 2, max: 100, message: '벤치마크 이름은 2~100자여야 합니다', trigger: 'blur' }
  ],
  count: [{ required: true, message: '생성할 질문 수를 입력하세요', trigger: 'blur' }],
  concurrency_count: [{ required: true, message: '생성 동시 실행 수를 입력하세요', trigger: 'blur' }]
}

// 双向绑定visible
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const graphEnhancedDisabled = computed(() => graphIndexedChunks.value <= 0)

const generationModeOptions = computed(() => [
  {
    value: 'vector',
    label: '벡터 생성',
    tag: '기본',
    description: '벡터 유사도로 조각을 검색하며, 모든 지식베이스에 안정적으로 적용됩니다.',
    helper: '일반 평가 기준을 빠르게 만들기에 적합합니다.',
    icon: Database,
    disabled: false
  },
  {
    value: 'graph_enhanced',
    label: '그래프 강화 생성',
    tag: '그래프',
    description: '벡터 검색에 지식 그래프를 결합해 관련 조각을 확장합니다.',
    helper: graphEnhancedDisabled.value
      ? '현재 지식베이스는 그래프 생성을 완료하지 않아 그래프 강화 생성을 사용할 수 없습니다'
      : `그래프가 생성된 조각: ${graphIndexedChunks.value}`,
    icon: Network,
    disabled: graphEnhancedDisabled.value
  }
])

const loadGraphBuildStatus = async () => {
  if (!props.kbId) return
  try {
    const status = await graphBuildApi.getStatus(props.kbId)
    graphIndexedChunks.value = Number(status?.indexed_chunks || 0)
    if (graphEnhancedDisabled.value && formState.generation_mode === 'graph_enhanced') {
      formState.generation_mode = 'vector'
    }
  } catch (error) {
    console.error('加载图谱构建状态失败:', error)
    graphIndexedChunks.value = 0
    if (formState.generation_mode === 'graph_enhanced') {
      formState.generation_mode = 'vector'
    }
  }
}

const selectGenerationMode = (option) => {
  if (option.disabled) return
  formState.generation_mode = option.value
}

// 生成基准
const handleGenerate = async () => {
  if (generating.value) return

  try {
    // 表单验证
    await formRef.value.validate()

    generating.value = true

    const params = {
      name: formState.name,
      description: formState.description,
      count: formState.count,
      neighbors_count: formState.neighbors_count,
      concurrency_count: formState.concurrency_count,
      generation_mode: formState.generation_mode,
      graph_expand_top_k: formState.graph_expand_top_k,
      llm_model_spec: formState.llm_model_spec
    }

    const response = await evaluationApi.generateDataset(props.kbId, params)

    if (response.message === 'success') {
      message.success('생성 작업을 제출했습니다')
      visible.value = false
      resetForm()
      emit('success')
    } else {
      generating.value = false
      message.error(response.message || '생성에 실패했습니다')
    }
  } catch (error) {
    console.error('生成失败:', error)
    generating.value = false
    message.error(error?.response?.data?.detail || '생성에 실패했습니다')
  }
}

// 取消操作
const handleCancel = () => {
  if (generating.value) return
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(formState, {
    name: defaultBenchmarkName(),
    description: '',
    count: 10,
    neighbors_count: 1,
    concurrency_count: 10,
    generation_mode: 'vector',
    graph_expand_top_k: 1,
    llm_model_spec: configStore.config?.default_model || ''
  })
  generating.value = false
}

// 选择LLM模型
const handleSelectLLMModel = (modelSpec) => {
  formState.llm_model_spec = modelSpec
}

// 监听visible变化
watch(visible, (val) => {
  if (val && !generating.value) {
    resetForm()
    loadGraphBuildStatus()
  }
})
</script>

<style scoped lang="less">
.generation-mode-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.help-icon {
  width: 14px;
  height: 14px;
  color: var(--gray-500);
  cursor: help;
}

.benchmark-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.benchmark-help-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-600);
}

.benchmark-help-link {
  margin-left: 2px;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.generation-mode-card {
  border: 1px solid var(--gray-150);
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--gray-0);
  outline: none;

  &:hover,
  &:focus-visible {
    border-color: var(--main-color);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--main-20);
  }

  &.active {
    border-color: var(--main-color);
    background: var(--main-10);
    box-shadow: 0 0 0 1px var(--main-20);

    .mode-icon {
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
    gap: 8px;
    margin-bottom: 10px;
  }

  .mode-icon {
    width: 20px;
    height: 20px;
    color: var(--main-color);
    flex-shrink: 0;
  }

  .mode-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--gray-800);
  }

  .mode-tag {
    margin-left: auto;
    margin-right: 0;
  }

  .card-description {
    font-size: 13px;
    color: var(--gray-600);
    line-height: 1.5;
  }

  .card-helper {
    margin-top: 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--gray-500);

    &.warning {
      color: var(--color-warning-500);
    }
  }
}

@media (max-width: 640px) {
  .generation-mode-cards {
    grid-template-columns: 1fr;
  }

  .benchmark-modal-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .footer-actions {
    align-self: flex-end;
  }
}
</style>
