<template>
  <main class="cli-auth-view">
    <section class="cli-auth-panel">
      <div class="cli-auth-header">
        <p class="eyebrow">Yuxi CLI</p>
        <h1>명령줄 로그인 확인</h1>
      </div>

      <a-alert v-if="errorMessage" type="error" :message="errorMessage" show-icon />

      <a-spin v-else-if="loading" />

      <template v-else>
        <a-result
          v-if="approved"
          status="success"
          title="승인 완료"
          sub-title="이 페이지를 닫고 터미널로 돌아가세요."
        />

        <div v-else class="session-summary">
          <div class="code-block">{{ userCode }}</div>
          <a-alert
            type="warning"
            show-icon
            message="본인이 시작한 명령줄 로그인인지 확인하세요"
            description="승인하면 현재 계정으로 API 키가 만들어져 터미널에 전달됩니다. 본인이 시작한 요청이 아니라면 승인하지 말고 이 페이지를 닫으세요."
          />
          <dl>
            <div>
              <dt>자격 증명 이름</dt>
              <dd>{{ session?.key_name || 'Yuxi CLI' }}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{{ session?.status || '-' }}</dd>
            </div>
            <div>
              <dt>만료 시간</dt>
              <dd>{{ session?.expires_at || '-' }}</dd>
            </div>
          </dl>
          <a-button type="primary" size="large" :loading="approving" @click="approveSession">
            승인 확인
          </a-button>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/apis/auth_api'

const route = useRoute()
const loading = ref(true)
const approving = ref(false)
const approved = ref(false)
const errorMessage = ref('')
const session = ref(null)

const userCode = computed(() =>
  String(route.query.user_code || '')
    .trim()
    .toUpperCase()
)

async function loadSession() {
  if (!userCode.value) {
    errorMessage.value = 'CLI 승인 코드가 없습니다'
    loading.value = false
    return
  }
  try {
    loading.value = true
    session.value = await authApi.getCLIAuthSession(userCode.value)
  } catch (error) {
    errorMessage.value = error.message || 'CLI 승인 세션을 불러오지 못했습니다'
  } finally {
    loading.value = false
  }
}

async function approveSession() {
  try {
    approving.value = true
    await authApi.approveCLIAuthSession(userCode.value)
    approved.value = true
  } catch (error) {
    errorMessage.value = error.message || 'CLI 승인을 완료하지 못했습니다'
  } finally {
    approving.value = false
  }
}

onMounted(loadSession)
</script>

<style scoped lang="less">
.cli-auth-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background: var(--gray-50);
}

.cli-auth-panel {
  width: min(520px, 100%);
  padding: 32px;
  border: 1px solid var(--dark-10);
  border-radius: 8px;
  background: var(--color-bg-container);
}

.cli-auth-header {
  margin-bottom: 24px;

  .eyebrow {
    margin: 0 0 8px;
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  h1 {
    margin: 0;
    color: var(--color-text);
    font-size: 26px;
    font-weight: 650;
  }
}

.session-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.code-block {
  padding: 16px;
  border: 1px solid var(--dark-10);
  border-radius: 8px;
  background: var(--color-bg-elevated);
  color: var(--color-text);
  font-size: 24px;
  font-weight: 650;
  letter-spacing: 0;
  text-align: center;
}

dl {
  display: grid;
  gap: 12px;
  margin: 0;

  div {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 16px;
  }

  dt {
    color: var(--color-text-secondary);
  }

  dd {
    margin: 0;
    color: var(--color-text);
    overflow-wrap: anywhere;
  }
}

@media (max-width: 560px) {
  .cli-auth-panel {
    padding: 24px;
  }

  dl div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
