<template>
  <div class="user-management">
    <!-- 头部区域 -->
    <div class="header-section">
      <div class="header-content">
        <div class="section-title">사용자 관리</div>
        <p class="section-description">
          시스템 사용자를 관리합니다. 사용자를 삭제하면 해당 사용자는 더 이상 로그인할 수 없습니다.
        </p>
      </div>
      <div class="header-actions">
        <a-button
          @click="handleRefresh"
          :loading="userManagement.refreshing"
          title="새로고침"
          class="refresh-btn lucide-icon-btn"
        >
          <template #icon>
            <RefreshCw :size="16" :class="{ spin: userManagement.refreshing }" />
          </template>
        </a-button>
        <a-button type="primary" @click="showAddUserModal" class="add-btn lucide-icon-btn">
          <template #icon><Plus :size="16" /></template>
          사용자 추가
        </a-button>
      </div>
    </div>

    <div class="filter-section">
      <a-input
        v-model:value="userManagement.searchKeyword"
        class="search-input"
        placeholder="사용자명 / ID / 휴대폰 번호 검색"
        allow-clear
      >
        <template #prefix><Search :size="16" /></template>
      </a-input>
      <div class="filter-actions">
        <a-select v-model:value="userManagement.departmentFilter" class="filter-select">
          <a-select-option value="">모든 부서</a-select-option>
          <a-select-option
            v-for="dept in departmentFilterOptions"
            :key="dept.value"
            :value="dept.value"
          >
            {{ dept.label }}
          </a-select-option>
        </a-select>
        <a-select v-model:value="userManagement.roleFilter" class="filter-select">
          <a-select-option value="">모든 권한</a-select-option>
          <a-select-option value="superadmin">최고 관리자</a-select-option>
          <a-select-option value="admin">관리자</a-select-option>
          <a-select-option value="user">일반 사용자</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-section">
      <a-spin :spinning="userManagement.loading">
        <div v-if="userManagement.error" class="error-message">
          <a-alert type="error" :message="userManagement.error" show-icon />
        </div>

        <div class="cards-container">
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <a-empty
              :description="userManagement.users.length === 0 ? '사용자 데이터가 없습니다' : '일치하는 사용자가 없습니다'"
            />
          </div>
          <div v-else class="user-cards-grid">
            <InfoCard
              v-for="user in paginatedUsers"
              :key="user.id"
              :title="user.username"
              :subtitle="`ID: ${user.uid || '-'}`"
              class="user-card"
            >
              <template #icon>
                <FallbackAvatar
                  :src="user.avatar"
                  :default-src="getUserDefaultAvatarSrc(user)"
                  :name="user.username"
                  :seed="user.uid || user.username"
                  kind="user"
                  :size="40"
                  shape="circle"
                  :alt="user.username"
                  class="avatar-img"
                />
              </template>

              <template #status>
                <div
                  v-if="user.role === 'admin' || user.role === 'superadmin' || user.department_name"
                  class="role-dept-badge"
                >
                  <span class="role-icon-wrapper" :class="getRoleClass(user.role)">
                    <UserLock v-if="user.role === 'superadmin'" :size="14" />
                    <UserStar v-else-if="user.role === 'admin'" :size="14" />
                    <User v-else :size="14" />
                  </span>
                  <span v-if="user.department_name" class="dept-text">
                    {{ user.department_name }}
                  </span>
                </div>
              </template>

              <template #card-more-action-corner>
                <a-menu>
                  <a-menu-item key="edit" @click.stop="showEditUserModal(user)">
                    <span class="lucide-menu-item">
                      <SquarePen :size="14" />
                      <span>사용자 수정</span>
                    </span>
                  </a-menu-item>
                  <a-menu-item
                    key="delete"
                    :disabled="isUserDeleteDisabled(user)"
                    :danger="!isUserDeleteDisabled(user)"
                    @click.stop="confirmDeleteUser(user)"
                  >
                    <span class="lucide-menu-item">
                      <Trash2 :size="14" />
                      <span>사용자 삭제</span>
                    </span>
                  </a-menu-item>
                </a-menu>
              </template>

              <template #info>
                <div class="card-content">
                  <div class="info-item">
                    <span class="info-label">휴대폰 번호:</span>
                    <span class="info-value phone-text">{{ user.phone_number || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">생성 시간:</span>
                    <span class="info-value time-text">{{ formatTime(user.created_at) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">최근 로그인:</span>
                    <span class="info-value time-text">{{ formatTime(user.last_login) }}</span>
                  </div>
                </div>
              </template>
            </InfoCard>
          </div>
          <div v-if="filteredUsers.length > userManagement.pageSize" class="pagination-section">
            <a-pagination
              v-model:current="userManagement.currentPage"
              v-model:page-size="userManagement.pageSize"
              :total="filteredUsers.length"
              :page-size-options="['20', '50', '100']"
              show-size-changer
              size="small"
            />
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 用户表单模态框 -->
    <a-modal
      v-model:open="userManagement.modalVisible"
      :title="userManagement.modalTitle"
      @ok="handleUserFormSubmit"
      :confirmLoading="userManagement.loading"
      @cancel="userManagement.modalVisible = false"
      :maskClosable="false"
      width="480px"
      class="user-modal"
    >
      <a-form layout="vertical" class="user-form">
        <a-form-item label="사용자명" required class="form-item">
          <a-input
            v-model:value="userManagement.form.username"
            placeholder="사용자명을 입력하세요(2~20자)"
            @blur="validateAndGenerateUid"
            :maxlength="20"
          />
          <div v-if="userManagement.form.usernameError" class="error-text">
            {{ userManagement.form.usernameError }}
          </div>
          <div
            v-if="userManagement.form.generatedUid && !userManagement.editMode"
            class="help-text"
          >
            로그인 ID: {{ userManagement.form.generatedUid }} (사용자명을 기반으로 자동 생성됩니다)
          </div>
        </a-form-item>

        <!-- 手机号字段 -->
        <a-form-item label="휴대폰 번호" class="form-item">
          <a-input
            v-model:value="userManagement.form.phoneNumber"
            placeholder="휴대폰 번호 입력(선택 사항, 로그인에 사용 가능)"
            :maxlength="11"
          />
          <div v-if="userManagement.form.phoneError" class="error-text">
            {{ userManagement.form.phoneError }}
          </div>
        </a-form-item>

        <template v-if="userManagement.editMode">
          <div class="password-toggle">
            <a-checkbox v-model:checked="userManagement.displayPasswordFields">
              비밀번호 변경
            </a-checkbox>
          </div>
        </template>

        <template v-if="!userManagement.editMode || userManagement.displayPasswordFields">
          <a-form-item label="비밀번호" required class="form-item">
            <a-input-password
              v-model:value="userManagement.form.password"
              :placeholder="`비밀번호를 입력하세요(최소 ${MIN_PASSWORD_LENGTH}자)`"
              :minlength="MIN_PASSWORD_LENGTH"
            />
          </a-form-item>

          <a-form-item label="비밀번호 확인" required class="form-item">
            <a-input-password
              v-model:value="userManagement.form.confirmPassword"
              placeholder="비밀번호를 다시 입력하세요"
            />
          </a-form-item>
        </template>

        <a-form-item
          v-if="userManagement.editMode && userManagement.form.role === 'superadmin'"
          label="권한"
          class="form-item"
        >
          <a-input value="최고 관리자" disabled />
          <div class="help-text">최고 관리자 계정의 권한은 변경할 수 없습니다</div>
        </a-form-item>
        <a-form-item v-else label="권한" class="form-item">
          <a-select v-model:value="userManagement.form.role">
            <a-select-option value="user">일반 사용자</a-select-option>
            <a-select-option value="admin" v-if="userStore.isSuperAdmin">관리자</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 部门选择器（仅超级管理员可见） -->
        <a-form-item v-if="userStore.isSuperAdmin" label="부서" class="form-item">
          <a-select v-model:value="userManagement.form.departmentId" placeholder="부서를 선택하세요">
            <a-select-option
              v-for="dept in departmentManagement.departments"
              :key="dept.id"
              :value="dept.id"
            >
              {{ dept.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, onMounted, watch, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import { departmentApi } from '@/apis'
import {
  Plus,
  SquarePen,
  Trash2,
  User,
  UserLock,
  UserStar,
  RefreshCw,
  Search
} from 'lucide-vue-next'
import { formatDateTime } from '@/utils/time'
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH } from '@/utils/passwordValidation'
import { generatePixelAvatar } from '@/utils/pixelAvatar'
import FallbackAvatar from '@/components/common/FallbackAvatar.vue'
import InfoCard from '@/components/shared/InfoCard.vue'

const userStore = useUserStore()

// 用户管理相关状态
const userManagement = reactive({
  loading: false,
  refreshing: false,
  users: [],
  searchKeyword: '',
  departmentFilter: '',
  roleFilter: '',
  currentPage: 1,
  pageSize: 50,
  error: null,
  modalVisible: false,
  modalTitle: '사용자 추가',
  editMode: false,
  editUserId: null,
  form: {
    username: '',
    generatedUid: '', // 自动生成的uid
    phoneNumber: '', // 手机号
    password: '',
    confirmPassword: '',
    role: 'user', // 默认角色
    departmentId: null, // 部门ID
    usernameError: '', // 用户名错误信息
    phoneError: '' // 手机号错误信息
  },
  displayPasswordFields: true // 编辑时是否显示密码字段
})

// 部门列表（仅超级管理员使用）
const departmentManagement = reactive({
  departments: []
})

const departmentFilterOptions = computed(() => {
  const options = new Map()

  departmentManagement.departments.forEach((dept) => {
    options.set(String(dept.id), {
      value: String(dept.id),
      label: dept.name
    })
  })

  userManagement.users.forEach((user) => {
    const departmentId = user.department_id
    const departmentName = user.department_name

    if (departmentId == null && !departmentName) return

    const value = String(departmentId ?? departmentName)

    if (!options.has(value)) {
      options.set(value, {
        value,
        label: departmentName || `부서 ${departmentId}`
      })
    }
  })

  return [...options.values()]
})

const filteredUsers = computed(() => {
  const keyword = userManagement.searchKeyword.trim().toLowerCase()

  return userManagement.users.filter((user) => {
    const matchesKeyword =
      !keyword ||
      [user.username, user.uid, user.phone_number].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(keyword)
      )
    const matchesDepartment =
      !userManagement.departmentFilter ||
      String(user.department_id ?? user.department_name ?? '') === userManagement.departmentFilter
    const matchesRole = !userManagement.roleFilter || user.role === userManagement.roleFilter

    return matchesKeyword && matchesDepartment && matchesRole
  })
})

const paginatedUsers = computed(() => {
  const pageSize = Number(userManagement.pageSize)
  const start = (userManagement.currentPage - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})

// 获取部门列表
const fetchDepartments = async () => {
  if (!userStore.isSuperAdmin) return // 普通管理员不需要获取所有部门列表
  try {
    const departments = await departmentApi.getDepartments()
    departmentManagement.departments = departments
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

// 添加验证用户名并生成uid的函数
const validateAndGenerateUid = async () => {
  const username = userManagement.form.username.trim()

  // 清空之前的错误和生成的ID
  userManagement.form.usernameError = ''
  userManagement.form.generatedUid = ''

  if (!username) {
    return
  }

  // 在编辑模式下，不需要重新生成uid
  if (userManagement.editMode) {
    return
  }

  try {
    const result = await userStore.validateUsernameAndGenerateUid(username)
    userManagement.form.generatedUid = result.uid
  } catch (error) {
    userManagement.form.usernameError = error.message || '사용자명 확인에 실패했습니다'
  }
}

// 验证手机号格式
const validatePhoneNumber = (phone) => {
  if (!phone) {
    return true // 手机号可选
  }

  // 中国大陆手机号格式验证
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 监听密码字段显示状态变化
watch(
  () => userManagement.displayPasswordFields,
  (newVal) => {
    // 当取消显示密码字段时，清空密码输入
    if (!newVal) {
      userManagement.form.password = ''
      userManagement.form.confirmPassword = ''
    }
  }
)

// 监听手机号输入变化
watch(
  () => userManagement.form.phoneNumber,
  (newPhone) => {
    userManagement.form.phoneError = ''

    if (newPhone && !validatePhoneNumber(newPhone)) {
      userManagement.form.phoneError = '올바른 휴대폰 번호 형식을 입력하세요'
    }
  }
)

watch(
  () => [userManagement.searchKeyword, userManagement.departmentFilter, userManagement.roleFilter],
  () => {
    userManagement.currentPage = 1
  }
)

watch(
  () => filteredUsers.value.length,
  (total) => {
    const maxPage = Math.max(1, Math.ceil(total / Number(userManagement.pageSize)))
    if (userManagement.currentPage > maxPage) {
      userManagement.currentPage = maxPage
    }
  }
)

// 格式化时间显示
const formatTime = (timeStr) => formatDateTime(timeStr)

const getUserDefaultAvatarSrc = (user) => (user.uid ? generatePixelAvatar(user.uid) : '')

const isUserDeleteDisabled = (user) =>
  user.id === userStore.userId ||
  (user.role === 'superadmin' && userStore.userRole !== 'superadmin')

// 获取用户列表
const fetchUsers = async () => {
  try {
    userManagement.loading = true
    const users = await userStore.getUsers()
    userManagement.users = users
    userManagement.error = null
  } catch (error) {
    console.error('获取用户列表失败:', error)
    userManagement.error = '사용자 목록을 불러오지 못했습니다'
  } finally {
    userManagement.loading = false
  }
}

// 刷新用户和部门信息
const handleRefresh = async () => {
  if (userManagement.refreshing) return
  userManagement.refreshing = true
  try {
    await Promise.all([fetchUsers(), fetchDepartments()])
    message.success('새로고침했습니다')
  } catch (error) {
    console.error('刷新失败:', error)
    message.error('새로고침에 실패했습니다')
  } finally {
    userManagement.refreshing = false
  }
}

// 打开添加用户模态框
const showAddUserModal = () => {
  userManagement.modalTitle = '사용자 추가'
  userManagement.editMode = false
  userManagement.editUserId = null
  userManagement.form = {
    username: '',
    generatedUid: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'user', // 默认角色为普通用户
    departmentId: null,
    usernameError: '',
    phoneError: ''
  }
  userManagement.displayPasswordFields = true
  userManagement.modalVisible = true
}

// 打开编辑用户模态框
const showEditUserModal = (user) => {
  userManagement.modalTitle = '사용자 수정'
  userManagement.editMode = true
  userManagement.editUserId = user.id
  userManagement.form = {
    username: user.username,
    generatedUid: user.uid || '', // 编辑模式显示现有的uid
    phoneNumber: user.phone_number || '',
    password: '',
    confirmPassword: '',
    role: user.role,
    departmentId: user.department_id || null,
    usernameError: '',
    phoneError: ''
  }
  userManagement.displayPasswordFields = false // 默认不显示密码字段
  userManagement.modalVisible = true
}

// 处理用户表单提交
const handleUserFormSubmit = async () => {
  try {
    // 简单验证
    if (!userManagement.form.username.trim()) {
      message.error('사용자명을 입력하세요')
      return
    }

    // 验证用户名长度
    if (
      userManagement.form.username.trim().length < 2 ||
      userManagement.form.username.trim().length > 20
    ) {
      message.error('사용자명은 2~20자여야 합니다')
      return
    }

    // 验证手机号
    if (userManagement.form.phoneNumber && !validatePhoneNumber(userManagement.form.phoneNumber)) {
      message.error('올바른 휴대폰 번호 형식을 입력하세요')
      return
    }

    if (userManagement.displayPasswordFields) {
      if (!userManagement.form.password) {
        message.error('비밀번호를 입력하세요')
        return
      }

      if (!isPasswordLongEnough(userManagement.form.password)) {
        message.error(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자여야 합니다`)
        return
      }

      if (userManagement.form.password !== userManagement.form.confirmPassword) {
        message.error('입력한 비밀번호가 서로 다릅니다')
        return
      }
    }

    userManagement.loading = true

    // 根据模式决定创建还是更新用户
    if (userManagement.editMode) {
      // 创建更新数据对象
      const updateData = {
        username: userManagement.form.username.trim(),
        role: userManagement.form.role
      }

      // 添加手机号字段
      if (userManagement.form.phoneNumber) {
        updateData.phone_number = userManagement.form.phoneNumber
      }

      // 超级管理员可以修改部门
      if (userStore.isSuperAdmin && userManagement.form.departmentId) {
        updateData.department_id = userManagement.form.departmentId
      }

      // 如果显示了密码字段并且填写了密码，才更新密码
      if (userManagement.displayPasswordFields && userManagement.form.password) {
        updateData.password = userManagement.form.password
      }

      await userStore.updateUser(userManagement.editUserId, updateData)
      message.success('사용자 정보를 수정했습니다')
    } else {
      // 创建新用户
      const createData = {
        username: userManagement.form.username.trim(),
        password: userManagement.form.password,
        role: userManagement.form.role
      }

      // 超级管理员可以指定部门
      if (userStore.isSuperAdmin && userManagement.form.departmentId) {
        createData.department_id = userManagement.form.departmentId
      }

      // 添加手机号字段（如果填写了）
      if (userManagement.form.phoneNumber) {
        createData.phone_number = userManagement.form.phoneNumber
      }

      await userStore.createUser(createData)
      message.success('사용자를 추가했습니다')
    }

    // 重新获取用户列表
    await fetchUsers()
    userManagement.modalVisible = false
  } catch (error) {
    console.error('用户操作失败:', error)
    message.error(error.message || '작업에 실패했습니다. 잠시 후 다시 시도하세요')
  } finally {
    userManagement.loading = false
  }
}

// 删除用户
const confirmDeleteUser = (user) => {
  // 自己不能删除自己
  if (user.id === userStore.userId) {
    message.error('자신의 계정은 삭제할 수 없습니다')
    return
  }

  // 确认对话框
  Modal.confirm({
    title: '사용자 삭제 확인',
    content: `사용자 "${user.username}"을(를) 삭제할까요? 삭제 후에는 복구할 수 없습니다.`,
    okText: '삭제',
    okType: 'danger',
    cancelText: '취소',
    async onOk() {
      try {
        userManagement.loading = true
        await userStore.deleteUser(user.id)
        message.success('사용자를 삭제했습니다')
        // 重新获取用户列表
        await fetchUsers()
      } catch (error) {
        console.error('删除用户失败:', error)
        message.error(error.message || '삭제에 실패했습니다. 잠시 후 다시 시도하세요')
      } finally {
        userManagement.loading = false
      }
    }
  })
}

const getRoleClass = (role) => {
  switch (role) {
    case 'superadmin':
      return 'role-superadmin'
    case 'admin':
      return 'role-admin'
    case 'user':
      return 'role-user'
    default:
      return 'role-default'
  }
}

// 在组件挂载时获取用户列表
onMounted(async () => {
  await fetchUsers()
  await fetchDepartments()
})
</script>

<style lang="less" scoped>
.user-management {
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

        :deep(.ant-btn-loading-icon) {
          color: var(--gray-600);
        }
      }
    }
  }

  .filter-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .search-input {
      width: 300px;
      max-width: 100%;

      :deep(.ant-input-prefix) {
        color: var(--gray-500);
        margin-right: 6px;
      }
    }

    .filter-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-left: auto;
    }

    .filter-select {
      width: 150px;
    }
  }

  @media (max-width: 640px) {
    .filter-section {
      align-items: stretch;

      .search-input,
      .filter-actions {
        width: 100%;
      }

      .filter-actions {
        margin-left: 0;
      }

      .filter-select {
        flex: 1;
        min-width: 0;
      }
    }
  }

  .content-section {
    overflow: hidden;

    .error-message {
      padding: 16px 24px;
    }

    .cards-container {
      .empty-state {
        padding: 60px 20px;
        text-align: center;
      }

      .user-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
        // padding: 16px;

        .user-card {
          cursor: default;

          :deep(.info-card-icon) {
            border-radius: 50%;
          }

          :deep(.info-card-body) {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .role-dept-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px 2px 4px;
            background: var(--gray-50);
            border-radius: 4px;

            .role-icon-wrapper {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;

              &.role-superadmin {
                color: var(--color-error-700);
              }
              &.role-admin {
                color: var(--color-info-700);
              }
              &.role-user {
                color: var(--color-success-700);
              }
            }

            .dept-text {
              font-size: 12px;
              color: var(--gray-700);
              font-weight: 500;
            }
          }

          .card-content {
            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 2px 0;
              border-bottom: 1px solid var(--gray-25);

              &:last-child {
                border-bottom: none;
              }

              .info-label {
                font-size: 12px;
                color: var(--gray-600);
                font-weight: 500;
                min-width: 70px;
              }

              .info-value {
                font-size: 12px;
                color: var(--gray-900);
                text-align: right;
                flex: 1;

                &.time-text {
                  color: var(--gray-700);
                }

                &.phone-text {
                  font-family: 'Monaco', 'Consolas', monospace;
                }
              }
            }
          }
        }
      }

      .pagination-section {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
      }
    }
  }

  .time-text {
    font-size: 13px;
    color: var(--gray-700);
  }

  .phone-text,
  .user-id-text {
    font-size: 13px;
    color: var(--gray-900);
    font-family: 'Monaco', 'Consolas', monospace;
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

.user-modal {
  :deep(.ant-modal-header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--gray-150);

    .ant-modal-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--gray-900);
    }
  }

  :deep(.ant-modal-body) {
    padding: 20px 24px 24px;
  }

  .user-form {
    .form-item {
      margin-bottom: 16px;

      :deep(.ant-form-item-label) {
        padding-bottom: 6px;

        label {
          font-weight: 600;
          font-size: 13px;
          color: var(--gray-800);
        }
      }
    }

    .error-text {
      color: var(--color-error-500);
      font-size: 12px;
      margin-top: 4px;
      line-height: 1.3;
    }

    .help-text {
      color: var(--gray-600);
      font-size: 12px;
      margin-top: 4px;
      line-height: 1.3;
    }

    .password-toggle {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--gray-25);
      border-radius: 8px;
      border: 1px solid var(--gray-100);

      :deep(.ant-checkbox-wrapper) {
        font-weight: 500;
        color: var(--gray-700);
        font-size: 13px;
      }
    }
  }
}
</style>
