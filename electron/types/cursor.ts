/** 获取cursor的id */
export interface CursorIds {
  /** 设备id */
  'telemetry.devDeviceId': string;
  /** mac机器id */
  'telemetry.macMachineId': string;
  /** 机器id */
  'telemetry.machineId': string;
  /** sqm id */
  'telemetry.sqmId': string;
  /** 存储服务机器id */
  'storage.serviceMachineId': string;
}

/** 获取cursor的配置 */
export interface CursorConfig {
  /** 存储路径 */
  storagePath: string;
  /** sqlite路径 */
  sqlitePath: string;
  /** 机器id路径 */
  machineIdPath: string;
  /** workbenchJs路径 */
  workbenchJsPath: string;
  /** cursor路径 */
  cursorPath: string;
}

/** 重置cursor */
export interface ResetResult {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: CursorIds;
  /** 错误 */
  error?: string;
}

/** 备份cursor */
export interface BackupInfo {
  /** 原始路径 */
  originalPath: string;
  /** 备份路径 */
  backupPath: string;
  /** 时间戳 */
  timestamp: Date;
}