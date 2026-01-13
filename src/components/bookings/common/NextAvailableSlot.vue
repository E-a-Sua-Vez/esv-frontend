<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { DateModel } from '../../../shared/utils/date.model';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getPendingBookingsBetweenDates } from '../../../application/services/booking';
import { getAttentionByDate } from '../../../application/services/attention';

export default {
  name: 'NextAvailableSlot',
  props: {
    commerce: { type: Object, required: true },
    queue: { type: Object, required: true },
    selectedServices: { type: Array, default: () => [] },
    daysAhead: { type: Number, default: 30 },
    excludeSlot: { type: Object, default: null }, // Slot to exclude from search
    refreshKey: { type: [String, Number], default: null }, // Key to trigger refresh when bookings/attentions change
  },
  emits: ['slot-selected', 'show-manual-selection'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const nextSlot = ref(null);
    const error = ref('');

    // Check if specific calendar is enabled
    const isSpecificCalendar = computed(
      () =>
        (props.queue.serviceInfo && props.queue.serviceInfo.specificCalendar) ||
        (props.commerce.serviceInfo && props.commerce.serviceInfo.specificCalendar)
    );

    // Format date for display
    const formatSlotDate = dateStr => {
      try {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        if (isToday) return t('attentionCreation.today');
        if (isTomorrow) return t('attentionCreation.tomorrow');

        // Calculate days difference for better context
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' });
        const year = date.getFullYear();
        const currentYear = today.getFullYear();

        // If it's within this week (next 7 days), show weekday
        if (diffDays <= 7) {
          return `${weekday}, ${day} ${month}`;
        }

        // If it's more than 7 days but same year, show date with month
        if (year === currentYear) {
          return `${day} de ${date.toLocaleDateString('pt-BR', { month: 'long' })}`;
        }

        // If it's next year, include year
        return `${day} de ${date.toLocaleDateString('pt-BR', { month: 'long' })} ${year}`;
      } catch (error) {
        return dateStr;
      }
    };

    // Calculate blocks needed based on selected services
    const calculateBlocksNeeded = () => {
      if (!props.selectedServices || props.selectedServices.length === 0) {
        return 1; // Default to 1 block if no services selected
      }

      const totalDuration = props.selectedServices.reduce(
        (acc, service) =>
          acc + (service.serviceInfo?.blockTime || service.serviceInfo?.estimatedTime || 30),
        0
      );

      const queueBlockTime = props.queue?.blockTime || 30;
      const blocksNeeded = Math.ceil(totalDuration / queueBlockTime);

      return blocksNeeded;
    };

    // Check if consecutive blocks are available
    const hasConsecutiveBlocks = (blocks, startIndex, blocksNeeded) => {
      if (blocksNeeded <= 1) return true;

      const startBlock = blocks[startIndex];
      if (!startBlock) {
        return false;
      }

      const availableNumbers = blocks.map(b => b.number);

      for (let i = 0; i < blocksNeeded; i++) {
        const neededNumber = startBlock.number + i;
        if (!availableNumbers.includes(neededNumber)) {
          return false;
        }
      }
      return true;
    };

    // Find next available slot
    const findNextAvailableSlot = async () => {
      if (!props.queue || !props.commerce) return;

      loading.value = true;
      error.value = '';
      nextSlot.value = null;

      try {
        const today = new DateModel();
        const todayStr = today.toString();
        const blocksNeeded = calculateBlocksNeeded();

        // Get attention days from queue
        const attentionDays = props.queue.serviceInfo?.attentionDays || [];

        // Get today's day of week to check if it's in attentionDays
        const todayDateObj = new Date(todayStr + 'T00:00:00');
        let todayDayOfWeek = todayDateObj.getDay();
        if (todayDayOfWeek === 0) todayDayOfWeek = 7; // Sunday becomes 7

        // Search for the next 30 days
        for (let dayOffset = 0; dayOffset < props.daysAhead; dayOffset++) {
          const searchDate = new DateModel(today.addDays(dayOffset));
          const dateStr = searchDate.toString();

          // Filter by attention days if configured
          if (attentionDays.length > 0) {
            const searchDateObj = new Date(dateStr + 'T00:00:00');
            let dayOfWeek = searchDateObj.getDay();
            if (dayOfWeek === 0) dayOfWeek = 7; // Sunday becomes 7
            // Skip if not an attention day
            if (!attentionDays.includes(dayOfWeek)) {
              continue;
            }
          }

          let blocks = [];

          if (isSpecificCalendar.value) {
            // Use specific calendar API
            const blocksBySpecificDate = await getQueueBlockDetailsBySpecificDayByCommerceId(
              props.commerce.id,
              props.queue.id
            );
            blocks = blocksBySpecificDate[dateStr] || [];
          } else {
            // Use regular calendar API
            const blocksByDay = await getQueueBlockDetailsByDay(props.queue.id);

            // Convert date to day of week
            const searchDateObj = new Date(dateStr + 'T00:00:00');
            let dayOfWeek = searchDateObj.getDay();
            if (dayOfWeek === 0) dayOfWeek = 7; // Sunday becomes 7

            blocks = blocksByDay[dayOfWeek] || [];
          }

          if (blocks.length === 0) continue;

          // Get bookings for this date
          const bookings = await getPendingBookingsBetweenDates(props.queue.id, dateStr, dateStr);

          // Get attentions for this date
          const attentions = await getAttentionByDate(props.queue.id, dateStr);

          // Get reserved block numbers from bookings and attentions
          const reservedBlockNumbers = [];

          // Add reserved blocks from bookings (excluding cancelled bookings)
          if (bookings && bookings.length > 0) {
            bookings.forEach(booking => {
              // Skip cancelled bookings - they free up the slot
              const isCancelled =
                booking.cancelled === true ||
                booking.status === 'CANCELLED' ||
                booking.status === 'USER_CANCELED';

              if (isCancelled) {
                return;
              }

              if (booking.block) {
                if (booking.block.blockNumbers && Array.isArray(booking.block.blockNumbers)) {
                  reservedBlockNumbers.push(...booking.block.blockNumbers);
                } else if (booking.block.number) {
                  reservedBlockNumbers.push(booking.block.number);
                }
              }
            });
          }

          // Add reserved blocks from attentions (excluding cancelled attentions)
          if (attentions && attentions.length > 0) {
            attentions.forEach(attention => {
              // Skip cancelled attentions - they free up the slot
              const isCancelled = attention.cancelled === true || attention.status === 'CANCELLED';

              if (isCancelled) {
                return;
              }

              if (attention.block) {
                if (attention.block.blockNumbers && Array.isArray(attention.block.blockNumbers)) {
                  reservedBlockNumbers.push(...attention.block.blockNumbers);
                } else if (attention.block.number) {
                  reservedBlockNumbers.push(attention.block.number);
                }
              }
            });
          }

          // Find first available block
          let availableBlocks = blocks.filter(
            block => !reservedBlockNumbers.includes(block.number)
          );

          // Check if it's today - compare with the todayStr we calculated at the start
          const isToday = dateStr === todayStr;

          if (isToday) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinute;

            const beforeTimeFiltering = availableBlocks.length;
            availableBlocks = availableBlocks.filter(block => {
              if (!block.hourFrom) return false;

              // Parse block start time (e.g., "14:30" -> 14 * 60 + 30 = 870 minutes)
              const [blockHour, blockMinute] = block.hourFrom.split(':').map(Number);
              const blockTimeInMinutes = blockHour * 60 + (blockMinute || 0);

              // Only include blocks that start at least 30 minutes from now (buffer time)
              return blockTimeInMinutes > currentTimeInMinutes + 30;
            });
          }

          if (availableBlocks.length > 0) {
            // Sort by time and get the earliest
            const sortedBlocks = availableBlocks.sort((a, b) => {
              const timeA = a.hourFrom || '';
              const timeB = b.hourFrom || '';
              return timeA.localeCompare(timeB);
            });

            // Find first block that can accommodate the service duration
            let selectedBlock = null;
            for (let i = 0; i < sortedBlocks.length; i++) {
              const block = sortedBlocks[i];

              // Check if we have enough consecutive blocks
              if (hasConsecutiveBlocks(sortedBlocks, i, blocksNeeded)) {
                // Check if any of the needed consecutive blocks are reserved
                let hasReservedInSequence = false;
                for (let j = 0; j < blocksNeeded; j++) {
                  const neededNumber = block.number + j;
                  if (reservedBlockNumbers.includes(neededNumber)) {
                    hasReservedInSequence = true;
                    break;
                  }
                }

                if (!hasReservedInSequence) {
                  // Create super block if multiple blocks are needed
                  if (blocksNeeded > 1) {
                    const consecutiveBlocks = [];
                    for (let j = 0; j < blocksNeeded; j++) {
                      const neededNumber = block.number + j;
                      const consecutiveBlock = sortedBlocks.find(b => b.number === neededNumber);
                      if (consecutiveBlock) {
                        consecutiveBlocks.push(consecutiveBlock);
                      }
                    }

                    if (consecutiveBlocks.length === blocksNeeded) {
                      selectedBlock = {
                        number: consecutiveBlocks[0].number,
                        hourFrom: consecutiveBlocks[0].hourFrom,
                        hourTo: consecutiveBlocks[consecutiveBlocks.length - 1].hourTo,
                        blocks: consecutiveBlocks,
                        blockNumbers: consecutiveBlocks.map(b => b.number),
                        isSuperBlock: true,
                      };
                      break;
                    }
                  } else {
                    selectedBlock = block;
                    break;
                  }
                }
              }
            }

            if (!selectedBlock) {
              continue;
            }

            // Check if we should exclude this slot (if it matches the excludeSlot)
            if (
              props.excludeSlot &&
              dateStr === props.excludeSlot.date &&
              selectedBlock.number === props.excludeSlot.block?.number
            ) {
              // Try to find another suitable block
              let foundAlternative = false;
              for (let i = 0; i < sortedBlocks.length; i++) {
                const altBlock = sortedBlocks[i];
                if (
                  altBlock.number !== selectedBlock.number &&
                  hasConsecutiveBlocks(sortedBlocks, i, blocksNeeded)
                ) {
                  // Same logic as above but for alternative block
                  let hasReservedInSequence = false;
                  for (let j = 0; j < blocksNeeded; j++) {
                    const neededNumber = altBlock.number + j;
                    if (reservedBlockNumbers.includes(neededNumber)) {
                      hasReservedInSequence = true;
                      break;
                    }
                  }

                  if (!hasReservedInSequence) {
                    if (blocksNeeded > 1) {
                      const consecutiveBlocks = [];
                      for (let j = 0; j < blocksNeeded; j++) {
                        const neededNumber = altBlock.number + j;
                        const consecutiveBlock = sortedBlocks.find(b => b.number === neededNumber);
                        if (consecutiveBlock) {
                          consecutiveBlocks.push(consecutiveBlock);
                        }
                      }

                      if (consecutiveBlocks.length === blocksNeeded) {
                        selectedBlock = {
                          number: consecutiveBlocks[0].number,
                          hourFrom: consecutiveBlocks[0].hourFrom,
                          hourTo: consecutiveBlocks[consecutiveBlocks.length - 1].hourTo,
                          blocks: consecutiveBlocks,
                          blockNumbers: consecutiveBlocks.map(b => b.number),
                          isSuperBlock: true,
                        };
                        foundAlternative = true;
                        break;
                      }
                    } else {
                      selectedBlock = altBlock;
                      foundAlternative = true;
                      break;
                    }
                  }
                }
              }

              if (!foundAlternative) {
                continue;
              }
            }

            nextSlot.value = {
              date: dateStr,
              block: selectedBlock,
              queue: props.queue,
              commerce: props.commerce,
              formattedDate: formatSlotDate(dateStr),
            };
            break;
          }
        }

        loading.value = false;
      } catch (err) {
        console.error('Error finding next available slot:', err);
        error.value = t('nextAvailableSlot.searchingError');
        loading.value = false;
      }
    };

    // Handle slot selection
    const selectSlot = () => {
      if (nextSlot.value) {
        emit('slot-selected', {
          date: nextSlot.value.date,
          block: nextSlot.value.block,
          queue: nextSlot.value.queue,
        });
      }
    };

    // Handle manual selection
    const showManualSelection = () => {
      emit('show-manual-selection');
    };

    // Calculate days away from today
    const getDaysAway = dateStr => {
      try {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        return 0;
      }
    };

    // Watch for changes in queue or commerce
    watch(
      [() => props.queue, () => props.commerce],
      () => {
        findNextAvailableSlot();
      },
      { immediate: true },
    );

    // Watch for refreshKey changes (triggered when bookings/attentions are cancelled or updated)
    watch(
      () => props.refreshKey,
      () => {
        if (props.refreshKey !== null && props.refreshKey !== undefined) {
          findNextAvailableSlot();
        }
      },
    );

    onMounted(() => {
      findNextAvailableSlot();
    });

    return {
      loading,
      nextSlot,
      error,
      selectSlot,
      showManualSelection,
      formatSlotDate,
      getDaysAway,
      t,
    };
  },
};
</script>

<template>
  <div class="next-available-slot">
    <!-- Loading State -->
    <div v-if="loading" class="next-slot-loading">
      <div class="d-flex align-items-center">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">{{ t('nextAvailableSlot.loading') || 'Loading' }}</span>
        </div>
        <span class="text-muted">{{
          t('nextAvailableSlot.searching') || 'Buscando próxima disponibilidade...'
        }}</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="next-slot-error">
      <div class="alert alert-warning d-flex align-items-center">
        <i class="bi bi-exclamation-triangle me-2"></i>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Next Available Slot -->
    <div v-else-if="nextSlot" class="next-slot-card mt-2">
      <div class="next-slot-header">
        <i class="bi bi-clock-fill h5"></i>
        <span class="next-slot-title fw-bold h6">
          {{ t('nextAvailableSlot.title') || 'Próxima Disponibilidade' }}
        </span>
      </div>

      <div class="next-slot-content">
        <div class="next-slot-info">
          <div class="next-slot-datetime">
            <i class="bi bi-calendar-event me-2"></i>
            <span class="datetime-text">
              <span class="datetime-separator"></span>
              <span class="datetime-time">
              {{ nextSlot.formattedDate }}, {{ nextSlot.block.hourFrom }} - {{ nextSlot.block.hourTo }}
              </span>
            </span>
            <!-- Distance indicator for far dates -->
            <span v-if="getDaysAway(nextSlot.date) > 7" class="days-away-badge">
              {{
                t('nextAvailableSlot.inDays', { days: getDaysAway(nextSlot.date) }) ||
                `em ${getDaysAway(nextSlot.date)} dias`
              }}
            </span>
          </div>
          <div class="next-slot-service">
            <i class="bi bi-bookmark-fill me-2"></i>
            <span class="service-text">{{ queue.name }} • {{ commerce.name }}</span>
          </div>
        </div>

        <div class="next-slot-actions mt-1">
          <button type="button" class="btn btn-primary btn-quick-book" @click="selectSlot">
            <i class="bi bi-lightning-fill me-2"></i>
            {{ t('nextAvailableSlot.bookNow') || 'Reservar Agora' }}
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary btn-manual"
            @click="showManualSelection"
          >
            <i class="bi bi-calendar3 me-2"></i>
            {{ t('nextAvailableSlot.seeMoreTimes') || 'Ver Mais Horários' }}
          </button>
        </div>
      </div>
    </div>

    <!-- No Availability -->
    <div v-else class="next-slot-empty">
      <div class="alert alert-info d-flex align-items-center">
        <i class="bi bi-info-circle me-2"></i>
        <div>
          <strong>{{
            t('nextAvailableSlot.noAvailability') || 'Nenhuma disponibilidade encontrada'
          }}</strong
          ><br />
          <small class="text-muted">{{
            t('nextAvailableSlot.noAvailabilityDetails', { days: daysAhead }) ||
            `Não há horários disponíveis nos próximos ${daysAhead} dias`
          }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.next-available-slot {
  margin-bottom: 0.5rem;
}

.next-slot-loading,
.next-slot-error,
.next-slot-empty {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(169, 169, 169, 0.2);
}

.next-slot-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 1rem;
  border: 1.5px solid rgba(19, 10, 191, 0.508);
  box-shadow: 0 1px 8px rgba(169, 169, 169, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  align-items: left;
}

.next-slot-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.next-slot-card:hover::before {
  left: 100%;
}

.next-slot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 74, 173, 0.2);
}

.next-slot-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 0.25rem;
  margin-bottom: 0.375rem;
  color: var(--azul-turno, #004aad);
}

.next-slot-header i {
  margin-right: 0.25rem;
  color: var(--azul-turno, #004aad);
}

.next-slot-title {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1rem;
}

.next-slot-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.next-slot-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.next-slot-datetime {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
}

.next-slot-datetime i {
  color: var(--azul-turno, #004aad);
  font-size: 1.1rem;
}

.datetime-text {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.datetime-date {
  margin-right: 0.25rem;
}

.datetime-separator {
  margin: 0 0.25rem;
  opacity: 0.8;
}

.datetime-time {
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  line-height: 1rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.08) 0%, rgba(0, 194, 203, 0.12) 100%);
  color: var(--azul-turno, #004aad);
  font-weight: 700;
  box-shadow: 0 0 0 1px rgba(0, 74, 173, 0.12);
}

.days-away-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #856404;
  margin-left: 0.5rem;
}

.next-slot-service {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #666;
  line-height: 1rem;
  margin-top: .5rem;
}

.next-slot-service i {
  color: var(--verde-tu, #00c2cb);
  font-size: 0.95rem;
}

.next-slot-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-quick-book {
  background: linear-gradient(
    135deg,
    var(--azul-turno, #004aad) 0%,
    var(--verde-tu, #00c2cb) 100%
  ) !important;
  border: none !important;
  color: white !important;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.6rem;
  box-shadow: 0 3px 12px rgba(0, 74, 173, 0.25);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex: 1;
  min-width: 140px;
}

.btn-quick-book::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-quick-book:hover::before {
  left: 100%;
}

.btn-quick-book:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.4);
}

.btn-quick-book i {
  font-size: 1rem;
}

.btn-manual {
  background: transparent !important;
  border: 1.5px solid rgba(169, 169, 169, 0.3) !important;
  color: #666 !important;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.6rem;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-manual:hover {
  background: rgba(169, 169, 169, 0.1) !important;
  border-color: rgba(169, 169, 169, 0.5) !important;
  color: #333 !important;
  transform: translateX(-2px);
}

.btn-manual i {
  font-size: 0.9rem;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .next-slot-card {
    padding: 0.375rem;
  }

  .next-slot-actions {
    flex-direction: column;
    gap: 0.25rem;
  }

  .btn-quick-book,
  .btn-manual {
    width: 100%;
    justify-content: center;
    padding: 0.375rem 0.75rem;
  }

  .next-slot-datetime {
    font-size: 0.9rem;
  }

  .next-slot-service {
    font-size: 0.8rem;
  }
}

/* Animation for when slot appears */
.next-slot-card {
  animation: slideInUp 0.6s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Use same pulse/arrow animation as main "Próximo" button */
.btn-quick-book:not(:disabled) {
  animation: pulseGlow 2s ease-in-out infinite;
}

.btn-quick-book:hover:not(:disabled) i {
  transform: translateX(5px);
  animation: arrowBounce 0.6s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 4px 15px rgba(0, 74, 173, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(0, 74, 173, 0.6), 0 0 20px rgba(0, 194, 203, 0.3);
  }
}

@keyframes arrowBounce {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(5px);
  }
}

</style>
