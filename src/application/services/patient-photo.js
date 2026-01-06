import { requestBackend, getHeaders } from '../api';

/**
 * Patient Photo Service
 * Handles uploading, retrieving, and managing patient photos
 */

// In-memory cache for patient photos
const photoCache = {
  metadata: new Map(), // commerceId_clientId -> photo metadata
  thumbnails: new Map(), // commerceId_clientId_photoId -> thumbnail URL
  fullPhotos: new Map(), // commerceId_clientId_photoId -> full photo URL
};

// Helper to generate cache keys
const getCacheKey = (commerceId, clientId, photoId = null) => {
  return photoId
    ? `${commerceId}_${clientId}_${photoId}`
    : `${commerceId}_${clientId}`;
};

// Clear cache for a specific client (useful after upload/delete)
export const clearClientPhotoCache = (commerceId, clientId) => {
  const baseKey = getCacheKey(commerceId, clientId);

  // Clear metadata
  photoCache.metadata.delete(baseKey);

  // Clear all related thumbnails and photos
  for (const key of photoCache.thumbnails.keys()) {
    if (key.startsWith(baseKey)) {
      const url = photoCache.thumbnails.get(key);
      if (url) URL.revokeObjectURL(url); // Clean up blob URL
      photoCache.thumbnails.delete(key);
    }
  }

  for (const key of photoCache.fullPhotos.keys()) {
    if (key.startsWith(baseKey)) {
      const url = photoCache.fullPhotos.get(key);
      if (url) URL.revokeObjectURL(url); // Clean up blob URL
      photoCache.fullPhotos.delete(key);
    }
  }

};

// Upload patient photo (from camera capture or file upload)
export const uploadPatientPhoto = async (commerceId, clientId, photoData) => {
  try {
    const formData = new FormData();

    // Add photo file or blob
    if (photoData.blob) {
      // From camera capture
      formData.append('photo', photoData.blob, photoData.filename);
    } else if (photoData.file) {
      // From file upload
      formData.append('photo', photoData.file, photoData.filename);
    } else {
      throw new Error('No photo data provided');
    }

    // Add metadata
    formData.append('commerceId', commerceId);
    formData.append('clientId', clientId);
    formData.append('photoType', 'patient_profile');
    formData.append('uploadDate', new Date().toISOString());

    const response = await requestBackend.post(
      `/patient-photos/${commerceId}/${clientId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for photo upload
      },
    );


    // Clear cache after successful upload
    clearClientPhotoCache(commerceId, clientId);

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al subir la foto del paciente');
  }
};

// Get patient photo
export const getPatientPhoto = async (commerceId, clientId) => {
  const cacheKey = getCacheKey(commerceId, clientId);

  // Check cache first
  if (photoCache.metadata.has(cacheKey)) {
    return photoCache.metadata.get(cacheKey);
  }

  try {
    // Debug auth headers
    const headers = await getHeaders();
    const response = await requestBackend.get(`/patient-photos/${commerceId}/${clientId}`, headers);

    // Store in cache
    photoCache.metadata.set(cacheKey, response.data);

    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      photoCache.metadata.set(cacheKey, null);
      return null;
    }
    throw new Error(error.response?.data?.message || 'Error al obtener la foto del paciente');
  }
};

// Get patient photo URL for display
export const getPatientPhotoUrl = async (commerceId, clientId, photoId) => {
  if (!commerceId || !clientId || !photoId) {
    return null;
  }

  const cacheKey = getCacheKey(commerceId, clientId, photoId);

  // Check cache first - verify it belongs to this specific client
  if (photoCache.fullPhotos.has(cacheKey)) {
    const cachedUrl = photoCache.fullPhotos.get(cacheKey);
    // Verify the cache key matches exactly (commerceId + clientId + photoId)
    if (cachedUrl && cacheKey.startsWith(`${commerceId}_${clientId}_`)) {
      return cachedUrl;
    } else {
      // Invalid cache entry, remove it
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
      photoCache.fullPhotos.delete(cacheKey);
    }
  }

  try {
    // Debug auth headers
    const headers = await getHeaders();

    // Make an authenticated request to get the photo blob
    const response = await requestBackend.get(
      `/patient-photos/${commerceId}/${clientId}/${photoId}`,
      {
        responseType: 'blob',
        ...headers,
      },
    );

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);

    // Store in cache with verified key
    photoCache.fullPhotos.set(cacheKey, url);

    return url;
  } catch (error) {
    return null;
  }
};

// Get patient photo thumbnail URL
export const getPatientPhotoThumbnailUrl = async (commerceId, clientId, photoId) => {
  if (!commerceId || !clientId || !photoId) {
    return null;
  }

  const cacheKey = getCacheKey(commerceId, clientId, photoId);

  // Check cache first - verify it belongs to this specific client
  if (photoCache.thumbnails.has(cacheKey)) {
    const cachedUrl = photoCache.thumbnails.get(cacheKey);
    // Verify the cache key matches exactly (commerceId + clientId + photoId)
    if (cachedUrl && cacheKey.startsWith(`${commerceId}_${clientId}_`)) {
      return cachedUrl;
    } else {
      // Invalid cache entry, remove it
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
      photoCache.thumbnails.delete(cacheKey);
    }
  }

  try {
    // Debug auth headers
    const headers = await getHeaders();

    // Make an authenticated request to get the thumbnail blob
    const response = await requestBackend.get(
      `/patient-photos/${commerceId}/${clientId}/${photoId}/thumbnail`,
      { responseType: 'blob', ...headers }
    );

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);

    // Store in cache with verified key
    photoCache.thumbnails.set(cacheKey, url);

    return url;
  } catch (error) {
    return null;
  }
};

// Delete patient photo
export const deletePatientPhoto = async (commerceId, clientId, photoId) => {
  try {
    // Get auth headers
    const headers = await getHeaders();

    const response = await requestBackend.delete(
      `/patient-photos/${commerceId}/${clientId}/${photoId}`,
      headers
    );

    // Clear cache after successful deletion
    clearClientPhotoCache(commerceId, clientId);

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al eliminar la foto del paciente');
  }
};

// Update patient photo (replace existing)
export const updatePatientPhoto = async (commerceId, clientId, photoData) => {
  try {
    // First, try to get existing photo to replace it
    const existingPhoto = await getPatientPhoto(commerceId, clientId);

    if (existingPhoto && existingPhoto.id) {
      // Delete existing photo first
      await deletePatientPhoto(commerceId, clientId, existingPhoto.id);
    }

    // Upload new photo
    return await uploadPatientPhoto(commerceId, clientId, photoData);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al actualizar la foto del paciente');
  }
};

// Compress image before upload (client-side optimization)
export const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });

// Validate photo file
export const validatePhotoFile = file => {
  const errors = [];

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de archivo no válido. Use JPG, PNG o WebP.');
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('El archivo es muy grande. Máximo 5MB permitido.');
  }

  // Check if it's actually an image
  if (!file.type.startsWith('image/')) {
    errors.push('El archivo debe ser una imagen.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Create thumbnail from image
export const createThumbnail = (file, size = 150) =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Make it square
      canvas.width = size;
      canvas.height = size;

      // Calculate crop area for center square
      const minDimension = Math.min(img.width, img.height);
      const cropX = (img.width - minDimension) / 2;
      const cropY = (img.height - minDimension) / 2;

      // Draw cropped and resized image
      ctx.drawImage(img, cropX, cropY, minDimension, minDimension, 0, 0, size, size);

      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    };

    img.src = URL.createObjectURL(file);
  });

export default {
  uploadPatientPhoto,
  getPatientPhoto,
  getPatientPhotoUrl,
  getPatientPhotoThumbnailUrl,
  deletePatientPhoto,
  updatePatientPhoto,
  compressImage,
  validatePhotoFile,
  createThumbnail,
};
