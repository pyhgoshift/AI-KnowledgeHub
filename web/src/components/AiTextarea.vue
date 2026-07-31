<template>
  <div class="ai-textarea-wrapper" :class="`action-${actionPlacement}`">
    <a-textarea
      :value="modelValue"
      @update:value="$emit('update:modelValue', $event)"
      :placeholder="placeholder"
      :rows="rows"
      :auto-size="autoSize"
    />
    <a-tooltip v-if="name" title="AI로 설명을 생성하거나 다듬습니다">
      <a-button
        class="ai-btn"
        type="text"
        size="small"
        :loading="loading"
        @click="generateDescription"
      >
        <template #icon>
          <WandSparkles size="14" />
        </template>
        <span v-if="!loading" class="ai-text">{{ modelValue?.trim() ? '다듬기' : '생성' }}</span>
      </a-button>
    </a-tooltip>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { databaseApi } from '@/apis/knowledge_api'
import { WandSparkles } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 4
  },
  autoSize: {
    type: [Boolean, Object],
    default: false
  },
  files: {
    type: Array,
    default: () => []
  },
  actionPlacement: {
    type: String,
    default: 'inside'
  }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)

const generateDescription = async () => {
  if (!props.name?.trim()) {
    message.warning('먼저 지식베이스 이름을 입력하세요')
    return
  }

  loading.value = true
  try {
    const result = await databaseApi.generateDescription(props.name, props.modelValue, props.files)
    if (result.status === 'success' && result.description) {
      emit('update:modelValue', result.description)
      message.success('설명을 생성했습니다')
    } else {
      message.error(result.message || '생성에 실패했습니다')
    }
  } catch (error) {
    console.error('설명 생성 실패:', error)
    message.error(error.message || '설명 생성에 실패했습니다')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less" scoped>
.ai-textarea-wrapper {
  position: relative;

  .ai-btn {
    position: absolute;
    opacity: 0.9;
    top: 4px;
    right: 4px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 54px;
    padding: 2px 6px;
    height: 24px;
    color: var(--main-color);
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    font-size: 12px;
    transition: all 0.2s ease;

    &:hover {
      background: var(--main-10);
      border-color: var(--main-color);
    }

    .ai-text {
      font-weight: 500;
    }

    :deep(.ant-btn-loading-icon) {
      display: inline-flex;
      margin-inline-end: 0;
    }
  }

  &.action-header {
    .ai-btn {
      top: -31px;
      right: 0;
      height: 26px;
      min-width: 58px;
      padding: 0 9px;
      border-radius: 6px;
      background: var(--gray-0);
      border-color: var(--gray-150);
      color: var(--main-700);
      box-shadow: 0 1px 2px var(--shadow-1);

      &:hover {
        background: var(--gray-50);
        border-color: var(--gray-200);
        color: var(--gray-900);
      }
    }
  }
}
</style>
