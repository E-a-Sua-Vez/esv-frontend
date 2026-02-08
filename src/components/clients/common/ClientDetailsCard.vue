<script>
import { contactClient } from '../../../application/services/client';
import { globalStore } from '../../../stores';
import {
  getClientContactsDetailsByClientId,
  getPatientHistoryDetails,
  getBookingsDetails,
} from '../../../application/services/query-stack';
import { getPackagesByClient } from '../../../application/services/package';
import { getPatientHistoryItemByCommerce } from '../../../application/services/patient-history-item';
import { getFormsByClient } from '../../../application/services/form';
import { getFormPersonalizedByCommerceId } from '../../../application/services/form-personalized';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import { getPermissions } from '../../../application/services/permissions';
import {
  sendPreprontuarioWhatsapp,
  sendAgreementWhatsapp,
  checkPreprontuarioStatus,
  checkAgreementStatus,
} from '../../../application/services/whatsapp-notification';
import { getActiveFeature } from '../../../shared/features';
import { Modal } from 'bootstrap';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ClientAttentionsManagement from '../domain/ClientAttentionsManagement.vue';
import ClientContactsManagement from '../domain/ClientContactsManagement.vue';
import PatientHistoryManagement from '../../patient-history/domain/PatientHistoryManagement.vue';
import ClientBookingsManagement from '../domain/ClientBookingsManagement.vue';
import ClientPackagesManagement from '../domain/ClientPackagesManagement.vue';
import ClientDataManagement from '../domain/ClientDataManagement.vue';
import AttentionCreationModal from '../../attentions/domain/AttentionCreationModal.vue';
import LgpdConsentManager from '../../lgpd/LgpdConsentManager.vue';
import LgpdDataPortability from '../../lgpd/LgpdDataPortability.vue';
import { getGroupedQueueByCommerceId } from '../../../application/services/queue';
import { searchClientByIdNumber, getClientById } from '../../../application/services/client';
import { getConsentStatus } from '../../../application/services/consent';
import { getProfessionalsByCommerce } from '../../../application/services/professional';

export default {
  name: 'ClientDetailsCard',
  components: {
    Popper,
    Spinner,
    SimpleDownloadCard,
    ClientAttentionsManagement,
    ClientContactsManagement,
    PatientHistoryManagement,
    ClientBookingsManagement,
    ClientPackagesManagement,
    ClientDataManagement,
    AttentionCreationModal,
    LgpdConsentManager,
    LgpdDataPortability,
  },
  props: {
    show: { type: Boolean, default: true },
    client: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: true },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    services: { type: Array, default: undefined },
    management: { type: Boolean, default: true },
    attention: { type: Object, default: undefined }, // Optional: current attention context
    queue: { type: Object, default: undefined }, // Optional: current queue context
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      extendedEntity: true,
      checked: false,
      asc: false,
      store,
      userType: undefined,
      user: undefined,
      page: 1,
      limit: 10,
      attentions: [],
      bookings: [],
      packages: [],
      clientContacts: [],
      patientHistoryItems: [],
      patientForms: [],
      patientHistory: {},
      togglesClient: {},
      togglesDashboard: {},
      showClientData: false,
      preprontuarioStatus: null,
      agreementStatus: null,
      loadingPreprontuario: false,
      loadingAgreement: false,
      contactResultTypes: [
        { id: 'INTERESTED', name: 'INTERESTED' },
        { id: 'CONTACT_LATER', name: 'CONTACT_LATER' },
        { id: 'REJECTED', name: 'REJECTED' },
      ],
      // Flags para rastrear qué datos ya se han cargado (lazy loading)
      loadedQueues: null, // Cache para queues cargadas dinámicamente
      loadedProfessionals: null, // Cache para professionals cargados dinámicamente
      attentionsLoaded: false,
      bookingsLoaded: false,
      packagesLoaded: false,
      clientContactsLoaded: false,
      patientHistoryLoaded: false,
      showAttentionCreationModal: false,
      formsPersonalized: [], // Store forms to check for preprontuario
      preprontuarioActiveForContext: false, // Whether preprontuario is active for this context
      preselectedQueueForModal: null, // Queue preselected from package
      preselectedServiceIdForModal: null, // Service ID preselected from package
      preselectedPackageIdForModal: null, // Package ID preselected from package
      selectedBookingFromPackage: null, // Booking selected from package to open details
      selectedAttentionFromPackage: null, // Attention selected from package to open details
      consentStatus: null,
      loadingConsentStatus: false,
      lgpdModalVisible: false, // Track LGPD modal visibility for lazy loading
    };
  },
  methods: {
    // Removed getAttentions() method - ClientAttentionsManagement component handles its own data fetching
    // This was querying query-stack unnecessarily when the modal opened
    async getPackages(force = false) {
      // Solo cargar si no se han cargado antes, a menos que se fuerce
      if (!force && this.packagesLoaded && this.packages.length > 0) {
        return;
      }
      try {
        this.loading = true;
        // Don't clear packages array immediately to avoid triggering child watcher
        // Only clear if we're about to successfully load new data
        if (!this.commerce?.id || !this.client?.id) {
          this.loading = false;
          return;
        }
        const packagesData = await getPackagesByClient(this.commerce.id, this.client.id);
        // Flatten all packages for the component - update in one go to avoid triggering watcher with empty array
        const flattenedPackages = [
          ...(packagesData?.active || []),
          ...(packagesData?.completed || []),
          ...(packagesData?.expired || []),
          ...(packagesData?.cancelled || []),
        ];
        this.packages = flattenedPackages;
        this.packagesLoaded = true;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getBookings() {
      // Solo cargar si no se han cargado antes
      if (this.bookingsLoaded && this.bookings.length > 0) {
        return;
      }
      try {
        this.loading = true;
        this.bookings = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        // Use clientId to filter bookings directly, or fallback to searchText
        let clientId = undefined;
        let searchText = undefined;
        if (this.client?.id) {
          clientId = this.client.id; // Use client.id to filter by bookings.clientId
        } else if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.bookings = await getBookingsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.page,
          this.limit,
          searchText,
          this.queueId,
          false,
          undefined, // serviceId
          undefined, // status
          clientId // clientId - filters by bookings.clientId directly
        );
        this.bookingsLoaded = true;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getClientData() {
      // Load client data if missing before opening modal
      await this.loadClientIfDataMissing();
      // Update preprontuario status when opening edit modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }
      // ✅ Ensure showClientData is reset and set to true to trigger modal content
      this.showClientData = false;
      this.$nextTick(() => {
        this.showClientData = true;
      });
    },
    async loadClientIfDataMissing() {
      // Check if client data is missing (userPhone, userEmail, userIdNumber are not available)
      if (!this.client || !this.client.id) {
        return;
      }

      const hasPhone = this.client.userPhone && this.client.userPhone !== 'N/I';
      const hasEmail = this.client.userEmail && this.client.userEmail !== 'N/I';
      const hasIdNumber = this.client.userIdNumber && this.client.userIdNumber !== 'N/I';

      // If all data is missing, load client from API
      if (!hasPhone && !hasEmail && !hasIdNumber) {
        try {
          const loadedClient = await getClientById(this.client.id);

          if (loadedClient && loadedClient.id) {
            // Merge loaded data into existing client object to preserve reactivity
            Object.assign(this.client, {
              userPhone: loadedClient.userPhone || loadedClient.phone || this.client.userPhone,
              userEmail: loadedClient.userEmail || loadedClient.email || this.client.userEmail,
              userIdNumber:
                loadedClient.userIdNumber || loadedClient.idNumber || this.client.userIdNumber,
              userName:
                loadedClient.userName ||
                loadedClient.name ||
                this.client.userName ||
                this.client.name,
              userLastName:
                loadedClient.userLastName ||
                loadedClient.lastName ||
                this.client.userLastName ||
                this.client.lastName,
              // Preserve any other fields that might exist
              ...Object.keys(loadedClient).reduce((acc, key) => {
                if (!this.client[key] && loadedClient[key]) {
                  acc[key] = loadedClient[key];
                }
                return acc;
              }, {}),
            });
            // Force Vue to re-render
            this.$forceUpdate();
          }
        } catch (error) {
          // Non-critical error, continue without updating
        }
      }
    },
    async getClientContacts() {
      // Solo cargar si no se han cargado antes
      if (this.clientContactsLoaded && this.clientContacts.length > 0) {
        return;
      }
      try {
        this.loading = true;
        this.clientContacts = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.clientContacts = await getClientContactsDetailsByClientId(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.client.id,
          this.page,
          this.limit,
          this.daysSinceContacted,
          this.searchText,
          false,
          this.contactResultType
        );
        this.clientContactsLoaded = true;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getPatientHistory() {
      // Always load fresh data when modal opens
      try {
        this.loading = true;
        const result = await getPatientHistoryDetails(this.client.id);
        if (result && result.length > 0) {
          this.patientHistory = result[0];
        } else {
          this.patientHistory = {};
        }
        const items = await getPatientHistoryItemByCommerce(this.commerce.id);
        if (items && items.length > 0) {
          this.patientHistoryItems = items;
        } else {
          this.patientHistoryItems = [];
        }
        const forms = await getFormsByClient(this.commerce.id, this.client.id);
        if (forms && forms.length > 0) {
          this.patientForms = forms;
        } else {
          this.patientForms = [];
        }
        this.patientHistoryLoaded = true;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.client]);
      navigator.clipboard.writeText(textToCopy);
    },
    async check() {
      try {
        this.loading = true;
        if (this.client && this.client.userId) {
          const user = await contactClient(this.client.userId, {});
          this.checked = user.contacted;
        }
        this.loading = false;
      } catch (error) {
        this.checked = false;
        this.loading = false;
        this.alertError = error.message;
      }
    },
    goToCreateBooking() {
      // DEPRECATED: This method is kept for backwards compatibility but is no longer used
      // The modal is opened via data-bs-toggle on the button
    },
    async openAttentionCreationModal() {
      if (!this.commerce) {
        return;
      }

      // Update preprontuario status when opening attention creation modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }

      if (this.commerce?.id) {
        try {
          const groupedQueues = await getGroupedQueueByCommerceId(this.commerce.id);

          // Convert grouped queues object to flat array
          this.loadedQueues = Object.values(groupedQueues).flat();

          this.loadedProfessionals = await getProfessionalsByCommerce(this.commerce.id);

          // Force Vue to update by waiting for next tick
          await this.$nextTick();
        } catch (error) {
          // Error loading queues or professionals, but continue opening modal
          console.warn('Failed to load data for attention creation modal:', error);
        }
      }

      this.showAttentionCreationModal = true;
    },
    closeAttentionCreationModal() {
      this.showAttentionCreationModal = false;
      // Clear preselected data when closing
      this.preselectedQueueForModal = null;
      this.preselectedServiceIdForModal = null;
      this.preselectedPackageIdForModal = null;
    },
    handleAttentionCreated(attention) {
      // Handle when attention is successfully created
      // Refresh ClientAttentionsManagement component to show new attention (force refresh)
      if (this.$refs.attentionsManagementRef && this.$refs.attentionsManagementRef.refresh) {
        this.$refs.attentionsManagementRef.refresh(true); // Force refresh after creating attention
      }
      // Refresh packages to update sessions count
      if (
        this.$refs.packagesManagementRef &&
        this.$refs.packagesManagementRef.handleAttentionCreated
      ) {
        this.$refs.packagesManagementRef.handleAttentionCreated(attention);
      }
    },
    handleOpenAttentionModalFromPackage(data) {
      // Check if this is a request to show attention details (not create new)
      if (data.mode === 'details' && data.attention) {
        // Hide packages modal temporarily
        this.hidePackagesModal();

        // Wait a bit for the packages modal to close
        setTimeout(() => {
          // Call the openAttentionModal method directly on ClientAttentionsManagement
          if (
            this.$refs.attentionsManagementRef &&
            this.$refs.attentionsManagementRef.openAttentionModal
          ) {
            this.$refs.attentionsManagementRef.openAttentionModal(data.attention);

            // Listen for when the attention details modal closes to restore packages modal
            const checkModalClosed = setInterval(() => {
              const attentionModal = this.$refs.attentionsManagementRef?.showAttentionModal;
              if (attentionModal === false) {
                clearInterval(checkModalClosed);
                // Restore packages modal after attention details modal closes
                setTimeout(() => {
                  this.showPackagesModal();
                }, 300);
              }
            }, 500);
          } else {
            console.error('ClientAttentionsManagement ref not found or method not available');
            // Restore packages modal if error
            this.showPackagesModal();
          }
        }, 300);
      } else {
        // Open attention creation modal with package pre-selected data

        // Find the client object
        const clientForModal = this.client;

        // Prepare client data for modal
        this.attentionCreationClientData = {
          queryStackClientId: clientForModal?.queryStackId || clientForModal?.id,
          firebaseClientId: clientForModal?.clientId || clientForModal?.id, // Use actual clientId if available
          clientId: clientForModal?.clientId || clientForModal?.id, // Include clientId for AttentionCreationFlow
          sendingClientId: true, // Allow sending clientId since we have it
          hasIdNumber: !!clientForModal?.userIdNumber,
          hasEmail: !!clientForModal?.userEmail,
          hasPhone: !!clientForModal?.userPhone,
          userIdNumber: clientForModal?.userIdNumber,
          name: clientForModal?.name,
          lastName: clientForModal?.lastName,
          email: clientForModal?.userEmail,
          phone: clientForModal?.userPhone,
        };

        // Store preselected data
        this.preselectedQueueForModal = data.queue || null;
        this.preselectedServiceIdForModal = data.serviceId || null;
        this.preselectedPackageIdForModal = data.packageId || null;

        // Open the modal
        this.showAttentionCreationModal = true;
      }
    },

    handleOpenBookingModalFromPackage(booking) {
      // Hide packages modal temporarily
      this.hidePackagesModal();

      // Wait a bit for the packages modal to close
      setTimeout(() => {
        // Call the openBookingDetailsModal method directly on ClientBookingsManagement
        if (
          this.$refs.bookingsManagementRef &&
          this.$refs.bookingsManagementRef.openBookingDetailsModal
        ) {
          this.$refs.bookingsManagementRef.openBookingDetailsModal(booking);

          // Listen for when the booking details modal closes to restore packages modal
          const checkModalClosed = setInterval(() => {
            const bookingDetailsModal = document.getElementById('bookingDetailsModal');
            if (bookingDetailsModal && !bookingDetailsModal.classList.contains('show')) {
              clearInterval(checkModalClosed);
              // Restore packages modal after booking details modal closes
              setTimeout(() => {
                this.showPackagesModal();
              }, 300);
            }
          }, 500);
        } else {
          console.error('ClientBookingsManagement ref not found or method not available');
          // Restore packages modal if error
          this.showPackagesModal();
        }
      }, 300);
    },

    handleOpenPaymentFormFromPackage(paymentData) {
      // Open attention creation modal with package pre-selected for payment
      // The user will need to create an attention/booking first, then PaymentForm will open automatically

      // Find the client object
      const clientForModal = this.client;

      // Prepare client data for modal
      this.attentionCreationClientData = {
        queryStackClientId: clientForModal?.queryStackId || clientForModal?.id,
        firebaseClientId: clientForModal?.clientId || clientForModal?.id, // Use actual clientId if available
        clientId: clientForModal?.clientId || clientForModal?.id, // Include clientId for AttentionCreationFlow
        sendingClientId: true, // Allow sending clientId since we have it
        hasIdNumber: !!clientForModal?.userIdNumber,
        hasEmail: !!clientForModal?.userEmail,
        hasPhone: !!clientForModal?.userPhone,
        userIdNumber: clientForModal?.userIdNumber,
        name: clientForModal?.name,
        lastName: clientForModal?.lastName,
        email: clientForModal?.userEmail,
        phone: clientForModal?.userPhone,
      };

      // Store preselected package data for payment
      // Find queue that has the package serviceId
      let preselectedQueue = null;
      if (paymentData.packageId && this.queuesArray && this.queuesArray.length > 0) {
        // Try to find a queue that matches the package's services
        preselectedQueue = this.queuesArray.find(
          queue =>
            queue.serviceId === paymentData.serviceId ||
            (queue.servicesId &&
              Array.isArray(queue.servicesId) &&
              queue.servicesId.includes(paymentData.serviceId))
        );
      }

      this.preselectedQueueForModal = preselectedQueue;
      this.preselectedServiceIdForModal = paymentData.serviceId || null;
      this.preselectedPackageIdForModal = paymentData.packageId || null;

      // Store payment data to be used when PaymentForm opens
      this.preselectedPaymentData = {
        packageId: paymentData.packageId,
        totalAmount: paymentData.prepayComplete
          ? paymentData.totalAmount
          : paymentData.remainingAmount,
        paymentAmount: paymentData.prepayComplete
          ? paymentData.totalAmount
          : paymentData.remainingAmount,
        procedureNumber: paymentData.procedureNumber || 1,
        proceduresTotalNumber: paymentData.proceduresTotalNumber,
        prepayComplete: paymentData.prepayComplete || false,
      };

      // Open the modal
      this.showAttentionCreationModal = true;

      // Show message to user
      const message = paymentData.prepayComplete
        ? this.$t('package.prepayCompleteMessage') ||
          'Se abrirá el formulario de pago para preparar todo el paquete.'
        : this.$t('package.payRemainingMessage') ||
          `Se abrirá el formulario de pago para pagar ${paymentData.remainingAmount} ${
            this.commerce?.currency || 'BRL'
          } restantes.`;

      // Note: The actual PaymentForm will open when the attention/booking is created
      // This is a limitation - PaymentForm requires an attention/booking ID
      // For now, we open the attention creation modal and the user can proceed from there
    },
    hidePackagesModal() {
      try {
        const packagesModal = document.getElementById(`packagesModal-${this.client.id}`);
        if (packagesModal) {
          // Use Bootstrap's modal API instead of manual DOM manipulation
          const bsModal = Modal.getOrCreateInstance(packagesModal);
          if (bsModal) {
            bsModal.hide();
          } else {
            console.error('Bootstrap Modal instance not found');
          }
        } else {
          console.warn('Packages modal element not found');
        }
      } catch (error) {
        console.error('Error hiding packages modal:', error);
      }
    },
    showPackagesModal() {
      try {
        const packagesModal = document.getElementById(`packagesModal-${this.client.id}`);
        if (packagesModal) {
          // Use Bootstrap's modal API instead of manual DOM manipulation
          const bsModal = Modal.getOrCreateInstance(packagesModal);
          if (bsModal) {
            bsModal.show();
          } else {
            console.error('Bootstrap Modal instance not found');
          }
        } else {
          console.warn('Packages modal element not found');
        }
      } catch (error) {
        console.error('Error showing packages modal:', error);
      }
    },
    ensureModalBackdrop(modalElement) {
      try {
        // Check if backdrop already exists
        if (!document.querySelector('.modal-backdrop')) {
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
      } catch (error) {
        console.error('Error ensuring modal backdrop:', error);
      }
    },
    setupModalRestoreListener(modalId) {
      try {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
          // Remove any existing listener to avoid duplicates
          modalElement.removeEventListener('hidden.bs.modal', this.restorePackagesModalHandler);

          // Add new listener
          this.restorePackagesModalHandler = () => {
            this.showPackagesModal();
            // Remove the listener after use
            modalElement.removeEventListener('hidden.bs.modal', this.restorePackagesModalHandler);
          };

          modalElement.addEventListener('hidden.bs.modal', this.restorePackagesModalHandler);
        }
      } catch (error) {
        console.error('Error setting up modal restore listener:', error);
      }
    },
    cleanupModalListeners() {
      // Clean up any existing listeners
      if (this.restorePackagesModalHandler) {
        const modalElements = document.querySelectorAll('[id*="Modal"]');
        modalElements.forEach(modal => {
          modal.removeEventListener('hidden.bs.modal', this.restorePackagesModalHandler);
        });
        this.restorePackagesModalHandler = null;
      }
    },
    handleAttentionCreationError(errors) {
      // Handle errors as needed
    },
    handleExportCSV() {
      if (this.$refs.attentionsManagementRef && this.$refs.attentionsManagementRef.exportToCSV) {
        this.$refs.attentionsManagementRef.exportToCSV();
      }
    },
    handleExportBookingsCSV() {
      if (this.$refs.bookingsManagementRef && this.$refs.bookingsManagementRef.exportToCSV) {
        this.$refs.bookingsManagementRef.exportToCSV();
      }
    },
    handleExportPackagesCSV() {
      if (this.$refs.packagesManagementRef && this.$refs.packagesManagementRef.exportToCSV) {
        this.$refs.packagesManagementRef.exportToCSV();
      }
    },
    handleExportContactsCSV() {
      if (this.$refs.contactsManagementRef && this.$refs.contactsManagementRef.exportToCSV) {
        this.$refs.contactsManagementRef.exportToCSV();
      }
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 90) {
        return 'bi-qr-code green-icon';
      } else if (score <= 180) {
        return 'bi-qr-code yellow-icon';
      } else {
        return 'bi-qr-code red-icon';
      }
    },
    clasifyDaysContacted(score) {
      if (score === undefined || !score) {
        return 'bi-chat-left-dots-fill gray-icon';
      } else if (score <= 90) {
        return 'bi-chat-left-dots-fill green-icon';
      } else if (score <= 180) {
        return 'bi-chat-left-dots-fill yellow-icon';
      } else {
        return 'bi-chat-left-dots-fill red-icon';
      }
    },
    clasifyContactResult(result) {
      if (result === undefined) {
        return 'bi-patch-check-fill blue-icon';
      } else if (result === 'INTERESTED') {
        return 'bi-patch-check-fill green-icon';
      } else if (result === 'CONTACT_LATER') {
        return 'bi-patch-check-fill yellow-icon';
      } else {
        return 'bi-patch-check-fill red-icon';
      }
    },
    clasifyTemperature(temperature) {
      if (!temperature) {
        return 'bi-thermometer-half blue-icon';
      } else if (temperature === 'QUENTE') {
        return 'bi-thermometer-high red-icon';
      } else if (temperature === 'MORNO') {
        return 'bi-thermometer-half green-icon';
      } else if (temperature === 'FRIO') {
        return 'bi-thermometer-low blue-icon';
      } else {
        return 'bi-thermometer-half blue-icon';
      }
    },
    getTemperatureLabel(temperature) {
      if (!temperature) {
        return this.$t('dashboard.temperature') || 'Prioridade';
      } else if (temperature === 'QUENTE') {
        return this.$t('dashboard.temperatureQuente') || 'Quente (Vermelho)';
      } else if (temperature === 'MORNO') {
        return this.$t('dashboard.temperatureMorno') || 'Morno (Verde)';
      } else if (temperature === 'FRIO') {
        return this.$t('dashboard.temperatureFrio') || 'Frio (Azul)';
      } else {
        return this.$t('dashboard.temperature') || 'Prioridade';
      }
    },
    getCardTypeClass() {
      const daysSince = this.client?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'client-card-success';
      if (daysSince <= 180) return 'client-card-warning';
      return 'client-card-error';
    },
    getStatusIconClass() {
      const daysSince = this.client?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'icon-success';
      if (daysSince <= 180) return 'icon-warning';
      return 'icon-error';
    },
    async getUserType() {
      // Parallelize independent permission calls
      const [userType, togglesClient, togglesDashboard] = await Promise.all([
        this.store.getCurrentUserType,
        getPermissions('client', 'admin'),
        getPermissions('dashboard'),
      ]);
      this.userType = userType;
      this.togglesClient = togglesClient;
      this.togglesDashboard = togglesDashboard;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    closeModal() {
      const modalCloseButton = document.getElementById(
        `close-modal-patient-history-${this.client.id}`
      );
      modalCloseButton.click();
    },
    closeDataModal() {
      const modalCloseButton = document.getElementById(`close-modal-client-edit-${this.client.id}`);
      modalCloseButton.click();
      this.showClientData = false;
    },
    handleClientUpdated(updatedData) {
      // Update client object with new data
      if (this.client && updatedData) {
        Object.assign(this.client, updatedData);
        // Force Vue to re-render
        this.$forceUpdate();
      }
    },
    async checkPreprontuarioCompletion() {
      try {
        this.loadingPreprontuario = true;
        this.preprontuarioStatus = await checkPreprontuarioStatus(this.client.id, this.commerce.id);
        this.loadingPreprontuario = false;
      } catch (error) {
        this.loadingPreprontuario = false;
        console.error('Error checking preprontuario status:', error);
        // Set status to pending if there's an error, so the button can still be shown
        this.preprontuarioStatus = { completed: false };
      }
    },
    async checkAgreementCompletion() {
      try {
        this.loadingAgreement = true;
        this.agreementStatus = await checkAgreementStatus(this.client.id, this.commerce.id);
        this.loadingAgreement = false;
      } catch (error) {
        this.loadingAgreement = false;
        console.error('Error checking agreement status:', error);
      }
    },
    async sendPreprontuarioReminder() {
      try {
        this.loadingPreprontuario = true;
        // Build attention link if we have attention context
        let attentionLink = '';
        let attentionId = undefined;
        let queueId = undefined;

        if (this.attention && this.attention.id) {
          attentionId = this.attention.id;
          queueId = this.attention.queueId || this.queue?.id;

          // Generate the attention form link - check for both PRE_ATTENTION and FIRST_ATTENTION
          const formId = this.formsPersonalized.find(
            form =>
              (form.type === 'PRE_ATTENTION' || form.type === 'FIRST_ATTENTION') &&
              (form.queueId === this.queue?.id || form.queueId === this.attention.queueId) &&
              form.active === true
          )?.id;

          if (formId && this.client.id) {
            const baseUrl = window.location.origin;
            attentionLink = `${baseUrl}/form/${this.client.id}/${formId}/${this.attention.id}`;
          }
        } else if (this.queue?.id) {
          queueId = this.queue.id;
        }

        await sendPreprontuarioWhatsapp(
          this.client.id,
          this.commerce.id,
          this.client.userEmail,
          this.client.userPhone,
          attentionLink || undefined, // Pass the link if available
          attentionId, // Pass attention ID for event tracking
          queueId // Pass queue ID for event tracking
        );
        this.loadingPreprontuario = false;
        // Show success message
        alert(
          this.$t('whatsapp.preprontuario.sent') || 'Mensaje de preprontuario enviado exitosamente',
        );
        // Refresh status after sending
        if (this.preprontuarioActiveForContext) {
          await this.checkPreprontuarioCompletion();
        }
      } catch (error) {
        this.loadingPreprontuario = false;
        console.error('Error sending preprontuario reminder:', error);
        alert(this.$t('whatsapp.error') || 'Error al enviar mensaje');
      }
    },
    async sendAgreementReminder() {
      try {
        this.loadingAgreement = true;
        await sendAgreementWhatsapp(
          this.client.id,
          this.commerce.id,
          this.client.userEmail,
          this.client.userPhone
        );
        this.loadingAgreement = false;
        // Show success message
        alert(this.$t('whatsapp.agreement.sent') || 'Mensaje de convenio enviado exitosamente');
      } catch (error) {
        this.loadingAgreement = false;
        console.error('Error sending agreement reminder:', error);
        alert(this.$t('whatsapp.error') || 'Error al enviar mensaje');
      }
    },
    isPreprontuarioActive() {
      return getActiveFeature(this.commerce, 'attention-pre-form', 'PRODUCT');
    },
    // Check if preprontuario is active for the current context (commerce, attention, and queue)
    async checkPreprontuarioActiveForContext() {
      // If we have attention and queue context (in prontuario view), check if they have preprontuario forms
      if (this.attention && this.queue) {
        try {
          // Load forms if not already loaded
          if (!this.formsPersonalized || this.formsPersonalized.length === 0) {
            this.formsPersonalized = await getFormPersonalizedByCommerceId(this.commerce.id);
          }

          // Log all PRE_ATTENTION and FIRST_ATTENTION forms to debug
          const relevantForms = this.formsPersonalized.filter(
            f => f.type === 'PRE_ATTENTION' || f.type === 'FIRST_ATTENTION'
          );

          // Check if there's a PRE_ATTENTION or FIRST_ATTENTION form for the queue
          // Also check if form has no queueId (commerce-level form) or matches the queue
          const queueHasPreprontuario = this.formsPersonalized.some(
            form =>
              (form.type === 'PRE_ATTENTION' || form.type === 'FIRST_ATTENTION') &&
              (form.queueId === this.queue.id || !form.queueId || form.queueId === null) &&
              form.active === true &&
              form.available === true
          );

          const formsForQueue = this.formsPersonalized.filter(
            f =>
              (f.type === 'PRE_ATTENTION' || f.type === 'FIRST_ATTENTION') &&
              (f.queueId === this.queue.id || !f.queueId || f.queueId === null)
          );

          // Check if attention's queue has preprontuario (PRE_ATTENTION or FIRST_ATTENTION)
          // If attention.queueId is different from queue.id, check both
          // Also check if form has no queueId (commerce-level form)
          let attentionQueueHasPreprontuario = true;
          if (this.attention.queueId && this.attention.queueId !== this.queue.id) {
            attentionQueueHasPreprontuario = this.formsPersonalized.some(
              form =>
                (form.type === 'PRE_ATTENTION' || form.type === 'FIRST_ATTENTION') &&
                (form.queueId === this.attention.queueId ||
                  !form.queueId ||
                  form.queueId === null) &&
                form.active === true &&
                form.available === true
            );
          } else {
            // Same queue, use the same check
            attentionQueueHasPreprontuario = queueHasPreprontuario;
          }

          // Check if commerce has preprontuario active (feature flag) OR has any PRE_ATTENTION/FIRST_ATTENTION forms
          const commerceActive = this.isPreprontuarioActive();
          const commerceHasForms = this.formsPersonalized.some(
            form =>
              (form.type === 'PRE_ATTENTION' || form.type === 'FIRST_ATTENTION') &&
              form.active === true &&
              form.available === true
          );

          // All three must be active: (commerce feature OR commerce has forms), queue form, and attention's queue form
          this.preprontuarioActiveForContext =
            (commerceActive || commerceHasForms) &&
            queueHasPreprontuario &&
            attentionQueueHasPreprontuario;
          return this.preprontuarioActiveForContext;
        } catch (error) {
          console.error('Error checking preprontuario for context:', error);
          // If error, check if commerce has the feature active
          const commerceActive = this.isPreprontuarioActive();
          this.preprontuarioActiveForContext = commerceActive;
          return this.preprontuarioActiveForContext;
        }
      }

      // If no specific context (attention/queue), just check commerce level
      // But don't show indicator if we don't have full context
      this.preprontuarioActiveForContext = false;
      return false;
    },
    isAgreementRequired() {
      return getActiveFeature(this.commerce, 'attention-agreement-required', 'PRODUCT');
    },
    // Métodos para abrir modales (solo abren, no cargan datos)
    async openAttentionsModal() {
      // Update preprontuario status when opening modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }

      // Open the modal using Bootstrap's Modal API
      const attentionsModalElement = document.getElementById(`attentionsModal-${this.client.id}`);
      if (attentionsModalElement) {
        const attentionsModal = Modal.getOrCreateInstance(attentionsModalElement);
        attentionsModal.show();
      }
    },
    async openBookingsModal() {
      // Update preprontuario status when opening modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }

      // Open the modal using Bootstrap's Modal API
      const bookingsModalElement = document.getElementById(`bookingsModal-${this.client.id}`);
      if (bookingsModalElement) {
        const bookingsModal = Modal.getOrCreateInstance(bookingsModalElement);
        bookingsModal.show();
      }
    },
    async openPackagesModal() {
      // El modal se abre automáticamente con data-bs-toggle
      // Los datos se cargarán cuando el modal se muestre (event listener)
      // Update preprontuario status when opening modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }
    },
    async openPatientHistoryModal() {
      // El modal se abre automáticamente con data-bs-toggle
      // Los datos se cargarán cuando el modal se muestre (event listener)
      // Update preprontuario status when opening modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }
    },
    async openContactsModal() {
      // El modal se abre automáticamente con data-bs-toggle
      // Los datos se cargarán cuando el modal se muestre (event listener)
      // Update preprontuario status when opening modal
      if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
        await this.checkPreprontuarioCompletion();
      }
    },
    async openLgpdModal() {
      // El modal se abre automáticamente con data-bs-toggle
      // Los datos se cargarán cuando el modal se muestre (event listener)
    },
    handleConsentUpdated() {
      // Handle consent update event
      // No llamar loadConsentStatus aquí - el componente hijo ya gestiona su propio estado
    },
    handleLgpdModalShow() {
      this.lgpdModalVisible = true;
    },
    handleLgpdModalHide() {
      this.lgpdModalVisible = false;
    },
    hasBlockingConsents() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return false;
      }
      return this.consentStatus.missing.some(req => req.blockingForAttention && req.required);
    },
    getMissingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.length;
    },
    getBlockingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.filter(req => req.blockingForAttention && req.required)
        .length;
    },
    // Configurar event listeners para los modales
    setupModalEventListeners() {
      const clientId = this.client?.id;
      if (!clientId) return;

      // Modal de Atenciones
      const attentionsModal = document.getElementById(`attentionsModal-${clientId}`);
      if (attentionsModal && !attentionsModal.dataset.listenerAdded) {
        // Mark as listener added to prevent duplicate listeners
        attentionsModal.dataset.listenerAdded = 'true';
        attentionsModal.addEventListener('shown.bs.modal', async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
          // Load attentions when modal is opened (lazy loading - only if not already loaded)
          if (this.$refs.attentionsManagementRef && this.$refs.attentionsManagementRef.refresh) {
            const attentionsComponent = this.$refs.attentionsManagementRef;
            // Only refresh if attentions haven't been loaded yet
            if (
              !attentionsComponent.attentionsLoaded ||
              !attentionsComponent.attentions ||
              attentionsComponent.attentions.length === 0
            ) {
              await attentionsComponent.refresh();
            }
          }
        });
      }

      // Modal de Bookings
      const bookingsModal = document.getElementById(`bookingsModal-${clientId}`);
      if (bookingsModal && !bookingsModal.dataset.listenerAdded) {
        // Mark as listener added to prevent duplicate listeners
        bookingsModal.dataset.listenerAdded = 'true';
        bookingsModal.addEventListener('shown.bs.modal', async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
          // Load bookings when modal is opened (lazy loading - only if not already loaded)
          if (this.$refs.bookingsManagementRef && this.$refs.bookingsManagementRef.refresh) {
            const bookingsComponent = this.$refs.bookingsManagementRef;
            // Only refresh if bookings haven't been loaded yet
            if (
              !bookingsComponent.bookingsLoaded ||
              !bookingsComponent.bookings ||
              bookingsComponent.bookings.length === 0
            ) {
              await bookingsComponent.refresh();
            }
          }
        });
      }

      // Modal de Packages
      const packagesModal = document.getElementById(`packagesModal-${clientId}`);
      if (packagesModal) {
        // Remover listener anterior si existe para evitar duplicados
        const existingHandler = packagesModal._clientDetailsPackagesHandler;
        if (existingHandler) {
          packagesModal.removeEventListener('shown.bs.modal', existingHandler);
        }

        const handler = async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }

          // Always reload packages when modal opens
          await this.getPackages(true); // Force reload

          // Also refresh the ClientPackagesManagement component
          if (this.$refs.packagesManagementRef && this.$refs.packagesManagementRef.refresh) {
            await this.$refs.packagesManagementRef.refresh();
          }

          // Load attentions to fulfill the card
          if (this.$refs.attentionsManagementRef && this.$refs.attentionsManagementRef.refresh) {
            await this.$refs.attentionsManagementRef.refresh(true);

            // Update daysSinceAttention based on the most recent attention
            // Wait a bit for the watcher to update attentions from newAttentions
            await this.$nextTick();
            if (
              this.$refs.attentionsManagementRef.attentions &&
              this.$refs.attentionsManagementRef.attentions.length > 0
            ) {
              const mostRecentAttention = this.$refs.attentionsManagementRef.attentions[0];
              if (mostRecentAttention && mostRecentAttention.daysSinceAttention !== undefined) {
                // Use the daysSinceAttention from the most recent attention
                if (this.client) {
                  this.client.daysSinceAttention = mostRecentAttention.daysSinceAttention;
                }
              } else if (mostRecentAttention && mostRecentAttention.attentionCreatedDate) {
                // Fallback: calculate from date if daysSinceAttention is not available
                const attentionDate = new Date(mostRecentAttention.attentionCreatedDate);
                const now = new Date();
                const daysSince = Math.floor((now - attentionDate) / (1000 * 60 * 60 * 24));
                if (this.client) {
                  this.client.daysSinceAttention = daysSince;
                }
              }
            }
          }
        };

        // Guardar referencia al handler
        packagesModal._clientDetailsPackagesHandler = handler;
        packagesModal.addEventListener('shown.bs.modal', handler);
      } else {
        console.warn('[ClientDetailsCard] Packages modal not found', { clientId });
      }

      // Modal de Patient History
      const patientHistoryModal = document.getElementById(`patientHistoryModal-${clientId}`);
      if (patientHistoryModal) {
        patientHistoryModal.addEventListener('shown.bs.modal', async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
          // Always load patient history when modal opens
          this.getPatientHistory();
        });
      }

      // Modal de Edit Client Data
      const editModal = document.getElementById(`editModal-${clientId}`);
      if (editModal) {
        editModal.addEventListener('shown.bs.modal', async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
          this.getClientData();
        });
      }

      // Modal de Contacts
      const contactsModal = document.getElementById(`contactModal-${clientId}`);
      if (contactsModal) {
        contactsModal.addEventListener('shown.bs.modal', async () => {
          // Update preprontuario status when modal is shown
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
          if (!this.clientContactsLoaded) {
            this.getClientContacts();
          }
        });
      }

      // Modal de LGPD Consent - lazy loading
      const lgpdModal = document.getElementById(`lgpdModal-${clientId}`);
      if (lgpdModal) {
        lgpdModal.addEventListener('shown.bs.modal', () => {
          this.handleLgpdModalShow();
        });
        lgpdModal.addEventListener('hidden.bs.modal', () => {
          this.handleLgpdModalHide();
        });
      }
    },
  },
  computed: {
    visible() {
      const { showClientData } = this;
      return showClientData;
    },
    clientCreatedDateLabel() {
      // Try common date fields across query-stack / firestore / legacy payloads.
      const raw =
        this.client?.clientCreatedDate ||
        this.client?.createdDate ||
        this.client?.createdAt ||
        this.client?.created ||
        this.client?.userCreatedDate ||
        // fallback: last/most relevant attention date if that's what the list provides
        this.client?.attentionCreatedDate;

      const formatted = raw ? this.getDate(raw) : undefined;
      return formatted || 'N/I';
    },
    // ✅ Combine dashboard toggles with prop toggles for child components
    combinedToggles() {
      // Merge dashboard toggles first, then prop toggles (prop toggles take precedence if there's overlap)
      const dashboard = this.togglesDashboard || {};
      const prop = this.toggles || {};
      return {
        ...dashboard,
        ...prop,
      };
    },
    clientFullName() {
      if (!this.client) return 'N/I';
      // Try multiple field names to handle different data sources (query-stack, Firebase, etc.)
      const name = (this.client.userName || this.client.name || '').trim();
      const lastName = (this.client.userLastName || this.client.lastName || '').trim();
      const fullName = `${name} ${lastName}`.trim().toUpperCase();
      return fullName || 'N/I';
    },
    // Computed property to format client data for AttentionCreationModal
    attentionCreationClientData() {
      if (!this.client) return null;

      // ✅ Use the client ID directly if available
      // For clients from ClientDetailsCard, we should have a valid clientId
      const validClientId = this.client.clientId || this.client.id;
      const clientData = {
        ...(validClientId && { clientId: validClientId }), // Include clientId if we have it
        firebaseClientId: validClientId, // Same value for compatibility
        sendingClientId: !!validClientId, // Allow sending if we have a clientId
        userIdNumber: this.client.userIdNumber || this.client.idNumber,
        name: this.client.userName || this.client.name,
        lastName: this.client.userLastName || this.client.lastName,
        email: this.client.userEmail || this.client.email,
        phone: this.client.userPhone || this.client.phone,
        ...(this.client.personalInfo || {}),
      };

      return clientData;
    },
    // Computed property to get queues array from queues object
    queuesArray() {
      // Priority 1: If loadedQueues is available (dynamically loaded), use it first
      if (this.loadedQueues && Array.isArray(this.loadedQueues) && this.loadedQueues.length > 0) {
        return this.loadedQueues;
      }

      // Priority 2: Check commerce.queues
      if (this.commerce?.queues) {
        if (Array.isArray(this.commerce.queues) && this.commerce.queues.length > 0) {
          return this.commerce.queues;
        }
        if (typeof this.commerce.queues === 'object' && this.commerce.queues !== null) {
          const queues = Object.values(this.commerce.queues).flat();
          if (queues.length > 0) return queues;
        }
      }

      // Priority 3: Check queues prop (only if it has items)
      if (this.queues) {
        if (Array.isArray(this.queues) && this.queues.length > 0) {
          return this.queues;
        }
        // If queues is an object, convert to array
        if (typeof this.queues === 'object' && this.queues !== null) {
          const queues = Object.values(this.queues).flat();
          if (queues.length > 0) return queues;
        }
      }

      // Fallback: return loadedQueues even if empty (for reactivity)
      if (this.loadedQueues && Array.isArray(this.loadedQueues)) {
        return this.loadedQueues;
      }

      return [];
    },
    // Computed property to group queues for the modal
    groupedQueuesForModal() {
      const queues = this.queuesArray;
      if (!queues || queues.length === 0) return {};

      const grouped = {};
      queues.forEach(queue => {
        const type = queue.type || 'STANDARD';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(queue);
      });

      return grouped;
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
        if (this.extendedEntity) {
          // Load client data if missing when card is expanded (lazy loading)
          if (this.client && this.client.id) {
            await this.loadClientIfDataMissing();
          }
          // Load user type and permissions when expanded (needed for modals)
          if (!this.userType) {
            await this.getUserType();
          }
          if (!this.user) {
            await this.getUser();
          }
          // Check if preprontuario is active for context (only when expanded)
          await this.checkPreprontuarioActiveForContext();
          // Load status when expanded - if we have attention/queue context, always check status
          if (this.attention && this.queue && this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          } else if (this.preprontuarioActiveForContext) {
            await this.checkPreprontuarioCompletion();
          }
          if (this.isAgreementRequired()) {
            await this.checkAgreementCompletion();
          }
        }
      },
    },
    // Removed store watcher - getUserType and getUser will be called lazily when needed
    // (when card is expanded or when modals are opened)
    client: {
      immediate: true,
      deep: true, // Watch for deep changes in client object
      async handler(newClient, oldClient) {
        // Reset flags when client changes to allow reloading data for new client
        if (oldClient && newClient && oldClient.id !== newClient.id) {
          this.attentionsLoaded = false;
          this.bookingsLoaded = false;
          this.packagesLoaded = false;
          this.clientContactsLoaded = false;
          this.patientHistoryLoaded = false;
          this.attentions = [];
          this.bookings = [];
          this.packages = [];
          this.clientContacts = [];
          this.patientHistory = {};
        }
        // Force reactivity update when client data changes (e.g., after editing)
        if (newClient && oldClient && newClient.id === oldClient.id) {
          // Client data was updated, force Vue to re-render
          this.$forceUpdate();
        }
        // Load client data if missing (userPhone, userEmail, userIdNumber)
        if (newClient && newClient.id) {
          await this.loadClientIfDataMissing();
        }
        // Reconfigurar event listeners cuando el cliente cambia
        this.$nextTick(() => {
          this.setupModalEventListeners();
        });
      },
    },
    attention: {
      immediate: true,
      async handler() {
        // When attention context changes, check preprontuario status
        if (this.attention && this.queue && this.commerce && this.client) {
          await this.checkPreprontuarioActiveForContext();
          // Always check status if we're in prontuario view and context is active
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
        }
      },
    },
    queue: {
      immediate: true,
      async handler() {
        // When queue context changes, check preprontuario status
        if (this.attention && this.queue && this.commerce && this.client) {
          await this.checkPreprontuarioActiveForContext();
          // Always check status if we're in prontuario view and context is active
          if (this.preprontuarioActiveForContext || this.isPreprontuarioActive()) {
            await this.checkPreprontuarioCompletion();
          }
        }
      },
    },
    'commerce.id': {
      immediate: true,
      async handler(newCommerceId) {
        if (newCommerceId && (!this.loadedQueues || this.loadedQueues.length === 0)) {
          try {
            const groupedQueues = await getGroupedQueueByCommerceId(newCommerceId);
            this.loadedQueues = Object.values(groupedQueues).flat();
          } catch (error) {
            console.warn('❌ Failed to load queues for commerce:', newCommerceId, error);
          }
        }
      },
    },
    commerce: {
      immediate: true,
      deep: true,
      async handler(newCommerce) {
        if (newCommerce?.id && (!this.loadedQueues || this.loadedQueues.length === 0)) {
          try {
            const groupedQueues = await getGroupedQueueByCommerceId(newCommerce.id);
            this.loadedQueues = Object.values(groupedQueues).flat();
          } catch (error) {
            console.warn('❌ Failed to load queues on commerce change:', newCommerce.id, error);
          }
        }
      },
    },
  },
  async mounted() {
    // Configurar event listeners cuando el componente se monta (esto es necesario siempre)
    this.$nextTick(() => {
      this.setupModalEventListeners();
    });

    // Load queues if commerce is available and no queues loaded yet
    if (this.commerce?.id && (!this.loadedQueues || this.loadedQueues.length === 0)) {
      try {
        const groupedQueues = await getGroupedQueueByCommerceId(this.commerce.id);
        this.loadedQueues = Object.values(groupedQueues).flat();
      } catch (error) {
        console.warn('❌ Failed to load queues on mount for commerce:', this.commerce.id, error);
      }
    }

    // Don't load client data or check preprontuario on mount - wait until card is expanded or modal is opened
    // This reduces unnecessary API calls when the card is closed
  },
  beforeUnmount() {
    // Clean up modal listeners to prevent memory leaks
    this.cleanupModalListeners();
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Client Row - Clickable -->
    <div class="client-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('dashboard.clientCard.tooltip.status') }}</div>
          </template>
          <div class="client-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i class="bi bi-person-circle"></i>
          </div>
        </Popper>

        <!-- Client Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ clientFullName }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.copy') }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{
              formatIdNumber(client.userIdNumber || client.idNumber) || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.attentions') }}</div>
              </template>
              <span class="badge-mini attentions" @click.stop>
                <i class="bi bi-qr-code"></i>{{ client.attentionsCounter || 0 }}
              </span>
            </Popper>
            <Popper v-if="client.surveyId" :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.survey') }}</div>
              </template>
              <i class="bi bi-star-fill icon-mini-separated yellow-icon" @click.stop></i>
            </Popper>
            <Popper
              v-if="client.firstAttentionForm === true"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.form') }}</div>
              </template>
              <i class="bi bi-clipboard2-pulse-fill icon-mini-separated blue-icon" @click.stop></i>
            </Popper>
          </div>
        </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>{{ $t('dashboard.clientCard.tooltip.daysSinceAttention') }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${clasifyDaysSinceComment(client.daysSinceAttention || 0)}`"></i>
              <span>{{ client.daysSinceAttention || 0 }}</span>
            </div>
          </Popper>
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>{{ $t('dashboard.clientCard.tooltip.daysSinceContact') }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <Popper
                v-if="client.contacted === true || checked === true"
                :class="'dark'"
                arrow
                disable-click-away
                hover
              >
                <template #content>
                  <div>
                    {{
                      $t('dashboard.clientCard.tooltip.contactResult') || 'Resultado del contacto'
                    }}
                  </div>
                </template>
                <i
                  :class="`bi ${clasifyContactResult(client.contactResult || undefined)}`"
                  @click.stop
                ></i>
              </Popper>
              <i :class="`bi ${clasifyDaysContacted(client.daysSinceContactedClient || 0)}`"></i>
              <span>{{ client.daysSinceContactedClient || 0 }}</span>
            </div>
          </Popper>
          <!-- Temperature Indicator -->
          <Popper v-if="client.temperature" :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>{{ getTemperatureLabel(client.temperature) }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${clasifyTemperature(client.temperature)}`"></i>
            </div>
          </Popper>
          <!-- Preprontuario Status Indicator -->
          <!-- Show if: we have attention/queue context (prontuario view) AND (commerce has feature OR queue has form) -->
          <Popper
            v-if="attention && queue && (isPreprontuarioActive() || preprontuarioActiveForContext)"
            :class="'dark'"
            arrow
            disable-click-away
            hover
          >
            <template #content>
              <div>
                <span v-if="loadingPreprontuario">{{
                  $t('dashboard.loading') || 'Cargando...'
                }}</span>
                <span v-else-if="preprontuarioStatus?.completed">
                  {{
                    $t('dashboard.clientCard.tooltip.preprontuarioCompleted') ||
                    'Preprontuario completado'
                  }}
                </span>
                <span v-else>
                  {{
                    $t('dashboard.clientCard.tooltip.preprontuarioPending') ||
                    'Preprontuario pendiente'
                  }}
                </span>
              </div>
            </template>
            <div class="status-badge-inline">
              <i
                v-if="preprontuarioStatus?.completed"
                class="bi bi-clipboard2-check-fill green-icon"
              ></i>
              <i
                v-else-if="preprontuarioStatus !== null"
                class="bi bi-clipboard2-x-fill red-icon"
              ></i>
              <i v-else class="bi bi-clipboard2-pulse-fill gray-icon"></i>
              <span v-if="preprontuarioStatus?.completed">✓</span>
              <span
                v-else-if="preprontuarioStatus !== null && !loadingPreprontuario"
                class="preprontuario-pending-indicator"
              >
                <i class="bi bi-x-circle" style="font-size: 0.625rem; margin-left: 0.125rem"></i>
              </span>
              <span v-else-if="loadingPreprontuario" class="preprontuario-loading-indicator"
                >...</span
              >
            </div>
          </Popper>
          <!-- LGPD Consent Status Indicator -->
          <Popper
            v-if="client && commerce && consentStatus"
            :class="'dark'"
            arrow
            disable-click-away
            hover
          >
            <template #content>
              <div>
                <span v-if="hasBlockingConsents()">
                  {{
                    $t('attention.lgpd.blockingConsents', { count: getBlockingConsentsCount() }) ||
                    `Faltan ${getBlockingConsentsCount()} consentimiento(s) bloqueante(s)`
                  }}
                </span>
                <span v-else-if="getMissingConsentsCount() > 0">
                  {{
                    $t('attention.lgpd.missingConsents', { count: getMissingConsentsCount() }) ||
                    `Faltan ${getMissingConsentsCount()} consentimiento(s)`
                  }}
                </span>
                <span v-else>
                  {{
                    $t('attention.lgpd.allConsentsGranted') || 'Todos los consentimientos otorgados'
                  }}
                </span>
              </div>
            </template>
            <div class="status-badge-inline" @click.stop="openLgpdModal()">
              <i v-if="hasBlockingConsents()" class="bi bi-shield-exclamation red-icon"></i>
              <i
                v-else-if="getMissingConsentsCount() > 0"
                class="bi bi-shield-check yellow-icon"
              ></i>
              <i v-else class="bi bi-shield-check green-icon"></i>
            </div>
          </Popper>
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
          <!-- Action Buttons Section - First, No Title -->
          <div v-if="management && !loading" class="info-section">
            <div class="action-buttons-grid">
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewAttentions') }}</div>
                </template>
                <button
                  @click.stop="openAttentionsModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#attentionsModal-${this.client.id}`"
                >
                  <i class="bi bi-qr-code"></i>
                  <span>{{ $t('dashboard.attentions') }}</span>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewBookings') }}</div>
                </template>
                <button
                  @click.stop="openBookingsModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#bookingsModal-${this.client.id}`"
                >
                  <i class="bi bi-calendar-fill"></i>
                  <span>{{ $t('dashboard.bookings') }}</span>
                  <i
                    v-if="client.pendingBookings > 0"
                    class="bi bi-circle-fill notification-dot green"
                  ></i>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewPackages') || 'Ver Paquetes' }}</div>
                </template>
                <button
                  @click.stop="openPackagesModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#packagesModal-${this.client.id}`"
                >
                  <i class="bi bi-box-seam-fill"></i>
                  <span>{{ $t('dashboard.packages') || 'Paquetes' }}</span>
                  <i
                    v-if="
                      packages.filter(
                        p => (p.proceduresLeft || 0) > 0 && (p.proceduresLeft || 0) <= 3
                      ).length > 0
                    "
                    class="bi bi-circle-fill notification-dot yellow"
                  ></i>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewHistory') }}</div>
                </template>
                <button
                  @click.stop="openPatientHistoryModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#patientHistoryModal-${this.client.id}`"
                >
                  <i class="bi bi-file-medical-fill"></i>
                  <span>{{ $t('dashboard.patientHistory') }}</span>
                  <i
                    v-if="client.pendingControls > 0"
                    class="bi bi-circle-fill notification-dot yellow"
                  ></i>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.editClient') }}</div>
                </template>
                <button
                  @click.stop="getClientData()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#editModal-${this.client.id}`"
                >
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('dashboard.edit') }}</span>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewContacts') }}</div>
                </template>
                <button
                  @click.stop="openContactsModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#contactModal-${this.client.id}`"
                >
                  <i class="bi bi-chat-left-dots-fill"></i>
                  <span>{{ $t('dashboard.contact') }}</span>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('lgpd.title') || 'LGPD - Consentimentos e Portabilidade' }}</div>
                </template>
                <button
                  @click.stop="openLgpdModal()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#lgpdModal-${this.client.id}`"
                >
                  <i class="bi bi-shield-check"></i>
                  <span>{{ $t('lgpd.title') || 'LGPD' }}</span>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.schedule') }}</div>
                </template>
                <button class="action-btn" @click.stop="openAttentionCreationModal()">
                  <i class="bi bi-calendar-check-fill"></i>
                  <span>{{ $t('dashboard.schedule') }}</span>
                </button>
              </Popper>
            </div>
          </div>

          <!-- Preprontuario Status Section - Removed status card, only showing indicator in inline section -->

          <!-- Agreement Status Section -->
          <div v-if="isAgreementRequired()" class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-file-earmark-text-fill"></i>
              <span class="info-section-title-compact">{{
                $t('dashboard.agreement') || 'Convenio'
              }}</span>
            </div>
            <div class="status-card-container">
              <div
                class="status-card"
                :class="agreementStatus?.completed ? 'status-completed' : 'status-pending'"
              >
                <div class="status-card-content">
                  <div class="status-info">
                    <i
                      class="bi"
                      :class="
                        agreementStatus?.completed
                          ? 'bi-check-circle-fill'
                          : 'bi-exclamation-circle-fill'
                      "
                    ></i>
                    <div class="status-text">
                      <span class="status-label">{{
                        $t('dashboard.agreement.status') || 'Estado del Convenio'
                      }}</span>
                      <span class="status-value">
                        {{
                          agreementStatus?.completed
                            ? $t('dashboard.agreement.completed') || 'Completado'
                            : $t('dashboard.agreement.pending') || 'Pendiente'
                        }}
                      </span>
                    </div>
                  </div>
                  <button
                    v-if="!agreementStatus?.completed"
                    @click="sendAgreementReminder()"
                    :disabled="loadingAgreement"
                    class="whatsapp-btn"
                  >
                    <i class="bi bi-whatsapp"></i>
                    <span v-if="!loadingAgreement">{{
                      $t('dashboard.sendReminder') || 'Enviar Recordatorio'
                    }}</span>
                    <span v-else>{{ $t('dashboard.sending') || 'Enviando...' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Information Section - Second, Standardized -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-telephone-fill"></i>
              <span class="info-section-title-compact">{{
                $t('dashboard.clientCard.contactInfo') || $t('dashboard.contactInfo') || 'Contacto'
              }}</span>
            </div>
            <div class="contact-data-grid">
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.whatsapp') }}</div>
                </template>
                <a
                  class="data-item-compact whatsapp"
                  :href="'https://wa.me/' + client.userPhone"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{
                    $t('dashboard.clientCard.label.whatsapp') || 'WhatsApp'
                  }}</span>
                  <div class="data-value">
                    <i class="bi bi-whatsapp"></i>
                    <span>{{ client.userPhone || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.email') }}</div>
                </template>
                <a
                  class="data-item-compact email"
                  :href="'mailto:' + client.userEmail"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{
                    $t('dashboard.clientCard.label.email') || 'Email'
                  }}</span>
                  <div class="data-value">
                    <i class="bi bi-envelope"></i>
                    <span>{{ client.userEmail || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.idNumber') }}</div>
                </template>
                <div class="data-item-compact" @click.stop>
                  <span class="data-label">{{ $t('dashboard.clientCard.label.id') || 'ID' }}</span>
                  <div class="data-value">
                    <i class="bi bi-person-vcard"></i>
                    <span>{{ formatIdNumber(client.userIdNumber) || 'N/I' }}</span>
                  </div>
                </div>
              </Popper>
            </div>
          </div>

          <!-- Survey Data Section -->
          <div v-if="client.rating || client.nps" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-star-fill"></i>
              <span class="info-section-title">{{ $t('dashboard.surveyData') }}</span>
            </div>
            <div class="info-badges">
              <span class="info-badge">
                <i class="bi bi-star-fill yellow-icon"></i>
                <span class="badge-label">CSAT</span>
                <span class="badge-value">{{ client.rating || 'N/I' }}</span>
              </span>
              <span class="info-badge">
                <i class="bi bi-emoji-smile-fill blue-icon"></i>
                <span class="badge-label">NPS</span>
                <span class="badge-value">{{ client.nps || 'N/I' }}</span>
              </span>
            </div>
          </div>

          <!-- Attention Data Section -->
          <div
            v-if="
              client.queueName ||
              client.collaboratorName ||
              (client.commerceName && client.commerceTag) ||
              client.packageId ||
              client.servicesDetails ||
              client.attentionCreatedDate
            "
            class="info-section"
          >
            <div class="info-section-header">
              <i class="bi bi-qr-code"></i>
              <span class="info-section-title">{{ $t('dashboard.attentionData') }}</span>
            </div>
            <div class="info-badges">
              <span v-if="client.queueName" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.queueData') }}</span>
                <span class="badge-value">{{ client.queueName }}</span>
              </span>
              <span v-if="client.collaboratorName" class="info-badge">
                <i class="bi bi-person-fill"></i>
                <span class="badge-label">{{ $t('dashboard.userData') }}</span>
                <span class="badge-value">{{ client.collaboratorName }}</span>
              </span>
              <span v-if="client.commerceName && client.commerceTag" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.commerceData') }}</span>
                <span class="badge-value"
                  >{{ client.commerceName }} - {{ client.commerceTag }}</span
                >
              </span>
              <span v-if="client.packageId && client.packageName" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.package') }}</span>
                <span class="badge-value">{{ client.packageName }}</span>
                <span class="badge-subvalue"
                  >{{ client.packageProcedureNumber }} /
                  {{ client.packageProceduresTotalNumber }}</span
                >
                <i v-if="client.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
              </span>
              <span v-if="client.servicesDetails" class="info-badge services-badge">
                <span class="badge-label">{{ $t('paymentData.service') }}</span>
                <span v-for="serv in client.servicesDetails" :key="serv.id" class="service-tag">
                  {{ serv.name }}
                </span>
              </span>
              <span v-if="client.attentionCreatedDate" class="info-badge">
                <i class="bi bi-calendar-fill"></i>
                <span class="badge-value">{{ getDate(client.attentionCreatedDate) }}</span>
              </span>
            </div>
          </div>

          <!-- Personal Data Section - Third, Standardized -->
          <div
            v-if="
              client.userBirthday ||
              client.userOrigin ||
              client.userAddressCode ||
              client.userCode1 ||
              client.healthAgreementName
            "
            class="info-section compact-section"
          >
            <div class="info-section-header-compact">
              <i class="bi bi-person-fill"></i>
              <span class="info-section-title-compact">{{ $t('dashboard.personalData') }}</span>
            </div>
            <div class="personal-data-grid-compact">
              <div v-if="client.userBirthday" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.birthday') ||
                  $t('commerceQueuesView.birthday') ||
                  'Cumpleaños'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-cake-fill"></i>
                  <span>{{ getDate(client.userBirthday) }}</span>
                </div>
              </div>
              <div v-if="client.healthAgreementName" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.healthAgreement') ||
                  $t('commerceQueuesView.healthAgreementText') ||
                  'Convenio'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-heart-pulse-fill"></i>
                  <span>{{ client.healthAgreementName }}</span>
                </div>
              </div>
              <div v-if="client.userOrigin" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.origin') ||
                  $t('commerceQueuesView.origin') ||
                  'Origen'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ $t(`origin.${client.userOrigin}`) }}</span>
                </div>
              </div>
              <div v-if="client.userAddressText" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.address') || 'Endereço'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill red-icon"></i>
                  <span>{{ client.userAddressText }}</span>
                </div>
              </div>
              <div v-if="client.userAddressCode" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.addressCode') ||
                  $t('commerceQueuesView.addressCode') ||
                  'Código'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ client.userAddressCode }}</span>
                </div>
              </div>
              <div v-if="client.userAddressComplement" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.addressComplement') ||
                  $t('commerceQueuesView.addressComplement') ||
                  'Complemento'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ client.userAddressComplement }}</span>
                </div>
              </div>
              <div v-if="client.userCode1" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.code1') ||
                  $t('commerceQueuesView.code1') ||
                  'Código 1'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode1 }}</span>
                </div>
              </div>
              <div v-if="client.userCode2" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.code2') ||
                  $t('commerceQueuesView.code2') ||
                  'Código 2'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode2 }}</span>
                </div>
              </div>
              <div v-if="client.userCode3" class="data-item-compact">
                <span class="data-label">{{
                  $t('dashboard.clientCard.label.code3') ||
                  $t('commerceQueuesView.code3') ||
                  'Código 3'
                }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode3 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata Section - Compact, Same Line -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ client.id }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label"
                >{{ $t('dashboard.clientCard.date') || $t('dashboard.date') || 'Fecha' }}:</span
              >
              <span class="metadata-value">{{ clientCreatedDateLabel }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Modal Attentions - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`attentionsModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-10"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-qr-code"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.attentionsOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ client.userName || client.userIdNumber || client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ClientAttentionsManagement
                ref="attentionsManagementRef"
                :show-client-attentions-management="true"
                :toggles="combinedToggles"
                :attentions-in="attentions"
                :client="client"
                :commerce="commerce"
                :commerces="commerces"
                :queues="queues"
                :services="services"
              >
              </ClientAttentionsManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['dashboard.reports.attentions-management']"
                    :title="$t('dashboard.reports.attentions-management.title')"
                    :show-tooltip="true"
                    :description="$t('dashboard.reports.attentions-management.description')"
                    :icon="'file-earmark-spreadsheet'"
                    @download="handleExportCSV"
                    :can-download="toggles['dashboard.reports.attentions-management'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Bookings - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`bookingsModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-10"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-calendar-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.bookingsOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ client.userName || client.userIdNumber || client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ClientBookingsManagement
                ref="bookingsManagementRef"
                :show-client-bookings-management="true"
                :toggles="combinedToggles"
                :bookings-in="bookings"
                :client="client"
                :commerce="commerce"
                :commerces="commerces"
                :queues="queues"
                :services="services"
              >
              </ClientBookingsManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['dashboard.reports.bookings-management']"
                    :title="$t('dashboard.reports.bookings-management.title')"
                    :show-tooltip="true"
                    :description="$t('dashboard.reports.bookings-management.description')"
                    :icon="'file-earmark-spreadsheet'"
                    @download="handleExportBookingsCSV"
                    :can-download="toggles['dashboard.reports.bookings-management'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Packages - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`packagesModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-10"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-box-seam-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.packagesOf') || 'Paquetes de' }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ client.userName || client.userIdNumber || client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ClientPackagesManagement
                ref="packagesManagementRef"
                :show-client-packages-management="true"
                :toggles="combinedToggles"
                :packages-in="packages"
                :client="client"
                :commerce="commerce"
                :commerces="commerces"
                :queues="queuesArray"
                @open-attention-modal="handleOpenAttentionModalFromPackage"
                @open-booking-modal="handleOpenBookingModalFromPackage"
                @open-payment-form="handleOpenPaymentFormFromPackage"
              >
              </ClientPackagesManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['dashboard.reports.packages-management']"
                    :title="
                      $t('dashboard.reports.packages-management.title') || 'Exportar Paquetes'
                    "
                    :show-tooltip="true"
                    :description="
                      $t('dashboard.reports.packages-management.description') ||
                      'Exportar lista de paquetes'
                    "
                    :icon="'file-earmark-spreadsheet'"
                    @download="handleExportPackagesCSV"
                    :can-download="toggles['dashboard.reports.packages-management'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Edit - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`editModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-pencil-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.dataOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                :id="`close-modal-client-edit-${this.client.id}`"
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ClientDataManagement
                :show-client-data-management="visible"
                :toggles="togglesClient"
                :client="client"
                :commerce="commerce"
                :commerces="commerces"
                :close-modal="closeDataModal"
                @client-updated="handleClientUpdated"
              >
              </ClientDataManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <button
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-check-lg"></i> {{ $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Contact - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`contactModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-chat-left-dots-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.contactsOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ClientContactsManagement
                ref="contactsManagementRef"
                :show-client-attentions-management="true"
                :toggles="combinedToggles"
                :client-contacts-in="clientContacts"
                :client="client"
                :commerce="commerce"
                :commerces="commerces"
                :queues="queues"
                @getClientContacts="getClientContacts"
              >
              </ClientContactsManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['dashboard.reports.contacts-management']"
                    :title="$t('dashboard.reports.contacts-management.title')"
                    :show-tooltip="true"
                    :description="$t('dashboard.reports.contacts-management.description')"
                    :icon="'file-earmark-spreadsheet'"
                    @download="handleExportContactsCSV"
                    :can-download="toggles['dashboard.reports.contacts-management'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Patient History - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`patientHistoryModal-${this.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-file-medical-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('dashboard.patientHistoryOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                  </p>
                </div>
              </div>
              <button
                :id="`close-modal-patient-history-${this.client.id}`"
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <PatientHistoryManagement
                :show-patient-history-management="true"
                :client="client"
                :commerce="commerce"
                :attention="attention"
                :patient-history-in="patientHistory"
                :patient-history-items="patientHistoryItems"
                :patient-forms="patientForms"
                @getPatientHistory="getPatientHistory"
                @closeModal="closeModal"
              >
              </PatientHistoryManagement>
            </div>
          </div>
        </div>
      </div>

      <!-- LGPD Modal -->
      <Teleport to="body">
        <div
          :id="`lgpdModal-${client.id}`"
          class="modal fade modern-modal"
          tabindex="-1"
          :aria-labelledby="`lgpdModalLabel-${client.id}`"
          aria-hidden="true"
        >
          <div class="modal-dialog modal-xl modal-dialog-scrollable modern-modal-dialog">
            <div class="modal-content modern-modal-content">
              <div class="modal-header border-0 active-name modern-modal-header">
                <div class="modern-modal-header-inner">
                  <div class="modern-modal-icon-wrapper">
                    <i class="bi bi-shield-check"></i>
                  </div>
                  <div class="modern-modal-title-wrapper">
                    <h5
                      class="modal-title fw-bold modern-modal-title"
                      :id="`lgpdModalLabel-${client.id}`"
                    >
                      {{ $t('lgpd.title') }}
                    </h5>
                    <p class="modern-modal-client-name">{{ client.name }}</p>
                  </div>
                </div>
                <button
                  :id="`close-modal-lgpd-${client.id}`"
                  class="modern-modal-close-btn"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
              <Spinner :show="loading"></Spinner>
              <div class="modal-body modern-modal-body-content">
                <ul class="nav nav-tabs mb-3" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link active"
                      :id="`consent-tab-${client.id}`"
                      data-bs-toggle="tab"
                      :data-bs-target="`#consent-pane-${client.id}`"
                      type="button"
                      role="tab"
                    >
                      <i class="bi bi-shield-check me-2"></i>
                      {{ $t('lgpd.consent.title') }}
                    </button>
                  </li>
                  <li class="nav-item" role="presentation">
                    <button
                      class="nav-link"
                      :id="`portability-tab-${client.id}`"
                      data-bs-toggle="tab"
                      :data-bs-target="`#portability-pane-${client.id}`"
                      type="button"
                      role="tab"
                    >
                      <i class="bi bi-download me-2"></i>
                      {{ $t('lgpd.portability.title') }}
                    </button>
                  </li>
                </ul>
                <div class="tab-content">
                  <div
                    class="tab-pane fade show active"
                    :id="`consent-pane-${client.id}`"
                    role="tabpanel"
                  >
                    <LgpdConsentManager
                      :commerce-id="commerce.id"
                      :client-id="client.id"
                      :is-visible="lgpdModalVisible"
                      @consent-updated="handleConsentUpdated"
                    />
                  </div>
                  <div class="tab-pane fade" :id="`portability-pane-${client.id}`" role="tabpanel">
                    <LgpdDataPortability :commerce-id="commerce.id" :client-id="client.id" />
                  </div>
                </div>
              </div>
              <div class="modal-footer border-0 modern-modal-footer">
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i> {{ $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </Teleport>
    <!-- Attention Creation Modal -->
    <AttentionCreationModal
      v-if="commerce && client"
      :show="showAttentionCreationModal && !!commerce && !!client"
      :commerce="commerce"
      :queues="queuesArray"
      :grouped-queues="groupedQueuesForModal"
      :collaborators="loadedProfessionals || []"
      :preselected-client="client"
      :preselected-queue="preselectedQueueForModal"
      :preselected-service-id="preselectedServiceIdForModal"
      :preselected-package-id="preselectedPackageIdForModal"
      :client-data="attentionCreationClientData"
      :toggles="toggles || {}"
      creation-type="booking"
      @close="closeAttentionCreationModal"
      @attention-created="handleAttentionCreated"
      @error="handleAttentionCreationError"
    />
  </div>
</template>

<style scoped>
/* Ultra Compact Client Row */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0;
  margin-bottom: 0.5rem;
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

/* Card Type Variations - Ultra Compact */
.client-row-card.client-card-success {
  border-left: 2px solid #00c2cb;
}

.client-row-card.client-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.client-row-card.client-card-warning {
  border-left: 2px solid #f9c322;
}

.client-row-card.client-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.client-row-card.client-card-error {
  border-left: 2px solid #a52a2a;
}

.client-row-card.client-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
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

.client-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.client-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
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

.client-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-id-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.badge-mini {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  cursor: help;
  line-height: 1.2;
}

.badge-mini i {
  font-size: 0.625rem;
}

.icon-mini {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
}

.icon-mini-separated {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
  margin-left: 0.25rem;
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.collapse-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
  cursor: pointer;
}

.client-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
}

.client-row-card[class*='extended'] .collapse-icon,
.client-row-card:hover .collapse-icon {
  transform: scale(1.1);
}

/* Status Inline - Ultra Compact */
.status-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-badge-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.4375rem;
  background: rgba(169, 169, 169, 0.08);
  border-radius: 9999px;
  cursor: help;
  transition: all 0.2s ease;
  border: 1px solid rgba(169, 169, 169, 0.1);
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

.preprontuario-pending-indicator {
  display: inline-flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.6);
}

.preprontuario-loading-indicator {
  display: inline-block;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.625rem;
}

/* Responsive adjustments for ultra compact */
@media (max-width: 768px) {
  .client-row-content {
    gap: 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0;
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

.info-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Standardized Data Items - Compact */
.contact-data-grid,
.personal-data-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4375rem 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 5px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.data-item-compact:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.data-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.1;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.2;
}

.data-value i {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.data-item-compact.whatsapp:hover {
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.whatsapp:hover .data-value {
  color: #25d366;
}

.data-item-compact.whatsapp:hover .data-value i {
  color: #25d366;
}

.data-item-compact.email:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.data-item-compact.email:hover .data-value {
  color: #004aad;
}

.data-item-compact.email:hover .data-value i {
  color: #004aad;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.375rem 0.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.contact-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(169, 169, 169, 0.2);
}

.contact-item i {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.6);
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
  flex: 1;
}

.contact-link.whatsapp:hover {
  color: #25d366;
}

.contact-link.whatsapp:hover i {
  color: #25d366;
}

.contact-link.email:hover {
  color: #004aad;
}

.contact-link.email:hover i {
  color: #004aad;
}

/* Action Buttons - Uniform Style */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1875rem;
  padding: 0.25rem 0.375rem;
  min-height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.05) 100%);
  color: #004aad;
  border: 1.5px solid rgba(0, 74, 173, 0.2);
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.1);
}

.action-btn i {
  font-size: 0.9375rem;
}

.action-btn span {
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.action-btn .notification-dot {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  font-size: 0.5rem;
}

.notification-dot {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.5rem;
}

.notification-dot.green {
  color: #00c2cb;
}

.notification-dot.yellow {
  color: #f9c322;
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
  gap: 0.3125rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.info-badge:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-badge i {
  font-size: 0.875rem;
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-value {
  font-weight: 600;
  color: #000000;
}

.badge-subvalue {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}

.services-badge {
  align-items: flex-start;
  gap: 0.5rem;
}

.service-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.25rem;
  margin-top: 0.25rem;
}

/* Personal Data Section - Improved Readability */
.personal-data-section {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  padding: 0.875rem;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.personal-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.875rem;
}

.personal-data-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.personal-data-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.personal-data-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.personal-data-label i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
}

.personal-data-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.4;
  word-break: break-word;
}

.address-item {
  grid-column: 1 / -1;
}

.address-value {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.address-code {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.address-complement {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 0.5rem;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  flex-wrap: wrap;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 300;
  margin: 0 0.125rem;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.75rem;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-value {
  color: rgba(0, 0, 0, 0.8);
}

/* Icon Colors */
.green-icon {
  color: var(--verde-tu);
}

.yellow-icon {
  color: var(--amarillo-star);
}

.red-icon {
  color: var(--rojo-warning);
}

.blue-icon {
  color: var(--azul-turno);
}

.gray-icon {
  color: #a9a9a9;
}

/* Transition */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  max-height: 1000px;
  opacity: 1;
}

/* Status Cards */
.status-card-container {
  margin-top: 0.5rem;
}

.status-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 0.75rem;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.status-card.status-completed {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(0, 194, 203, 0.05);
}

.status-card.status-pending {
  border-color: rgba(249, 195, 34, 0.3);
  background: rgba(249, 195, 34, 0.05);
}

.status-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.status-info i {
  font-size: 1.125rem;
}

.status-completed .status-info i {
  color: #00c2cb;
}

.status-pending .status-info i {
  color: #f9c322;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.status-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
}

.whatsapp-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  background: linear-gradient(135deg, #25d366 0%, #20c65a 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.whatsapp-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #20c65a 0%, #1db954 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.whatsapp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.whatsapp-btn i {
  font-size: 0.875rem;
}

.prontuario-btn {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%);
  color: #a52a2a;
  border: 1.5px solid rgba(165, 42, 42, 0.2);
}

.prontuario-btn:hover {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.2) 0%, rgba(220, 53, 69, 0.1) 100%);
  border-color: rgba(165, 42, 42, 0.4);
  color: #a52a2a;
}

/* Responsive - Ultra Compact */
@media (max-width: 768px) {
  .client-row-card {
    padding: 0.4375rem 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .action-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .client-row-card {
    padding: 0.375rem 0.4375rem;
    margin: 0.1875rem 0.25rem;
    margin-bottom: 0;
  }

  .client-name-text {
    font-size: 0.6875rem;
  }

  .action-buttons-grid {
    grid-template-columns: 1fr;
  }

  .info-badges {
    flex-direction: column;
  }

  .info-badge {
    width: 100%;
  }

  .client-row-content {
    gap: 0.4375rem;
  }
}

/* Tooltip z-index improvements - Ensure tooltips appear above all content */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.client-row-card {
  overflow: visible;
}

.details-expandable-section {
  overflow: visible;
}

/* Keep scroll for content but allow tooltips to show */
.detailed-data {
  overflow-y: auto;
  overflow-x: visible;
}

/* Ensure tooltip containers don't clip */
.info-section,
.action-buttons-grid,
.contact-data-grid,
.personal-data-grid-compact {
  position: relative;
  overflow: visible;
}

/* Modern Modal Styles - Compact, beautiful, matching dashboard design */
:deep(.modern-modal-wrapper) {
  margin: 0;
  max-width: 100vw;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

:deep(.modern-modal-container) {
  border: none;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

/* LGPD & other modern modals using dialog/content classes */
:deep(.modern-modal-dialog) {
  margin: 0;
  max-width: 100vw;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

:deep(.modern-modal-content) {
  border: none;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

/* Modern Header - Compact with icon and title */
:deep(.modern-modal-header) {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0.75rem 0.75rem 0 0;
  min-height: auto;
  position: relative;
}

:deep(.modern-modal-header-inner) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

:deep(.modern-modal-icon-wrapper) {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.modern-modal-icon-wrapper i) {
  font-size: 1.125rem;
  color: #ffffff;
}

:deep(.modern-modal-title-wrapper) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

:deep(.modern-modal-title) {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

:deep(.modern-modal-client-name) {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.modern-modal-close-btn) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

:deep(.modern-modal-close-btn i) {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

:deep(.modern-modal-close-btn:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

:deep(.modern-modal-close-btn:focus) {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

/* Modern Body - Compact with proper spacing */
:deep(.modern-modal-body-content) {
  padding: 1rem;
  background: #ffffff;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Modern Footer - Clean and minimal */
:deep(.modern-modal-footer) {
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 0 0 0.75rem 0.75rem;
}

:deep(.modern-modal-footer .d-flex) {
  align-items: center;
}

:deep(.modern-modal-close-button) {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

:deep(.modern-modal-close-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

:deep(.modern-modal-close-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* LGPD Modal - Modern Tabs Styling */
:deep(.modern-modal-body-content .nav-tabs) {
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 1.5rem;
  padding-left: 0;
}

:deep(.modern-modal-body-content .nav-tabs .nav-item) {
  margin-bottom: -2px;
}

:deep(.modern-modal-body-content .nav-tabs .nav-link) {
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.75rem 1.25rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border-radius: 0;
}

:deep(.modern-modal-body-content .nav-tabs .nav-link:hover) {
  color: var(--azul-turno);
  border-bottom-color: rgba(37, 99, 235, 0.3);
  background: rgba(37, 99, 235, 0.05);
}

:deep(.modern-modal-body-content .nav-tabs .nav-link.active) {
  color: var(--azul-turno);
  border-bottom-color: var(--azul-turno);
  background: transparent;
}

:deep(.modern-modal-body-content .nav-tabs .nav-link i) {
  font-size: 1rem;
}

:deep(.modern-modal-body-content .tab-content) {
  padding: 0;
}

:deep(.modern-modal-body-content .tab-pane) {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  :deep(.modern-modal-wrapper) {
    margin: 0;
    max-width: 100vw;
    width: 100vw;
    height: 100vh;
  }

  :deep(.modern-modal-header) {
    padding: 0.625rem 0.875rem;
  }

  :deep(.modern-modal-icon-wrapper) {
    width: 2rem;
    height: 2rem;
  }

  :deep(.modern-modal-icon-wrapper i) {
    font-size: 1rem;
  }

  :deep(.modern-modal-title) {
    font-size: 0.9375rem;
  }

  :deep(.modern-modal-client-name) {
    font-size: 0.6875rem;
  }

  :deep(.modern-modal-body-content) {
    padding: 0.75rem;
    max-height: calc(100vh - 9rem);
  }

  :deep(.modern-modal-footer) {
    padding: 0.625rem 0.875rem;
  }

  :deep(.modern-modal-body-content .nav-tabs .nav-link) {
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
  }
}
</style>
