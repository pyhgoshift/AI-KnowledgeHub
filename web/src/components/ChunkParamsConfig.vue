<template>
  <div class="chunk-params-config">
    <div class="params-info">
      <p>청크 매개변수를 조정하면 텍스트 분할 방식을 제어하여 검색 품질과 문서 처리 효율에 영향을 줍니다.</p>
    </div>
    <a-form :model="localParams" name="chunkConfig" autocomplete="off" layout="vertical">
      <a-form-item v-if="showPreset" name="chunk_preset_id">
        <template #label>
          <span class="chunk-preset-label">
            청크 전략
            <a-tooltip :title="presetDescription">
              <QuestionCircleOutlined class="chunk-preset-help-icon" />
            </a-tooltip>
          </span>
        </template>
        <a-select
          v-model:value="localParams.chunk_preset_id"
          :options="presetOptions"
          :loading="chunkPresetLoading"
          style="width: 100%"
        />
        <p class="param-description">
          현재 문서 구조에 맞는 청크 전략을 선택하세요.
          <span v-if="allowPresetFollowDefault">비워 두면 지식베이스 기본 전략을 사용합니다.</span>
        </p>
      </a-form-item>

      <div class="chunk-row">
        <a-form-item v-if="showChunkSizeOverlap" name="chunk_token_num">
          <template #label>
            <span class="chunk-preset-label">
              최대 토큰 수
              <a-tooltip title="각 텍스트 조각의 최대 토큰 수입니다. 비워 두면 기본값 512를 사용합니다">
                <QuestionCircleOutlined class="chunk-preset-help-icon" />
              </a-tooltip>
            </span>
          </template>
          <a-input-number
            v-model:value="parserConfig.chunk_token_num"
            :min="100"
            :max="10000"
            placeholder="기본값 512"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item v-if="showChunkSizeOverlap" name="overlapped_percent">
          <template #label>
            <span class="chunk-preset-label">
              겹침 비율(%)
              <a-tooltip title="인접한 텍스트 조각의 토큰 기준 겹침 비율입니다. 비워 두면 기본값 0을 사용합니다">
                <QuestionCircleOutlined class="chunk-preset-help-icon" />
              </a-tooltip>
            </span>
          </template>
          <a-input-number
            v-model:value="parserConfig.overlapped_percent"
            :min="0"
            :max="99"
            placeholder="기본값 0"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item v-if="showQaSplit" name="delimiter">
          <template #label>
            <span class="chunk-preset-label">
              구분자
              <a-tooltip title="\\n, \\t 같은 이스케이프 문자를 지원합니다. 비워 두면 기본 구분자 \\n을 사용합니다">
                <QuestionCircleOutlined class="chunk-preset-help-icon" />
              </a-tooltip>
            </span>
          </template>
          <a-input
            v-model:value="parserConfig.delimiter"
            placeholder="기본값 \\n, \\n\\n\\n 또는 --- 입력 가능"
            style="width: 100%"
          />
        </a-form-item>
      </div>
    </a-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useChunkPresetOptions } from '@/composables/useChunkPresetOptions'
import { DEFAULT_CHUNK_PRESET_ID, isPlainObject } from '@/utils/chunkUtils'

const props = defineProps({
  tempChunkParams: {
    type: Object,
    required: true
  },
  showQaSplit: {
    type: Boolean,
    default: true
  },
  showChunkSizeOverlap: {
    type: Boolean,
    default: true
  },
  showPreset: {
    type: Boolean,
    default: true
  },
  allowPresetFollowDefault: {
    type: Boolean,
    default: false
  },
  databasePresetId: {
    type: String,
    default: DEFAULT_CHUNK_PRESET_ID
  }
})

const localParams = computed(() => props.tempChunkParams)
const fallbackParserConfig = ref({})
const {
  chunkPresetSelectOptions,
  chunkPresetLabelMap,
  chunkPresetLoading,
  loadChunkPresetOptions,
  getChunkPresetDescription
} = useChunkPresetOptions()

const parserConfig = computed(() => {
  if (!isPlainObject(props.tempChunkParams.chunk_parser_config)) {
    return fallbackParserConfig.value
  }
  return props.tempChunkParams.chunk_parser_config
})

const presetOptions = computed(() => {
  const options = []
  const defaultPresetLabel =
    chunkPresetLabelMap.value[props.databasePresetId] ||
    props.databasePresetId ||
    DEFAULT_CHUNK_PRESET_ID

  if (props.allowPresetFollowDefault) {
    options.push({
      value: '',
      label: `지식베이스 기본값 사용(${defaultPresetLabel})`
    })
  }

  options.push(...chunkPresetSelectOptions.value)

  return options
})

const effectivePresetId = computed(
  () => props.tempChunkParams.chunk_preset_id || props.databasePresetId || DEFAULT_CHUNK_PRESET_ID
)
const presetDescription = computed(() => getChunkPresetDescription(effectivePresetId.value))

onMounted(() => {
  loadChunkPresetOptions()
})
</script>

<style scoped>
.chunk-params-config {
  width: 100%;
}

.params-info {
  margin-bottom: 16px;
}

.params-info p {
  margin: 0;
  color: var(--gray-500);
  font-size: 14px;
  line-height: 1.5;
}

.chunk-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.chunk-row > .ant-form-item {
  flex: 1;
  margin-bottom: 0;
}

.param-description {
  font-size: 12px;
  color: var(--gray-400);
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.chunk-preset-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chunk-preset-help-icon {
  color: var(--gray-500);
  cursor: help;
  font-size: 14px;
}
</style>
