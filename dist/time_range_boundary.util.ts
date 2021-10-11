export function createEpochTimeRangeBoundary(time: number) {
    return {
        type: 'EpochTimeRangeBoundary',
        epochMillis: time,
    };
}
