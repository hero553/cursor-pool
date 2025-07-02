class Time {
  /**
   * 睡眠
   * @param ms 睡眠时间，单位：秒
   * @returns 
   */
  static sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
  }
}

export { Time };