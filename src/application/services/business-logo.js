import { requestBackend, getHeaders } from '../api';

/**
 * Business Logo Service
 * Handles uploading, retrieving, and managing business logos
 */

// Upload business logo (from file upload)
export const uploadBusinessLogo = async (businessId, logoData) => {
  try {
    console.log('🏢 BusinessLogo: Starting upload with data:', {
      businessId,
      hasFile: !!logoData.file,
      filename: logoData.filename,
    });

    const formData = new FormData();

    // Add logo file
    if (logoData.file) {
      console.log('🏢 BusinessLogo: Adding file to FormData');
      formData.append('logo', logoData.file, logoData.filename);
    } else {
      throw new Error('No logo data provided');
    }

    // Add metadata
    formData.append('businessId', businessId);
    formData.append('logoType', 'business_logo');
    formData.append('uploadDate', new Date().toISOString());

    console.log('🏢 BusinessLogo: Sending request to backend...');
    const response = await requestBackend.post(`/business-logos/${businessId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds timeout for logo upload
    });

    console.log('🏢 BusinessLogo: Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading business logo:', error);
    throw new Error(error.response?.data?.message || 'Error al subir el logo del negocio');
  }
};

// Get business logo metadata
export const getBusinessLogo = async businessId => {
  try {
    console.log('🏢 BusinessLogo Frontend: Requesting logo metadata for:', { businessId });

    const headers = await getHeaders();
    console.log('🏢 BusinessLogo Frontend: Auth headers:', headers);

    const response = await requestBackend.get(`/business-logos/${businessId}`);
    console.log('🏢 BusinessLogo Frontend: Response received:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // No logo found - this is normal for businesses without custom logos
      console.log('🏢 BusinessLogo Frontend: No logo found (404)');
      return null;
    }
    if (error.response?.status === 401) {
      console.error('🏢 BusinessLogo Frontend: Authentication error (401):', error.response.data);
    }
    console.error('🏢 BusinessLogo Frontend: Error getting business logo:', error);
    throw new Error(error.response?.data?.message || 'Error al obtener el logo del negocio');
  }
};

// Get business logo URL for display
export const getBusinessLogoUrl = async (businessId, logoId) => {
  if (!businessId || !logoId) {
    console.warn('🔍 BusinessLogo: Missing parameters for logo URL:', { businessId, logoId });
    return null;
  }

  try {
    const headers = await getHeaders();

    // Make an authenticated request to get the logo blob
    const response = await requestBackend.get(`/business-logos/${businessId}/${logoId}`, {
      responseType: 'blob',
    });

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(
        '🏢 BusinessLogo: Authentication error for full logo (401):',
        error.response.data,
      );
    }
    console.error('🔍 BusinessLogo: Error loading full logo:', error);
    return null;
  }
};

// Get business logo thumbnail URL
export const getBusinessLogoThumbnailUrl = async (businessId, logoId) => {
  if (!businessId || !logoId) {
    console.warn('🔍 BusinessLogo: Missing parameters for thumbnail URL:', { businessId, logoId });
    return null;
  }

  try {
    const headers = await getHeaders();
    console.log('🏢 BusinessLogo: Thumbnail auth headers:', headers);

    // Make an authenticated request to get the thumbnail blob
    const response = await requestBackend.get(`/business-logos/${businessId}/${logoId}/thumbnail`, {
      responseType: 'blob',
    });

    // Create a blob URL that can be used in img src
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'image/jpeg',
    });
    const url = URL.createObjectURL(blob);
    console.log('🔍 BusinessLogo: Generated authenticated thumbnail URL');
    return url;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error(
        '🏢 BusinessLogo: Authentication error for thumbnail (401):',
        error.response.data,
      );
    }
    console.error('🔍 BusinessLogo: Error loading thumbnail:', error);
    return null;
  }
};

// Delete business logo
export const deleteBusinessLogo = async (businessId, logoId) => {
  try {
    const response = await requestBackend.delete(`/business-logos/${businessId}/${logoId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting business logo:', error);
    throw new Error(error.response?.data?.message || 'Error al eliminar el logo del negocio');
  }
};

// Update business logo (replace existing)
export const updateBusinessLogo = async (businessId, logoData) => {
  try {
    // First, try to get existing logo to replace it
    const existingLogo = await getBusinessLogo(businessId);

    if (existingLogo && existingLogo.id) {
      // Delete existing logo first
      await deleteBusinessLogo(businessId, existingLogo.id);
    }

    // Upload new logo
    return await uploadBusinessLogo(businessId, logoData);
  } catch (error) {
    console.error('Error updating business logo:', error);
    throw new Error(error.response?.data?.message || 'Error al actualizar el logo del negocio');
  }
};

// Compress image before upload (client-side optimization)
// Optimized for business logos: recommended size 250x230px or similar aspect ratio
export const compressLogo = (file, maxWidth = 500, maxHeight = 460, quality = 0.9) =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      // Maintain aspect ratio similar to CommerceLogo (250x230)
      const targetAspectRatio = 250 / 230; // ~1.087
      const currentAspectRatio = width / height;

      if (currentAspectRatio > targetAspectRatio) {
        // Image is wider - fit to width
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        // Image is taller - fit to height
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

// Validate logo file
export const validateLogoFile = file => {
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

// Create thumbnail from image (for business logos)
export const createLogoThumbnail = (file, size = 150) =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Maintain aspect ratio similar to CommerceLogo
      const targetAspectRatio = 250 / 230; // ~1.087
      const currentAspectRatio = img.width / img.height;

      let canvasWidth, canvasHeight;

      if (currentAspectRatio > targetAspectRatio) {
        // Image is wider
        canvasWidth = size;
        canvasHeight = size / targetAspectRatio;
      } else {
        // Image is taller
        canvasHeight = size;
        canvasWidth = size * targetAspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw resized image
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    };

    img.src = URL.createObjectURL(file);
  });

export default {
  uploadBusinessLogo,
  getBusinessLogo,
  getBusinessLogoUrl,
  getBusinessLogoThumbnailUrl,
  deleteBusinessLogo,
  updateBusinessLogo,
  compressLogo,
  validateLogoFile,
  createLogoThumbnail,
};
