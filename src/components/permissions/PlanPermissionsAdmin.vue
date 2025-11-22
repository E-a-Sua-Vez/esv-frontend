<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPlans, updatePlanPermission } from '../../application/services/plan';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../common/ToggleCapabilities.vue';
import Message from '../common/Message.vue';
import PoweredBy from '../common/PoweredBy.vue';
import CommerceLogo from '../common/CommerceLogo.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import SimplePermissionCard from './SimplePermissionCard.vue';

export default {
  name: 'PlanPermissionsAdmin',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    ToggleCapabilities,
    Warning,
    SimplePermissionCard,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      plans: {},
      planSelectedIndex: 0,
      planSelected: {
        permissions: [],
      },
      permissions: [],
      showAdd: false,
      newPermission: {},
      permissionError: false,
      errorsAdd: [],
      toggles: {},
      searchString: '',
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.plans = await getPlans();
        await selectPlan(state.planSelectedIndex);
        state.toggles = await getPermissions('plans', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const selectPlan = async planIndex => {
      try {
        loading.value = true;
        state.planSelectedIndex = planIndex;
        state.planSelected = state.plans[planIndex];
        const permissions = [];
        if (
          state.planSelected &&
          state.planSelected.permissions &&
          !Array.isArray(state.planSelected.permissions)
        ) {
          Object.keys(state.planSelected.permissions).map(permission => {
            permissions.push({
              name: permission,
              value: state.planSelected.permissions[permission],
            });
          });
          state.planSelected.permissions = permissions;
          state.permissions = permissions;
        }
        state.permissions = state.permissions.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPermission = {
        type: 'boolean',
      };
    };

    const validateAdd = permission => {
      state.errorsAdd = [];
      if (!permission.name || permission.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessPermissionsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPermission)) {
          state.newPermission.value = false;
          if (state.newPermission.type) {
            if (state.newPermission.type === 'number') {
              state.newPermission.value = 0;
            }
          }
          const permission = {
            name: state.newPermission.name,
            value: state.newPermission.value,
          };
          await updatePlanPermission(state.planSelected.id, permission);
          state.plans = await getPlans();
          selectPlan(state.planSelectedIndex);
          state.showAdd = false;
          state.newPermission = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async permission => {
      try {
        await updatePlanPermission(state.planSelected.id, permission);
        state.plans = await getPlans();
        selectPlan(state.planSelectedIndex);
        state.newPermission = {};
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const filter = computed(() => {
      if (state.searchString.length >= 3) {
        if (state.planSelected && state.planSelected.permissions.length > 0) {
          state.permissions = state.planSelected.permissions.filter(i =>
            i.name.toLowerCase().startsWith(state.searchString.toLowerCase())
          );
        }
      } else {
        state.permissions = state.planSelected.permissions;
      }
    });

    return {
      state,
      loading,
      alertError,
      filter,
      add,
      update,
      goBack,
      selectPlan,
      showAdd,
    };
  },
};
</script>

<template>
  <div>
    <div id="page-header" class="text-center mt-2">
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
    </div>
    <div id="businessPermissionsAdmin">
      <div v-if="state.toggles['plans.admin.view']">
        <div id="businessPermissionsAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.plans">
              <span>{{ $t('businessPermissionsAdmin.plan') }} </span>
              <select
                class="btn btn-md fw-bold text-dark m-1 select px-1"
                v-model="state.planSelected"
                @change="selectPlan($event.target.selectedIndex)"
                id="plans"
              >
                <option v-for="plan in state.plans" :key="plan.id" :value="plan">
                  {{ plan.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="row mx-4">
            <input
              min="1"
              max="50"
              type="text"
              class="form-control"
              v-model="state.searchString"
              :placeholder="$t('enterSearcher')"
            />
            {{ filter }}
          </div>
        </div>
        <div v-if="!loading" id="businessPermissionsAdmin-result" class="mt-4">
          <div>
            <div v-if="state.plans.length === 0">
              <Message
                :title="$t('businessPermissionsAdmin.message.2.title')"
                :content="$t('businessPermissionsAdmin.message.2.content')"
              />
            </div>
            <div class="row mb-2">
              <div class="col-8 text-label">
                <span>{{ $t('businessPermissionsAdmin.listResult') }}</span>
                <span class="fw-bold m-2">{{ state.permissions.length }}</span>
              </div>
              <div class="col-4">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!state.toggles['plans.admin.add']"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
            <div
              id="add-plans"
              class="plans-card mb-4"
              v-if="state.showAdd && state.toggles['plans.admin.add']"
            >
              <div class="row g-1">
                <div id="plans-permission-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessPermissionsAdmin.permission') }}
                  </div>
                  <div class="col-8">
                    <input
                      min="5"
                      type="text"
                      class="form-control"
                      v-model="state.newPermission.name"
                      v-bind:class="{ 'is-invalid': state.permissionError }"
                      placeholder="Ex. dashboard.panel.view"
                    />
                  </div>
                </div>
                <div id="plans-permission-type-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessPermissionsAdmin.type') }}
                  </div>
                  <div class="col-8">
                    <input
                      type="radio"
                      class="btn-check mx-2"
                      v-model="state.newPermission.type"
                      value="boolean"
                      name="permission-type"
                      id="success-outlined"
                      autocomplete="off"
                      checked
                    />
                    <label class="btn btn-outline-success" for="success-outlined">Boolean</label>
                    <input
                      type="radio"
                      class="btn-check m-2"
                      v-model="state.newPermission.type"
                      value="number"
                      name="permission-type"
                      id="danger-outlined"
                      autocomplete="off"
                    />
                    <label class="btn btn-outline-danger m-2" for="danger-outlined">Number</label>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newPermission)"
                  >
                    {{ $t('businessPermissionsAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in state.errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
            </div>
            <div
              class="plans-card mb-4"
              v-if="state.permissions.length > 0 && state.toggles['plans.admin.read']"
            >
              <div v-for="(permission, index) in state.permissions" :key="index">
                <SimplePermissionCard
                  :show="true"
                  :can-update="state.toggles['plans.admin.update']"
                  :permission="permission"
                  :show-tooltip="true"
                  @update="update"
                >
                </SimplePermissionCard>
              </div>
            </div>
            <div v-if="!state.toggles['plans.admin.read'] && !loading">
              <Message
                :title="$t('businessPermissionsAdmin.message.1.title')"
                :content="$t('businessPermissionsAdmin.message.1.content')"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!state.toggles['plans.admin.view'] && !loading">
        <Message
          :title="$t('businessPermissionsAdmin.message.1.title')"
          :content="$t('businessPermissionsAdmin.message.1.content')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.module-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.module-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.plans-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
</style>
