<template>
  <n-config-provider :theme="darkTheme">
    <n-notification-provider>
      <Home />
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import Home from './views/home/index.vue'
import { NNotificationProvider, darkTheme } from 'naive-ui'
</script>

<style scoped lang="scss">

</style>