<template>
  <div
    class="document-thumbnail"
    :class="{ selected: isSelected, urgent: isUrgent }"
    @click="$emit('select', document)"
    @dblclick="$emit('preview', document)"
  >
    <!-- Thumbnail Preview -->
    <div class="thumbnail-preview">
      <div class="thumbnail-content">
        <!-- Image thumbnail -->
        <img
          v-if="isImage && thumbnailUrl"
          :src="thumbnailUrl"
          :alt="document.name"
          class="thumbnail-image"
          @error="handleImageError"
        />

        <!-- File type icon -->
        <div v-else class="thumbnail-icon">
          <i :class="getFileTypeIcon(document.format)"></i>
        </div>
      </div>

      <!-- Overlay indicators -->
      <div class="thumbnail-overlay">
        <div class="thumbnail-badges">
          <span v-if="document.urgency === 'CRITICAL'" class="badge badge-critical">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </span>
          <span v-if="document.urgency === 'HIGH'" class="badge badge-high">
            <i class="bi bi-arrow-up-circle"></i>
          </span>
          <span v-if="document.isConfidential" class="badge badge-confidential">
            <i class="bi bi-shield-lock"></i>
          </span>
          <span v-if="document.requiresReview && !document.reviewedAt" class="badge badge-review">
            <i class="bi bi-eye"></i>
          </span>
        </div>

        <div class="thumbnail-actions">
          <button
            class="thumbnail-action-btn"
            @click.stop="$emit('preview', document)"
            title="Vista previa"
          >
            <i class="bi bi-eye"></i>
          </button>
          <button class="thumbnail-action-btn" @click.stop="downloadDocument" title="Descargar">
            <i class="bi bi-download"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Document Info -->
    <div class="thumbnail-info">
      <div class="thumbnail-title" :title="document.name">
        {{ truncateText(document.name, 25) }}
      </div>
      <div class="thumbnail-meta">
        <span class="thumbnail-category">
          <i :class="getCategoryIcon(document.category)"></i>
          {{ getCategoryLabel(document.category) }}
        </span>
        <span class="thumbnail-date">
          {{ formatDate(document.createdAt) }}
        </span>
      </div>

      <!-- Tags -->
      <div v-if="document.tags && document.tags.length > 0" class="thumbnail-tags">
        <span v-for="tag in document.tags.slice(0, 2)" :key="tag" class="thumbnail-tag">
          {{ tag }}
        </span>
        <span v-if="document.tags.length > 2" class="thumbnail-tag-more">
          +{{ document.tags.length - 2 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import {
  getFileTypeIcon,
  getDocumentCategories,
  getClientDocument,
} from '../../application/services/document';
import { getDateAndHour } from '../../shared/utils/date';

export default {
  name: 'DocumentThumbnail',
  props: {
    document: { type: Object, required: true },
    isSelected: { type: Boolean, default: false },
  },
  emits: ['select', 'preview'],
  setup(props) {
    const categories = getDocumentCategories();

    const isImage = computed(() => {
      const format = props.document.format?.toLowerCase() || '';
      return (
        format.includes('image') ||
        ['jpg', 'jpeg', 'png', 'gif', 'bmp'].some(ext => format.includes(ext))
      );
    });

    const isUrgent = computed(() => ['HIGH', 'CRITICAL'].includes(props.document.urgency));

    const thumbnailUrl = computed(() => {
      // In a real implementation, this would be a thumbnail URL from the backend
      if (isImage.value && props.document.thumbnailLocation) {
        return props.document.thumbnailLocation;
      }
      return null;
    });

    const getCategoryIcon = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.icon || 'bi-file-earmark';
    };

    const getCategoryLabel = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.label || category;
    };

    const formatDate = date => getDateAndHour(date);

    const truncateText = (text, maxLength) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const handleImageError = event => {
      event.target.style.display = 'none';
      event.target.nextElementSibling.style.display = 'flex';
    };

    const downloadDocument = async () => {
      try {
        const fileBlob = await getClientDocument(
          props.document.commerceId,
          props.document.option,
          props.document.name
        );

        const url = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = props.document.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    };

    return {
      isImage,
      isUrgent,
      thumbnailUrl,
      getCategoryIcon,
      getCategoryLabel,
      formatDate,
      truncateText,
      handleImageError,
      downloadDocument,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.document-thumbnail {
  width: 180px;
  flex-shrink: 0;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.document-thumbnail:hover {
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.document-thumbnail.selected {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}

.document-thumbnail.urgent {
  border-left: 4px solid #dc3545;
}

.thumbnail-preview {
  position: relative;
  height: 120px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumbnail-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.thumbnail-icon i {
  font-size: 3rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.document-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-badges {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.badge {
  padding: 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.badge-critical {
  background: #dc3545;
  color: white;
}

.badge-high {
  background: #ffc107;
  color: #212529;
}

.badge-confidential {
  background: #6f42c1;
  color: white;
}

.badge-review {
  background: #17a2b8;
  color: white;
}

.thumbnail-actions {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.thumbnail-action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 0.25rem;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
}

.thumbnail-action-btn:hover {
  background: white;
  color: var(--azul-turno);
}

.thumbnail-info {
  padding: 0.75rem;
}

.thumbnail-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.thumbnail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.thumbnail-category {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.thumbnail-date {
  font-size: 0.75rem;
  color: #6c757d;
}

.thumbnail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.thumbnail-tag {
  padding: 0.125rem 0.375rem;
  background: #e9ecef;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  color: #495057;
  font-weight: 500;
}

.thumbnail-tag-more {
  padding: 0.125rem 0.375rem;
  background: #6c757d;
  color: white;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .document-thumbnail {
    width: 150px;
  }

  .thumbnail-preview {
    height: 100px;
  }

  .thumbnail-icon i {
    font-size: 2.5rem;
  }
}
</style>
