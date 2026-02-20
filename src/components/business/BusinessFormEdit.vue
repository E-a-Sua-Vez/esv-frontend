<template>
  <div class="business-form-edit" :class="{ show: show }">
    <div class="row">
      <!-- Basic Fields Section -->
      <div v-if="!showOnly || showOnly === 'basic'" class="form-fields-container">
      <div id="business-name-form-update" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.name') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.nameHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <input
            min="1"
            max="50"
            type="text"
            class="form-control"
            :value="business.name"
            placeholder="brilliant-shop-1"
          />
        </div>
      </div>
      <div id="business-keyName-form-update" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.keyName') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.keyNameHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <input
            min="1"
            max="50"
            type="text"
            class="form-control"
            :value="business.keyName"
            placeholder="brilliant-shop-1"
          />
        </div>
      </div>
      <div id="business-email-form-update" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.email') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.emailHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <input
            min="10"
            type="email"
            class="form-control"
            :value="business.email"
            placeholder="business@email.com"
          />
        </div>
      </div>
      <div id="business-logo-form-update" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.logo') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.logoHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <div class="d-flex flex-column gap-2">
            <!-- Logo Preview -->
            <div v-if="businessLogos[business.id]" class="logo-preview-small">
              <img
                :src="businessLogos[business.id]"
                :alt="$t('businessAdmin.logo')"
                class="logo-preview-img"
                @error="$emit('loadLogo', business.id, business.logo)"
              />
            </div>
            <div
              v-else-if="business.logo && business.logo.startsWith('/business-logos/')"
              class="logo-preview-small"
            >
              <div
                class="logo-loading-placeholder d-flex flex-column align-items-center justify-content-center p-3"
              >
                <i class="bi bi-hourglass-split mb-2"></i>
                <span class="small text-muted">{{ $t('common.loading') || 'Cargando...' }}</span>
              </div>
            </div>
            <div
              v-else-if="business.logo && !business.logo.startsWith('/business-logos/')"
              class="logo-preview-small"
            >
              <img :src="business.logo" :alt="$t('businessAdmin.logo')" class="logo-preview-img" />
            </div>
            <!-- Logo por defecto cuando no hay logo -->
            <div v-else class="logo-preview-small">
              <img
                src="/images/logo_horizontal_transparente.png"
                :alt="$t('businessAdmin.logo')"
                class="logo-preview-img"
              />
            </div>
            <!-- Upload Button -->
            <div class="d-flex align-items-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="$emit('openLogoUpload', business.id)"
                :disabled="!toggles['businesses.admin.edit']"
              >
                <i class="bi bi-image me-1"></i>
                {{
                  businessLogos[business.id] || business.logo
                    ? $t('businessAdmin.logoUpload.replaceLogo')
                    : $t('businessAdmin.logoUpload.selectLogo')
                }}
              </button>
              <span v-if="business.logo || businessLogos[business.id]" class="small text-muted">
                <i class="bi bi-check-circle text-success"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div id="business-category-form-update" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.category') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.categoryHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <select
            class="btn btn-md btn-light fw-bold text-dark select"
            v-model="business.category"
            id="caterogies"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ $t(`categories.${cat}`) }}
            </option>
          </select>
        </div>
      </div>
      <div id="business-active-form" class="row g-2">
        <div class="col-4 text-label">
          {{ $t('businessCommercesAdmin.active') }}
          <Popper :class="'dark p-1'" arrow>
            <template #content>
              <div>{{ $t('businessAdmin.activeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <Toggle v-model="business.active" :disabled="!toggles['businesses.admin.edit']" />
        </div>
      </div>
      </div>

      <!-- Datos de localización -->
      <div v-if="!showOnly || showOnly === 'location'" class="form-fields-container">
      <div class="row g-2" v-if="!showOnly">
        <a
          class="nav-link fw-bold section-toggle-button"
          data-bs-toggle="collapse"
          aria-expanded="true"
          :aria-controls="`update-location-${index}`"
          :href="`#update-location-${index}`"
        >
          {{ $t('businessCommercesAdmin.location') }}
          <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div :id="`update-location-${index}`" :class="showOnly === 'location' ? 'row m-0' : 'collapse row m-0'">
        <div id="business-country-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.country') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.countryHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="12"
              type="text"
              class="form-control"
              v-model="business.localeInfo.country"
              :class="{ 'is-invalid': errors.countryUpdateError }"
              placeholder="Ex. ve, br, cl"
            />
          </div>
        </div>
        <div id="business-language-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.language') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.languageHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <select
              class="btn btn-md btn-light fw-bold text-dark select"
              v-model="business.localeInfo.language"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>
        <div id="business-timezone-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.timezone') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.timezoneHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <select
              class="btn btn-md btn-light fw-bold text-dark select"
              v-model="business.localeInfo.timezone"
            >
              <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
              <option value="America/Caracas">Caracas (UTC-4)</option>
              <option value="America/Santiago">Santiago (UTC-3/UTC-4)</option>
              <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
              <option value="America/Bogota">Bogotá (UTC-5)</option>
              <option value="America/Lima">Lima (UTC-5)</option>
              <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
              <option value="America/Montevideo">Montevideo (UTC-3)</option>
            </select>
          </div>
        </div>
        <div id="business-zip-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.zip') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.zipHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="20"
              type="text"
              class="form-control"
              v-model="business.localeInfo.zip"
              @blur="handleZipBlur"
              placeholder="Ex.: 01310-100"
            />
          </div>
        </div>
        <div id="business-address-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.address') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.addressHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="80"
              type="text"
              class="form-control"
              v-model="business.localeInfo.address"
              :class="{ 'is-invalid': errors.addressUpdateError }"
              placeholder="Street 1, Building 56, City, State"
            />
          </div>
        </div>
        <div id="business-addressLat-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.addressLat') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.addressLatHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="10"
              type="number"
              class="form-control"
              v-model="business.localeInfo.addressLat"
              placeholder="Ex.: 10.65656"
            />
          </div>
        </div>
        <div id="business-addressLng-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.addressLng') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.addressLngHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="10"
              type="number"
              class="form-control"
              v-model="business.localeInfo.addressLng"
              placeholder="Ex.: -10.65656"
            />
          </div>
        </div>
      </div>
      </div>

      <!-- Datos de Contacto -->
      <div v-if="!showOnly || showOnly === 'contact'" class="form-fields-container">
      <div class="row g-2" v-if="!showOnly">
        <a
          class="nav-link fw-bold section-toggle-button"
          data-bs-toggle="collapse"
          :href="`#update-contact-${index}`"
          aria-expanded="true"
          :aria-controls="`#update-contact-${index}`"
        >
          {{ $t('businessCommercesAdmin.contact') }}
          <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div :id="`update-contact-${index}`" :class="showOnly === 'contact' ? 'row m-0' : 'collapse row m-0'">
        <div id="business-contact-email-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.email') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.contactEmailHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="30"
              type="email"
              class="form-control"
              v-model="business.contactInfo.email"
              placeholder="Ex.: contact@business.com"
            />
          </div>
        </div>
        <div id="business-contact-url-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.url') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.contactUrlHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="30"
              type="text"
              class="form-control"
              v-model="business.contactInfo.url"
              placeholder="Ex.: https://www.business.com/"
            />
          </div>
        </div>
        <div id="business-phone-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.phone') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.contactPhoneHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="10"
              type="tel"
              class="form-control"
              v-model="business.contactInfo.phone"
              :class="{ 'is-invalid': errors.phoneUpdateError }"
              placeholder="Cod. Pais + Numero"
            />
          </div>
        </div>
        <div id="business-contact-phone2-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.phone2') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.phone2Help') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="9"
              max="12"
              type="tel"
              class="form-control"
              v-model="business.contactInfo.phone2"
              placeholder="Ex.: 56233445533"
            />
          </div>
        </div>
        <div id="business-contact-whatsapp-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.whatsapp') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.whatsappHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="9"
              max="12"
              type="tel"
              class="form-control"
              v-model="business.contactInfo.whatsapp"
              placeholder="Ex.: 56233445533"
            />
          </div>
        </div>
        <div id="business-contact-twitter-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.twitter') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.twitterHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              v-model="business.contactInfo.twitter"
              placeholder="Ex.: tw_commerce"
            />
          </div>
        </div>
        <div id="business-contact-instagram-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.instagram') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.instagramHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              v-model="business.contactInfo.instagram"
              placeholder="Ex.: ig_commerce"
            />
          </div>
        </div>
        <div id="business-contact-facebook-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.facebook') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.facebookHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              v-model="business.contactInfo.facebook"
              placeholder="Ex.: fb_commerce"
            />
          </div>
        </div>
      </div>
      </div>

      <!-- Datos de Servicio -->
      <div v-if="!showOnly || showOnly === 'service'" class="form-fields-container">
      <div class="row g-2" v-if="!showOnly">
        <a
          class="nav-link fw-bold section-toggle-button"
          data-bs-toggle="collapse"
          :href="`#update-service-${index}`"
        >
          {{ $t('businessCommercesAdmin.service') }}
          <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div :id="`update-service-${index}`" :class="showOnly === 'service' ? 'row m-0' : 'collapse row m-0'">
        <div id="business-serviceUrl-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.serviceUrl') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.serviceUrlHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <input
              min="1"
              max="12"
              type="text"
              class="form-control"
              v-model="business.serviceInfo.serviceUrl"
              placeholder="Ex. https://menu.business.com"
            />
          </div>
        </div>
        <div id="business-attentionHour-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.attentionHour') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.attentionHourHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control"
              v-model="business.serviceInfo.attentionHourFrom"
              placeholder="Ex. 8"
            />
          </div>
          <div class="col-2 text-center align-self-center">{{ $t('businessAdmin.hourSeparator') }}</div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control"
              v-model="business.serviceInfo.attentionHourTo"
              placeholder="Ex. 16"
            />
          </div>
        </div>
        <div id="add-business-break-active-form" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.break') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.breakHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <Toggle
              v-model="business.serviceInfo.break"
              :disabled="!toggles['businesses.admin.edit']"
            />
          </div>
        </div>
        <div
          id="business-attentionBreak-form-update"
          v-if="business.serviceInfo.break"
          class="row g-2"
        >
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.breakHour') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.breakHourHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control"
              v-model="business.serviceInfo.breakHourFrom"
              placeholder="Ex. 8"
            />
          </div>
          <div class="col-2 text-center align-self-center">{{ $t('businessAdmin.hourSeparator') }}</div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control"
              v-model="business.serviceInfo.breakHourTo"
              placeholder="Ex. 16"
            />
          </div>
        </div>
        <div id="business-attentionDays-form-update" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.attentionDays') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.attentionDaysHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <div class="form-check form-switch" v-for="day in [1, 2, 3, 4, 5, 6, 7]" :key="day">
              <input
                class="form-check-input"
                type="checkbox"
                :id="`day-update-${day}`"
                :checked="dayChecked(day)"
                @click="checkDay($event, day)"
              />
              <label class="form-check-label" :for="`day-update-${day}`">
                {{ $t(`days.${day}`) }}
              </label>
            </div>
          </div>
        </div>
        <div id="update-business-personalized-active-form" class="row g-2">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.personalized') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessAdmin.personalizedHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <div class="col-8">
            <Toggle
              v-model="business.serviceInfo.personalized"
              :disabled="!toggles['businesses.admin.edit']"
              @update:model-value="initializedPersonalizedHours"
            />
          </div>
        </div>
        <div
          id="business-personalized-form-update"
          v-if="business.serviceInfo.personalized"
          class="row g-2"
        >
          <div class="row g-2" v-for="day in business.serviceInfo.attentionDays" :key="day">
            <div class="col-4 text-label">
              {{ $t(`days.${day}`) }}
            </div>
            <div class="col-3">
              <input
                min="0"
                max="24"
                minlength="1"
                maxlength="2"
                type="number"
                class="form-control"
                v-model="business.serviceInfo.personalizedHours[day].attentionHourFrom"
                placeholder="Ex. 8"
              />
            </div>
            <div class="col-2 text-center align-self-center">{{ $t('businessAdmin.hourSeparator') }}</div>
            <div class="col-3">
              <input
                min="0"
                max="24"
                minlength="1"
                maxlength="2"
                type="number"
                class="form-control"
                v-model="business.serviceInfo.personalizedHours[day].attentionHourTo"
                placeholder="Ex. 16"
              />
            </div>
          </div>
        </div>
        <!-- Non-Working Dates Manager - Only show when not in modal mode -->
        <div v-if="!showOnly" id="business-nonWorkingDates-form-update" class="row g-2">
          <div class="col-12">
            <hr />
            <NonWorkingDatesManager
              :show="true"
              :loading="false"
              :serviceInfo="business.serviceInfo"
              :level="'business'"
              :readonly="!toggles['businesses.admin.edit']"
              @update:serviceInfo="business.serviceInfo = $event"
            />
          </div>
        </div>
      </div>
      </div>

      <div v-if="!showOnly" id="business-id-form" class="row -2 mb-g3">
        <div class="row business-details-container">
          <div class="col">
            <span><strong>Id:</strong> {{ business.id }}</span>
            <button
              type="button"
              class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
              @click="copyIdToClipboard(business.id)"
              :title="$t('copy') || 'Copiar Id'"
            >
              <i class="bi bi-clipboard"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import NonWorkingDatesManager from '../domain/NonWorkingDatesManager.vue';
import { getAddressBR } from '../../application/services/address';

export default {
  name: 'BusinessFormEdit',
  components: {
    Toggle,
    Popper,
    NonWorkingDatesManager,
  },
  props: {
    business: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    errors: {
      type: Object,
      default: () => ({}),
    },
    categories: {
      type: Array,
      default: () => [],
    },
    toggles: {
      type: Object,
      default: () => ({}),
    },
    businessLogos: {
      type: Object,
      default: () => ({}),
    },
    show: {
      type: Boolean,
      default: false,
    },
    showOnly: {
      type: String,
      default: null, // 'basic', 'location', 'contact', 'service'
    },
  },
  emits: ['openLogoUpload', 'loadLogo'],
  methods: {
    async copyIdToClipboard(id) {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    },
  },
  setup(props, { emit }) {
    const loadingZip = ref(false);

    // Asegurar que localeInfo tenga valores por defecto
    if (!props.business.localeInfo) {
      props.business.localeInfo = {};
    }
    if (!props.business.localeInfo.language) {
      props.business.localeInfo.language = 'es';
    }
    if (!props.business.localeInfo.timezone) {
      props.business.localeInfo.timezone = 'America/Sao_Paulo';
    }

    const handleZipBlur = async () => {
      const zip = props.business.localeInfo?.zip;
      const country = props.business.localeInfo?.country;

      if (zip && country === 'br') {
        const value = zip.replace(/\D/g, '');
        const validcep = /^[0-9]{8}$/;

        if (validcep.test(value)) {
          try {
            loadingZip.value = true;
            const result = await getAddressBR(zip);

            if (result && !result.erro) {
              const address = `${result.logradouro}, ${result.bairro}, ${result.localidade} ${result.uf}`;
              props.business.localeInfo.address = address;
            }
          } catch (error) {
            // Error fetching address from CEP
          } finally {
            loadingZip.value = false;
          }
        }
      }
    };

    const dayChecked = day => {
      if (props.business.serviceInfo && props.business.serviceInfo.attentionDays) {
        return props.business.serviceInfo.attentionDays.includes(day);
      }
      return false;
    };

    const checkDay = (event, day) => {
      if (props.business.serviceInfo) {
        if (!props.business.serviceInfo.attentionDays) {
          props.business.serviceInfo.attentionDays = [];
        }
        if (event.target.checked) {
          if (!props.business.serviceInfo.attentionDays.includes(day)) {
            props.business.serviceInfo.attentionDays.push(day);
          }
          // If personalized is already enabled, add this day to personalizedHours
          if (props.business.serviceInfo.personalized === true) {
            if (!props.business.serviceInfo.personalizedHours) {
              props.business.serviceInfo.personalizedHours = {};
            }
            props.business.serviceInfo.personalizedHours[day] = {
              attentionHourFrom: props.business.serviceInfo.attentionHourFrom || 8,
              attentionHourTo: props.business.serviceInfo.attentionHourTo || 16,
            };
          }
        } else {
          props.business.serviceInfo.attentionDays =
            props.business.serviceInfo.attentionDays.filter(el => el !== day);
          // Remove from personalizedHours if it exists
          if (
            props.business.serviceInfo.personalizedHours &&
            props.business.serviceInfo.personalizedHours[day]
          ) {
            delete props.business.serviceInfo.personalizedHours[day];
          }
        }
        props.business.serviceInfo.attentionDays.sort();
      }
    };

    const initializedPersonalizedHours = value => {
      if (value === true) {
        if (!props.business.serviceInfo.personalizedHours) {
          props.business.serviceInfo.personalizedHours = {};
        }
        // Initialize attentionDays array if it doesn't exist
        if (!props.business.serviceInfo.attentionDays) {
          props.business.serviceInfo.attentionDays = [];
        }
        // If there are already selected days, initialize personalized hours for them
        if (
          props.business.serviceInfo.attentionDays &&
          props.business.serviceInfo.attentionDays.length > 0
        ) {
          props.business.serviceInfo.attentionDays.forEach(day => {
            if (!props.business.serviceInfo.personalizedHours[day]) {
              props.business.serviceInfo.personalizedHours[day] = {
                attentionHourFrom: props.business.serviceInfo.attentionHourFrom || 8,
                attentionHourTo: props.business.serviceInfo.attentionHourTo || 16,
              };
            }
          });
        }
      }
    };

    return {
      dayChecked,
      checkDay,
      initializedPersonalizedHours,
      handleZipBlur,
      loadingZip,
    };
  },
};
</script>

<style scoped>
.business-form-edit {
  display: none;
}

.business-form-edit.show {
  display: block;
  padding: 0.5rem;
}

.row.g-2 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
  margin-bottom: 0;
}

.text-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-control {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  color: #212529;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  outline: 0;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control:hover:not(:disabled):not(:focus) {
  border-color: rgba(169, 169, 169, 0.5);
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
}

.form-control::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.form-control.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.5;
  color: #212529;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
}

.business-details-container {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.65);
  padding: 0.75rem 0.5rem;
  margin-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.875rem;
  margin: 0;
  background: rgba(0, 0, 0, 0.88);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.97);
  text-transform: capitalize;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.section-toggle-button:active {
  transform: translateY(0);
}

.section-toggle-button[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.92);
}

.collapse {
  padding: 0.5rem 0;
}

.form-check {
  padding: 0.1rem 0;
  margin-bottom: 0;
}

.form-check-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
  margin-left: 0.5rem;
}

.form-check-input {
  cursor: pointer;
}

.form-check-input:checked {
  background-color: rgba(0, 194, 203, 0.9);
  border-color: rgba(0, 194, 203, 0.9);
}

.logo-preview-small {
  width: 100%;
  max-width: 200px;
  height: auto;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.logo-preview-img {
  max-width: 100%;
  max-height: 150px;
  height: auto;
  object-fit: contain;
  border-radius: 0.25rem;
}

.logo-loading-placeholder {
  min-height: 100px;
  color: #6c757d;
}

.logo-loading-placeholder i {
  font-size: 1.5rem;
}

.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  padding: 0.25rem;
}
</style>
