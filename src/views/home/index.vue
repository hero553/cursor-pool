<template>
  <n-space vertical size="large" style="width: 100%; max-width: 520px; margin: 32px auto;">
    <!-- 顶部提示 -->
    <n-alert type="info" style="margin-top: 12px; border-radius: 10px;">
      历史账号被限制后，可切换到新账号继续用。
    </n-alert>

    <!-- 标题 -->
    <div class="main-title">Cursor Professional</div>

    <!-- API Key 验证 -->
    <n-card class="main-card">
      <n-space align="center" justify="center">
        <n-input v-model:value="apiKeyState" style="width: 320px;" placeholder="请输入API Key" />
        <n-button type="primary" @click="onVerify">验证</n-button>
        <n-button type="error" @click="clearApiKeyFromStorage" :disabled="!apiKeyState">清除</n-button>
      </n-space>
    </n-card>

    <!-- 账号统计 -->
    <n-card class="main-card" style="margin-top: 16px;">
      <n-grid :cols="3" x-gap="16" y-gap="8" style="text-align: center;">
        <n-gi>
          <n-statistic label="过期时间">
              <n-text :type="statusTextState === '有效' ? 'success' : 'error'" style="font-size: 14px;">
                {{ expiredAtTextState }}
              </n-text>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="剩余天数">
              <n-text :type="statusTextState === '有效' ? 'success' : 'error'" style="font-size: 14px;">
                {{ remainDaysState }}天
              </n-text>
          </n-statistic>
        </n-gi>
        <n-gi>
          <n-statistic label="状态">
              <n-text :type="statusTextState === '有效' ? 'success' : 'error'" style="font-size: 14px;">
                {{ statusTextState }}
              </n-text>
          </n-statistic>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 当前账号信息 -->
    <n-card class="main-card" style="margin-top: 16px;">
      <n-space vertical>
        <div>
          <n-text depth="3">当前cursor账号：</n-text>
          <n-tag type="info" size="small" style="margin-left: 8px;">PRO TRIAL</n-tag>
        </div>
        <div>
          <n-text style="font-size: 14px; font-weight: 600;">{{ currentEmailState }}</n-text>
        </div>
        <n-alert type="info" style="margin-top: 8px;" show-icon>
          官网已取消次数计费，改为用量计费。如果出现
          <n-text type="warning">You've hit your free requests limit</n-text>
          的提示，请切换新账号，且可在侧边栏来回切换。现机制：claude限制后换到gemini还能用
        </n-alert>
      </n-space>
    </n-card>

    <!-- 底部按钮 -->
      <!-- 重置cursor -->
      <n-button type="info" size="large" block  @click="onResetCursor" :loading="resetLoadingState" :disabled="statusTextState === '已过期'" style="margin: 10px 0;">
        重置cursor
      </n-button>

    <!-- 切换账号 -->
    <n-button type="primary" size="large" block @click="onSwitchAccount" :disabled="statusTextState === '已过期'">
      切换账号
    </n-button>
  </n-space>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { NButton, NInput, NAlert, NGrid, NGi, NSpace, NStatistic, NText, NTag, NProgress, NCard } from 'naive-ui'
import { getApiKeyByKey, getAccountsByApiKey } from '@/api/api-key'
import { saveApiKey, getApiKey, removeApiKey } from '@/api/storage'
import { useCountdown } from '../../hooks'
import dayjs from 'dayjs'
import { useNotification } from 'naive-ui'
const notification = useNotification()

const apiKeyState = ref('')
const currentEmailState = ref('')
const accountsState = ref([])
const currentAccountIndex = ref(0)

// 账号信息展示
const remainDaysState = ref(0)
const statusTextState = ref('')
const expiredAtTextState = ref('')

// 从 storage 获取 API Key
const loadApiKeyFromStorage = async () => {
  try {
    const result = await getApiKey()
    if (result.success && result.data) {
      apiKeyState.value = result.data
      // 如果有 API Key，自动验证
      await getApiKeyService()
    }
  } catch (error) {
    console.error('获取存储的 API Key 失败:', error)
  }
}

// 保存 API Key 到 storage
const saveApiKeyToStorage = async (apiKey) => {
  try {
    await saveApiKey(apiKey)
  } catch (error) {
    console.error('保存 API Key 失败:', error)
  }
}

// 删除存储的 API Key
const clearApiKeyFromStorage = async () => {
  try {
    await removeApiKey()
    apiKeyState.value = ''
    accountsState.value = []
    currentEmailState.value = ''
    remainDaysState.value = 0
    statusTextState.value = '-'
    expiredAtTextState.value = '-'
    notification.success({
      duration:2000,
      content: 'API Key 已清除',
      closable: true,
    })
  } catch (error) {
    console.error('清除 API Key 失败:', error)
  }
}

// 获取账号信息
const getApiKeyService = async () => {
  try {
    // 1. 先获取 API Key 基本信息
    const apiKeyInfo = await getApiKeyByKey(apiKeyState.value)
    console.log('API Key 信息:', apiKeyInfo.data)
    
    // 使用 API Key 信息计算过期时间、剩余天数、状态
    const apiKeyData = apiKeyInfo.data
    setApiKeyInfo(apiKeyData)
    
    // 2. 再获取账号列表
    const accountsInfo = await getAccountsByApiKey(apiKeyState.value)
    console.log('账号列表:', accountsInfo.data)
    
    accountsState.value = accountsInfo.data.accounts || []
    if (accountsState.value.length > 0) {
      currentAccountIndex.value = 0
      setCurrentAccount(accountsState.value[0])
      notification.success({
        duration:2000,
        content: 'API Key 验证成功',
        closable: true,
      })
    } else {
      currentEmailState.value = ''
      notification.warning({
        duration:2000,
        content: '未找到可用账号',
        closable: true,
      })
    }
  } catch (e) {
    console.error('API 调用失败:', e)
    accountsState.value = []
    currentEmailState.value = ''
    remainDaysState.value = 0
    statusTextState.value = '-'
    expiredAtTextState.value = '-'
    notification.error({
      duration:2000,
      content: e.message,  
      closable: true,
    })

    notification.error({
      duration:2000,
      content: 'API Key 验证失败',  
      closable: true,
    })

  }
}

// 设置 API Key 信息（过期时间、剩余天数、状态）
function setApiKeyInfo(apiKeyData) {
  expiredAtTextState.value = dayjs(apiKeyData.expiredAt).format('YYYY-MM-DD HH:mm')
  const now = new Date()
  const expired = new Date(apiKeyData.expiredAt)
  const diff = expired - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  remainDaysState.value = days > 0 ? days : 0
  statusTextState.value = expired > now ? '有效' : '已过期'
}

// 设置当前账号信息（只设置邮箱）
function setCurrentAccount(account) {
  currentEmailState.value = account.username
}

// 切换账号
function onSwitchAccount() {
  if(!apiKeyState.value?.trim()) {
    notification.warning({
      duration:2000,
      content: '请输入API Key', 
      closable: true,
    })
    return
  }
  if (statusTextState.value === '已过期') {
    notification.warning({
      duration:2000,
      content: 'API Key 已过期，无法切换账号',  
      closable: true,
    })
    return
  }
  if (accountsState.value.length <= 1) {
    notification.warning({
      duration:2000,
      content: '无法切换，请购买新额度帐号',
      closable: true,
    })
    return
  }
  let nextIndex = currentAccountIndex.value + 1
  if (nextIndex >= accountsState.value.length) {
    nextIndex = 0
  }
  // 如果下一个账号和当前账号一样，再往后找
  if (accountsState.value[nextIndex].username === currentEmailState.value) {
    nextIndex = (nextIndex + 1) % accountsState.value.length
  }
  currentAccountIndex.value = nextIndex
  setCurrentAccount(accountsState.value[nextIndex])
  
  // 调用 Electron 切换账户
  switchAccountInElectron(accountsState.value[nextIndex])
}

// 调用 Electron 切换账户
const switchAccountInElectron = async (account) => {
  try {
    const response = await window.ipcRenderer.invoke('switch-account', {
      token: account.token,
      email: account.username,
      password: account.password
    })
    
    if (response.success) {
      notification.success({
        duration:2000,
        content: response.message || '账户切换成功',
        closable: true,
      })
    } else {
      notification.error({
        duration:2000,
        content: response.message || '账户切换失败',
        closable: true,
      })
    }
  } catch (error) {
    console.error('切换账户失败:', error)
    notification.error({
      duration:2000,
      content: '切换账户失败: ' + (error.message || '未知错误'),
      closable: true,
    })
  }
}

function onVerify() {
  if(!apiKeyState.value?.trim()) {
    notification.warning({
      duration:2000,
      content: '请输入API Key',
      closable: true,
    })
    return
  }
  // 保存到 storage 并验证
  saveApiKeyToStorage(apiKeyState.value)
  getApiKeyService()
}

// 页面加载时从 storage 获取 API Key
onMounted(() => {
  loadApiKeyFromStorage()
})

const { start } = useCountdown({
  seconds: 5 * 60,
  callback: () => {
    if (apiKeyState.value) {
      getApiKeyService()
    }
  }
})
start()

/** 重置cursor */
const resetLoadingState = ref(false);
/** 重置cursor结果 */
const resetResultState = ref(null);

const onResetCursor = async () => {
  if(!apiKeyState.value?.trim()) {
    notification.warning({
      duration:2000,
      content: '请输入API Key',
      closable: true,
    })
    return
  }
  if (statusTextState.value === '已过期') {
    notification.warning({
      duration:2000,
      content: 'API Key 已过期，无法重置cursor',
      closable: true,
    })
    return
  }
  resetLoadingState.value = true;
  try {
    const response = await window.ipcRenderer.invoke('reset-cursor');
    resetResultState.value = response;
    if (response.success) {
      console.log('重置成功:', response.data);
      notification.success({
        duration:2000,
        content: '重置成功',
      })
    } else {
      console.error('重置失败:', response.error);
      notification.error({
        duration:2000,
        content: response.error,
        closable: true,
      })
    }
  } catch (error) {
    console.error('调用失败:', error);
    notification.error({
      duration:2000,
      content: error.message,
      closable: true,
    })
  } finally {
    resetLoadingState.value = false;
  }
}
</script>

<style scoped>
.main-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin: 24px 0 0 0;
  letter-spacing: 1px;
}

.main-card {
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.07);
  background: #fff;
  padding: 18px 20px 10px 20px;
}
</style>