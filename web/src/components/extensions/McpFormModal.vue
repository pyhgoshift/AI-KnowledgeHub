<template>
  <a-modal
    v-model:open="visible"
    :title="editMode ? 'MCP 편집' : 'MCP 추가'"
    @ok="handleFormSubmit"
    :confirmLoading="formLoading"
    @cancel="visible = false"
    :maskClosable="false"
    width="560px"
    class="server-modal"
  >
    <a-form layout="vertical" class="extension-form">
      <a-form-item label="MCP 식별자" required class="form-item">
        <a-input
          v-model:value="form.slug"
          placeholder="MCP 고정 식별자를 입력하세요. 예: my-mcp"
          :disabled="editMode"
        />
      </a-form-item>
      <a-form-item label="MCP 이름" required class="form-item">
        <a-input v-model:value="form.name" placeholder="화면에 표시할 MCP 이름을 입력하세요" />
      </a-form-item>
      <a-form-item label="설명" class="form-item">
        <a-input v-model:value="form.description" placeholder="MCP 설명을 입력하세요" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="전송 유형" required class="form-item">
            <a-select v-model:value="form.transport">
              <a-select-option value="streamable_http">streamable_http</a-select-option>
              <a-select-option value="sse">sse</a-select-option>
              <a-select-option value="stdio">stdio</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="아이콘" class="form-item">
            <a-input v-model:value="form.icon" placeholder="이모지를 입력하세요. 예: 🧠" :maxlength="2" />
          </a-form-item>
        </a-col>
      </a-row>
      <template v-if="form.transport === 'streamable_http' || form.transport === 'sse'">
        <a-form-item label="MCP URL" required class="form-item">
          <a-input v-model:value="form.url" placeholder="https://example.com/mcp" />
        </a-form-item>
        <a-form-item label="HTTP 요청 헤더" class="form-item">
          <a-textarea
            v-model:value="form.headersText"
            placeholder='JSON 형식. 예: {"Authorization": "Bearer xxx"}'
            :rows="3"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="HTTP 시간 제한(초)" class="form-item">
              <a-input-number
                v-model:value="form.timeout"
                :min="1"
                :max="300"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="SSE 읽기 시간 제한(초)" class="form-item">
              <a-input-number
                v-model:value="form.sse_read_timeout"
                :min="1"
                :max="300"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </template>
      <template v-if="isStdioTransport">
        <a-form-item label="명령" required class="form-item">
          <a-input v-model:value="form.command" placeholder="예: npx 또는 /path/to/server" />
        </a-form-item>
        <a-form-item label="인수" class="form-item">
          <a-select
            v-model:value="form.args"
            mode="tags"
            placeholder="인수를 입력한 뒤 Enter를 누르세요. 예: -m"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="환경 변수" class="form-item">
          <McpEnvEditor v-model="form.env" />
        </a-form-item>
      </template>
      <a-form-item label="태그" class="form-item">
        <a-select
          v-model:value="form.tags"
          mode="tags"
          placeholder="태그를 입력한 뒤 Enter를 누르세요"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { mcpApi } from '@/apis/mcp_api'
import McpEnvEditor from '@/components/McpEnvEditor.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false },
  editData: { type: Object, default: null }
})

const emit = defineEmits(['update:open', 'submitted'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

const formLoading = ref(false)

const form = reactive({
  slug: '',
  name: '',
  description: '',
  transport: 'streamable_http',
  url: '',
  command: '',
  args: [],
  env: null,
  headersText: '',
  timeout: null,
  sse_read_timeout: null,
  tags: [],
  icon: ''
})

const isStdioTransport = computed(
  () =>
    String(form.transport || '')
      .trim()
      .toLowerCase() === 'stdio'
)

watch(
  () => props.open,
  (val) => {
    if (val && props.editData) {
      Object.assign(form, {
        slug: props.editData.slug || '',
        name: props.editData.name || '',
        description: props.editData.description || '',
        transport: props.editData.transport || 'streamable_http',
        url: props.editData.url || '',
        command: props.editData.command || '',
        args: props.editData.args || [],
        env: props.editData.env || null,
        headersText: props.editData.headers ? JSON.stringify(props.editData.headers, null, 2) : '',
        timeout: props.editData.timeout,
        sse_read_timeout: props.editData.sse_read_timeout,
        tags: props.editData.tags || [],
        icon: props.editData.icon || ''
      })
    } else if (val && !props.editData) {
      Object.assign(form, {
        slug: '',
        name: '',
        description: '',
        transport: 'streamable_http',
        url: '',
        command: '',
        args: [],
        env: null,
        headersText: '',
        timeout: null,
        sse_read_timeout: null,
        tags: [],
        icon: ''
      })
    }
  },
  { immediate: true }
)

const handleFormSubmit = async () => {
  try {
    formLoading.value = true
    let headers = null
    if (form.headersText.trim()) {
      try {
        headers = JSON.parse(form.headersText)
      } catch {
        message.error('요청 헤더 JSON 형식이 잘못되었습니다')
        return
      }
    }
    const data = {
      slug: form.slug,
      name: form.name,
      description: form.description || null,
      transport: form.transport,
      url: form.url || null,
      command: form.command || null,
      args: form.args.length > 0 ? form.args : null,
      env: form.env,
      headers,
      timeout: form.timeout || null,
      sse_read_timeout: form.sse_read_timeout || null,
      tags: form.tags.length > 0 ? form.tags : null,
      icon: form.icon || null
    }
    if (!data.slug?.trim()) {
      message.error('MCP 식별자를 입력하세요')
      return
    }
    if (!data.name?.trim()) {
      message.error('MCP 이름을 입력하세요')
      return
    }
    if (!data.transport) {
      message.error('전송 유형을 선택하세요')
      return
    }
    if (['sse', 'streamable_http'].includes(data.transport)) {
      if (!data.url?.trim()) {
        message.error('HTTP 유형은 MCP URL을 입력해야 합니다')
        return
      }
    }
    if (data.transport === 'stdio') {
      if (!data.command?.trim()) {
        message.error('StdIO 유형은 명령을 입력해야 합니다')
        return
      }
    }

    if (props.editMode) {
      const { slug, ...updateData } = data
      const result = await mcpApi.updateMcpServer(props.editData?.slug || slug, updateData)
      if (result.success) {
        message.success('MCP를 수정했습니다')
      } else {
        message.error(result.message || '수정에 실패했습니다')
        return
      }
    } else {
      const result = await mcpApi.createMcpServer(data)
      if (result.success) {
        message.success('MCP를 만들었습니다')
      } else {
        message.error(result.message || '만들기에 실패했습니다')
        return
      }
    }
    visible.value = false
    emit('submitted')
  } catch (err) {
    message.error(err.message || '작업에 실패했습니다')
  } finally {
    formLoading.value = false
  }
}
</script>

<style lang="less" scoped>
@import '@/assets/css/extensions.less';
</style>
