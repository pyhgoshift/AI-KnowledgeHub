import { reactive } from 'vue'
import { modelProviderApi } from '@/apis/system_api'

/**
 * 模型状态检查 composable，供 Chat/Embedding/Rerank 模型选择器共用。
 */
export function useModelStatus() {
  const statusMap = reactive({})

  const getStatusIcon = (key) => {
    const status = statusMap[key]
    if (!status) return '○'
    if (status.status === 'available') return '✓'
    if (status.status === 'unavailable') return '✗'
    if (status.status === 'error') return '⚠'
    return '○'
  }

  const getStatusClass = (key) => {
    return statusMap[key]?.status || ''
  }

  const getStatusTooltip = (key) => {
    const status = statusMap[key]
    if (!status) return '상태를 알 수 없음'
    const text =
      { available: '사용 가능', unavailable: '사용 불가', error: '오류' }[status.status] || '알 수 없음'
    return `${text}: ${status.message || '상세 정보 없음'}`
  }

  const checkV2Status = async (spec) => {
    try {
      const response = await modelProviderApi.getModelStatusBySpec(spec)
      if (response.data) {
        statusMap[spec] = response.data
      }
    } catch {
      statusMap[spec] = { spec, status: 'error', message: '확인 실패' }
    }
  }

  const checkV2Statuses = async (models) => {
    for (const model of models || []) {
      await checkV2Status(model.spec)
    }
  }

  return {
    statusMap,
    getStatusIcon,
    getStatusClass,
    getStatusTooltip,
    checkV2Status,
    checkV2Statuses
  }
}
