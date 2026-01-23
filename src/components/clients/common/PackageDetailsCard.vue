<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import { pausePackage, resumePackage, cancelPackage } from '../../../application/services/package';
import { getAttentionsDetails } from '../../../application/services/query-stack';
import { getBookingsDetails } from '../../../application/services/query-stack';
import { getAllIncomesByPackage } from '../../../application/services/income';

export default {
  name: 'PackageDetailsCard',
  components: { Popper, Spinner, AreYouSure },
  props: {
    show: { type: Boolean, default: true },
    packageData: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    disableClick: { type: Boolean, default: false },
    queues: { type: Array, default: () => [] },
  },
  emits: ['package-updated', 'refresh', 'open-attention-modal', 'open-payment-form'],
  data() {
    return {
      loading: false,
      extendedEntity: false,
      packageAttentions: [],
      packageBookings: [],
      loadingAttentions: false,
      loadingBookings: false,
      showCancelConfirm: false,
      packageIncomes: [],
      loadingIncomes: false,
      paidAmount: 0,
      remainingAmount: 0,
    };
  },
  computed: {
    pkg() {
      return this.packageData;
    },
    // Calculate proceduresUsed dynamically from attentionsId and bookingsId
    // Count: Atenciones (PENDING, PROCESSING, TERMINATED) + Reservas (PENDING)
    // Exclude: Reservas CANCELLED, PROCESSED, USER_CANCELLED, etc.
    calculatedProceduresUsed() {
      if (!this.pkg) return 0;

      // Count attentions: PENDING, PROCESSING, TERMINATED
      const validAttentionsCount = this.packageAttentions.filter(
        att =>
          att.status === 'PENDING' || att.status === 'PROCESSING' || att.status === 'TERMINATED'
      ).length;

      // Count only PENDING bookings (exclude CANCELLED, PROCESSED, USER_CANCELLED, etc.)
      const pendingBookingsCount = this.pendingBookings.length;

      // Total used = valid attentions + pending bookings
      const dynamicUsed = validAttentionsCount + pendingBookingsCount;

      // Use proceduresUsed if it's set and higher (for completed sessions that were consumed)
      // This handles cases where backend has more accurate count
      return Math.max(dynamicUsed, this.pkg.proceduresUsed || 0);
    },
    sessionsProgress() {
      if (!this.pkg || !this.pkg.proceduresAmount) return 0;
      const used = this.calculatedProceduresUsed;
      return Math.round((used / this.pkg.proceduresAmount) * 100);
    },
    sessionsRemaining() {
      if (!this.pkg || !this.pkg.proceduresAmount) return 0;
      // Calculate remaining based on proceduresAmount and calculatedProceduresUsed
      const remaining = this.pkg.proceduresAmount - this.calculatedProceduresUsed;
      // Use proceduresLeft if it's set and lower (more accurate for consumed sessions)
      if (this.pkg.proceduresLeft !== undefined && this.pkg.proceduresLeft !== null) {
        return Math.min(remaining, this.pkg.proceduresLeft);
      }
      return Math.max(0, remaining);
    },
    isLowSessions() {
      return this.sessionsRemaining > 0 && this.sessionsRemaining <= 3;
    },
    isExpiringSoon() {
      if (!this.pkg?.expireAt) return false;
      const expireDate = new Date(this.pkg.expireAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    },
    daysUntilExpiry() {
      if (!this.pkg?.expireAt) return null;
      const expireDate = new Date(this.pkg.expireAt);
      const now = new Date();
      return Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
    },
    canBookNextSession() {
      return (
        (this.pkg?.status === 'ACTIVE' ||
          this.pkg?.status === 'CONFIRMED' ||
          this.pkg?.status === 'REQUESTED') &&
        this.sessionsRemaining > 0 &&
        (!this.pkg?.expireAt || new Date(this.pkg.expireAt) > new Date())
      );
    },
    pendingAttentions() {
      // Show attentions: PENDING, PROCESSING, TERMINATED
      return this.packageAttentions.filter(
        att =>
          att.status === 'PENDING' || att.status === 'PROCESSING' || att.status === 'TERMINATED'
      );
    },
    pendingBookings() {
      return this.packageBookings.filter(booking => booking.status === 'PENDING');
    },
    canCreateNewReservation() {
      return this.canBookNextSession && this.sessionsRemaining > 0;
    },
    paymentInfo() {
      if (!this.pkg) return null;
      const totalAmount = this.pkg.totalAmount || 0;
      const paid = this.paidAmount || 0;
      const remaining = Math.max(0, totalAmount - paid);
      const paymentPercentage = totalAmount > 0 ? Math.round((paid / totalAmount) * 100) : 0;

      return {
        totalAmount,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentPercentage,
        isFullyPaid: this.pkg.paid === true || remaining <= 0,
        hasPayment: totalAmount > 0,
      };
    },
  },
  methods: {
    async showDetails() {
      this.extendedEntity = !this.extendedEntity;
      if (this.extendedEntity && this.pkg?.id && this.commerce?.id) {
        // Load data when details are expanded
        await this.loadPackageAttentions();
        await this.loadPackageBookings();
        await this.loadPackageIncomes();
      }
    },
    async loadPackageIncomes() {
      if (!this.pkg?.id || !this.commerce?.id) return;
      if (this.loadingIncomes) return;
      try {
        this.loadingIncomes = true;
        const incomes = await getAllIncomesByPackage(this.commerce.id, this.pkg.id);
        this.packageIncomes = incomes || [];

        // Calcular monto pagado (sumar todos los incomes confirmados)
        this.paidAmount = this.packageIncomes
          .filter(income => income.status === 'CONFIRMED')
          .reduce((sum, income) => sum + (Number(income.amount) || 0), 0);

        // Calcular monto pendiente
        const totalAmount = this.pkg.totalAmount || 0;
        this.remainingAmount = Math.max(0, totalAmount - this.paidAmount);
      } catch (error) {
        console.error('Error loading package incomes:', error);
        this.packageIncomes = [];
        this.paidAmount = 0;
        this.remainingAmount = 0;
      } finally {
        this.loadingIncomes = false;
      }
    },
    openPaymentForm(prepayComplete = false) {
      // Emitir evento para abrir PaymentForm con el paquete preseleccionado
      this.$emit('open-payment-form', {
        packageId: this.pkg.id,
        packageName: this.pkg.name,
        totalAmount: this.pkg.totalAmount,
        paidAmount: this.paidAmount,
        remainingAmount: this.remainingAmount,
        prepayComplete, // true = preparar todo, false = pagar restante
        procedureNumber: this.calculatedProceduresUsed + 1,
        proceduresTotalNumber: this.pkg.proceduresAmount,
      });
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyPackage() {
      const textToCopy = jsonToCsv([this.pkg]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyStatus(status) {
      if (status === 'ACTIVE' || status === 'CONFIRMED') {
        return 'bi-check-circle-fill green-icon';
      } else if (status === 'PAUSED') {
        return 'bi-pause-circle-fill yellow-icon';
      } else if (status === 'COMPLETED') {
        return 'bi-check-circle-fill blue-icon';
      } else if (status === 'EXPIRED') {
        return 'bi-clock-fill red-icon';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill red-icon';
      } else {
        return 'bi-box-fill blue-icon';
      }
    },
    getCardTypeClass() {
      const status = this.pkg?.status;
      if (status === 'ACTIVE' || status === 'CONFIRMED') return 'client-card-success';
      if (status === 'PAUSED') return 'client-card-warning';
      if (status === 'COMPLETED') return 'client-card-info';
      if (status === 'EXPIRED' || status === 'CANCELLED') return 'client-card-error';
      return 'client-card-default';
    },
    getStatusIconClass() {
      const status = this.pkg?.status;
      if (status === 'ACTIVE' || status === 'CONFIRMED') return 'icon-success';
      if (status === 'PAUSED') return 'icon-warning';
      if (status === 'COMPLETED') return 'icon-info';
      if (status === 'EXPIRED' || status === 'CANCELLED') return 'icon-error';
      return 'icon-default';
    },
    getProgressBarColor() {
      const progress = this.sessionsProgress;
      if (progress >= 90) return '#00c2cb'; // Success - almost complete
      if (progress >= 50) return '#004aad'; // Info - halfway
      if (this.isLowSessions) return '#f9c322'; // Warning - low sessions
      return '#00c2cb'; // Default
    },
    async loadPackageAttentions() {
      if (!this.pkg?.id || !this.commerce?.id) return;
      // Prevent concurrent loads
      if (this.loadingAttentions) return;
      try {
        this.loadingAttentions = true;

        // If package has attentionsId array, we can use it directly
        if (
          this.pkg.attentionsId &&
          Array.isArray(this.pkg.attentionsId) &&
          this.pkg.attentionsId.length > 0
        ) {
          // Load attentions by IDs
          const attentionPromises = this.pkg.attentionsId.map(id =>
            getAttentionsDetails(
              this.commerce.id,
              undefined, // from
              undefined, // to
              undefined, // commerceIds
              1, // page
              1, // limit
              undefined, // daysSinceType
              undefined, // daysSinceContacted
              undefined, // contactable
              undefined, // contacted
              undefined, // searchText
              undefined, // queueId
              undefined, // survey
              false, // asc
              undefined, // contactResultType
              undefined, // serviceId
              undefined, // stock
              id, // id - specific attention ID
              undefined, // userId
              this.pkg.clientId // clientId
            )
              .then(res => {
                const att = res?.[0] || null;
                if (att) {
                }
                return att;
              })
              .catch(err => {
                console.error('[PackageDetailsCard] Error loading attention by ID:', id, err);
                return null;
              })
          );
          const attentions = await Promise.all(attentionPromises);
          this.packageAttentions = attentions.filter(att => att !== null);
        } else {
          // Fallback: load all attentions for client and filter by packageId
          const allAttentions = await getAttentionsDetails(
            this.commerce.id,
            undefined, // from
            undefined, // to
            undefined, // commerceIds
            1, // page
            100, // limit
            undefined, // daysSinceType
            undefined, // daysSinceContacted
            undefined, // contactable
            undefined, // contacted
            undefined, // searchText
            undefined, // queueId
            undefined, // survey
            false, // asc
            undefined, // contactResultType
            undefined, // serviceId
            undefined, // stock
            undefined, // id
            undefined, // userId
            this.pkg.clientId // clientId
          );

          // Filter attentions that belong to this package
          // Attentions have a direct property named packageId

          this.packageAttentions = (allAttentions || []).filter(att => {
            // Use String() to ensure both are strings for comparison
            const attPackageId = String(att.packageId || '').trim();
            const pkgId = String(this.pkg.id || '').trim();
            const matches = attPackageId === pkgId && attPackageId !== '';
            if (att.packageId || this.pkg.id) {
            }
            return matches;
          });
        }
      } catch (error) {
        console.error('Error loading package attentions:', error);
        this.packageAttentions = [];
      } finally {
        this.loadingAttentions = false;
      }
    },
    async loadPackageBookings() {
      if (!this.pkg?.id || !this.commerce?.id) return;
      // Allow reloading even if already loading to ensure fresh data
      if (this.loadingBookings) return;
      try {
        this.loadingBookings = true;
        // If package has bookingsId array, we can use it directly
        if (
          this.pkg.bookingsId &&
          Array.isArray(this.pkg.bookingsId) &&
          this.pkg.bookingsId.length > 0
        ) {
          // For now, we'll still load all and filter, but we could optimize this later
          // by creating a service method to get bookings by IDs
          const allBookings = await getBookingsDetails(
            this.commerce.id,
            null, // from
            null, // to
            null, // commerceIds
            1, // page
            100, // limit
            null, // searchText
            null, // queueId
            false, // asc
            null, // serviceId
            null, // status
            this.pkg.clientId // clientId
          );
          // Filter bookings that belong to this package
          // Load all bookings for the package, pendingBookings computed will filter to only PENDING
          this.packageBookings = (allBookings || []).filter(
            booking => this.pkg.bookingsId.includes(booking.id) || booking.packageId === this.pkg.id,
          );
        } else {
          // Fallback: load all bookings for client and filter by packageId
          const allBookings = await getBookingsDetails(
            this.commerce.id,
            null, // from
            null, // to
            null, // commerceIds
            1, // page
            100, // limit
            null, // searchText
            null, // queueId
            false, // asc
            null, // serviceId
            null, // status
            this.pkg.clientId // clientId
          );
          // Filter bookings that belong to this package
          // Load all bookings for the package, pendingBookings computed will filter to only PENDING
          this.packageBookings = (allBookings || []).filter(
            booking => booking.packageId === this.pkg.id
          );
        }
      } catch (error) {
        console.error('Error loading package bookings:', error);
        this.packageBookings = [];
      } finally {
        this.loadingBookings = false;
      }
    },
    getAttentionStatusClass(status) {
      if (status === 'TERMINATED') return 'status-terminated';
      if (status === 'PROCESSING') return 'status-processing';
      if (status === 'PENDING') return 'status-pending';
      return 'status-default';
    },
    getBookingStatusClass(status) {
      if (status === 'PENDING') return 'status-pending';
      if (status === 'CONFIRMED') return 'status-confirmed';
      if (status === 'CANCELLED') return 'status-cancelled';
      return 'status-default';
    },
    async handlePause() {
      if (!confirm(this.$t('package.confirmPause') || '¿Pausar este paquete?')) return;
      try {
        this.loading = true;
        await pausePackage(this.pkg.id);
        this.$emit('package-updated');
        this.$emit('refresh');
      } catch (error) {
        alert(this.$t('package.errorPause') || 'Error al pausar el paquete');
      } finally {
        this.loading = false;
      }
    },
    async handleResume() {
      try {
        this.loading = true;
        await resumePackage(this.pkg.id);
        this.$emit('package-updated');
        this.$emit('refresh');
      } catch (error) {
        alert(this.$t('package.errorResume') || 'Error al reanudar el paquete');
      } finally {
        this.loading = false;
      }
    },
    showCancelConfirmation() {
      this.showCancelConfirm = true;
    },
    async handleCancel() {
      try {
        this.loading = true;
        await cancelPackage(this.pkg.id);
        this.showCancelConfirm = false;
        this.$emit('package-updated');
        this.$emit('refresh');
      } catch (error) {
        alert(this.$t('package.errorCancel') || 'Error al cancelar el paquete');
      } finally {
        this.loading = false;
      }
    },
    cancelCancelConfirmation() {
      this.showCancelConfirm = false;
    },
    goToBooking() {
      // Emit event to open attention creation modal with package pre-selected
      const packageServiceId =
        this.pkg.servicesId && this.pkg.servicesId.length === 1 ? this.pkg.servicesId[0] : null;

      // Find queue that has the package serviceId
      let preselectedQueue = null;
      if (packageServiceId && this.queues && this.queues.length > 0) {
        preselectedQueue = this.queues.find(
          queue =>
            // Check if queue has the serviceId in its servicesId array or serviceId property
            queue.serviceId === packageServiceId ||
            (queue.servicesId &&
              Array.isArray(queue.servicesId) &&
              queue.servicesId.includes(packageServiceId)),
        );
      }

      this.$emit('open-attention-modal', {
        clientId: this.pkg.clientId,
        packageId: this.pkg.id,
        serviceId: packageServiceId,
        queue: preselectedQueue,
      });
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler(newVal) {
        this.extendedEntity = newVal;
        // Load data when modal is opened
        if (newVal && this.pkg?.id && this.commerce?.id) {
          await this.loadPackageAttentions();
          await this.loadPackageBookings();
        }
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler(newVal) {
        // Load data when details are expanded (either via prop or click)
        if (newVal && this.pkg?.id && this.commerce?.id) {
          await this.loadPackageAttentions();
          await this.loadPackageBookings();
        }
      },
    },
    packageData: {
      immediate: true,
      deep: true,
      async handler(newPkg) {
        // Load data when package data is available (when modal opens)
        if (newPkg?.id && this.commerce?.id) {
          // Load data immediately when package is available
          await this.loadPackageAttentions();
          await this.loadPackageBookings();
          await this.loadPackageIncomes();
        }
      },
    },
    // Watch for changes in packageAttentions and packageBookings to force recalculation
    packageAttentions: {
      deep: true,
      handler() {
        // Force Vue to recalculate computed properties when attentions change
        this.$nextTick(() => {
          // Computed properties will automatically recalculate
        });
      },
    },
    packageBookings: {
      deep: true,
      handler() {
        // Force Vue to recalculate computed properties when bookings change
        this.$nextTick(() => {
          // Computed properties will automatically recalculate
        });
      },
    },
  },
  mounted() {
    // Load data when component is mounted (when modal opens)
    if (this.pkg?.id && this.commerce?.id) {
      // Use nextTick to ensure component is fully mounted
      this.$nextTick(() => {
        this.loadPackageAttentions();
        this.loadPackageBookings();
        this.loadPackageIncomes();
      });
    }
  },
};
</script>

<template>
  <div v-if="show && pkg">
    <!-- Ultra Compact Package Row - Clickable -->
    <div
      class="client-row-card"
      :class="getCardTypeClass()"
      :style="disableClick ? 'cursor: default;' : ''"
      @click="disableClick ? null : showDetails()"
    >
      <div class="client-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('package.status') || 'Estado del paquete' }}: {{ pkg.status }}</div>
          </template>
          <div class="client-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="`bi ${clasifyStatus(pkg.status)}`"></i>
          </div>
        </Popper>

        <!-- Package Name & Progress -->
        <div class="package-info-inline">
          <div class="package-name-inline">
            <span class="package-name-text">{{ pkg.name || 'Paquete' }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('package.copy') || 'Copiar datos del paquete' }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyPackage()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <!-- Intelligent Session Progress Bar -->
          <div class="package-progress-inline">
            <div class="session-progress-container">
              <div class="session-progress-bar">
                <div
                  class="session-progress-fill"
                  :style="{
                    width: `${sessionsProgress}%`,
                    backgroundColor: getProgressBarColor(),
                  }"
                ></div>
              </div>
              <span class="session-progress-text">
                {{ calculatedProceduresUsed }} / {{ pkg.proceduresAmount || 0 }}
                <span class="session-remaining-badge" :class="{ 'low-sessions': isLowSessions }">
                  {{ sessionsRemaining }} {{ $t('package.sessionsLeft') || 'restantes' }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <!-- Expiration Badge -->
          <div
            v-if="pkg.expireAt"
            class="status-badge-inline expiration-badge"
            :class="{ 'warning-badge': isExpiringSoon }"
            @click.stop
          >
            <i class="bi bi-calendar-x-fill"></i>
            <span>{{ getDate(pkg.expireAt) }}</span>
            <span v-if="isExpiringSoon" class="expiring-soon-indicator">
              ({{ daysUntilExpiry }}d)
            </span>
          </div>
          <!-- Last Session Date -->
          <div v-if="pkg.lastSessionDate" class="status-badge-inline date-badge" @click.stop>
            <i class="bi bi-calendar-check-fill"></i>
            <span>{{ getDate(pkg.lastSessionDate) }}</span>
          </div>
        </div>

        <!-- Collapse Icon -->
        <div class="collapse-icon-wrapper">
          <i
            class="bi collapse-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
        </div>
      </div>
    </div>

    <!-- Expandable Details Section -->
    <div class="details-expandable-section">
      <Spinner :show="loading"></Spinner>
      <Transition name="details-expand">
        <div v-if="extendedEntity" class="detailed-data">
          <!-- Package Overview Section -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-box-seam-fill"></i>
              <span class="info-section-title-compact">{{
                $t('package.overview') || 'Resumen del Paquete'
              }}</span>
            </div>
            <div class="package-overview-grid">
              <!-- Sessions Progress Card -->
              <div class="package-stat-card">
                <div class="stat-card-header">
                  <i class="bi bi-graph-up-arrow"></i>
                  <span class="stat-card-label">{{ $t('package.sessions') || 'Sesiones' }}</span>
                </div>
                <div class="stat-card-value">
                  <span class="stat-number">{{ calculatedProceduresUsed }}</span>
                  <span class="stat-separator">/</span>
                  <span class="stat-number">{{ pkg.proceduresAmount || 0 }}</span>
                </div>
                <div class="stat-card-progress">
                  <div class="progress-bar-full">
                    <div
                      class="progress-bar-fill"
                      :style="{
                        width: `${sessionsProgress}%`,
                        backgroundColor: getProgressBarColor(),
                      }"
                    ></div>
                  </div>
                </div>
                <div class="stat-card-footer">
                  <span class="stat-footer-text" :class="{ 'warning-text': isLowSessions }">
                    {{ sessionsRemaining }}
                    {{ $t('package.sessionsRemaining') || 'sesiones restantes' }}
                  </span>
                </div>
              </div>

              <!-- Status Card -->
              <div class="package-stat-card">
                <div class="stat-card-header">
                  <i class="bi" :class="clasifyStatus(pkg.status)"></i>
                  <span class="stat-card-label">{{ $t('package.status') || 'Estado' }}</span>
                </div>
                <div class="stat-card-value">
                  <span class="stat-badge" :class="`status-${pkg.status?.toLowerCase()}`">
                    {{ pkg.status }}
                  </span>
                </div>
                <div class="stat-card-footer">
                  <span class="stat-footer-text">
                    {{ $t(`package.status.${pkg.status}`) || pkg.status }}
                  </span>
                </div>
              </div>

              <!-- Expiration Card -->
              <div v-if="pkg.expireAt" class="package-stat-card">
                <div class="stat-card-header">
                  <i class="bi bi-calendar-x-fill" :class="{ 'red-icon': isExpiringSoon }"></i>
                  <span class="stat-card-label">{{
                    $t('package.expiration') || 'Vencimiento'
                  }}</span>
                </div>
                <div class="stat-card-value">
                  <span class="stat-date">{{ getDate(pkg.expireAt) }}</span>
                </div>
                <div class="stat-card-footer">
                  <span class="stat-footer-text" :class="{ 'warning-text': isExpiringSoon }">
                    <template v-if="isExpiringSoon">
                      <i class="bi bi-exclamation-triangle-fill"></i>
                      {{ $t('package.expiringSoon') || 'Vence pronto' }} ({{ daysUntilExpiry }}
                      {{ $t('package.days') || 'días' }})
                    </template>
                    <template v-else-if="daysUntilExpiry > 0">
                      {{ daysUntilExpiry }} {{ $t('package.daysLeft') || 'días restantes' }}
                    </template>
                    <template v-else>
                      {{ $t('package.expired') || 'Vencido' }}
                    </template>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Package Attentions & Bookings -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-list-check"></i>
              <span class="info-section-title-compact">{{
                $t('package.attentionsAndBookings') || 'Atenciones y Reservas'
              }}</span>
            </div>

            <!-- Pending Attentions -->
            <div v-if="loadingAttentions" class="centered">
              <Spinner :show="true"></Spinner>
            </div>
            <div v-else-if="pendingAttentions.length > 0" class="package-items-list">
              <div class="package-items-header">
                <i class="bi bi-clock-history"></i>
                <span>{{
                  $t('package.pendingAttentions') || 'Atenciones (Pendientes/En Proceso/Terminadas)'
                }}</span>
                <span class="items-count">({{ pendingAttentions.length }})</span>
              </div>
              <div
                v-for="(attention, idx) in pendingAttentions"
                :key="`att-${idx}`"
                class="package-item-card"
                :class="getAttentionStatusClass(attention.status)"
              >
                <div class="package-item-info">
                  <div class="package-item-main">
                    <span
                      class="package-item-status-badge"
                      :class="getAttentionStatusClass(attention.status)"
                    >
                      {{ attention.status }}
                    </span>
                    <span class="package-item-number">#{{ attention.number }}</span>
                    <span v-if="attention.queueName" class="package-item-queue">{{
                      attention.queueName
                    }}</span>
                  </div>
                  <div class="package-item-details">
                    <span v-if="attention.createdDate" class="package-item-date">
                      <i class="bi bi-calendar"></i>
                      {{ getDate(attention.createdDate) }}
                    </span>
                    <span v-if="attention.block?.blockNumbers" class="package-item-blocks">
                      <i class="bi bi-grid-3x3"></i>
                      Bloques: {{ attention.block.blockNumbers.join(', ') }}
                    </span>
                    <span v-if="attention.serviceName" class="package-item-service">
                      <i class="bi bi-briefcase"></i>
                      {{ attention.serviceName }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pending Bookings -->
            <div v-if="loadingBookings" class="centered">
              <Spinner :show="true"></Spinner>
            </div>
            <div v-else-if="pendingBookings.length > 0" class="package-items-list">
              <div class="package-items-header">
                <i class="bi bi-calendar-check"></i>
                <span>{{ $t('package.pendingBookings') || 'Reservas Pendientes' }}</span>
                <span class="items-count">({{ pendingBookings.length }})</span>
              </div>
              <div
                v-for="(booking, idx) in pendingBookings"
                :key="`book-${idx}`"
                class="package-item-card"
                :class="getBookingStatusClass(booking.status)"
              >
                <div class="package-item-info">
                  <div class="package-item-main">
                    <span
                      class="package-item-status-badge"
                      :class="getBookingStatusClass(booking.status)"
                    >
                      {{ booking.status }}
                    </span>
                    <span v-if="booking.queueName" class="package-item-queue">{{
                      booking.queueName
                    }}</span>
                  </div>
                  <div class="package-item-details">
                    <span v-if="booking.date" class="package-item-date">
                      <i class="bi bi-calendar"></i>
                      {{ getDate(booking.date) }}
                    </span>
                    <span v-if="booking.hour" class="package-item-time">
                      <i class="bi bi-clock"></i>
                      {{ booking.hour }}
                    </span>
                    <span v-if="booking.block?.blockNumbers" class="package-item-blocks">
                      <i class="bi bi-grid-3x3"></i>
                      Bloques: {{ booking.block.blockNumbers.join(', ') }}
                    </span>
                    <span v-if="booking.serviceName" class="package-item-service">
                      <i class="bi bi-briefcase"></i>
                      {{ booking.serviceName }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="
                !loadingAttentions &&
                !loadingBookings &&
                pendingAttentions.length === 0 &&
                pendingBookings.length === 0
              "
              class="package-items-empty"
            >
              <i class="bi bi-info-circle"></i>
              <span>{{
                $t('package.noAttentionsOrBookings') ||
                'No hay atenciones o reservas para este paquete'
              }}</span>
            </div>

            <!-- Create New Reservation Button -->
            <div class="package-create-reservation">
              <button
                class="btn btn-sm btn-dark rounded-pill px-3"
                :class="{ 'btn-secondary': !canCreateNewReservation }"
                :disabled="!canCreateNewReservation"
                @click.stop="goToBooking()"
              >
                <i class="bi bi-calendar-plus"></i>
                {{ $t('package.createReservation') || 'Crear Reserva/Atención' }}
                <span v-if="sessionsRemaining > 0" class="sessions-remaining-indicator">
                  ({{ sessionsRemaining }} {{ $t('package.sessionsLeft') || 'sesiones restantes' }})
                </span>
              </button>
              <div v-if="!canCreateNewReservation" class="reservation-disabled-message">
                <i class="bi bi-info-circle"></i>
                <span>{{
                  $t('package.maxSessionsReached') || 'Se alcanzó el máximo de sesiones del paquete'
                }}</span>
              </div>
            </div>
          </div>

          <!-- Package Payment Information Section -->
          <div v-if="paymentInfo && paymentInfo.hasPayment" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-credit-card-fill"></i>
              <span class="info-section-title">{{
                $t('package.paymentInfo') || 'Información de Pago'
              }}</span>
            </div>
            <div class="package-payment-grid">
              <!-- Total Amount Card -->
              <div class="package-payment-card">
                <div class="payment-card-header">
                  <i class="bi bi-coin"></i>
                  <span class="payment-card-label">{{
                    $t('package.totalAmount') || 'Monto Total'
                  }}</span>
                </div>
                <div class="payment-card-value">
                  {{ paymentInfo.totalAmount }} {{ commerce?.currency || 'BRL' }}
                </div>
              </div>

              <!-- Paid Amount Card -->
              <div class="package-payment-card">
                <div class="payment-card-header">
                  <i class="bi bi-check-circle-fill green-icon"></i>
                  <span class="payment-card-label">{{ $t('package.paidAmount') || 'Pagado' }}</span>
                </div>
                <div class="payment-card-value">
                  {{ paymentInfo.paidAmount }} {{ commerce?.currency || 'BRL' }}
                </div>
                <div class="payment-card-progress">
                  <div class="progress-bar-full">
                    <div
                      class="progress-bar-fill"
                      :style="{
                        width: `${paymentInfo.paymentPercentage}%`,
                        backgroundColor: paymentInfo.isFullyPaid ? '#00c2cb' : '#004aad',
                      }"
                    ></div>
                  </div>
                </div>
                <div class="payment-card-footer">
                  <span class="payment-footer-text">{{ paymentInfo.paymentPercentage }}%</span>
                </div>
              </div>

              <!-- Remaining Amount Card -->
              <div class="package-payment-card" :class="{ 'fully-paid': paymentInfo.isFullyPaid }">
                <div class="payment-card-header">
                  <i
                    class="bi"
                    :class="
                      paymentInfo.isFullyPaid
                        ? 'bi-check-circle-fill green-icon'
                        : 'bi-clock-history'
                    "
                  ></i>
                  <span class="payment-card-label">{{
                    $t('package.remainingAmount') || 'Pendiente'
                  }}</span>
                </div>
                <div
                  class="payment-card-value"
                  :class="{ 'fully-paid-value': paymentInfo.isFullyPaid }"
                >
                  {{ paymentInfo.remainingAmount }} {{ commerce?.currency || 'BRL' }}
                </div>
                <div v-if="paymentInfo.isFullyPaid" class="payment-card-footer">
                  <span class="payment-footer-text fully-paid-text">
                    <i class="bi bi-check-circle-fill"></i>
                    {{ $t('package.fullyPaid') || 'Completamente Pagado' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Payment Actions -->
            <div v-if="!paymentInfo.isFullyPaid" class="package-payment-actions">
              <button
                class="btn btn-sm btn-dark rounded-pill px-3"
                @click.stop="openPaymentForm(false)"
                :disabled="loadingIncomes"
              >
                <i class="bi bi-credit-card"></i>
                {{ $t('package.payRemaining') || 'Pagar Restante' }} ({{
                  paymentInfo.remainingAmount
                }}
                {{ commerce?.currency || 'BRL' }})
              </button>
              <button
                class="btn btn-sm btn-outline-dark rounded-pill px-3"
                @click.stop="openPaymentForm(true)"
                :disabled="loadingIncomes"
              >
                <i class="bi bi-wallet2"></i>
                {{ $t('package.prepayComplete') || 'Preparar Todo el Paquete' }} ({{
                  paymentInfo.totalAmount
                }}
                {{ commerce?.currency || 'BRL' }})
              </button>
            </div>

            <!-- Payment History -->
            <div v-if="packageIncomes.length > 0" class="package-payment-history">
              <div class="payment-history-header">
                <i class="bi bi-list-ul"></i>
                <span class="payment-history-title">{{
                  $t('package.paymentHistory') || 'Historial de Pagos'
                }}</span>
                <span class="payment-history-count">({{ packageIncomes.length }})</span>
              </div>
              <div class="payment-history-list">
                <div
                  v-for="(income, idx) in packageIncomes"
                  :key="`income-${idx}`"
                  class="payment-history-item"
                  :class="{ pending: income.status === 'PENDING' }"
                >
                  <div class="payment-history-item-main">
                    <span
                      class="payment-history-status"
                      :class="`status-${income.status?.toLowerCase()}`"
                    >
                      {{
                        income.status === 'CONFIRMED'
                          ? $t('package.confirmed') || 'Confirmado'
                          : $t('package.pending') || 'Pendiente'
                      }}
                    </span>
                    <span class="payment-history-amount">
                      {{ income.amount }} {{ commerce?.currency || 'BRL' }}
                    </span>
                    <span v-if="income.installments > 1" class="payment-history-installment">
                      {{ $t('package.installment') || 'Cuota' }} {{ income.installmentNumber }}/{{
                        income.installments
                      }}
                    </span>
                  </div>
                  <div class="payment-history-item-details">
                    <span v-if="income.paymentMethod" class="payment-history-method">
                      {{
                        $t(`paymentClientMethods.${income.paymentMethod}`) || income.paymentMethod
                      }}
                    </span>
                    <span v-if="income.createdAt" class="payment-history-date">
                      {{ getDate(income.createdAt) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Package Details Section -->
          <div class="info-section">
            <div class="info-section-header">
              <i class="bi bi-info-circle-fill"></i>
              <span class="info-section-title">{{ $t('package.details') || 'Detalles' }}</span>
            </div>
            <div class="info-badges">
              <span
                v-if="pkg.servicesId && pkg.servicesId.length > 0"
                class="info-badge services-badge"
              >
                <span class="badge-label">{{ $t('package.services') || 'Servicios' }}</span>
                <span v-for="(serviceId, idx) in pkg.servicesId" :key="idx" class="service-tag">
                  {{ serviceId }}
                </span>
              </span>
              <span v-if="pkg.type" class="info-badge">
                <span class="badge-label">{{ $t('package.type') || 'Tipo' }}</span>
                <span class="badge-value">{{ pkg.type }}</span>
              </span>
              <span v-if="pkg.totalAmount" class="info-badge">
                <i class="bi bi-coin"></i>
                <span class="badge-label">{{ $t('package.totalAmount') || 'Monto Total' }}</span>
                <span class="badge-value">{{ pkg.totalAmount }}</span>
              </span>
              <span v-if="pkg.paid" class="info-badge">
                <i class="bi bi-check-circle-fill green-icon"></i>
                <span class="badge-label">{{ $t('package.paid') || 'Pagado' }}</span>
              </span>
              <span v-if="pkg.lastSessionDate" class="info-badge">
                <i class="bi bi-calendar-check-fill"></i>
                <span class="badge-label">{{ $t('package.lastSession') || 'Última Sesión' }}</span>
                <span class="badge-value">{{ getDate(pkg.lastSessionDate) }}</span>
              </span>
              <span v-if="pkg.nextRecommendedSessionDate" class="info-badge">
                <i class="bi bi-calendar-event"></i>
                <span class="badge-label">{{
                  $t('package.nextRecommended') || 'Próxima Recomendada'
                }}</span>
                <span class="badge-value">{{ getDate(pkg.nextRecommendedSessionDate) }}</span>
              </span>
            </div>
          </div>

          <!-- Quick Actions Section -->
          <div class="info-section">
            <div class="info-section-header">
              <i class="bi bi-lightning-fill"></i>
              <span class="info-section-title">{{
                $t('package.actions') || 'Acciones Rápidas'
              }}</span>
            </div>
            <div class="package-actions-grid">
              <button
                v-if="pkg.status === 'ACTIVE' || pkg.status === 'CONFIRMED'"
                class="action-btn-package pause-btn"
                @click.stop="handlePause()"
                :disabled="loading"
              >
                <i class="bi bi-pause-circle-fill"></i>
                <span>{{ $t('package.pause') || 'Pausar' }}</span>
              </button>
              <button
                v-if="pkg.status === 'PAUSED'"
                class="action-btn-package resume-btn"
                @click.stop="handleResume()"
                :disabled="loading"
              >
                <i class="bi bi-play-circle-fill"></i>
                <span>{{ $t('package.resume') || 'Reanudar' }}</span>
              </button>
              <button
                v-if="canBookNextSession"
                class="action-btn-package book-btn"
                @click.stop="goToBooking()"
              >
                <i class="bi bi-calendar-plus"></i>
                <span>{{ $t('package.bookSession') || 'Reservar Sesión' }}</span>
              </button>
              <button
                v-if="pkg.status !== 'CANCELLED' && pkg.status !== 'COMPLETED'"
                class="action-btn-package cancel-btn"
                @click.stop="showCancelConfirmation()"
                :disabled="loading"
              >
                <i class="bi bi-x-circle-fill"></i>
                <span>{{ $t('package.cancel') || 'Cancelar' }}</span>
              </button>
            </div>
            <AreYouSure
              :show="showCancelConfirm"
              @actionYes="handleCancel()"
              @actionNo="cancelCancelConfirmation()"
            />
          </div>

          <!-- Metadata Section -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ pkg.id }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label">{{ $t('package.created') || 'Creado' }}:</span>
              <span class="metadata-value">{{ getDate(pkg.createdAt) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Ultra Compact Package Row - Inherit from BookingDetailsCard */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: 0;
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-bottom: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  cursor: pointer;
  z-index: 1;
}

.client-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

/* Client Row Content - Ultra Compact Horizontal Layout */
.client-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.client-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.client-icon-mini i {
  font-size: 0.9375rem;
}

.client-row-card:hover .client-icon-mini {
  transform: scale(1.05);
}

.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
}

.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.icon-info {
  background: rgba(0, 74, 173, 0.12);
  color: #004aad;
}

.icon-default {
  background: rgba(169, 169, 169, 0.12);
  color: #a9a9a9;
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.1875rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.75rem;
}

.status-badge-inline:hover {
  background: rgba(169, 169, 169, 0.15);
  border-color: rgba(169, 169, 169, 0.2);
}

.status-badge-inline i {
  font-size: 0.75rem;
}

.status-badge-inline span {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

/* Card Type Variations */
.client-card-success {
  border-left: 2px solid #00c2cb;
}

.client-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.client-card-warning {
  border-left: 2px solid #f9c322;
}

.client-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.client-card-error {
  border-left: 2px solid #a52a2a;
}

.client-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

.client-card-info {
  border-left: 2px solid #004aad;
}

.client-card-info:hover {
  background: rgba(0, 74, 173, 0.03);
}

.client-card-default {
  border-left: 2px solid rgba(169, 169, 169, 0.3);
}

/* Package-specific additions */
.package-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.package-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.package-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.package-progress-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.session-progress-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.session-progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(169, 169, 169, 0.15);
  border-radius: 9999px;
  overflow: hidden;
  min-width: 60px;
}

.session-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.session-progress-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.session-remaining-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  background: rgba(0, 194, 203, 0.1);
  color: #00c2cb;
  font-weight: 700;
}

.session-remaining-badge.low-sessions {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
  animation: pulse-warning 2s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.sessions-badge {
  background: rgba(0, 194, 203, 0.12);
  border-color: rgba(0, 194, 203, 0.2);
}

.sessions-badge.warning-badge {
  background: rgba(249, 195, 34, 0.15);
  border-color: rgba(249, 195, 34, 0.3);
}

.sessions-badge.danger-badge {
  background: rgba(165, 42, 42, 0.15);
  border-color: rgba(165, 42, 42, 0.3);
}

.expiration-badge {
  background: rgba(169, 169, 169, 0.08);
}

.expiration-badge.warning-badge {
  background: rgba(249, 195, 34, 0.15);
  border-color: rgba(249, 195, 34, 0.3);
}

.expiring-soon-indicator {
  font-size: 0.625rem;
  font-weight: 700;
  color: #f9c322;
  margin-left: 0.25rem;
}

.warning-icon {
  font-size: 0.75rem;
  color: #f9c322;
  margin-left: 0.125rem;
}

/* Package Overview Grid */
.package-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.package-stat-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.package-stat-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.stat-card-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.stat-card-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stat-card-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
}

.stat-separator {
  font-size: 1rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.4);
}

.stat-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active,
.status-confirmed {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.status-paused {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.status-completed {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.status-expired,
.status-cancelled {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.stat-date {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
}

.stat-card-progress {
  margin-bottom: 0.5rem;
}

.progress-bar-full {
  width: 100%;
  height: 8px;
  background: rgba(169, 169, 169, 0.15);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.stat-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-footer-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.stat-footer-text.warning-text {
  color: #f9c322;
  font-weight: 700;
}

/* Recommended Dates */
.recommended-dates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.recommended-date-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recommended-date-card:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  transform: translateX(4px);
}

.recommended-date-card i:first-child {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.recommended-date-text {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
}

.recommended-date-arrow {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease;
}

.recommended-date-card:hover .recommended-date-arrow {
  transform: translateX(4px);
  color: #00c2cb;
}

.recommended-dates-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(169, 169, 169, 0.05);
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.recommended-dates-action {
  margin-top: 0.75rem;
  display: flex;
  justify-content: center;
}

/* Package Actions */
.package-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.action-btn-package {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-package:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-btn-package:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn-package.pause-btn {
  border-color: rgba(249, 195, 34, 0.3);
  color: #f9c322;
}

.action-btn-package.pause-btn:hover:not(:disabled) {
  background: rgba(249, 195, 34, 0.1);
  border-color: rgba(249, 195, 34, 0.5);
}

.action-btn-package.resume-btn {
  border-color: rgba(0, 194, 203, 0.3);
  color: #00c2cb;
}

.action-btn-package.resume-btn:hover:not(:disabled) {
  background: rgba(0, 194, 203, 0.1);
  border-color: rgba(0, 194, 203, 0.5);
}

.action-btn-package.book-btn {
  border-color: rgba(0, 74, 173, 0.3);
  color: #004aad;
  background: rgba(0, 74, 173, 0.05);
}

.action-btn-package.book-btn:hover:not(:disabled) {
  background: rgba(0, 74, 173, 0.15);
  border-color: rgba(0, 74, 173, 0.5);
}

.action-btn-package.cancel-btn {
  border-color: rgba(165, 42, 42, 0.3);
  color: #a52a2a;
}

.action-btn-package.cancel-btn:hover:not(:disabled) {
  background: rgba(165, 42, 42, 0.1);
  border-color: rgba(165, 42, 42, 0.5);
}

.action-btn-package i {
  font-size: 0.875rem;
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: rgba(245, 246, 247, 0.4);
  border: 1px solid rgba(169, 169, 169, 0.1);
  border-top: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.detailed-data {
  padding: 0.625rem;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible;
  background: rgba(250, 251, 252, 0.4);
  position: relative;
}

/* Info Sections - Ultra Compact */
.info-section {
  margin-bottom: 0.75rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.15);
}

.info-section-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Compact Section Styles */
.compact-section {
  margin-bottom: 0.75rem;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.12);
}

.info-section-header-compact i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title-compact {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Info Badges */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.info-badge.services-badge {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.service-tag {
  padding: 0.125rem 0.375rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
}

.badge-label {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
}

.badge-value {
  color: #000000;
}

/* Metadata Section */
.metadata-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-label {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
}

.metadata-value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  margin: 0 0.125rem;
}

/* Transition for expandable details */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 800px;
  opacity: 1;
}

/* Package Items List (Attentions & Bookings) */
.package-items-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.package-items-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.25rem;
}

.package-items-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.items-count {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
}

.package-item-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  padding: 0.625rem;
  transition: all 0.2s ease;
}

.package-item-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateX(2px);
}

.package-item-card.status-pending {
  border-left: 3px solid #f9c322;
}

.package-item-card.status-terminated {
  border-left: 3px solid #00c2cb;
}

.package-item-card.status-confirmed {
  border-left: 3px solid #004aad;
}

.package-item-card.status-cancelled {
  border-left: 3px solid #a52a2a;
}

.package-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.package-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.package-item-status-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.package-item-status-badge.status-pending {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.package-item-status-badge.status-terminated {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.package-item-status-badge.status-confirmed {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.package-item-status-badge.status-cancelled {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.package-item-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
}

.package-item-queue {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  padding: 0.125rem 0.375rem;
  background: rgba(0, 74, 173, 0.1);
  border-radius: 4px;
}

.package-item-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.package-item-details i {
  font-size: 0.75rem;
  margin-right: 0.125rem;
}

.package-item-date,
.package-item-time,
.package-item-blocks,
.package-item-service {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Package Payment Information */
.package-payment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.package-payment-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.package-payment-card:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.package-payment-card.fully-paid {
  background: rgba(0, 194, 203, 0.05);
  border-color: rgba(0, 194, 203, 0.2);
}

.payment-card-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
}

.payment-card-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.payment-card-header .green-icon {
  color: #00c2cb;
}

.payment-card-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-card-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.5rem;
}

.payment-card-value.fully-paid-value {
  color: #00c2cb;
}

.payment-card-progress {
  margin-bottom: 0.5rem;
}

.payment-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.payment-footer-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.payment-footer-text.fully-paid-text {
  color: #00c2cb;
  font-weight: 700;
}

.package-payment-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.package-payment-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.package-payment-history {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

.payment-history-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-history-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.payment-history-title {
  flex: 1;
}

.payment-history-count {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
}

.payment-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-history-item {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  padding: 0.625rem;
  transition: all 0.2s ease;
}

.payment-history-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateX(2px);
}

.payment-history-item.pending {
  border-left: 3px solid #f9c322;
}

.payment-history-item-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.375rem;
}

.payment-history-status {
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-history-status.status-confirmed {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.payment-history-status.status-pending {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.payment-history-amount {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
}

.payment-history-installment {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
}

.payment-history-item-details {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.payment-history-method,
.payment-history-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.package-items-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(169, 169, 169, 0.05);
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.package-create-reservation {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.package-create-reservation .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sessions-remaining-indicator {
  font-size: 0.6875rem;
  font-weight: 600;
  opacity: 0.8;
}

.reservation-disabled-message {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  font-style: italic;
}

.reservation-disabled-message i {
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .package-overview-grid {
    grid-template-columns: 1fr;
  }

  .recommended-dates-grid {
    grid-template-columns: 1fr;
  }

  .package-actions-grid {
    grid-template-columns: 1fr;
  }

  .session-progress-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .session-progress-bar {
    width: 100%;
  }

  .package-item-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
