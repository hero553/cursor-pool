const STORAGE_KEY = 'cursor_api_key'

// 存储 API Key
export function saveApiKey(apiKey: string) {
  try {
    localStorage.setItem(STORAGE_KEY, apiKey)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 获取 API Key
export function getApiKey() {
  try {
    const apiKey = localStorage.getItem(STORAGE_KEY)
    return { success: true, data: apiKey }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 删除 API Key
export function removeApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
} 