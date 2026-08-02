import { message } from 'ant-design-vue'

/**
 * 统一错误处理工具类
 */
export class ErrorHandler {
  /**
   * 处理通用错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {Object} options - 配置选项
   */
  static handleError(error, context = '작업', options = {}) {
    const {
      showMessage = true,
      logToConsole = true,
      customMessage = null,
      severity = 'error'
    } = options

    // 控制台日志
    if (logToConsole) {
      console.error(`${context}失败:`, error)
    }

    // 用户提示
    if (showMessage) {
      const displayMessage = customMessage || this.getErrorMessage(error, context)

      switch (severity) {
        case 'warning':
          message.warning(displayMessage)
          break
        case 'info':
          message.info(displayMessage)
          break
        case 'error':
        default:
          message.error(displayMessage)
          break
      }
    }

    return error
  }

  /**
   * 获取错误消息
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @returns {string} 错误消息
   */
  static getErrorMessage(error, context) {
    if (error?.message) {
      return `${context} 실패: ${error.message}`
    }
    return `${context} 실패`
  }

  /**
   * 处理网络请求错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   */
  static handleNetworkError(error, context = '네트워크 요청') {
    let customMessage = null

    if (error?.code === 'NETWORK_ERROR') {
      customMessage = '네트워크 연결에 실패했습니다. 네트워크 설정을 확인하세요'
    } else if (error?.status === 401) {
      customMessage = '인증에 실패했습니다. 다시 로그인하세요'
    } else if (error?.status === 403) {
      customMessage = '권한이 부족해 이 작업을 수행할 수 없습니다'
    } else if (error?.status === 404) {
      customMessage = '요청한 리소스가 없습니다'
    } else if (error?.status >= 500) {
      customMessage = '서버 오류입니다. 잠시 후 다시 시도하세요'
    }

    return this.handleError(error, context, { customMessage })
  }

  /**
   * 处理聊天相关错误
   * @param {Error} error - 错误对象
   * @param {string} operation - 操作类型
   */
  static handleChatError(error, operation) {
    const contextMap = {
      send: '메시지 전송',
      create: '대화 만들기',
      delete: '대화 삭제',
      rename: '대화 이름 변경',
      load: '대화 불러오기',
      export: '대화 내보내기',
      stream: '스트리밍 처리'
    }

    const context = contextMap[operation] || operation
    return this.handleError(error, context)
  }

  /**
   * 处理验证错误
   * @param {string} message - 验证错误消息
   */
  static handleValidationError(message) {
    return this.handleError(new Error(message), '입력 검증', {
      severity: 'warning',
      customMessage: message
    })
  }

  /**
   * 处理异步操作错误
   * @param {Function} asyncFn - 异步函数
   * @param {string} context - 错误上下文
   * @param {Object} options - 配置选项
   */
  static async handleAsync(asyncFn, context, options = {}) {
    try {
      return await asyncFn()
    } catch (error) {
      this.handleError(error, context, options)
      throw error
    }
  }

  /**
   * 创建错误处理装饰器
   * @param {string} context - 错误上下文
   * @param {Object} options - 配置选项
   */
  static createHandler(context, options = {}) {
    return (error) => this.handleError(error, context, options)
  }
}

/**
 * 快捷方法
 */
export const handleChatError = ErrorHandler.handleChatError.bind(ErrorHandler)
export const handleNetworkError = ErrorHandler.handleNetworkError.bind(ErrorHandler)
export const handleValidationError = ErrorHandler.handleValidationError.bind(ErrorHandler)
export const handleAsync = ErrorHandler.handleAsync.bind(ErrorHandler)

export default ErrorHandler
