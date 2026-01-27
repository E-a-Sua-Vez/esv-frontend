<script>
import { ref, reactive, onBeforeMount, toRefs, watch, computed } from 'vue';
import Popper from 'vue3-popper';
import Warning from '../../components/common/Warning.vue';
import {
  getPaymentFiscalNoteTypes,
  getPaymentMethods,
  getPaymentTypes,
} from '../../shared/utils/data.ts';
import {
  getAvailablePackagesForService,
  getActivePackagesByClient,
} from '../../application/services/package';
import { getPendingIncomeByPackage } from '../../application/services/income';
import { getServicesById } from '../../application/services/service';
import { getAttentionDetails } from '../../application/services/attention';
import { getBookingDetails } from '../../application/services/booking';
import Message from '../common/Message.vue';

export default {
  name: 'PaymentForm',
  components: { Warning, Message, Popper },
  props: {
    id: { type: String, default: undefined },
    commerce: { type: Object, default: {} },
    clientId: { type: String, default: undefined },
    serviceId: { type: String, default: undefined }, // Service ID to filter packages (legacy/single)
    // NEW: robust multi-service support
    serviceIds: { type: Array, default: () => [] }, // Array of service IDs (booking/attention)
    services: { type: Array, default: () => [] }, // Array of service objects/details (optional)
    confirmPayment: { type: Boolean, default: false },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    // NEW: Professional commission props
    professionalName: { type: String, default: undefined },
    professionalId: { type: String, default: undefined },
    professionalCommission: { type: [Number, String], default: undefined },
    professionalCommissionType: { type: String, default: undefined },
    suggestedCommissionAmount: { type: Number, default: undefined },
    // DEPRECATED: single service price hint (keep for backward compatibility)
    servicePrice: { type: Number, default: undefined },
    // NEW: Optional props to pre-populate package info if already available
    existingPackageId: { type: String, default: undefined },
    existingPackageProcedureNumber: { type: Number, default: undefined },
    existingPackageProceduresTotalNumber: { type: Number, default: undefined },
    // NEW: Type of entity (to know if we should fetch attention or booking)
    entityType: { type: String, default: 'attention' }, // 'attention' or 'booking'
    // NEW: Existing confirmation data (to show payment already confirmed)
    existingConfirmationData: { type: Object, default: undefined },
  },
  async setup(props) {
    const loading = ref(false);

    const {
      id,
      commerce,
      clientId,
      serviceId,
      serviceIds,
      services,
      errorsAdd,
      confirmPayment,
      professionalName,
      professionalId,
      professionalCommission,
      professionalCommissionType,
      suggestedCommissionAmount,
      servicePrice,
      existingPackageId,
      existingPackageProcedureNumber,
      existingPackageProceduresTotalNumber,
      entityType,
      existingConfirmationData,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newConfirmationData: {
        procedureNumber: 1,
        proceduresTotalNumber: 1,
        processPaymentNow: true, // Default: true - procesar pago ahora por defecto
        // Default selection when payment fields are shown
        paymentType: 'TOTALLY',
        // Initialize these so confirm logic can evaluate consistently
        paymentMethod: '',
        paymentAmount: null,
        totalAmount: null,
        installments: 1,
        packagePaid: false,
        paymentFiscalNote: 'NOTA_FISCAL',
        confirmInstallments: true, // Default: true - todas las cuotas se crean como confirmadas
      },
      paymentTypes: [],
      paymentMethods: [],
      paymentFicalNoteTypes: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      totalAmountError: false,
      installmentsError: false,
      packages: [],
      selectedPackage: {},
      pendingIncomes: [],
    });

    const userEditedTotalAmount = ref(false);
    const userEditedPaymentAmount = ref(false);
    const loadedServices = ref([]); // Services fetched from backend when details are missing
    const loadingServices = ref(false);

    const normalizeServicePrice = s => {
      if (!s) return 0;
      // Prefer serviceInfo.price (canonical entity)
      const p = s.serviceInfo?.price ?? s.price ?? s.amount ?? s.value;
      const n = Number(p);
      return Number.isFinite(n) ? n : 0;
    };

    const hasServicePriceData = s => {
      if (!s) return false;
      // Check if service has price information
      return (
        (s.serviceInfo && s.serviceInfo.price !== undefined && s.serviceInfo.price !== null) ||
        s.price !== undefined ||
        s.amount !== undefined ||
        s.value !== undefined
      );
    };

    const loadServicesIfNeeded = async () => {
      // Only fetch if we have serviceIds but no complete service details
      const ids =
        Array.isArray(serviceIds.value) && serviceIds.value.length > 0 ? serviceIds.value : [];
      const providedServices = Array.isArray(services.value) ? services.value : [];

      // If we have IDs but no services, or services without price data, fetch
      const needsFetch =
        ids.length > 0 &&
        (providedServices.length === 0 || providedServices.some(s => !hasServicePriceData(s)));

      if (needsFetch && !loadingServices.value && commerce.value?.id) {
        try {
          loadingServices.value = true;
          const fetched = await getServicesById(ids);
          if (Array.isArray(fetched) && fetched.length > 0) {
            loadedServices.value = fetched;
          }
        } catch (error) {
          console.error('[PaymentForm] Error loading services:', error);
          loadedServices.value = [];
        } finally {
          loadingServices.value = false;
        }
      } else if (
        providedServices.length > 0 &&
        providedServices.every(s => hasServicePriceData(s))
      ) {
        // Clear loaded services if we now have complete data from props
        loadedServices.value = [];
      }
    };

    const servicePriceSuggestion = computed(() => {
      // Priority 1: Use loaded services (from backend fetch)
      if (Array.isArray(loadedServices.value) && loadedServices.value.length > 0) {
        const total = loadedServices.value.reduce((sum, s) => sum + normalizeServicePrice(s), 0);
        if (total > 0) return total;
      }

      // Priority 2: Use provided services array (from props)
      const list = Array.isArray(services.value) ? services.value : [];
      if (list.length > 0) {
        const total = list.reduce((sum, s) => sum + normalizeServicePrice(s), 0);
        if (total > 0) return total;
      }

      // Priority 3: Fallback to deprecated single servicePrice
      const single = Number(servicePrice.value);
      if (Number.isFinite(single) && single > 0) return single;

      return 0;
    });

    // Computed to check if payment is already confirmed
    const isPaymentConfirmed = computed(() => {
      return existingConfirmationData.value?.paid === true;
    });

    const confirmationMessage = computed(() => {
      if (isPaymentConfirmed.value) {
        const paymentDate = existingConfirmationData.value?.paymentDate;
        const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('pt-BR') : '';
        const amount = existingConfirmationData.value?.paymentAmount;
        const method = existingConfirmationData.value?.paymentMethod;
        
        return {
          title: 'Pagamento Confirmado',
          details: `Confirmado em ${formattedDate}${amount ? ` - ${amount} ${commerce.value?.currency || 'BRL'}` : ''}${method ? ` via ${method}` : ''}`,
          date: formattedDate,
          amount: amount,
          method: method
        };
      }
      return null;
    });

    // Computed para determinar qué mostrar en "Total Procedimiento"
    // Si es PAQUETE: precio del servicio de esta sesión (no el total del paquete)
    // Si es SERVICIO NORMAL: precio del servicio
    const totalAmountSuggestion = computed(() => {
      // Si hay paquete seleccionado, usar el precio del servicio (no el total del paquete)
      // porque el total del paquete ya fue pagado en la primera sesión
      if (state.selectedPackage && state.selectedPackage.id) {
        // Para paquetes, mostrar el precio del servicio de esta sesión específica
        return servicePriceSuggestion.value;
      }
      // Para servicios normales, mostrar el precio del servicio
      return servicePriceSuggestion.value;
    });

    const formattedServicePrice = computed(() => {
      const total = servicePriceSuggestion.value;
      if (!total || total <= 0) return '';
      const currency = commerce.value?.currency || 'BRL';
      try {
        return `${Number(total).toLocaleString('de-DE')} ${currency}`;
      } catch (e) {
        return `${total} ${currency}`;
      }
    });

    // Computed para estado de pago del paquete
    const packagePaymentStatus = computed(() => {
      if (!state.selectedPackage || !state.selectedPackage.id) return null;

      const pack = state.selectedPackage;
      const isPaid = pack.paid === true || state.newConfirmationData.packagePaid === true;
      const hasPendingIncomes = state.pendingIncomes && state.pendingIncomes.length > 0;

      return {
        isPaid: isPaid && !hasPendingIncomes,
        hasPendingIncomes,
        pendingIncomesCount: hasPendingIncomes ? state.pendingIncomes.length : 0,
        packageName: pack.name || 'Paquete',
        totalAmount: pack.totalAmount || 0,
      };
    });

    // Calcular automáticamente el valor pagado basado en totalAmount e installments
    // NOTA: Este cálculo es solo una ayuda/sugerencia. El usuario siempre puede editar
    // el campo "Valor Pagado" libremente, y una vez editado manualmente, este cálculo
    // no se ejecutará automáticamente para no sobrescribir el valor del usuario.
    const calculatePaymentAmount = () => {
      // Solo calcular si el usuario no ha editado manualmente paymentAmount
      // Si el usuario ya editó el campo, respetamos su valor y no lo sobrescribimos
      if (
        !userEditedPaymentAmount.value &&
        state.newConfirmationData.totalAmount &&
        state.newConfirmationData.installments &&
        state.newConfirmationData.installments > 0
      ) {
        const total = Number(state.newConfirmationData.totalAmount);
        const installments = Number(state.newConfirmationData.installments);
        if (total > 0 && installments > 0) {
          const calculatedAmount = total / installments;
          state.newConfirmationData.paymentAmount = Math.round(calculatedAmount * 100) / 100; // Redondear a 2 decimales
        }
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.paymentTypes = getPaymentTypes();
        state.paymentMethods = getPaymentMethods();
        state.paymentFicalNoteTypes = getPaymentFiscalNoteTypes();

        // Load services from backend if needed (before package loading)
        await loadServicesIfNeeded();

        // Cargar información de procedimiento si la atención/reserva ya tiene un paquete asociado
        let loadedPackageId = existingPackageId.value;
        let loadedProcedureNumber = existingPackageProcedureNumber.value;
        let loadedProceduresTotalNumber = existingPackageProceduresTotalNumber.value;

        // Si no se pasaron los valores como props, intentar cargarlos desde el backend
        if (
          id.value &&
          (!loadedPackageId || !loadedProcedureNumber || !loadedProceduresTotalNumber)
        ) {
          try {
            let entityData = null;
            if (entityType.value === 'booking') {
              entityData = await getBookingDetails(id.value);
            } else {
              entityData = await getAttentionDetails(id.value);
            }

            if (entityData) {
              // Si la entidad ya tiene un paquete asociado, usar esa información
              if (entityData.packageId) {
                loadedPackageId = entityData.packageId;
                // Usar packageProcedureNumber y packageProceduresTotalNumber si están disponibles
                if (
                  entityData.packageProcedureNumber !== undefined &&
                  entityData.packageProcedureNumber !== null
                ) {
                  loadedProcedureNumber = entityData.packageProcedureNumber;
                }
                if (
                  entityData.packageProceduresTotalNumber !== undefined &&
                  entityData.packageProceduresTotalNumber !== null
                ) {
                  loadedProceduresTotalNumber = entityData.packageProceduresTotalNumber;
                }
              }
            }
          } catch (error) {
            console.warn('[PaymentForm] Error loading entity details for package info:', error);
            // Continuar sin la información del paquete
          }
        }

        // Inicializar valores de procedimiento si se encontró información del paquete
        if (loadedPackageId && loadedProcedureNumber && loadedProceduresTotalNumber) {
          state.newConfirmationData.packageId = loadedPackageId;
          state.newConfirmationData.procedureNumber = loadedProcedureNumber;
          state.newConfirmationData.proceduresTotalNumber = loadedProceduresTotalNumber;
        }

        if (confirmPayment.value === true && commerce.value.id && clientId.value) {
          // Intelligent package loading: filter by service if provided
          const firstServiceId =
            (Array.isArray(serviceIds.value) &&
              serviceIds.value.length > 0 &&
              serviceIds.value[0]) ||
            serviceId.value;
          if (firstServiceId) {
            state.packages = await getAvailablePackagesForService(
              commerce.value.id,
              firstServiceId,
              clientId.value
            );
          } else {
            // Load all active packages for client
            state.packages = await getActivePackagesByClient(commerce.value.id, clientId.value);
          }

          // Si hay un paquete cargado, marcarlo como seleccionado
          if (loadedPackageId && state.packages && state.packages.length > 0) {
            const foundPackage = state.packages.find(pkg => pkg.id === loadedPackageId);
            if (foundPackage) {
              state.selectedPackage = foundPackage;
              state.newConfirmationData.packageId = foundPackage.id;
              // Cargar ingresos pendientes del paquete
              state.pendingIncomes = await getPendingIncomeByPackage(
                commerce.value.id,
                foundPackage.id,
              );
              // Verificar si el paquete está pagado (tanto por el flag paid como por la ausencia de ingresos pendientes)
              const isPackagePaid =
                foundPackage.paid === true ||
                (state.pendingIncomes && state.pendingIncomes.length === 0);
              state.newConfirmationData.packagePaid = isPackagePaid;

              // Si el paquete está pagado, establecer montos en 0 para indicar que está incluido
              if (isPackagePaid && !userEditedTotalAmount.value && !userEditedPaymentAmount.value) {
                state.newConfirmationData.totalAmount = 0;
                state.newConfirmationData.paymentAmount = 0;
              }
            }
          } else if (existingPackageId.value && state.packages && state.packages.length > 0) {
            // Si hay un existingPackageId pero no se encontró en loadedPackageId, buscarlo
            const foundPackage = state.packages.find(pkg => pkg.id === existingPackageId.value);
            if (foundPackage) {
              state.selectedPackage = foundPackage;
              state.newConfirmationData.packageId = foundPackage.id;
              // Cargar ingresos pendientes del paquete
              state.pendingIncomes = await getPendingIncomeByPackage(
                commerce.value.id,
                foundPackage.id,
              );
              const isPackagePaid =
                foundPackage.paid === true ||
                (state.pendingIncomes && state.pendingIncomes.length === 0);
              state.newConfirmationData.packagePaid = isPackagePaid;

              if (isPackagePaid && !userEditedTotalAmount.value && !userEditedPaymentAmount.value) {
                state.newConfirmationData.totalAmount = 0;
                state.newConfirmationData.paymentAmount = 0;
              }
            }
          }
        }
        loading.value = false;

        // Prefill totals (editable) if we can compute a suggested total
        // BUT: Skip if package is paid (amounts should be 0)
        const isPackagePaid =
          state.newConfirmationData.packagePaid === true ||
          (state.selectedPackage && state.selectedPackage.paid === true);

        // Use nextTick to ensure computed has updated after services load
        await new Promise(resolve => setTimeout(resolve, 100));
        if (servicePriceSuggestion.value > 0 && !isPackagePaid) {
          const price = Number(servicePriceSuggestion.value);
          if (
            !userEditedTotalAmount.value &&
            (state.newConfirmationData.totalAmount === null ||
              state.newConfirmationData.totalAmount === undefined)
          ) {
            state.newConfirmationData.totalAmount = price;
            // Calcular paymentAmount automáticamente basado en installments
            calculatePaymentAmount();
          }
          if (
            state.newConfirmationData.processPaymentNow === true &&
            !userEditedPaymentAmount.value &&
            (state.newConfirmationData.paymentAmount === null ||
              state.newConfirmationData.paymentAmount === undefined)
          ) {
            // Usar calculatePaymentAmount en lugar de establecer directamente
            calculatePaymentAmount();
            // Si calculatePaymentAmount no calculó (porque no hay installments válido), usar el precio total
            if (
              !state.newConfirmationData.paymentAmount ||
              state.newConfirmationData.paymentAmount === null
            ) {
              state.newConfirmationData.paymentAmount = price;
            }
          }
          sendData();
        } else if (isPackagePaid && state.newConfirmationData.processPaymentNow) {
          // If package is paid, ensure amounts are 0
          if (!userEditedTotalAmount.value && !userEditedPaymentAmount.value) {
            state.newConfirmationData.totalAmount = 0;
            state.newConfirmationData.paymentAmount = 0;
            state.newConfirmationData.paymentMethod = 'PAID';
          }
          sendData();
        }

        // Inicializar comisión si suggestedCommissionAmount está disponible
        if (suggestedCommissionAmount.value && suggestedCommissionAmount.value > 0) {
          state.newConfirmationData.paymentCommission = Number(suggestedCommissionAmount.value);
          sendData();
        }
      } catch (error) {
        loading.value = false;
      }
    });

    // Watch for changes in serviceIds or services to reload if needed
    watch(
      [serviceIds, services, () => commerce.value?.id],
      async () => {
        await loadServicesIfNeeded();
        // Re-prefill if price suggestion changed and user hasn't edited
        // BUT: Skip if package is paid
        const isPackagePaid =
          state.newConfirmationData.packagePaid === true ||
          (state.selectedPackage && state.selectedPackage.paid === true);

        if (
          servicePriceSuggestion.value > 0 &&
          !isPackagePaid &&
          !userEditedTotalAmount.value &&
          !userEditedPaymentAmount.value
        ) {
          const price = Number(servicePriceSuggestion.value);
          if (
            state.newConfirmationData.totalAmount === null ||
            state.newConfirmationData.totalAmount === undefined
          ) {
            state.newConfirmationData.totalAmount = price;
            calculatePaymentAmount();
          }
          if (
            state.newConfirmationData.processPaymentNow === true &&
            (state.newConfirmationData.paymentAmount === null ||
              state.newConfirmationData.paymentAmount === undefined)
          ) {
            calculatePaymentAmount();
            // Si calculatePaymentAmount no calculó, usar el precio total
            if (
              !state.newConfirmationData.paymentAmount ||
              state.newConfirmationData.paymentAmount === null
            ) {
              state.newConfirmationData.paymentAmount = price;
            }
          }
          sendData();
        } else if (isPackagePaid && state.newConfirmationData.processPaymentNow) {
          // If package is paid, ensure amounts are 0
          if (!userEditedTotalAmount.value && !userEditedPaymentAmount.value) {
            state.newConfirmationData.totalAmount = 0;
            state.newConfirmationData.paymentAmount = 0;
          }
          sendData();
        }
      },
      { deep: true },
    );

    // AUTO-CALCULATE COMMISSION based on professional data
    const calculateSuggestedCommission = () => {
      // If suggestedCommissionAmount is already calculated (from parent), use it
      if (suggestedCommissionAmount.value && suggestedCommissionAmount.value > 0) {
        return Number(suggestedCommissionAmount.value);
      }

      // Otherwise, calculate based on commission type
      if (professionalCommission.value && state.newConfirmationData.paymentAmount) {
        const amount = Number(state.newConfirmationData.paymentAmount);
        const commission = Number(professionalCommission.value);

        // Check if it's a percentage (assuming PERCENTAGE if commission < 100)
        // This is a heuristic; ideally we'd have the type passed separately
        if (commission > 0 && commission <= 100) {
          // Treat as percentage
          return Math.round((amount * commission) / 100);
        } else {
          // Treat as fixed amount
          return commission;
        }
      }
      return 0;
    };

    // WATCHER for professional commission auto-calculation
    watch(
      [
        professionalName,
        professionalCommission,
        suggestedCommissionAmount,
        () => state.newConfirmationData.paymentAmount,
      ],
      () => {
        console.log('[PaymentForm] Main watcher triggered:', {
          professionalName: professionalName.value,
          professionalCommission: professionalCommission.value,
          suggestedCommissionAmount: suggestedCommissionAmount.value,
          paymentAmount: state.newConfirmationData.paymentAmount,
          currentCommission: state.newConfirmationData.paymentCommission,
        });

        // Auto-set commission when professional is assigned
        if (professionalName.value) {
          const suggested = calculateSuggestedCommission();
          console.log('[PaymentForm] Calculated suggested:', suggested);

          if (suggested > 0) {
            // Siempre usar suggestedCommissionAmount si está disponible (viene del backend)
            if (suggestedCommissionAmount.value && suggestedCommissionAmount.value > 0) {
              const newValue = Number(suggestedCommissionAmount.value);
              console.log('[PaymentForm] Using suggestedCommissionAmount:', newValue);
              state.newConfirmationData.paymentCommission = newValue;
              sendData();
            }
            // Solo calcular automáticamente si el campo está vacío/cero Y hay paymentAmount
            else if (
              state.newConfirmationData.paymentAmount > 0 &&
              (!state.newConfirmationData.paymentCommission ||
                state.newConfirmationData.paymentCommission === 0)
            ) {
              console.log('[PaymentForm] Auto-calculating commission:', suggested);
              state.newConfirmationData.paymentCommission = suggested;
              sendData();
            }
          }
        }
      },
    );

    // WATCHER específico para suggestedCommissionAmount - actualizar inmediatamente
    watch(
      suggestedCommissionAmount,
      newValue => {
        console.log('[PaymentForm] suggestedCommissionAmount changed:', newValue, typeof newValue);
        if (newValue && newValue > 0 && professionalName.value) {
          const numValue = Number(newValue);
          console.log('[PaymentForm] Setting paymentCommission to:', numValue);
          state.newConfirmationData.paymentCommission = numValue;
          sendData();
        }
      },
      { immediate: true },
    );

    const sendData = () => {
      // Asegurar que los datos del profesional se incluyan en confirmationData
      if (professionalId.value) {
        state.newConfirmationData.professionalId = professionalId.value;
        state.newConfirmationData.professionalCommissionType = professionalCommissionType.value || 'PERCENTAGE';
        state.newConfirmationData.professionalCommissionValue = professionalCommission.value;
        
        // Calcular professionalCommissionAmount basado en paymentAmount
        if (state.newConfirmationData.paymentAmount && professionalCommission.value) {
          const commissionValue = Number(professionalCommission.value);
          if (professionalCommissionType.value === 'FIXED') {
            state.newConfirmationData.professionalCommissionAmount = commissionValue;
          } else {
            // PERCENTAGE por defecto
            state.newConfirmationData.professionalCommissionAmount = Math.round(
              (state.newConfirmationData.paymentAmount * commissionValue) / 100
            );
          }
        }
        
        // Agregar notas de comisión
        if (!state.newConfirmationData.professionalCommissionNotes && professionalName.value) {
          state.newConfirmationData.professionalCommissionNotes = `Comisión del profesional ${professionalName.value}`;
        }
      }
      
      receiveData(state.newConfirmationData);
    };

    const selectPaymentType = $event => {
      if ($event && $event.target) {
        const paymentType = $event.target.value;
        // Preservar comisión del profesional si está asignado
        const currentProfessionalCommission =
          professionalName.value && state.newConfirmationData.paymentCommission
            ? state.newConfirmationData.paymentCommission
            : null;

        if (['PAID', 'RETURN', 'EVALUATION', 'PROMOTION', 'TRIAL'].includes(paymentType)) {
          state.newConfirmationData.paymentMethod = 'PAID';
          state.newConfirmationData.paymentAmount = 0;
          state.newConfirmationData.totalAmount = 0;
          // Solo borrar comisión si NO hay profesional asignado
          state.newConfirmationData.paymentCommission = currentProfessionalCommission || 0;
          state.newConfirmationData.installments = 1;
        } else {
          state.newConfirmationData.paymentMethod = '';
          state.newConfirmationData.paymentAmount = null;
          state.newConfirmationData.totalAmount = null;
          // Solo borrar comisión si NO hay profesional asignado
          state.newConfirmationData.paymentCommission = currentProfessionalCommission;
          state.newConfirmationData.installments = 1;
        }
      }
    };

    const selectPackage = async pack => {
      if (pack && pack.id) {
        state.selectedPackage = pack;
        state.newConfirmationData.packageId = pack.id;
        state.newConfirmationData.proceduresTotalNumber = pack.proceduresAmount;

        // Intelligent procedure number calculation using proceduresUsed
        if (id.value && (pack.firstBookingId === id.value || pack.firstAttentionId === id.value)) {
          state.newConfirmationData.procedureNumber = 1;
        } else {
          // Use proceduresUsed if available (more accurate)
          if (pack.proceduresUsed !== undefined && pack.proceduresUsed !== null) {
            state.newConfirmationData.procedureNumber = pack.proceduresUsed + 1;
          } else {
            // Fallback to old method
            if (pack.bookingsId || pack.attentionsId) {
              let procedures = 0;
              const bookingProcedures =
                pack.bookingsId && pack.bookingsId.length >= 0 ? pack.bookingsId.length : 0;
              const attentionProcedures =
                pack.attentionsId && pack.attentionsId.length >= 0 ? pack.attentionsId.length : 0;
              if (bookingProcedures >= attentionProcedures) {
                procedures = bookingProcedures;
              } else {
                procedures = attentionProcedures;
              }
              state.newConfirmationData.procedureNumber = procedures + 1;
            } else {
              state.newConfirmationData.procedureNumber = 1;
            }
          }
        }

        // Clear packageId if procedure number exceeds available sessions
        if (state.newConfirmationData.procedureNumber > (pack.proceduresLeft || 0)) {
          alert('No hay sesiones disponibles en este paquete');
          state.newConfirmationData.packageId = undefined;
          state.selectedPackage = {};
          sendData();
          return;
        }

        state.pendingIncomes = await getPendingIncomeByPackage(commerce.value.id, pack.id);
        // Verificar si el paquete está pagado (tanto por el flag paid como por la ausencia de ingresos pendientes)
        const isPackagePaid =
          pack.paid === true || (state.pendingIncomes && state.pendingIncomes.length === 0);
        state.newConfirmationData.packagePaid = isPackagePaid;

        // Si el paquete está pagado y el usuario no ha editado los montos, establecer en 0
        if (isPackagePaid && !userEditedTotalAmount.value && !userEditedPaymentAmount.value) {
          state.newConfirmationData.totalAmount = 0;
          state.newConfirmationData.paymentAmount = 0;
        }
        sendData();
      } else if (pack === 'NEW') {
        state.selectedPackage = {};
        state.newConfirmationData.packageId = undefined;
        state.pendingIncomes = undefined;
        state.newConfirmationData.procedureNumber = 1;
        state.newConfirmationData.proceduresTotalNumber = 1;
        state.newConfirmationData.packagePaid = false;
        sendData();
      } else if (pack === 'NONE') {
        state.selectedPackage = {};
        state.newConfirmationData.packageId = undefined;
        state.pendingIncomes = undefined;
        state.newConfirmationData.procedureNumber = 1;
        state.newConfirmationData.proceduresTotalNumber = 1;
        state.newConfirmationData.packagePaid = false;
        sendData();
      }
      state.selectedPayment = undefined;
      state.newConfirmationData.processPaymentNow = false;
    };

    const selectPayment = payment => {
      if (payment && payment.id) {
        // Preservar comisión del profesional si está asignado
        const currentProfessionalCommission =
          professionalName.value && state.newConfirmationData.paymentCommission
            ? state.newConfirmationData.paymentCommission
            : 0;

        state.newConfirmationData.paymentType = 'PARTIAL';
        state.newConfirmationData.paymentMethod = payment.paymentMethod || undefined;
        state.newConfirmationData.paymentAmount = payment.amount || undefined;
        state.newConfirmationData.totalAmount = payment.totalAmount || undefined;
        state.newConfirmationData.paymentCommission = currentProfessionalCommission;
        state.newConfirmationData.paymentFiscalNote = payment.fiscalNote || undefined;
        state.newConfirmationData.installments = payment.installments || undefined;
        state.newConfirmationData.pendingPaymentId = payment.id;
        sendData();
      }
    };

    const processPaymentNow = async event => {
      // Preservar comisión del profesional si está asignado
      const currentProfessionalCommission =
        professionalName.value && state.newConfirmationData.paymentCommission
          ? state.newConfirmationData.paymentCommission
          : undefined;

      state.newConfirmationData.processPaymentNow = event.target.checked;
      if (state.newConfirmationData.processPaymentNow) {
        // Check if package is paid
        const isPackagePaid = packagePaymentStatus.value && packagePaymentStatus.value.isPaid;

        if (isPackagePaid) {
          // If package is paid, set amounts to 0 to indicate it's included
          state.newConfirmationData.paymentType = 'TOTALLY';
          state.newConfirmationData.paymentMethod = 'PAID'; // Mark as paid
          state.newConfirmationData.paymentAmount = 0;
          state.newConfirmationData.totalAmount = 0;
          state.newConfirmationData.paymentCommission = currentProfessionalCommission || 0;
          state.newConfirmationData.paymentFiscalNote = 'NOTA_FISCAL';
          state.newConfirmationData.installments = 1;
          state.newConfirmationData.pendingPaymentId = undefined;
          state.selectedPayment = undefined;
        } else {
          // Default to TOTALLY when user enables payment
          state.newConfirmationData.paymentType = 'TOTALLY';
          state.newConfirmationData.paymentMethod = '';
          state.newConfirmationData.paymentAmount = null;
          state.newConfirmationData.totalAmount = null;
          state.newConfirmationData.paymentCommission = currentProfessionalCommission;
          state.newConfirmationData.paymentFiscalNote = 'NOTA_FISCAL';
          state.newConfirmationData.installments = 1;
          state.newConfirmationData.pendingPaymentId = undefined;
          state.selectedPayment = undefined;

          // Prefill amounts from suggested total if available
          if (
            servicePriceSuggestion.value > 0 &&
            !userEditedTotalAmount.value &&
            !userEditedPaymentAmount.value
          ) {
            const price = Number(servicePriceSuggestion.value);
            state.newConfirmationData.totalAmount = price;
            // Calcular paymentAmount automáticamente basado en installments
            calculatePaymentAmount();
            // Si calculatePaymentAmount no calculó, usar el precio total
            if (
              !state.newConfirmationData.paymentAmount ||
              state.newConfirmationData.paymentAmount === null
            ) {
              state.newConfirmationData.paymentAmount = price;
            }
          }
        }
      }
      sendData();
    };

    const confirmInstallments = async event => {
      if (event.target.checked) {
        state.newConfirmationData.confirmInstallments = event.target.checked;
      }
      sendData();
    };

    const paidPackage = () =>
      state.selectedPackage &&
      state.selectedPackage.id &&
      state.selectedPackage.status !== 'REQUESTED' &&
      state.pendingIncomes &&
      state.pendingIncomes.length === 0;

    return {
      state,
      loading,
      commerce,
      errorsAdd,
      selectPaymentType,
      sendData,
      confirmPayment,
      selectPackage,
      selectPayment,
      processPaymentNow,
      confirmInstallments,
      paidPackage,
      serviceId,
      serviceIds,
      services,
      servicePriceSuggestion,
      formattedServicePrice,
      userEditedTotalAmount,
      userEditedPaymentAmount,
      calculatePaymentAmount,
      packagePaymentStatus,
      isPaymentConfirmed,
      confirmationMessage,
    };
  },
};
</script>
<template>
  <div class="payment-form-modern">
    <!-- Payment Confirmation Message -->
    <div v-if="isPaymentConfirmed && confirmationMessage" class="payment-confirmed-message">
      <div class="payment-confirmed-header">
        <i class="bi bi-check-circle-fill"></i>
        <h4>{{ confirmationMessage.title }}</h4>
      </div>
      <div class="payment-confirmed-details">
        <p>{{ confirmationMessage.details }}</p>
      </div>
    </div>
    
    <div id="payment-data" v-if="!isPaymentConfirmed">
      <div class="payment-form-content">
        <div v-if="state.packages && state.packages.length > 0" class="payment-form-field">
          <label class="payment-form-label">
            <i class="bi bi-box-seam-fill"></i>
            {{ $t('collaboratorBookingsView.packages') || 'Paquetes' }}
          </label>
          <select
            class="payment-form-select"
            v-model="state.selectedPackage"
            @change="selectPackage(state.selectedPackage)"
            id="package-select"
          >
            <option :value="undefined">
              {{ $t('package.selectPackage') || 'Seleccionar paquete' }}
            </option>
            <option
              v-for="pkg in state.packages"
              :key="pkg.id"
              :value="pkg"
              :disabled="(pkg.proceduresLeft || 0) <= 0"
            >
              {{ pkg.name }} - {{ pkg.proceduresLeft || 0 }}
              {{ $t('package.sessionsLeft') || 'sesiones' }}
              <template v-if="pkg.expireAt">
                ({{ $t('package.expires') || 'Vence' }}:
                {{ new Date(pkg.expireAt).toLocaleDateString() }})
              </template>
            </option>
            <option key="NEW" value="NEW">
              {{ $t('package.newPackage') || 'NUEVO PAQUETE' }}
            </option>
            <option key="NONE" value="NONE">
              {{ $t('package.none') || 'NINGUNO' }}
            </option>
          </select>
          <!-- Intelligent Package Info Display -->
          <div v-if="state.selectedPackage && state.selectedPackage.id" class="package-info-card">
            <!-- Package Payment Status Badge -->
            <div
              v-if="packagePaymentStatus && packagePaymentStatus.isPaid"
              class="package-paid-badge"
            >
              <i class="bi bi-check-circle-fill"></i>
              <span>{{
                $t('paymentForm.packagePaid') || 'Paquete Pagado - Esta sesión está incluida'
              }}</span>
            </div>
            <div
              v-if="packagePaymentStatus && packagePaymentStatus.hasPendingIncomes"
              class="package-pending-badge"
            >
              <i class="bi bi-clock-history"></i>
              <span>
                {{
                  $t('paymentForm.packagePendingIncomes', {
                    count: packagePaymentStatus.pendingIncomesCount,
                  }) || `Pagos pendientes: ${packagePaymentStatus.pendingIncomesCount}`
                }}
              </span>
            </div>
            <div class="package-info-row">
              <span class="package-info-label"
                >{{ $t('package.sessionsRemaining') || 'Sesiones' }}:</span
              >
              <span class="package-info-value">
                <strong>{{ state.selectedPackage.proceduresLeft || 0 }}</strong> /
                {{ state.selectedPackage.proceduresAmount || 0 }}
              </span>
            </div>
            <div v-if="state.selectedPackage.expireAt" class="package-info-row">
              <span class="package-info-label"
                >{{ $t('package.expiration') || 'Vencimiento' }}:</span
              >
              <span class="package-info-value">
                {{ new Date(state.selectedPackage.expireAt).toLocaleDateString() }}
              </span>
            </div>
            <div v-if="state.selectedPackage.lastSessionDate" class="package-info-row">
              <span class="package-info-label"
                >{{ $t('package.lastSession') || 'Última sesión' }}:</span
              >
              <span class="package-info-value">
                {{ new Date(state.selectedPackage.lastSessionDate).toLocaleDateString() }}
              </span>
            </div>
            <div
              v-if="
                (state.selectedPackage.proceduresLeft || 0) <= 3 &&
                (state.selectedPackage.proceduresLeft || 0) > 0
              "
              class="package-warning"
            >
              <i class="bi bi-exclamation-triangle-fill"></i>
              {{ $t('package.lowSessionsWarning') || 'Quedan pocas sesiones en este paquete' }}
            </div>
          </div>
        </div>
        <div class="payment-form-field" id="payment-procedure-total-number-form-add">
          <label class="payment-form-label">
            {{ $t('collaboratorBookingsView.proceduresTotalNumber') }}
          </label>
          <div class="payment-form-procedure">
            <input
              min="1"
              type="number"
              class="payment-form-input"
              v-model="state.newConfirmationData.procedureNumber"
              placeholder="0"
              @keyup="sendData"
            />
            <span class="payment-form-separator">
              {{ $t('collaboratorBookingsView.procedureNumber') }}
            </span>
            <input
              min="1"
              type="number"
              class="payment-form-input"
              v-model="state.newConfirmationData.proceduresTotalNumber"
              placeholder="0"
              @keyup="sendData"
            />
          </div>
        </div>
        <div v-if="confirmPayment === true" class="payment-form-payment-section">
          <div class="payment-form-field payment-form-switch" v-if="!paidPackage()">
            <label class="payment-form-label">
              {{ $t('collaboratorBookingsView.processPaymentNow') }}
            </label>
            <div class="form-check form-switch">
              <input
                class="form-check-input payment-switch-input"
                type="checkbox"
                id="skip-payment"
                v-model="state.newConfirmationData.processPaymentNow"
                @click="processPaymentNow($event)"
                @keyup="sendData"
              />
            </div>
          </div>
          <div
            v-if="state.selectedPackage && state.pendingIncomes && state.pendingIncomes.length > 0"
          >
            <div
              v-if="state.newConfirmationData.processPaymentNow === true"
              class="payment-form-field"
            >
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.pendingPayment') }}
              </label>
              <select
                class="payment-form-select"
                v-model="state.selectedPayment"
                @change="selectPayment(state.selectedPayment)"
                id="types"
              >
                <option key="NONE" :value="undefined">Select</option>
                <option v-for="typ in state.pendingIncomes" :key="typ.name" :value="typ">
                  {{ typ.installmentNumber }} - {{ typ.amount }}
                </option>
              </select>
            </div>
          </div>
          <div v-else-if="paidPackage()">
            <Message
              :title="$t('collaboratorBookingsView.message.9.title')"
              :content="$t('collaboratorBookingsView.message.9.content')"
            />
          </div>
          <div
            v-if="state.newConfirmationData.processPaymentNow === true && !paidPackage()"
            class="payment-form-payment-fields"
          >
            <!-- Package Paid Notice -->
            <div
              v-if="packagePaymentStatus && packagePaymentStatus.isPaid"
              class="package-paid-notice"
            >
              <div class="package-paid-notice-content">
                <i class="bi bi-info-circle-fill"></i>
                <div class="package-paid-notice-text">
                  <strong>{{ $t('paymentForm.packagePaid') || 'Paquete Pagado' }}</strong>
                  <span>{{
                    $t('paymentForm.packagePaidMessage') ||
                    'Esta sesión está incluida en el paquete prepagado. No se requiere pago adicional.'
                  }}</span>
                </div>
              </div>
            </div>
            <!-- SERVICE PRICE HINT -->
            <div
              v-if="servicePriceSuggestion && Number(servicePriceSuggestion) > 0"
              class="payment-form-field service-price-hint"
            >
              <div class="service-price-header">
                <label class="payment-form-label">
                  <i class="bi bi-tag-fill"></i>
                  {{ $t('paymentForm.servicePrice') || 'Precio del servicio' }}
                </label>
                <div class="service-price-info">
                  <span class="service-price-value">{{ formattedServicePrice }}</span>
                  <small class="service-price-note">
                    {{
                      $t('paymentForm.servicePriceNote') ||
                      'Se usa como sugerencia para el total (editable).'
                    }}
                  </small>
                </div>
              </div>
            </div>
            
            <!-- Desktop: Organized in rows | Mobile: Vertical stack -->
            <div class="payment-form-rows">
              <!-- Row 1: Tipo de Pagamento | Método de Pagamento -->
              <div class="payment-form-row">
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentType') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentType') ||
                            'Tipo de Pago: TOTALMENTE (pago completo) o PARCIAL (pago parcial).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <select
                    class="payment-form-select"
                    :class="{ 'is-invalid': state.paymentAmountError }"
                    v-model="state.newConfirmationData.paymentType"
                    id="types"
                    @change="selectPaymentType($event)"
                  >
                    <option v-for="typ in state.paymentTypes" :key="typ.name" :value="typ.id">
                      {{ $t(`paymentTypes.${typ.name}`) }}
                    </option>
                  </select>
                </div>
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentMethod') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentMethod') ||
                            'Método de Pago: Forma en que se realizó el pago (Efectivo, Tarjeta, Transferencia, etc.).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <select
                    class="payment-form-select"
                    :class="{ 'is-invalid': state.paymentMethodError }"
                    v-model="state.newConfirmationData.paymentMethod"
                    id="types"
                    @change="sendData"
                  >
                    <option v-for="typ in state.paymentMethods" :key="typ.name" :value="typ.id">
                      {{ $t(`paymentClientMethods.${typ.name}`) }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Row 2: Nota Fiscal | Total Procedimiento -->
              <div class="payment-form-row">
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentFiscalNote') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentFiscalNote') ||
                            'Nota Fiscal: Tipo de documento fiscal (Nota Fiscal o Gerencial).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <select
                    class="payment-form-select"
                    v-model="state.newConfirmationData.paymentFiscalNote"
                    @change="sendData"
                    id="types"
                  >
                    <option v-for="typ in state.paymentFicalNoteTypes" :key="typ.name" :value="typ.id">
                      {{ $t(`paymentFiscalNotes.${typ.name}`) }}
                    </option>
                  </select>
                </div>
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.totalAmount') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.totalAmount') ||
                            'Total del procedimiento: Precio del servicio para esta sesión (editable).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                    <span
                      v-if="packagePaymentStatus && packagePaymentStatus.isPaid"
                      class="package-paid-indicator"
                    >
                      <i class="bi bi-check-circle-fill"></i>
                      {{ $t('paymentForm.includedInPackage') || '(Incluido en paquete)' }}
                    </span>
                  </label>
                  <input
                    min="1"
                    type="number"
                    class="payment-form-input"
                    :class="{
                      'is-invalid': state.totalAmountError,
                      'package-paid-input': packagePaymentStatus && packagePaymentStatus.isPaid,
                    }"
                    v-model="state.newConfirmationData.totalAmount"
                    placeholder="100"
                    :disabled="packagePaymentStatus && packagePaymentStatus.isPaid"
                    @input="
                      userEditedTotalAmount = true;
                      calculatePaymentAmount();
                      sendData();
                    "
                  />
                </div>
              </div>

              <!-- Row 3: Valor Pago | Parcelas -->
              <div class="payment-form-row">
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentAmount') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentAmount') ||
                            'Valor Pagado: Monto que se está pagando en esta transacción. Se calcula automáticamente como Total / Parcelas (editable).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                    <span
                      v-if="packagePaymentStatus && packagePaymentStatus.isPaid"
                      class="package-paid-indicator"
                    >
                      <i class="bi bi-check-circle-fill"></i>
                      {{ $t('paymentForm.includedInPackage') || '(Incluido en paquete)' }}
                    </span>
                  </label>
                  <input
                    min="1"
                    type="number"
                    class="payment-form-input"
                    :class="{
                      'is-invalid': state.paymentAmountError,
                      'package-paid-input': packagePaymentStatus && packagePaymentStatus.isPaid,
                    }"
                    v-model="state.newConfirmationData.paymentAmount"
                    placeholder="100"
                    :disabled="packagePaymentStatus && packagePaymentStatus.isPaid"
                    @input="
                      userEditedPaymentAmount = true;
                      sendData();
                    "
                  />
                </div>
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.installments') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.installments') ||
                            'Número de Parcelas: Cantidad de cuotas en las que se dividirá el pago. El valor pagado se calcula automáticamente como Total / Parcelas.'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <input
                    min="1"
                    type="number"
                    class="payment-form-input"
                    :class="{ 'is-invalid': state.installmentsError }"
                    v-model="state.newConfirmationData.installments"
                    placeholder="100"
                    @input="
                      calculatePaymentAmount();
                      sendData();
                    "
                    @keyup="sendData"
                  />
                </div>
              </div>

              <!-- Row 4: Professional Commission Info (full width) -->
              <div v-if="professionalName" class="payment-form-row payment-form-row-single">
                <div class="payment-form-field payment-commission-section">
                  <div class="professional-commission-header">
                    <label class="payment-form-label">
                      <i class="bi bi-person-badge"></i>
                      {{ $t('professionals.assignedProfessional') || 'Profesional Asignado' }}
                    </label>
                    <div class="professional-commission-info">
                      <span class="professional-name">{{ professionalName }}</span>
                      <span v-if="professionalCommission" class="suggested-commission">
                        Comisión Asignada:
                        <strong>{{ professionalCommission }}</strong>
                      </span>
                      <span
                        v-if="suggestedCommissionAmount && state.newConfirmationData.paymentAmount"
                        class="calculated-commission"
                      >
                        {{ $t('professionals.calculatedAmount') || 'Monto Calculado' }}:
                        <strong
                          >{{ suggestedCommissionAmount }} {{ commerce?.currency || 'BRL' }}</strong
                        >
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Row 5: Comisión de Pago (full width) -->
              <div class="payment-form-row payment-form-row-single">
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentCommission') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentCommission') ||
                            'Comisión de Pago: Monto de comisión asociado a este pago (opcional).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <input
                    min="1"
                    type="number"
                    class="payment-form-input"
                    v-model.number="state.newConfirmationData.paymentCommission"
                    placeholder="100"
                    @input="sendData"
                    @change="sendData"
                  />
                </div>
              </div>

              <!-- Row 6: Confirmar Parcela (switch, full width) -->
              <div class="payment-form-row payment-form-row-single">
                <div class="payment-form-field payment-form-switch">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.confirmInstallments') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.confirmInstallments') ||
                            'Confirmar Parcela: Si está activado, todas las cuotas se crean como CONFIRMADAS (pagadas). Si está desactivado, se crean como PENDIENTES (requieren confirmación manual).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <div class="form-check form-switch">
                    <input
                      class="form-check-input payment-switch-input"
                      type="checkbox"
                      id="confirm-installments"
                      v-model="state.newConfirmationData.confirmInstallments"
                      @click="confirmInstallments($event)"
                      @keyup="sendData"
                    />
                  </div>
                </div>
              </div>

              <!-- Row 6: Comentário (textarea, full width) -->
              <div class="payment-form-row payment-form-row-single">
                <div class="payment-form-field">
                  <label class="payment-form-label">
                    {{ $t('collaboratorBookingsView.paymentComment') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{
                            $t('paymentForm.tooltip.paymentComment') ||
                            'Comentario de Pago: Notas adicionales sobre este pago (opcional).'
                          }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill payment-field-info-icon"></i>
                    </Popper>
                  </label>
                  <textarea
                    class="payment-form-textarea"
                    id="comment"
                    rows="3"
                    v-model="state.newConfirmationData.paymentComment"
                    :placeholder="$t('collaboratorBookingsView.paymentComment')"
                    @keyup="sendData"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="payment-form-errors" v-if="errorsAdd.length > 0">
          <Warning>
            <template v-slot:message>
              <li v-for="(error, index) in errorsAdd" :key="index">
                {{ $t(error) }}
              </li>
            </template>
          </Warning>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* Modern Payment Form - Compact */
.payment-form-modern {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.payment-form-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: -0.01em;
}

.payment-form-select,
.payment-form-input {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
}

.payment-form-select:hover,
.payment-form-input:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-select:focus,
.payment-form-input:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-select.is-invalid,
.payment-form-input.is-invalid {
  border-color: #dc3545;
}

.payment-form-procedure {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.payment-form-procedure .payment-form-input {
  flex: 1;
}

.payment-form-separator {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.payment-form-switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.form-check-input {
  width: 1.25em;
  height: 1.25em;
  margin-top: 0.125em;
  vertical-align: top;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  border: 1px solid rgba(0, 0, 0, 0.25);
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border-radius: 0.25rem;
}

.form-check-input[type="checkbox"]:checked {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.form-switch .form-check-input {
  width: 2em;
  margin-left: -2.5em;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba%280,0,0,.25%29'/%3e%3c/svg%3e");
  background-position: left center;
  border-radius: 2em;
  transition: background-position .15s ease-in-out;
  background-color: #fff !important;
  border-color: rgba(0, 0, 0, 0.25) !important;
}

.form-switch .form-check-input:checked {
  background-position: right center;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e");
  background-color: #0d6efd !important;
  border-color: #0d6efd !important;
}

/* Estilos específicos para el switch de payment */
.payment-form-field.payment-form-switch .form-switch .form-check-input.payment-switch-input {
  width: 3rem !important;
  height: 1.5rem !important;
  margin-left: -3.25rem !important;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba%280,0,0,.25%29'/%3e%3c/svg%3e") !important;
  background-position: left center !important;
  background-repeat: no-repeat !important;
  background-size: contain !important;
}

.payment-form-field.payment-form-switch .form-switch .form-check-input.payment-switch-input:checked {
  background-color: #0d6efd !important;
  border-color: #0d6efd !important;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e") !important;
  background-position: right center !important;
}

.payment-form-textarea {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
  resize: vertical;
  font-family: inherit;
}

.payment-form-textarea:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-textarea:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-payment-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
}

.payment-form-payment-fields {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Desktop: Organize fields in rows */
.payment-form-rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Payment Confirmation Message Styles */
.payment-confirmed-message {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.payment-confirmed-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.payment-confirmed-header i {
  color: #155724;
  font-size: 1.5rem;
}

.payment-confirmed-header h4 {
  color: #155724;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.payment-confirmed-details {
  color: #155724;
}

.payment-confirmed-details p {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
}

.payment-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-row-single {
  /* For single field rows (like textarea, switches) */
}

/* Desktop: 2 columns layout */
@media (min-width: 768px) {
  .payment-form-row {
    flex-direction: row;
    gap: 0.75rem;
  }

  .payment-form-row .payment-form-field {
    flex: 1;
    min-width: 0;
  }

  .payment-form-row-single .payment-form-field {
    flex: 1;
  }
}

.payment-form-errors {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 6px;
}

/* Legacy styles for compatibility */
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}

.data-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}

.examples {
  font-size: 0.8rem;
  line-height: 1rem;
  color: 0.5px solid var(--gris-default);
}

.text-label {
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

/* Intelligent Package Info Card */
.package-info-card {
  margin-top: 0.5rem;
  padding: 0.625rem;
  background: rgba(245, 246, 247, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.package-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

.package-info-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.package-info-value {
  font-weight: 700;
  color: #000000;
}

.package-warning {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  background: rgba(249, 195, 34, 0.1);
  border: 1px solid rgba(249, 195, 34, 0.3);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #f9c322;
  margin-top: 0.25rem;
}

.package-warning i {
  font-size: 0.875rem;
}

.payment-form-label i {
  margin-right: 0.375rem;
  color: rgba(0, 0, 0, 0.6);
}

/* SERVICE PRICE HINT */
.service-price-hint {
  background: rgba(31, 63, 146, 0.06);
  border: 1px solid rgba(31, 63, 146, 0.15);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.service-price-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.service-price-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.service-price-value {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
}

.service-price-note {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

/* PROFESSIONAL COMMISSION STYLES */
.payment-commission-section {
  background: rgba(74, 144, 226, 0.08);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.professional-commission-header .payment-form-label {
  color: #4a90e2;
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.professional-commission-header .payment-form-label i {
  color: #4a90e2;
  margin-right: 0.5rem;
}

.professional-commission-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.professional-name {
  font-weight: 700;
  color: #2c3e50;
  font-size: 0.9rem;
}

.suggested-commission,
.calculated-commission {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.7);
}

.suggested-commission strong,
.calculated-commission strong {
  color: #4a90e2;
  font-weight: 600;
}

/* COMMISSION WARNING STYLES */
.commission-warning-content {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

.commission-warning-icon {
  font-size: 0.875rem;
  color: rgba(255, 193, 7, 0.8);
  cursor: help;
  transition: color 0.2s ease;
}

.commission-warning-icon:hover {
  color: rgba(255, 193, 7, 1);
}

/* PACKAGE PAYMENT STATUS BADGES */
.package-paid-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: rgba(0, 194, 203, 0.1);
  border: 1px solid rgba(0, 194, 203, 0.3);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #00c2cb;
}

.package-paid-badge i {
  font-size: 0.875rem;
  color: #00c2cb;
}

.package-pending-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: rgba(249, 195, 34, 0.1);
  border: 1px solid rgba(249, 195, 34, 0.3);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #f9c322;
}

.package-pending-badge i {
  font-size: 0.875rem;
  color: #f9c322;
}

.package-paid-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #00c2cb;
}

.package-paid-indicator i {
  font-size: 0.75rem;
}

.package-paid-input {
  background: rgba(0, 194, 203, 0.05);
  border-color: rgba(0, 194, 203, 0.2);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
}

.package-paid-input:disabled {
  opacity: 0.7;
}

/* Package Paid Notice */
.package-paid-notice {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.2);
  border-radius: 8px;
}

.package-paid-notice-content {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.package-paid-notice-content i {
  font-size: 1rem;
  color: #00c2cb;
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.package-paid-notice-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.package-paid-notice-text strong {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #00c2cb;
}

.package-paid-notice-text span {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
}

/* Payment Field Info Icon */
.payment-field-info-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  margin-left: 0.375rem;
  cursor: help;
  transition: color 0.2s ease;
}

.payment-field-info-icon:hover {
  color: #00c2cb;
}

/* Popper tooltip styles for payment form */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
  max-width: 320px !important;
}
</style>
