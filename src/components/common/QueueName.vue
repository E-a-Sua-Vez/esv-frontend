<script>
import QueueAttentionDetails from '../domain/QueueAttentionDetails.vue';

export default {
  components: { QueueAttentionDetails },
  name: 'QueueName',
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    details: { type: Boolean, default: false },
    queuePendingDetails: { type: Object, default: [] },
    queueProcessingDetails: { type: Object, default: [] }
  },
  data() {
    return {
      extendedEntity: false,
    }
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    }
  }
}
</script>

<template>
  <div>
    <div :class="queue.active === true ? 'active' : 'desactived'">
      <span
        v-if="details"
        class="queue-details"
        :class="queue.active === true ? 'active-name' : 'desactived-name'"
        data-bs-toggle="modal"
        href="#queueModal"
      >
        <div class="row centered">
          <div class="col-8">
            <i class="bi bi-person-lines-fill"></i> {{ queue.name }}
          </div>
          <div class="col-2">
            <span
              data-bs-toggle="modal"
              href="#queueModal">
              <i class="dark fw-bold" :class="'bi bi-arrow-right-circle-fill'"></i>
            </span>
          </div>
        </div>
      </span>
      <span v-else :class="queue.active === true ? 'active-name' : 'desactived-name'">
        <i class="bi bi-person-lines-fill"></i> {{ queue.name }}
      </span>
    </div>
    <!-- Modal Queue Details -->
    <div class="modal fade" id="queueModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered" :class="queue.active === true ? 'active-name' : 'desactived-name'">
              <h5 class="modal-title fw-bold"><i class="bi bi-person-lines-fill"></i> {{ queue.name }}</h5>
              <button id="close-modal" class="btn-close btn-light" type="button" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body text-center pb-3">
              <QueueAttentionDetails
                :queue="queue"
                :queuePendingDetails="queuePendingDetails"
                :queueProcessingDetails="queueProcessingDetails"
              ></QueueAttentionDetails>
              <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" data-bs-toggle="modal" data-bs-target="#queueModal">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active {
  background-color: var(--azul-turno);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--azul-turno);
}
.active-name {
  background-color: var(--azul-turno);
  color: var(--color-background);
  font-weight: 700;
  font-size: .9rem;
}
.desactived {
  background-color: var(--gris-tooltip);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--gris-tooltip);
}
.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: .9rem;
}
.show {
  padding: .5rem;
  overflow-y: auto;
}
.queue-details {
  cursor: pointer;
}

</style>