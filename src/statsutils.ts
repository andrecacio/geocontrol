export const calculateStats = (values: number[]) => {

  if (!values.length) {
    return {
      mean: 0,
      variance: 0,
      upperThreshold: 0,
      lowerThreshold: 0
    };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return {
    mean,
    variance,
    upperThreshold: mean + 2 * std,
    lowerThreshold: mean - 2 * std
  };
};

export const mapOutliers = (
  measurements: { value: number; createdAt: Date }[],
  lower: number,
  upper: number
) => {
  return measurements.map(({ createdAt, value }) => ({
    createdAt,
    value,
    isOutlier: value < lower || value > upper
  }));
};

export const extractOnlyOutliers = (
  measurements: { value: number; createdAt: Date; isOutlier: boolean }[]
) => {
  return measurements.filter(({ isOutlier }) => isOutlier);
}
