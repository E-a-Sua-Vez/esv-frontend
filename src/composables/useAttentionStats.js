import { computed, ref } from 'vue';

/**
 * Composable to calculate attention statistics
 * Reusable across different attention pages
 */
export function useAttentionStats(attention, queue, statsUpdateTrigger) {
  const attentionStats = computed(() => {
    // Use trigger to force recomputation
    const _ = statsUpdateTrigger?.value || 0;

    // Define now at the top to ensure it's always available
    const now = new Date();

    if (!attention.value || !attention.value.id) {
      return null;
    }

    const createdDate = attention.value.createdDate || attention.value.createdAt;
    if (!createdDate) {
      return null;
    }

    let created;
    if (createdDate instanceof Date) {
      created = createdDate;
    } else if (createdDate.toDate && typeof createdDate.toDate === 'function') {
      created = createdDate.toDate();
    } else if (createdDate.seconds) {
      created = new Date(createdDate.seconds * 1000);
    } else {
      created = new Date(createdDate);
    }

    // For PROCESSING attentions, calculate waiting time from creation to processedAt
    // For other statuses, calculate from creation to now
    let endTime = now;
    const isProcessing =
      attention.value.status === 'PROCESSING' ||
      (typeof attention.value.status === 'string' &&
        attention.value.status.toUpperCase() === 'PROCESSING');

    if (isProcessing && attention.value.processedAt) {
      const processedDate = attention.value.processedAt;
      try {
        let parsedProcessed;
        if (processedDate instanceof Date) {
          parsedProcessed = processedDate;
        } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
          parsedProcessed = processedDate.toDate();
        } else if (processedDate.seconds !== undefined) {
          parsedProcessed = new Date(processedDate.seconds * 1000);
        } else if (processedDate._seconds !== undefined) {
          parsedProcessed = new Date(processedDate._seconds * 1000);
        } else if (typeof processedDate === 'string') {
          parsedProcessed = new Date(processedDate);
        } else {
          parsedProcessed = new Date(processedDate);
        }

        if (!isNaN(parsedProcessed.getTime())) {
          endTime = parsedProcessed;
        } else {
          endTime = now;
        }
      } catch (error) {
        endTime = now; // Fallback to now if parsing fails
      }
    }

    const diffMs = endTime - created;
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    let elapsedDisplay = '';
    if (minutes < 60) {
      elapsedDisplay = `${minutes} min`;
    } else if (hours < 24) {
      elapsedDisplay = `${hours}h ${minutes % 60}min`;
    } else {
      const days = Math.floor(hours / 24);
      elapsedDisplay = `${days}d ${hours % 24}h`;
    }

    const creationTime = created.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const creationDate = created.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });

    let timeStatus = 'neutral';
    let timeColor = '#a9a9a9';
    if (minutes < 10) {
      timeStatus = 'excellent';
      timeColor = '#00c2cb';
    } else if (minutes < 60) {
      timeStatus = 'good';
      timeColor = '#f9c322';
    } else if (minutes < 180) {
      timeStatus = 'warning';
      timeColor = '#ff9800';
    } else {
      timeStatus = 'poor';
      timeColor = '#a52a2a';
    }

    // Calculate processing time if attention is PROCESSING
    let processingTime = null;
    let processingDisplay = '';
    let processingMinutes = 0;
    let expectedDuration = null; // in minutes
    let durationComparison = null; // percentage elapsed
    let durationStatus = 'neutral';
    let durationColor = '#a9a9a9';
    let minutesRemaining = null;

    if (attention.value.status === 'PROCESSING' && attention.value.processedAt) {
      let processed;
      const processedDate = attention.value.processedAt;
      try {
        if (processedDate instanceof Date) {
          processed = processedDate;
        } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
          processed = processedDate.toDate();
        } else if (processedDate.seconds !== undefined) {
          processed = new Date(processedDate.seconds * 1000);
        } else if (processedDate._seconds !== undefined) {
          processed = new Date(processedDate._seconds * 1000);
        } else if (typeof processedDate === 'string') {
          processed = new Date(processedDate);
        } else {
          processed = new Date(processedDate);
        }

        if (!isNaN(processed.getTime())) {
          const processingDiffMs = now - processed;
          processingMinutes = Math.floor(processingDiffMs / (1000 * 60));
          const processingHours = Math.floor(processingMinutes / 60);

          if (processingMinutes < 60) {
            processingDisplay = `${processingMinutes} min`;
          } else if (processingHours < 24) {
            processingDisplay = `${processingHours}h ${processingMinutes % 60}min`;
          } else {
            const days = Math.floor(processingHours / 24);
            processingDisplay = `${days}d ${processingHours % 24}h`;
          }
          processingTime = processingDisplay;

          // Calculate expected duration from services, booking, or queue estimated duration (in that order)
          // Check servicesDetails first
          if (
            attention.value.servicesDetails &&
            Array.isArray(attention.value.servicesDetails) &&
            attention.value.servicesDetails.length > 0
          ) {
            expectedDuration = attention.value.servicesDetails.reduce((total, service) => {
              if (service && service.serviceInfo) {
                return (
                  total + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime || 0)
                );
              }
              return total;
            }, 0);
          }
          // If no duration from services, use queue estimated duration as fallback
          if (!expectedDuration || expectedDuration === 0) {
            if (queue?.value?.estimatedDuration && queue.value.estimatedDuration > 0) {
              expectedDuration = queue.value.estimatedDuration;
            }
          }

          // If we have expected duration, calculate comparison
          if (expectedDuration && expectedDuration > 0) {
            durationComparison = (processingMinutes / expectedDuration) * 100;
            minutesRemaining = expectedDuration - processingMinutes;

            // Color coding based on percentage
            if (durationComparison < 70) {
              durationStatus = 'excellent';
              durationColor = '#28a745'; // Green
            } else if (durationComparison < 90) {
              durationStatus = 'good';
              durationColor = '#f9c322'; // Yellow
            } else if (durationComparison < 100) {
              durationStatus = 'warning';
              durationColor = '#ff9800'; // Orange
            } else {
              durationStatus = 'poor';
              durationColor = '#a52a2a'; // Red
            }
          }
        }
      } catch (error) {
        console.error('Error calculating processing time:', error);
      }
    }

    return {
      creationTime,
      creationDate,
      elapsedTime: elapsedDisplay,
      elapsedMinutes: minutes,
      timeStatus,
      timeColor,
      processingTime,
      processingMinutes,
      expectedDuration,
      durationComparison,
      durationStatus,
      durationColor,
      minutesRemaining,
    };
  });

  return {
    attentionStats,
  };
}
