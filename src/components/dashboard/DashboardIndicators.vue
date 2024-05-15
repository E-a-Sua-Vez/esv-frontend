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
import AttentionOriginDetails from './domain/AttentionOriginDetails.vue';
import AttentionClientContactDetails from './domain/AttentionClientContactDetails.vue';
import AttentionDaysSinceDetails from './domain/AttentionDaysSinceDetails.vue';
import CollectionDetails from './domain/CollectionDetails.vue';

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
    Spinner,
    AttentionOriginDetails,
    AttentionClientContactDetails,
    AttentionDaysSinceDetails,
    CollectionDetails
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
      sentimentScore: {}
    }
  },
  beforeMount() {
    if (this.calculatedMetrics['survey.created'] && this.calculatedMetrics['survey.created']['sentimentScore']) {
      this.sentimentScore['totalSentimentBad'] = this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentBad'] || 0;
      this.sentimentScore['totalSentimentNeutral'] = this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentNeutral'] || 0;
      this.sentimentScore['totalSentimentGood'] = this.calculatedMetrics['survey.created']['sentimentScore']['totalSentimentGood'] || 0;
    }
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
          :subdata="calculatedMetrics['booking.created'].stillPendingBookings"
          :title="$t('dashboard.items.attentions.27')"
          :showTooltip="true"
          :description="$t('dashboard.booking')"
          :icon="'bi-calendar2-check-fill'"
          :iconStyleClass="'orange-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <div id="booking-number-details" class="row centered">
              <div class="col-3">
                <div class="metric-card-title">
                  <i class="bi bi-calendar-plus-fill h4 fw-bold yellow-icon m-1"></i>
                </div>
                <div class="metric-card-title">
                  {{ $t('dashboard.items.attentions.28') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[0] || 0 }}</span>
                </div>
              </div>
              <div class="col-3">
                <div class="metric-card-title">
                  <i class="bi bi-calendar2-check-fill h4 fw-bold blue-icon m-1"></i>
                </div>
                <div class="metric-card-title">
                  {{ $t('dashboard.items.attentions.35') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[2] || 0 }}</span>
                </div>
              </div>
              <div class="col-3">
                <div class="metric-card-title">
                  <i class="bi bi-calendar2-heart-fill h4 fw-bold green-icon m-1"></i>
                </div>
                <div class="metric-card-title">
                  {{ $t('dashboard.items.attentions.29') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[1] || 0 }}</span>
                </div>
              </div>
              <div class="col-3">
                <div class="metric-card-title">
                  <i class="bi bi-calendar-x-fill h4 fw-bold red-icon m-1"></i>
                </div>
                <div class="metric-card-title">
                  {{ $t('dashboard.items.attentions.30') }}
                </div>
                <div class="centered">
                  <span class="h5 fw-bold">{{ calculatedMetrics['booking.created'].bookingFlow.datasets[3] || 0 }}</span>
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
          :data="calculatedMetrics['survey.created'].nps || 0"
          :subdata="calculatedMetrics['survey.created'].count_nps || 0"
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
      <div id="attention-origin-avg">
        <DetailsCard
          :show="!!toggles['dashboard.attention-origin-avg.view']"
          :data="calculatedMetrics['clients']['maxOrigin']?.name ? $t(`origin.${calculatedMetrics['clients']['maxOrigin']?.name}`) : 'No Data'"
          :subdata="calculatedMetrics['clients']['maxOrigin'] ? calculatedMetrics['clients']['maxOrigin']?.count : 0"
          :title="$t('dashboard.items.attentions.31')"
          :showTooltip="true"
          :description="$t('dashboard.origin')"
          :icon="'bi-emoji-heart-eyes-fill'"
          :iconStyleClass="'orange-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionOriginDetails
              :show="!!toggles['dashboard.attention-origin-avg.view']"
              :distribution="calculatedMetrics['clients']['originDistribution']"
              :count="calculatedMetrics['clients'].originTotal || 0"
              :limit="10"
            >
            </AttentionOriginDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-client-contact">
        <DetailsCard
          :show="!!toggles['dashboard.attention-client-contact.view']"
          :data="calculatedMetrics['clients']?.contactTotal ? calculatedMetrics['clients']?.contactTotal : 0"
          :subdata="undefined"
          :title="$t('dashboard.items.attentions.32')"
          :showTooltip="true"
          :description="$t('dashboard.contacts')"
          :icon="'bi-chat-left-dots-fill'"
          :iconStyleClass="'yellow-icon'"
          :detailsOpened="detailsOpened"
          >
          <template v-slot:details>
            <AttentionClientContactDetails
              :show="!!toggles['dashboard.attention-client-contact.view']"
              :distributionType="calculatedMetrics['clients']['typeContactDistribution']"
              :distributionResult="calculatedMetrics['clients']['resultContactDistribution']"
              :count="calculatedMetrics['clients'].contactTotal || 0"
            >
            </AttentionClientContactDetails>
          </template>
        </DetailsCard>
      </div>
      <div id="attention-daysSince-clients">
        <AttentionDaysSinceDetails
          :show="!!toggles['dashboard.attention-days-since-clients.view']"
          :distribution="calculatedMetrics['clients']['resultDaysSinceDistribution']"
          :count="calculatedMetrics['clients'].daysSinceClientsTotal || 0"
        >
        </AttentionDaysSinceDetails>
      </div>
      <div id="attention-collection-clients">
        <CollectionDetails
          :show="!!toggles['dashboard.collection-details.view']"
          :calculatedMetrics="calculatedMetrics"
          :detailsOpened="detailsOpened"
        >
        </CollectionDetails>
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
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>