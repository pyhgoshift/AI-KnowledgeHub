import { message } from 'ant-design-vue'
import { multimodalApi } from '@/apis/agent_api'

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

export const uploadMultimodalImage = async (file) => {
  if (!file) return null

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    message.error('이미지 파일이 너무 큽니다. 10MB 미만의 이미지를 선택하세요')
    return null
  }

  if (!file.type?.startsWith('image/')) {
    message.error('올바른 이미지 파일을 선택하세요')
    return null
  }

  try {
    message.loading({ content: '이미지를 처리하는 중...', key: 'image-upload' })

    const result = await multimodalApi.uploadImage(file)
    if (!result.success) {
      message.error({
        content: `이미지를 처리하지 못했습니다: ${result.error}`,
        key: 'image-upload'
      })
      return null
    }

    message.success({
      content: '이미지 처리 완료',
      key: 'image-upload',
      duration: 2
    })

    return {
      success: true,
      imageContent: result.image_content,
      thumbnailContent: result.thumbnail_content,
      width: result.width,
      height: result.height,
      format: result.format,
      mimeType: result.mime_type || file.type,
      sizeBytes: result.size_bytes,
      originalName: file.name || result.original_filename || 'pasted-image'
    }
  } catch (error) {
    console.error('이미지 업로드 실패:', error)
    message.error({
      content: `이미지 업로드 실패: ${error.message || '알 수 없는 오류'}`,
      key: 'image-upload'
    })
    return null
  }
}
