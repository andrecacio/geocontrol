import { calculateStats, mapOutliers, extractOnlyOutliers } from "../../../src/statsutils";

describe("statsutils", () => {
    it("calculateStats calcola media, varianza e limiti coerenti", () => {
      const vals = [1, 1, 1, 100];
      const { mean, variance, upperThreshold, lowerThreshold } = calculateStats(vals);
  
      expect(mean).toBeGreaterThan(lowerThreshold);
      expect(mean).toBeLessThan(upperThreshold);
      expect(variance).toBeGreaterThan(0);
    });
  
    it("mapOutliers marca correttamente gli outlier con limiti fissi", () => {
      // Scegliamo noi i limiti 5–15 per avere 2 outlier evidenti.
      const data = [
        { value: 2, createdAt: new Date() },   // outlier basso
        { value: 10, createdAt: new Date() },  // dentro limiti
        { value: 20, createdAt: new Date() },  // outlier alto
      ];
      const mapped = mapOutliers(data, 5, 15);
      const flags  = mapped.map(m => m.isOutlier);
      expect(flags).toEqual([true, false, true]);
    });
  
    it("extractOnlyOutliers filtra solo i true", () => {
      const arr = [
        { value: 2,  createdAt: new Date(), isOutlier: true },
        { value: 10, createdAt: new Date(), isOutlier: false },
      ];
      const out = extractOnlyOutliers(arr);
      expect(out).toHaveLength(1);
      expect(out[0].value).toBe(2);
    });
    
    it("calculateStats gestisce array vuoto", () => {
        const s = calculateStats([]);
        expect(s.mean).toBe(0);
        expect(s.upperThreshold).toBe(0);
      });
  });
  