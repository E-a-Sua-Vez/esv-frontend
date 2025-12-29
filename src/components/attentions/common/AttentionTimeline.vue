<template>
  <div
    v-if="attention && (attention.id || attention.attentionId)"
    class="timeline-card-collapsable"
  >
    <div
      class="timeline-card-header"
      :class="{ 'timeline-card-header-clickable': isCollapsedProp === undefined }"
      @click="isCollapsedProp === undefined ? toggleCollapse() : null"
    >
      <div class="timeline-header-content">
        <div class="timeline-header-icon">
          <i class="bi bi-clock-history"></i>
        </div>
        <div class="timeline-header-title">
          {{ $t('attentionStats.timeline') || 'Linha do Tempo da Atenção' }}
        </div>
      </div>
      <div class="timeline-header-arrow">
        <i class="bi" :class="isCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
      </div>
    </div>
    <div v-show="!isCollapsed" class="timeline-card-body">
      <div v-if="!timeline || timeline.length === 0" class="timeline-empty">
        <i class="bi bi-info-circle"></i>
        <span>{{
          $t('attentionStats.timeline.noData') || 'No hay datos de línea de tiempo disponibles'
        }}</span>
      </div>
      <div v-else class="timeline-container">
        <div
          v-for="(item, index) in timeline"
          :key="index"
          class="timeline-item"
          :class="{
            'timeline-item-completed': item.status === 'completed',
            'timeline-item-pending': item.status === 'pending',
            'timeline-item-not-applicable': item.status === 'not-applicable',
            'timeline-item-cancelled': item.status === 'cancelled',
            'timeline-item-skipped': item.status === 'skipped',
          }"
        >
          <div class="timeline-marker">
            <div
              class="timeline-marker-icon"
              :class="{
                'icon-completed': item.status === 'completed',
                'icon-pending': item.status === 'pending',
                'icon-not-applicable': item.status === 'not-applicable',
                'icon-cancelled': item.status === 'cancelled',
                'icon-skipped': item.status === 'skipped',
              }"
            >
              <i :class="item.icon"></i>
            </div>
            <div v-if="index < timeline.length - 1" class="timeline-connector"></div>
          </div>
          <div class="timeline-content">
            <div class="timeline-label-wrapper">
              <div class="timeline-label">{{ item.label }}</div>
            </div>
            <div v-if="item.status === 'not-applicable'" class="timeline-not-applicable">
              {{ $t('attentionStats.notApplicable') || 'No aplica' }}
            </div>
            <template v-else-if="item.status === 'cancelled' || item.status === 'skipped'">
              <div class="timeline-details-row">
                <div v-if="item.date || item.time" class="timeline-datetime-group">
                  <div v-if="item.date" class="timeline-date">
                    <i class="bi bi-calendar3"></i>
                    <span>{{ item.date }}</span>
                  </div>
                  <div v-if="item.time" class="timeline-time">
                    <i class="bi bi-clock"></i>
                    <span>{{ item.time }}</span>
                  </div>
                </div>
                <div class="timeline-status-badge" :class="`badge-${item.status}`">
                  {{ item.statusLabel }}
                </div>
              </div>
            </template>
            <template v-else>
              <div class="timeline-details-row">
                <div v-if="item.date || item.time" class="timeline-datetime-group">
                  <div v-if="item.date" class="timeline-date">
                    <i class="bi bi-calendar3"></i>
                    <span>{{ item.date }}</span>
                  </div>
                  <div v-if="item.time" class="timeline-time">
                    <i class="bi bi-clock"></i>
                    <span>{{ item.time }}</span>
                  </div>
                </div>
                <div
                  class="timeline-collaborator"
                  :class="{ 'timeline-collaborator-empty': !item.collaborator }"
                >
                  <i class="bi bi-person-badge"></i>
                  <span>{{ item.collaborator || 'N/A' }}</span>
                </div>
                <div
                  class="timeline-duration"
                  :class="{
                    'timeline-duration-empty':
                      item.duration === null || item.duration === undefined,
                  }"
                >
                  <i class="bi bi-hourglass-split"></i>
                  <span>{{
                    item.duration !== null && item.duration !== undefined
                      ? `${Math.round(item.duration)} min`
                      : 'N/A'
                  }}</span>
                </div>
                <div
                  v-if="item.status === 'pending' && !item.date && !item.statusLabel"
                  class="timeline-pending"
                >
                  {{ $t('attentionStats.pending') || 'Pendente' }}
                </div>
                <div
                  v-if="item.statusLabel"
                  class="timeline-status-badge"
                  :class="[`badge-${item.status}`, { 'badge-system': item.isSystemTerminated }]"
                >
                  {{ item.statusLabel }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { getActiveFeature } from '../../../shared/features';

/**
 * AttentionTimeline Component
 *
 * Props:
 * @param {Object} attention - Attention object with:
 *   - id: string (required)
 *   - status: string (PENDING, PROCESSING, TERMINATED, CANCELLED, SKIPED, USER_CANCELLED, RATED, etc.)
 *   - currentStage: string (optional, when stages enabled: CHECK_IN, PRE_CONSULTATION, CONSULTATION, POST_CONSULTATION, CHECKOUT, TERMINATED)
 *   - stageHistory: Array (optional, when stages enabled)
 *   - createdAt: Date
 *   - processedAt: Date (optional)
 *   - endAt: Date (optional)
 *   - ratedAt: Date (optional)
 *   - cancelled: boolean (optional)
 *   - cancelledAt: Date (optional)
 *   - bookingId: string (optional)
 *   - surveyId: string (optional)
 *
 * @param {Object} booking - Booking object (optional, required if attention.bookingId exists):
 *   - date: Date
 *   - createdAt: Date
 *
 * @param {Object} commerce - Commerce object (optional, for feature flags):
 *   - features: Array (optional)
 *
 * @param {Object} collaboratorsMap - Map of collaboratorId -> collaborator name (optional):
 *   - Used to display collaborator names for each stage
 *   - Format: { 'collaboratorId1': 'Name 1', 'collaboratorId2': 'Name 2' }
 */
export default {
  name: 'AttentionTimeline',
  props: {
    attention: {
      type: Object,
      required: true,
      validator: value => value && (value.id || value.attentionId),
    },
    booking: {
      type: Object,
      default: null,
    },
    commerce: {
      type: Object,
      default: null,
    },
    collaboratorsMap: {
      type: Object,
      default: () => ({}),
    },
    isCollapsed: {
      type: Boolean,
      default: undefined,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const internalCollapsed = ref(true);

    // Use prop if provided, otherwise use internal state
    const isCollapsed = computed(() =>
      props.isCollapsed !== undefined ? props.isCollapsed : internalCollapsed.value
    );

    const toggleCollapse = () => {
      // Only toggle if not controlled by prop
      if (props.isCollapsed === undefined) {
        internalCollapsed.value = !internalCollapsed.value;
      }
    };

    // Helper function to format date and time
    const formatDateTime = dateValue => {
      if (!dateValue) return { date: null, time: null };

      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } else if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      } else {
        date = new Date(dateValue);
      }

      if (isNaN(date.getTime())) return { date: null, time: null };

      return {
        date: date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        time: date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    };

    // Helper to convert date to Date object
    const toDate = dateValue => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
      if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
      return new Date(dateValue);
    };

    // Helper to calculate duration in minutes from enteredAt and exitedAt
    const calculateDuration = (enteredAt, exitedAt) => {
      if (!enteredAt) return null;

      const entered = toDate(enteredAt);
      const exited = exitedAt ? toDate(exitedAt) : null;

      if (!entered || isNaN(entered.getTime())) return null;

      // If no exit time, use current time or endAt/ratedAt as fallback
      const endTime =
        exited ||
        (props.attention.endAt ? toDate(props.attention.endAt) : null) ||
        (props.attention.ratedAt ? toDate(props.attention.ratedAt) : null) ||
        new Date();

      if (!endTime || isNaN(endTime.getTime())) return null;

      // Calculate difference in minutes
      const diffMs = endTime.getTime() - entered.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      return diffMinutes > 0 ? diffMinutes : null;
    };

    // Helper to find stage info from stageHistory
    const findStageInfo = stage => {
      if (!props.attention.stageHistory || !Array.isArray(props.attention.stageHistory)) {
        return null;
      }
      // Find the most recent entry for this stage
      const entries = props.attention.stageHistory.filter(e => e.stage === stage);
      if (entries.length === 0) return null;
      // Return the most recent entry
      const mostRecent = entries[entries.length - 1];
      let duration = mostRecent?.duration || null;

      // If duration is not available, calculate it from enteredAt and exitedAt
      if (!duration && mostRecent?.enteredAt) {
        duration = calculateDuration(mostRecent.enteredAt, mostRecent.exitedAt);
      }

      return {
        enteredAt: mostRecent?.enteredAt || null,
        enteredBy: mostRecent?.enteredBy || null,
        exitedAt: mostRecent?.exitedAt || null,
        exitedBy: mostRecent?.exitedBy || null,
        duration,
      };
    };

    // Helper to get collaborator name from ID
    const getCollaboratorName = collaboratorId => {
      if (!collaboratorId || !props.collaboratorsMap) return null;
      return props.collaboratorsMap[collaboratorId] || null;
    };

    // Determine current stage/status position
    const getCurrentPosition = () => {
      const isStagesEnabled = getActiveFeature(
        props.commerce,
        'attention-stages-enabled',
        'PRODUCT'
      );

      if (isStagesEnabled && props.attention.currentStage) {
        // Map stages to positions
        const stageMap = {
          CHECK_IN: 1,
          PRE_CONSULTATION: 2,
          CONSULTATION: 2,
          POST_CONSULTATION: 2,
          CHECKOUT: 3,
          TERMINATED: 4,
        };
        return stageMap[props.attention.currentStage] || 0;
      } else {
        // Use status for backward compatibility
        const statusMap = {
          PENDING: 0, // Before check-in
          PROCESSING: 2, // In processing
          TERMINATED: 4,
          RATED: 4,
          CANCELLED: -1, // Special case
          SKIPED: -1, // Special case
          USER_CANCELLED: -1, // Special case
        };
        return statusMap[props.attention.status] || 0;
      }
    };

    // Check if attention was cancelled or skipped
    const getCancellationInfo = () => {
      const status = props.attention.status;
      const isCancelled =
        props.attention.cancelled || status === 'CANCELLED' || status === 'USER_CANCELLED';
      const isSkipped = status === 'SKIPED';

      if (isCancelled) {
        const cancelledDate = props.attention.cancelledAt || props.attention.endAt;
        return {
          type: 'cancelled',
          date: cancelledDate,
          label:
            status === 'USER_CANCELLED'
              ? t('attentionStats.timelineSteps.cancelledByUser') || 'Cancelado por el Usuario'
              : t('attentionStats.timelineSteps.cancelled') || 'Cancelado',
        };
      } else if (isSkipped) {
        const skippedDate = props.attention.endAt || props.attention.processedAt;
        return {
          type: 'skipped',
          date: skippedDate,
          label: t('attentionStats.timelineSteps.skipped') || 'Saltado',
        };
      }
      return null;
    };

    // Check if attention was terminated by system/scheduler
    const isTerminatedBySystem = () => {
      // Check status: TERMINATED_RESERVE_CANCELLED means terminated automatically when booking was cancelled
      if (props.attention.status === 'TERMINATED_RESERVE_CANCELLED') {
        return true;
      }

      // Check stageHistory: if TERMINATED stage has enteredBy/exitedBy as 'system'
      if (props.attention.stageHistory && Array.isArray(props.attention.stageHistory)) {
        const terminatedStage = props.attention.stageHistory.find(
          entry => entry.stage === 'TERMINATED'
        );
        if (terminatedStage) {
          const enteredBy = terminatedStage.enteredBy?.toLowerCase() || '';
          const exitedBy = terminatedStage.exitedBy?.toLowerCase() || '';
          if (
            enteredBy === 'system' ||
            exitedBy === 'system' ||
            enteredBy === 'scheduler' ||
            exitedBy === 'scheduler'
          ) {
            return true;
          }
        }
      }

      return false;
    };

    // Calculate attention timeline with dates and times - ALWAYS show all stages
    const timeline = computed(() => {
      const attentionId = props.attention?.id || props.attention?.attentionId;
      if (!props.attention || !attentionId) return [];

      const timelineItems = [];
      const isStagesEnabled = getActiveFeature(
        props.commerce,
        'attention-stages-enabled',
        'PRODUCT'
      );
      const checkoutEnabled = getActiveFeature(
        props.commerce,
        'attention-checkout-enabled',
        'PRODUCT'
      );

      const currentPosition = getCurrentPosition();
      const cancellationInfo = getCancellationInfo();

      // Determine where cancellation/skip happened
      let cancellationPosition = -1;
      if (cancellationInfo) {
        // Determine position based on what was completed before cancellation
        if (props.attention.processedAt) {
          cancellationPosition = currentPosition >= 2 ? currentPosition : 1;
        } else {
          cancellationPosition = 0; // Cancelled before check-in
        }
      }

      // 1. Booking - ALWAYS show
      const hasBooking = props.attention.bookingId && props.booking;
      if (hasBooking) {
        const bookingDate = props.booking.date || props.booking.createdAt;
        const bookingDateTime = formatDateTime(bookingDate);
        timelineItems.push({
          label: t('attentionStats.timelineSteps.booking') || 'Reserva Criada',
          icon: 'bi bi-calendar-check',
          date: bookingDateTime.date,
          time: bookingDateTime.time,
          duration: null,
          collaborator: null, // Booking doesn't have a collaborator
          status: 'completed',
          position: -1, // Before check-in
        });
      } else {
        timelineItems.push({
          label: t('attentionStats.timelineSteps.booking') || 'Reserva Criada',
          icon: 'bi bi-calendar-check',
          date: null,
          time: null,
          duration: null,
          collaborator: null,
          status: 'not-applicable',
          position: -1,
        });
      }

      // 2. Check-In - ALWAYS show
      let checkInDate = null;
      let checkInCollaborator = null;
      let checkInDuration = null;
      if (isStagesEnabled) {
        const checkInInfo = findStageInfo('CHECK_IN');
        if (checkInInfo) {
          checkInDate = checkInInfo.enteredAt;
          checkInCollaborator = getCollaboratorName(checkInInfo.enteredBy);
          checkInDuration = checkInInfo.duration;
        } else {
          checkInDate = props.attention.processedAt || props.attention.createdAt;
          checkInCollaborator = getCollaboratorName(props.attention.collaboratorId);
          // Try to get duration from stageHistory even if not found in findStageInfo
          if (props.attention.stageHistory && Array.isArray(props.attention.stageHistory)) {
            const checkInStages = props.attention.stageHistory.filter(e => e.stage === 'CHECK_IN');
            if (checkInStages.length > 0) {
              const lastStage = checkInStages[checkInStages.length - 1];
              checkInDuration =
                lastStage?.duration || calculateDuration(lastStage?.enteredAt, lastStage?.exitedAt);
            }
          }
          // If still no duration, calculate from processedAt to next stage or endAt
          if (!checkInDuration && checkInDate) {
            const nextStage = props.attention.stageHistory?.find(e =>
              ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(e.stage)
            );
            const nextStageDate =
              nextStage?.enteredAt || props.attention.endAt || props.attention.ratedAt;
            checkInDuration = calculateDuration(checkInDate, nextStageDate);
          }
        }
      } else {
        checkInDate =
          props.attention.processedAt ||
          (props.attention.status === 'PENDING' ? null : props.attention.createdAt);
        checkInCollaborator = getCollaboratorName(props.attention.collaboratorId);
        // Calculate duration from processedAt to endAt/ratedAt
        if (checkInDate && (props.attention.endAt || props.attention.ratedAt)) {
          checkInDuration = calculateDuration(
            checkInDate,
            props.attention.endAt || props.attention.ratedAt,
          );
        }
      }
      // Fallback: always try to get collaborator from main attention
      if (!checkInCollaborator) {
        checkInCollaborator = getCollaboratorName(props.attention.collaboratorId);
      }
      const checkInDateTime = formatDateTime(checkInDate);
      const checkInPosition = 0;
      const checkInStatus = checkInDate
        ? 'completed'
        : currentPosition > checkInPosition
        ? 'pending'
        : cancellationPosition === checkInPosition
        ? cancellationInfo?.type || 'pending'
        : 'pending';

      timelineItems.push({
        label: t('attentionStats.timelineSteps.checkin') || 'Check-In',
        icon: 'bi bi-play-circle-fill',
        date: checkInDateTime.date,
        time: checkInDateTime.time,
        duration: checkInDuration,
        collaborator: checkInCollaborator,
        status: checkInStatus,
        position: checkInPosition,
        statusLabel: cancellationPosition === checkInPosition ? cancellationInfo?.label : null,
      });

      // 3. Em Atendimento - ALWAYS show
      let processingDate = null;
      let processingCollaborator = null;
      let processingDuration = null;
      if (isStagesEnabled) {
        // Try to find any processing stage
        const preConsultationInfo = findStageInfo('PRE_CONSULTATION');
        const consultationInfo = findStageInfo('CONSULTATION');
        const postConsultationInfo = findStageInfo('POST_CONSULTATION');

        const processingInfo = preConsultationInfo || consultationInfo || postConsultationInfo;
        if (processingInfo) {
          processingDate = processingInfo.enteredAt;
          processingCollaborator = getCollaboratorName(processingInfo.enteredBy);
          processingDuration = processingInfo.duration;
        } else if (props.attention.status === 'PROCESSING' || props.attention.processedAt) {
          processingDate = props.attention.processedAt;
          processingCollaborator = getCollaboratorName(props.attention.collaboratorId);
          // Try to get duration from any processing stage in stageHistory
          if (props.attention.stageHistory && Array.isArray(props.attention.stageHistory)) {
            const processingStages = props.attention.stageHistory.filter(e =>
              ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(e.stage)
            );
            if (processingStages.length > 0) {
              const lastStage = processingStages[processingStages.length - 1];
              processingDuration =
                lastStage?.duration || calculateDuration(lastStage?.enteredAt, lastStage?.exitedAt);
            }
          }
          // If still no duration, calculate from processedAt to checkout or endAt
          if (!processingDuration && processingDate) {
            const checkoutStage = props.attention.stageHistory?.find(e => e.stage === 'CHECKOUT');
            const nextStageDate =
              checkoutStage?.enteredAt || props.attention.endAt || props.attention.ratedAt;
            processingDuration = calculateDuration(processingDate, nextStageDate);
          }
        }
      } else {
        if (props.attention.status === 'PROCESSING' || props.attention.processedAt) {
          processingDate = props.attention.processedAt;
          processingCollaborator = getCollaboratorName(props.attention.collaboratorId);
          // Calculate duration from processedAt to endAt/ratedAt
          if (processingDate && (props.attention.endAt || props.attention.ratedAt)) {
            processingDuration = calculateDuration(
              processingDate,
              props.attention.endAt || props.attention.ratedAt,
            );
          }
        }
      }
      // Fallback: always try to get collaborator from main attention
      if (
        !processingCollaborator &&
        (props.attention.status === 'PROCESSING' || props.attention.processedAt)
      ) {
        processingCollaborator = getCollaboratorName(props.attention.collaboratorId);
      }
      const processingDateTime = formatDateTime(processingDate);
      const processingPosition = 1;
      const processingStatus = processingDate
        ? 'completed'
        : currentPosition > processingPosition
        ? 'pending'
        : cancellationPosition === processingPosition
        ? cancellationInfo?.type || 'pending'
        : currentPosition >= processingPosition
        ? 'pending'
        : 'pending';

      timelineItems.push({
        label: t('attentionStats.timelineSteps.processing') || 'Em Atendimento',
        icon: 'bi bi-clock-history',
        date: processingDateTime.date,
        time: processingDateTime.time,
        duration: processingDuration,
        collaborator: processingCollaborator,
        status: processingStatus,
        position: processingPosition,
        statusLabel: cancellationPosition === processingPosition ? cancellationInfo?.label : null,
      });

      // 4. Check-Out - ALWAYS show
      const checkoutPosition = 2;
      if (checkoutEnabled) {
        const checkoutInfo = findStageInfo('CHECKOUT');
        const checkoutDate = checkoutInfo?.enteredAt || null;
        let checkoutCollaborator = checkoutInfo
          ? getCollaboratorName(checkoutInfo.enteredBy)
          : null;
        let checkoutDuration = checkoutInfo?.duration || null;
        // Fallback: try to get from stageHistory directly
        if (
          !checkoutDuration &&
          props.attention.stageHistory &&
          Array.isArray(props.attention.stageHistory)
        ) {
          const checkoutStages = props.attention.stageHistory.filter(e => e.stage === 'CHECKOUT');
          if (checkoutStages.length > 0) {
            const lastCheckout = checkoutStages[checkoutStages.length - 1];
            if (!checkoutCollaborator) {
              checkoutCollaborator = getCollaboratorName(lastCheckout?.enteredBy);
            }
            checkoutDuration =
              lastCheckout?.duration ||
              calculateDuration(lastCheckout?.enteredAt, lastCheckout?.exitedAt);
          }
        }
        // If still no duration, calculate from checkoutDate to endAt/ratedAt
        if (!checkoutDuration && checkoutDate) {
          checkoutDuration = calculateDuration(
            checkoutDate,
            props.attention.endAt || props.attention.ratedAt,
          );
        }
        // Final fallback: use main collaborator if checkout was done
        if (!checkoutCollaborator && checkoutDate) {
          checkoutCollaborator = getCollaboratorName(props.attention.collaboratorId);
        }
        const checkoutDateTime = formatDateTime(checkoutDate);
        const checkoutStatus = checkoutDate
          ? 'completed'
          : currentPosition > checkoutPosition
          ? 'pending'
          : cancellationPosition === checkoutPosition
          ? cancellationInfo?.type || 'pending'
          : currentPosition >= checkoutPosition
          ? 'pending'
          : 'pending';

        timelineItems.push({
          label: t('attentionStats.timelineSteps.checkout') || 'Check-Out',
          icon: 'bi bi-check-circle-fill',
          date: checkoutDateTime.date,
          time: checkoutDateTime.time,
          duration: checkoutDuration,
          collaborator: checkoutCollaborator,
          status: checkoutStatus,
          position: checkoutPosition,
          statusLabel: cancellationPosition === checkoutPosition ? cancellationInfo?.label : null,
        });
      } else {
        timelineItems.push({
          label: t('attentionStats.timelineSteps.checkout') || 'Check-Out',
          icon: 'bi bi-check-circle-fill',
          date: null,
          time: null,
          duration: null,
          collaborator: null,
          status: 'not-applicable',
          position: checkoutPosition,
        });
      }

      // 5. Terminado - ALWAYS show
      const terminatedDate = props.attention.endAt || props.attention.ratedAt;
      const terminatedDateTime = formatDateTime(terminatedDate);
      const terminatedPosition = 3;
      const terminatedStatus = terminatedDate
        ? 'completed'
        : cancellationInfo && cancellationPosition >= terminatedPosition
        ? cancellationInfo.type
        : currentPosition >= terminatedPosition
        ? 'pending'
        : 'pending';

      // Get collaborator who terminated (could be from last stage or main collaborator)
      let terminatedCollaborator = null;
      const terminatedBySystem = isTerminatedBySystem();

      if (isStagesEnabled && props.attention.stageHistory) {
        const terminatedInfo = findStageInfo('TERMINATED');
        if (terminatedInfo) {
          // If terminated by system, show "Sistema" instead of collaborator name
          if (terminatedBySystem) {
            terminatedCollaborator =
              t('attentionStats.timelineSteps.terminatedBySystem') || 'Sistema';
          } else {
            terminatedCollaborator = getCollaboratorName(terminatedInfo.enteredBy);
          }
        }
      }
      if (!terminatedCollaborator) {
        if (terminatedBySystem) {
          terminatedCollaborator =
            t('attentionStats.timelineSteps.terminatedBySystem') || 'Sistema';
        } else {
          terminatedCollaborator = getCollaboratorName(props.attention.collaboratorId);
        }
      }

      // Determine status label for system termination
      let terminatedStatusLabel = null;
      if (cancellationInfo && cancellationPosition >= terminatedPosition) {
        terminatedStatusLabel = cancellationInfo.label;
      } else if (terminatedBySystem && terminatedDate) {
        terminatedStatusLabel =
          t('attentionStats.timelineSteps.terminatedBySystem') || 'Terminado por el Sistema';
      }

      timelineItems.push({
        label: t('attentionStats.timelineSteps.terminated') || 'Terminado',
        icon: 'bi bi-check-all',
        date: terminatedDateTime.date,
        time: terminatedDateTime.time,
        duration: null,
        collaborator: terminatedCollaborator,
        status: terminatedStatus,
        position: terminatedPosition,
        statusLabel: terminatedStatusLabel,
        isSystemTerminated: terminatedBySystem,
      });

      // 6. Survey - ALWAYS show with detailed status
      const surveyPosition = 4;
      const isTerminated =
        props.attention.status === 'TERMINATED' ||
        props.attention.status === 'RATED' ||
        !!props.attention.endAt ||
        !!props.attention.ratedAt;

      // Check survey status
      const hasSurveyId = !!props.attention.surveyId;
      const hasRatedAt = !!props.attention.ratedAt;
      const surveySent = props.attention.notificationSurveySent === true;

      let surveyStatus = 'not-applicable';
      let surveyDate = null;
      let surveyTime = null;
      let surveyStatusLabel = null;

      if (hasSurveyId && hasRatedAt) {
        // Survey completed
        surveyStatus = 'completed';
        const surveyDateTime = formatDateTime(props.attention.ratedAt);
        surveyDate = surveyDateTime.date;
        surveyTime = surveyDateTime.time;
      } else if (hasSurveyId || surveySent) {
        // Survey sent but not completed
        surveyStatus = 'pending';
        surveyStatusLabel =
          t('attentionStats.timelineSteps.surveySentPending') || 'Enviada, pendiente de respuesta';
        // Try to get sent date from endAt or when it was sent
        if (props.attention.endAt) {
          const sentDateTime = formatDateTime(props.attention.endAt);
          surveyDate = sentDateTime.date;
          surveyTime = sentDateTime.time;
        }
      } else if (isTerminated) {
        // Attention terminated but survey not sent
        surveyStatus = 'not-applicable';
        surveyStatusLabel = t('attentionStats.timelineSteps.surveyNotSent') || 'No enviada';
      } else {
        // Attention not terminated yet, survey doesn't apply
        surveyStatus = 'not-applicable';
        surveyStatusLabel = t('attentionStats.notApplicable') || 'No aplica';
      }

      timelineItems.push({
        label: t('attentionStats.timelineSteps.survey') || 'Pesquisa de Satisfação',
        icon: 'bi bi-star-fill',
        date: surveyDate,
        time: surveyTime,
        duration: null,
        collaborator: null, // Survey is completed by the user, not a collaborator
        status: surveyStatus,
        position: surveyPosition,
        statusLabel: surveyStatusLabel,
      });

      return timelineItems;
    });

    return {
      timeline,
      isCollapsed,
      isCollapsedProp: toRef(props, 'isCollapsed'),
      toggleCollapse,
    };
  },
};
</script>

<style scoped>
.timeline-card-collapsable {
  width: 100%;
  margin: 0 auto;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.timeline-card-collapsable:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: rgba(169, 169, 169, 0.25);
}

.timeline-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  user-select: none;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
}

.timeline-card-header-clickable {
  cursor: pointer;
}

.timeline-card-header-clickable:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.timeline-header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.timeline-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
  font-size: 1rem;
}

.timeline-header-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.timeline-header-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.9rem;
  transition: transform 0.3s ease, color 0.2s ease;
}

.timeline-card-header:hover .timeline-header-arrow {
  color: #004aad;
}

.timeline-card-body {
  padding: 0.5rem 0.75rem;
  padding-top: 0.75rem;
}

.timeline-container {
  margin-top: 0.5rem;
  position: relative;
}

.timeline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.75rem;
  font-style: italic;
}

.timeline-empty i {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.4);
}

.timeline-item {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  position: relative;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

.timeline-marker-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  z-index: 2;
  position: relative;
  background: white;
  border: 2px solid;
  transition: all 0.3s ease;
}

.timeline-marker-icon.icon-completed {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.timeline-marker-icon.icon-pending {
  background: #e9ecef;
  border-color: #dee2e6;
  color: #6c757d;
  opacity: 0.6;
}

.timeline-marker-icon.icon-not-applicable {
  background: #f8f9fa;
  border-color: #dee2e6;
  color: #adb5bd;
}

.timeline-marker-icon.icon-cancelled {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.timeline-marker-icon.icon-skipped {
  background: #ffc107;
  border-color: #ffc107;
  color: white;
}

.timeline-connector {
  width: 2px;
  flex: 1;
  min-height: 20px;
  margin-top: 0.25rem;
  background: #dee2e6;
  transition: background 0.3s ease;
}

.timeline-item-completed .timeline-connector {
  background: #28a745;
}

.timeline-item-pending .timeline-connector {
  background: #dee2e6;
  opacity: 0.4;
}

.timeline-item-not-applicable .timeline-connector {
  background: #dee2e6;
  opacity: 0.3;
}

.timeline-item-cancelled .timeline-connector,
.timeline-item-skipped .timeline-connector {
  background: #dc3545;
}

.timeline-content {
  flex: 1;
  padding-top: 0.1rem;
}

.timeline-label-wrapper {
  margin-bottom: 0.4rem;
  width: 100%;
}

.timeline-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: rgba(0, 74, 173, 0.08);
  display: block;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
}

.timeline-item-pending .timeline-label {
  color: rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.05);
}

.timeline-item-not-applicable .timeline-label {
  color: #adb5bd;
  background: rgba(173, 181, 189, 0.1);
}

.timeline-item-cancelled .timeline-label {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.timeline-item-skipped .timeline-label {
  background: rgba(255, 193, 7, 0.15);
  color: #856404;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.timeline-details-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.2rem;
}

.timeline-datetime-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.timeline-date,
.timeline-time {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.65);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.timeline-item-pending .timeline-date,
.timeline-item-pending .timeline-time {
  color: rgba(0, 0, 0, 0.4);
}

.timeline-item-cancelled .timeline-date,
.timeline-item-cancelled .timeline-time {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
}

.timeline-item-cancelled .timeline-date i,
.timeline-item-cancelled .timeline-time i {
  color: #dc3545;
}

.timeline-date i,
.timeline-time i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

.timeline-collaborator {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.7);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 74, 173, 0.08);
  border-radius: 4px;
  font-weight: 500;
}

.timeline-collaborator i {
  font-size: 0.75rem;
  color: #004aad;
}

.timeline-collaborator-empty {
  background: rgba(173, 181, 189, 0.1);
  color: rgba(0, 0, 0, 0.4);
}

.timeline-collaborator-empty i {
  color: #adb5bd;
}

.timeline-duration {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.7);
  padding: 0.15rem 0.4rem;
  background: rgba(40, 167, 69, 0.1);
  border-radius: 4px;
  font-weight: 500;
}

.timeline-duration i {
  font-size: 0.75rem;
  color: #28a745;
}

.timeline-duration-empty {
  background: rgba(173, 181, 189, 0.1);
  color: rgba(0, 0, 0, 0.4);
}

.timeline-duration-empty i {
  color: #adb5bd;
}

.timeline-item-pending .timeline-duration,
.timeline-item-pending .timeline-collaborator {
  color: rgba(0, 0, 0, 0.3);
}

.timeline-pending {
  font-size: 0.7rem;
  font-style: italic;
  color: rgba(0, 0, 0, 0.4);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
}

.timeline-not-applicable {
  font-size: 0.7rem;
  font-style: italic;
  color: #adb5bd;
  padding: 0.15rem 0.4rem;
  background: rgba(173, 181, 189, 0.1);
  border-radius: 4px;
  font-weight: 500;
}

.timeline-status-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  margin-top: 0.15rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.timeline-status-badge.badge-cancelled {
  background-color: #dc3545;
  color: #ffffff;
  border: 1px solid #c82333;
  font-weight: 700;
}

.timeline-status-badge.badge-skipped {
  background-color: #fff3cd;
  color: #856404;
}

.timeline-status-badge.badge-pending {
  background-color: #d1ecf1;
  color: #0c5460;
}

.timeline-status-badge.badge-not-applicable {
  background-color: #f8f9fa;
  color: #6c757d;
}

.timeline-status-badge.badge-system {
  background-color: #6c757d;
  color: #ffffff;
  border: 1px solid #5a6268;
  font-weight: 700;
}

/* Responsive for timeline */
@media (max-width: 768px) {
  .timeline-item {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .timeline-marker-icon {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
  }

  .timeline-label {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
  }

  .timeline-details-row {
    gap: 0.5rem;
  }

  .timeline-date,
  .timeline-time,
  .timeline-collaborator,
  .timeline-duration {
    font-size: 0.65rem;
    padding: 0.1rem 0.3rem;
  }

  .timeline-datetime-group {
    gap: 0.3rem;
  }
}
</style>
