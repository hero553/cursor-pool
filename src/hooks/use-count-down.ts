import { ref, watchEffect, type WatchStopHandle, onUnmounted } from 'vue';

export const useCountdown = ({
    seconds = 60,
    isRepeat = true,
    onUnmountedStop = true,
    callback,
}: {
    /** 倒计时秒数，默认为60秒 */
    seconds?: number;
    /** 是否重复倒计时，默认为true */
    isRepeat?: boolean;
    /** 是否在onUnmounted时停止倒计时，默认为true */
    onUnmountedStop?: boolean;
    callback: () => void;
}) => {
    if (seconds <= 0) {
        throw new Error('倒计时时间（seconds）必须大于0');
    }
    const remainSecondsState = ref<number>();
    let stopTimerQueryHandle: WatchStopHandle | undefined;

    const stop = () => {
        if (stopTimerQueryHandle) {
            stopTimerQueryHandle();
        }
    };
    const start = () => {
        remainSecondsState.value = seconds;

        /** 开始前先停止 */
        stop();

        stopTimerQueryHandle = watchEffect((onInvalidate) => {
            const timer = setInterval(() => {
                if (remainSecondsState.value === 1) {
                    callback();
                    if (isRepeat) {
                        remainSecondsState.value = seconds;
                    } else {
                        remainSecondsState.value = undefined;
                        stop();
                    }
                } else {
                    remainSecondsState.value = remainSecondsState.value! - 1;
                }
            }, 1000);
            onInvalidate(() => {
                clearInterval(timer);
            });
        });
    };

    if (onUnmountedStop) {
        onUnmounted(() => {
            stop();
        });
    }

    return {
        remainSecondsState,
        start,
        stop,
    };
};
