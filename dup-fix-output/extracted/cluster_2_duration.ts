// AUTO-EXTRACTED: cluster_2
// Review before merging.

,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        export const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/addresses/verify', duration, 500, true);
        logError('Failed to verify address'
