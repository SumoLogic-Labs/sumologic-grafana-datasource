export function createEpochTimeRangeBoundary(time: number) {
  return {
    type: 'EpochTimeRangeBoundary',
    epochMillis: time,
  };
}

const durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;

export function calculateInterval(interval: string) {
  const matchResult = interval.match(durationSplitRegexp);
  if (!matchResult) {
    throw new Error(`Unsupported "${interval}" interval has been provided`);
  }
  const [, amountStr, unit] = matchResult;
  const amount = parseInt(amountStr, 10);
  let durationInSeconds = amount;
  switch (unit) {
    case 'ms':
      durationInSeconds = amount / 1000;
      break;
    case 's':
      // just skip as we init with seconds
      break;
    case 'm':
      durationInSeconds = amount * 60;
      break;
    case 'h':
      durationInSeconds = amount * 60 * 60;
      break;
    case 'd':
      durationInSeconds = amount * 24 * 60 * 60;
      break;
    case 'w':
      durationInSeconds = amount * 7 * 24 * 60 * 60;
      break;
    case 'M':
      durationInSeconds = amount * 30 * 24 * 60 * 60;
      break;
    case 'Y':
      durationInSeconds = amount * 365 * 24 * 60 * 60;
      break;
  }

  if (durationInSeconds < 1) {
    durationInSeconds = 1;
  }

  return Math.ceil(durationInSeconds);
}
