import { requestBackend, getHeaders } from '../api';

/**
 * Patient Photo Service
 * Handles uploading, retrieving, and managing patient photos
 */

// Upload patient photo (from camera capture or file upload)
export const uploadPatientPhoto = async (commerceId, clientId, photoData) => {
  try {
    console.log('📸 PatientPhoto: Starting upload with data:', {
      commerceId,
      clientId,
      hasBlob: !!photoData.blob,
      hasFile: !!photoData.file,
      filename: photoData.filename,
    });

    const formData = new FormData();

    // Add photo file or blob
    if (photoData.blob) {
      // From camera capture
      console.log('📸 PatientPhoto: Adding blob to FormData');
      formData.append('photo', photoData.blob, photoData.filename);
    } else if (photoData.file) {
      // From file upload
      console.log('📸 PatientPhoto: Adding file to FormData');
      formData.append('photo', photoData.file, photoData.filename);
    } else {
      throw new Error('No photo data provided');
    }

    // Add metadata
    formData.append('commerceId', commerceId);
    formData.append('clientId', clientId);
    formData.append('photoType', 'patient_profile');
    formData.append('uploadDate', new Date().toISOString());

    console.log('📸 PatientPhoto: Sending request to backend...');
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

    console.log('📸 PatientPhoto: Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading patient photo:', error);
    throw new Error(error.response?.data?.message || 'Error al subir la foto del paciente');
  }
};

// Get patient photo
export const getPatientPhoto = async (commerceId, clientId) => {
  try {
    console.log('📸 PatientPhoto Frontend: Requesting photo metadata for:', {
      commerceId,
      clientId,
    });

    // Debug auth headers
    const headers = await getHeaders();
    console.log('📸 PatientPhoto Frontend: Auth headers:', headers);

    const response = await requestBackend.get(`/patient-photos/${commerceId}/${clientId}`);
    console.log('📸 PatientPhoto Frontend: Response received:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // No photo found - this is normal for new patients
      console.log('📸 PatientPhoto Frontend: No photo found (404)');
      return null;
    }
    if (error.response?.status === 401) {
      console.error('📸 PatientPhoto Frontend: Authentication error (401):', error.response.data);
    }
    console.error('📸 PatientPhoto Frontend: Error getting patient photo:', error);
    throw new Error(error.response?.data?.message || 'Error al obtener la foto del paciente');
  }
};

// Get patient photo URL for display
export const getPatientPhotoUrl = async (commerceId, clientId, photoId) => {
  if (!commerceId || !clientId || !photoId) {
    console.warn('🔍 PatientPhoto: Missing parameters for photo URL:', {
      commerceId,
      clientId,
      photoId,
    });
    return null;
  }

  try {
    // Debug auth headers
    const headers = await getHeaders();
    console.log('📸 PatientPhoto: Full photo auth headers:', headers);

    // Make an authenticated request to get the photo blob
    const response = await requestBackend.get(
      `/patient-photos/${commerceId}/${clientId}/${photoId}`,
      {
        responseType: 'blob',
      },
    );

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);
    console.log('🔍 PatientPhoto: Generated authenticated full photo URL');
    return url;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(
        '📸 PatientPhoto: Authentication error for full photo (401):',
        error.response.data,
      );
    }
    console.error('🔍 PatientPhoto: Error loading full photo:', error);
    return null;
  }
};

// Get patient photo thumbnail URL
export const getPatientPhotoThumbnailUrl = async (commerceId, clientId, photoId) => {
  if (!commerceId || !clientId || !photoId) {
    console.warn('🔍 PatientPhoto: Missing parameters for thumbnail URL:', {
      commerceId,
      clientId,
      photoId,
    });
    return null;
  }

  try {
    // Debug auth headers
    const headers = await getHeaders();
    console.log('📸 PatientPhoto: Thumbnail auth headers:', headers);

    // Make an authenticated request to get the thumbnail blob
    const response = await requestBackend.get(
      `/patient-photos/${commerceId}/${clientId}/${photoId}/thumbnail`,
      {
        responseType: 'blob',
      },
    );

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);
    console.log('🔍 PatientPhoto: Generated authenticated thumbnail URL');
    return url;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(
        '📸 PatientPhoto: Authentication error for thumbnail (401):',
        error.response.data,
      );
    }
    console.error('🔍 PatientPhoto: Error loading thumbnail:', error);
    return null;
  }
};

// Delete patient photo
export const deletePatientPhoto = async (commerceId, clientId, photoId) => {
  try {
    const response = await requestBackend.delete(
      `/patient-photos/${commerceId}/${clientId}/${photoId}`,
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting patient photo:', error);
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
    console.error('Error updating patient photo:', error);
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
