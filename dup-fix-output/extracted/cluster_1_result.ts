// AUTO-EXTRACTED: cluster_1
// Review before merging.

${args.tracking_code} in ${duration}ms`);
        export const result = {
          ...trackingInfo,
          processing_time_ms: duration,
        };
        return JSON.stringify(result, null, 2);
      } catch (error: any) {
        const duration = Date.now() - startTime;
        monitoring.recordApiCall('easypost', '/trackers/package'
