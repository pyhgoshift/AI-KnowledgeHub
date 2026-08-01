<template>
  <div class="apikey-management">
    <!-- 头部区域 -->
    <div class="header-section">
      <div class="header-content">
        <div class="section-title">API 키 관리</div>
        <p class="section-description">
          외부 시스템에서 에이전트 대화 API를 호출할 때 사용합니다. 전체 키는 한 번만 표시되므로 안전하게 보관하세요.
        </p>
      </div>
      <div class="header-actions">
        <a-button
          @click="handleRefresh"
          :loading="refreshing"
          title="새로고침"
          class="refresh-btn lucide-icon-btn"
        >
          <template #icon><RefreshCw :size="16" :class="{ spin: refreshing }" /></template>
        </a-button>
        <a-button type="primary" @click="showCreateModal" class="add-btn lucide-icon-btn">
          <Plus :size="14" />
          API 키 만들기
        </a-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-section">
      <a-spin :spinning="loading">
        <div v-if="error" class="error-message">
          <a-alert type="error" :message="error" show-icon />
        </div>

        <div class="cards-container">
          <div v-if="apiKeys.length === 0" class="empty-state">
            <a-empty description="API 키가 없습니다. 위 버튼을 눌러 만드세요." />
          </div>
          <div v-else class="apikey-cards-grid">
            <div v-for="key in apiKeys" :key="key.id" class="apikey-card">
              <div class="card-header">
                <div class="key-info">
                  <KeyIcon size="18" class="key-icon" />
                  <div class="key-info-content">
                    <h4 class="key-name">{{ key.name }}</h4>
                  </div>
                </div>
                <code class="key-prefix">{{ key.key_prefix }}****</code>
              </div>

              <div class="card-content">
                <div class="info-item">
                  <span class="info-label">만료 시간:</span>
                  <span class="info-value">{{ key.expires_at || '만료 없음' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">최근 사용:</span>
                  <span class="info-value">{{ formatTime(key.last_used_at) }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="footer-left">
                  <span class="switch-label">{{ key.is_enabled ? '사용 중' : '사용 안 함' }}</span>
                  <a-switch :checked="key.is_enabled" size="small" @change="toggleEnabled(key)" />
                </div>
                <div class="footer-actions">
                  <a-tooltip title="재발급(전체 키 확인)">
                    <a-button
                      type="text"
                      size="small"
                      @click="regenerateKey(key)"
                      class="action-btn lucide-icon-btn"
                    >
                      <RefreshCw :size="14" />
                      <span>재발급</span>
                    </a-button>
                  </a-tooltip>
                  <a-popconfirm
                    title="이 API 키를 삭제할까요? 삭제 후에는 복구할 수 없습니다."
                    @confirm="deleteKey(key)"
                    ok-text="삭제"
                    cancel-text="취소"
                  >
                    <a-tooltip title="삭제">
                      <a-button type="text" size="small" danger class="action-btn lucide-icon-btn">
                        <Trash2 :size="14" />
                        <span>삭제</span>
                      </a-button>
                    </a-tooltip>
                  </a-popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 创建 Modal -->
    <a-modal
      v-model:open="createModalVisible"
      title="API 키 만들기"
      @ok="handleCreate"
      :confirmLoading="createLoading"
      ok-text="만들기"
      cancel-text="취소"
    >
      <a-form layout="vertical" :model="createForm">
        <a-form-item label="이름" required>
          <a-input v-model:value="createForm.name" placeholder="예: 운영 환경 API" />
        </a-form-item>
        <a-form-item label="만료 시간">
          <a-date-picker
            v-model:value="createForm.expires_at"
            show-time
            placeholder="비워 두면 만료되지 않습니다"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 密钥显示 Modal (创建后一次性显示) -->
    <a-modal
      v-model:open="secretModalVisible"
      title="API 키가 만들어졌습니다"
      :closable="true"
      @cancel="secretModalVisible = false"
      :footer="null"
      width="520px"
    >
      <div class="secret-display">
        <a-alert
          type="warning"
          message="지금 키를 복사하세요. 창을 닫으면 전체 키를 다시 볼 수 없습니다."
          show-icon
          class="secret-alert"
        />
        <div class="secret-value-container">
          <code class="secret-value">{{ createdSecret }}</code>
          <a-button type="primary" @click="copySecret" class="copy-btn lucide-icon-btn">
            <Copy :size="14" />
            복사
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { Plus, RefreshCw, Trash2, Copy } from 'lucide-vue-next'
import { Key as KeyIcon } from 'lucide-vue-next'
import { apikeyApi } from '@/apis/apikey_api'

const loading = ref(false)
const refreshing = ref(false)
const error = ref(null)
const apiKeys = ref([])

const createModalVisible = ref(false)
const secretModalVisible = ref(false)
const createLoading = ref(false)
const createdSecret = ref('')

const createForm = reactive({
  name: '',
  expires_at: null
})

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadApiKeys = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await apikeyApi.list()
    apiKeys.value = res.api_keys || []
  } catch (e) {
    error.value = e.message || '불러오기에 실패했습니다'
  } finally {
    loading.value = false
  }
}

// 刷新 API Key 列表
const handleRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await loadApiKeys()
    message.success('새로고침했습니다')
  } catch (e) {
    console.error('刷新失败:', e)
    message.error('새로고침에 실패했습니다')
  } finally {
    refreshing.value = false
  }
}

const showCreateModal = () => {
  createForm.name = ''
  createForm.expires_at = null
  createModalVisible.value = true
}

const handleCreate = async () => {
  if (!createForm.name.trim()) {
    message.error('이름을 입력하세요')
    return
  }

  createLoading.value = true
  try {
    const data = { name: createForm.name }
    if (createForm.expires_at) {
      data.expires_at = createForm.expires_at.format('YYYY-MM-DDTHH:mm:ss')
    }

    const res = await apikeyApi.create(data)
    createdSecret.value = res.secret
    createModalVisible.value = false
    secretModalVisible.value = true
    await loadApiKeys()
  } catch (e) {
    message.error(e.message || '만들기에 실패했습니다')
  } finally {
    createLoading.value = false
  }
}

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(createdSecret.value)
    message.success('클립보드에 복사했습니다')
  } catch {
    message.error('복사에 실패했습니다')
  }
}

const regenerateKey = async (key) => {
  try {
    const res = await apikeyApi.regenerate(key.id)
    createdSecret.value = res.secret
    secretModalVisible.value = true
    await loadApiKeys()
  } catch (e) {
    message.error(e.message || '재발급에 실패했습니다')
  }
}

const toggleEnabled = async (key) => {
  try {
    await apikeyApi.update(key.id, { is_enabled: !key.is_enabled })
    message.success(key.is_enabled ? '사용 안 함으로 변경했습니다' : '사용으로 변경했습니다')
    await loadApiKeys()
  } catch (e) {
    message.error(e.message || '작업에 실패했습니다')
  }
}

const deleteKey = async (key) => {
  try {
    await apikeyApi.delete(key.id)
    message.success('삭제했습니다')
    await loadApiKeys()
  } catch (e) {
    message.error(e.message || '삭제에 실패했습니다')
  }
}

onMounted(() => {
  loadApiKeys()
})
</script>

<style lang="less" scoped>
.apikey-management {
  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 16px;

    .header-content {
      flex: 1;
      min-width: 0;

      .section-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--gray-900);
        line-height: 1.4;
        margin: 12px 0 12px;
      }

      .section-description {
        font-size: 14px;
        color: var(--gray-600);
        line-height: 1.4;
        margin: 0;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      .refresh-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        transition: all 0.2s ease;

        &:hover {
          background: var(--gray-25);
        }

        .spin {
          animation: spin 1s linear infinite;
        }
      }
    }
  }

  .content-section {
    .error-message {
      margin-bottom: 16px;
    }

    .cards-container {
      .empty-state {
        padding: 48px 0;
      }

      .apikey-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 12px;
      }

      .apikey-card {
        background: var(--gray-0);
        border: 1px solid var(--gray-150);
        border-radius: 8px;
        padding: 12px;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;

        &:hover {
          border-color: var(--gray-300);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;

          .key-info {
            display: flex;
            align-items: center;
            gap: 10px;

            .key-icon {
              color: var(--main-600);
              flex-shrink: 0;
            }

            .key-info-content {
              .key-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--gray-900);
                margin: 0;
              }
            }
          }

          .key-prefix {
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            color: var(--gray-600);
            background: var(--gray-50);
            padding: 2px 8px;
            border-radius: 8px;
          }
        }

        .card-content {
          margin-bottom: 10px;

          .info-item {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            margin-bottom: 6px;
            font-size: 13px;

            &:last-child {
              margin-bottom: 0;
            }

            .info-label {
              color: var(--gray-600);
              flex-shrink: 0;
            }

            .info-value {
              color: var(--gray-900);
              word-break: break-all;
            }

            &.half {
              flex: 1;
            }
          }
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--gray-100);

          .footer-left {
            display: flex;
            align-items: center;
            gap: 8px;

            .switch-label {
              font-size: 12px;
              color: var(--gray-600);
            }
          }

          .footer-actions {
            display: flex;
            gap: 4px;
          }

          .action-btn {
            font-size: 12px;
            color: var(--gray-700);
            display: inline-flex;
            align-items: center;
            gap: 4px;

            &:hover {
              color: var(--main-600);
            }
          }
        }
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.secret-display {
  .secret-alert {
    margin-bottom: 16px;
  }

  .secret-value-container {
    display: flex;
    gap: 8px;
    align-items: stretch;

    .secret-value {
      flex: 1;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 13px;
      background: var(--gray-100);
      border: 1px solid var(--gray-200);
      border-radius: 6px;
      padding: 12px;
      word-break: break-all;
      color: var(--gray-900);
    }

    .copy-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }
}
</style>
