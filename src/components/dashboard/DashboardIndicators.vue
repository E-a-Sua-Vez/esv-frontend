<script>
import Spinner from '../../components/common/Spinner.vue';
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Message from '../../components/common/Message.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import html2pdf from "html2pdf.js";
import AttentionRatingDetails from './domain/AttentionRatingDetails.vue';
import AttentionNPSDetails from './domain/AttentionNPSDetails.vue';
import AttentionCommentsDetails from './domain/AttentionCommentsDetails.vue';
import AttentionCollaboratorsDetails from './domain/AttentionCollaboratorsDetails.vue';
import AttentionNotificationDetails from './domain/AttentionNotificationDetails.vue';
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';

export default {
  name: 'DashboardIndicators',
  components: {
    SimpleCard,
    DetailsCard,
    Message,
    SimpleDownloadCard,
    html2pdf,
    AttentionRatingDetails,
    AttentionNPSDetails,
    AttentionCommentsDetails,
    AttentionCollaboratorsDetails,
    AttentionNotificationDetails,
    PDFHeader,
    PDFFooter,
    Spinner
  },
  props: {
    showIndicators: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined }
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      sentimentScore: {
        totalSentimentBad: this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentBad'] || 0,
        totalSentimentNeutral: this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentNeutral'] || 0,
        totalSentimentGood: this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentGood'] || 0
      }
    }
  },
  onBeforeMount() {

  },
  methods: {
    exportToPDF() {
      this.loading = true;
      this.detailsOpened = true;
      const filename = `indicators-${this.commerce.name}-${this.commerce.tag}-${this.startDate}-${this.endDate}.pdf`;
      const options = {
				margin: .5,
  			filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};
      let doc = document.getElementById("indicators-component");
      document.getElementById("pdf-header").style.display = "block";
      document.getElementById("pdf-footer").style.display = "block";
      setTimeout(() => {
        html2pdf().set(options).from(doc).save().then(() => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          doc = undefined;
          this.detailsOpened = false;
          this.loading = false;
        }).catch(error => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          this.detailsOpened = false;
          doc = undefined;
          this.loading = false;
        });
      }, 1000);
    }
  }
}
</script>

<template>
  <div id="indicators" class="row" v-if="showIndicators === true && toggles['dashboard.indicators.view']">
    <SimpleDownloadCard
      :download="toggles['dashboard.reports.indicators']"
      :title="$t('dashboard.reports.indicators.title')"
      :showTooltip="true"
      :description="$t('dashboard.reports.indicators.description')"
      :icon="'bi-file-earmark-pdf'"
      @download="exportToPDF"
      :canDownload="toggles['dashboard.reports.indicators'] === true"
    ></SimpleDownloadCard>
    <Spinner :show="loading"></Spinner>
    <div id="indicators-component">
      <PDFHeader
        :show="toggles['dashboard.reports.indicators']"
        :title="$t('dashboard.reports.indicators.title')"
        :startDate="startDate"
        :endDate="endDate"
        :commerce="commerce"
      >
      </PDFHeader>
      <div id="attention-number">
        <DetailsCard
          :show="!!toggles['dashboard.attention-number.view']"
          :data="calculatedMetrics['attention.created'].attentionNumber"
          :subdatapastperiod="calculatedMetrics['attention.created'].pastPeriodAttentionNumber"
          :subdatapastmonth="calculatedMetrics['attention.created'].pastMonthAttentionNumber"
          :subdatacurrentperiod="calculatedMetrics['attention.created'].currentMonthAttentionNumber"
          :title="$t('dashboard.items.attentions.1')"
          :showTooltip="false"
          :icon="'bi-qr-code'"
          :iconStyleClass="'blue-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <div id="attention-number-details" class="row">
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-person-fill h4 fw-bold green-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.16') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['attention.created'].typesFlow.STANDARD || 0 }}</span>
                </div>
              </div>
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-people-fill h4 fw-bold red-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.17') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['attention.created'].typesFlow.NODEVICE || 0 }}</span>
                </div>
              </div>
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-star-fill h4 fw-bold yellow-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.18') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['attention.created'].typesFlow.SURVEY_ONLY || 0 }}</span>
                </div>
              </div>
            </div>
          </template>
        </DetailsCard>
      </div>
      <div id="booking-number">
        <DetailsCard
          :show="!!toggles['dashboard.booking-number.view']"
          :data="calculatedMetrics['booking.created'].bookingNumber"
          :title="$t('dashboard.items.attentions.27')"
          :showTooltip="false"
          :icon="'bi-calendar2-check-fill'"
          :iconStyleClass="'orange-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <div id="booking-number-details" class="row">
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-calendar-plus-fill h4 fw-bold yellow-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.28') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[0] || 0 }}</span>
                </div>
              </div>
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-calendar2-check-fill h4 fw-bold green-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.29') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[1] || 0 }}</span>
                </div>
              </div>
              <div class="col-4">
                <div class="metric-card-title">
                  <i class="bi bi-calendar-x-fill h4 fw-bold red-icon m-1"></i>
                  {{ $t('dashboard.items.attentions.30') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[2] || 0 }}</span>
                </div>
              </div>
            </div>
          </template>
        </DetailsCard>
      </div>
      <div>
        <div class="row">
          <div id="attention-time-avg" class="col">
            <SimpleCard
              :show="!!toggles['dashboard.attention-time-avg.view']"
              :data="calculatedMetrics['attention.created'].avgDuration"
              :title="$t('dashboard.items.attentions.2')"
              :showTooltip="true"
              :description="$t('dashboard.seconds')"
              :icon="'bi-clock-history'"
              :iconStyleClass="'green-icon'">
            </SimpleCard>
          </div>
          <div id="attention-no-device" class="col">
            <SimpleCard
              :show="!!toggles['dashboard.attention-no-device.view']"
              :data="calculatedMetrics['attention.created'].noDevicePer || 0 + '%'"
              :subdata="calculatedMetrics['attention.created'].noDevice || 0"
              :title="$t('dashboard.items.attentions.5')"
              :showTooltip="false"
              :icon="'bi-people-fill'"
              :iconStyleClass="'orange-icon'">
            </SimpleCard>
          </div>
        </div>
      </div>
      <div id="attention-queue">
        <SimpleCard
          :show="!!toggles['dashboard.attention-queue.view']"
          :data="calculatedMetrics['attention.created'].maxQueue"
          :subdata="calculatedMetrics['attention.created'].maxQueueCount"
          :title="$t('dashboard.items.attentions.4')"
          :showTooltip="false"
          :icon="'bi-person-heart'"
          :iconStyleClass="'red-icon'">
        </SimpleCard>
      </div>
      <div id="attention-rating-avg">
        <DetailsCard
          :show="!!toggles['dashboard.attention-rating-avg.view']"
          :data="calculatedMetrics['survey.created'].avgRating || 0"
          :subdata="calculatedMetrics['survey.created'].count_rating || 0"
          :title="$t('dashboard.items.attentions.3')"
          :showTooltip="true"
          :description="$t('dashboard.rating')"
          :icon="'bi-star-fill'"
          :iconStyleClass="'yellow-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionRatingDetails
              :show="toggles['dashboard.attention-rating-avg.view']"
              :count="calculatedMetrics['survey.created'].count_rating || 0"
              :min="calculatedMetrics['survey.created']['min']?.rating || 0"
              :max="calculatedMetrics['survey.created']['max']?.rating || 0"
              :messages="calculatedMetrics['survey.created']['messages'] || []"
              :score="calculatedMetrics['survey.created']['csatScore'] || []"
              :limit="5"
            >
            </AttentionRatingDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-nps-avg">
        <DetailsCard
          :show="!!toggles['dashboard.attention-nps-avg.view']"
          :data="calculatedMetrics['survey.created'].nps"
          :subdata="calculatedMetrics['survey.created'].count_nps"
          :title="$t('dashboard.items.attentions.24')"
          :showTooltip="true"
          :description="$t('dashboard.nps')"
          :icon="'bi-megaphone-fill'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionNPSDetails
              :show="!!toggles['dashboard.attention-nps-avg.view']"
              :min="calculatedMetrics['survey.created']['min']?.nps || 0"
              :max="calculatedMetrics['survey.created']['max']?.nps || 0"
              :score="calculatedMetrics['survey.created']['npsScore'] || []"
              :distribution="calculatedMetrics['survey.created']['npsDistribution']"
              :count="calculatedMetrics['survey.created'].count_nps || 0"
              :limit="10"
            >
            </AttentionNPSDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-comments-avg">
        <DetailsCard
          :show="!!toggles['dashboard.attention-comments-avg.view']"
          :data="calculatedMetrics['survey.created']?.prom_score"
          :subdata="calculatedMetrics['survey.created']['scoredMessages']?.length"
          :title="$t('dashboard.items.attentions.21')"
          :showTooltip="true"
          :description="$t('dashboard.sentiment')"
          :icon="'bi-chat-heart-fill'"
          :iconStyleClass="'red-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionCommentsDetails
              :show="!!toggles['dashboard.attention-comments-avg.view']"
              :messages="calculatedMetrics['survey.created']['scoredMessages']"
              :min="calculatedMetrics['survey.created']['sentimentScore']['minSentiment'] || 0"
              :max="calculatedMetrics['survey.created']['sentimentScore']['maxSentiment'] || 0"
              :distribution="sentimentScore"
              :limit="5"
            >
            </AttentionCommentsDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-collaborators">
        <DetailsCard
          :show="!!toggles['dashboard.attention-collaborators.view'] && calculatedMetrics['collaborators'].length > 0"
          :data="calculatedMetrics['collaborators'] ? calculatedMetrics['collaborators'][0]?.name : 'No Data'"
          :subdata="calculatedMetrics['collaborators'] ? calculatedMetrics['collaborators'][0]?.attention_counter : 0"
          :title="$t('dashboard.items.attentions.20')"
          :showTooltip="false"
          :icon="'bi-trophy-fill'"
          :iconStyleClass="'green-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionCollaboratorsDetails
              :show="!!toggles['dashboard.attention-collaborators.view'] && calculatedMetrics['collaborators'].length > 0"
              :collaborators="calculatedMetrics['collaborators']"
              :limit="5"
            >
            </AttentionCollaboratorsDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-notification">
        <DetailsCard
          :show="!!toggles['dashboard.attention-notification.view']"
          :data="calculatedMetrics['notification.created'].notificationNumber"
          :title="$t('dashboard.items.attentions.6')"
          :showTooltip="false"
          :icon="'bi-send-check-fill'"
          :iconStyleClass="'blue-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionNotificationDetails
              :show="!!toggles['dashboard.attention-notification.view']"
              :count="calculatedMetrics['notification.created'].notifiedAttentions"
              :booking="calculatedMetrics['notification.created'].notifiedBookings"
              :waitlist="calculatedMetrics['notification.created'].notifiedWaitlists"
              :channels="calculatedMetrics['notification.created'].channelFlow"
              :types="calculatedMetrics['notification.created'].typesFlow"
            >
            </AttentionNotificationDetails>
          </template>
        </DetailsCard>
      </div>
      <PDFFooter
        :show="toggles['dashboard.reports.indicators']"
      ></PDFFooter>
    </div>
  </div>
  <div v-if="showIndicators === true && !toggles['dashboard.indicators.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')" />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>