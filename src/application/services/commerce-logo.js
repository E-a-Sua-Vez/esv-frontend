import { requestBackend, getHeaders } from '../api';

/**
 * Commerce Logo Service
 * Handles uploading, retrieving, and managing commerce logos
 */

// Upload commerce logo (from file upload)
export const uploadCommerceLogo = async (commerceId, businessId, logoData) => {
  try {
    const formData = new FormData();

    // Add logo file
    if (logoData.file) {
      formData.append('logo', logoData.file, logoData.filename);
    } else {
      throw new Error('No logo data provided');
    }

    // Add metadata
    formData.append('commerceId', commerceId);
    formData.append('businessId', businessId);
    formData.append('logoType', 'commerce_logo');
    formData.append('uploadDate', new Date().toISOString());

    const response = await requestBackend.post(`/commerce-logos/${commerceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds timeout for logo upload
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading commerce logo:', error);
    throw new Error(error.response?.data?.message || 'Error al subir el logo del comercio');
  }
};

// Get commerce logo URL
export const getCommerceLogo = async commerceId => {
  try {
    const headers = await getHeaders();

    const response = await requestBackend.get(`/commerce-logos/${commerceId}`, {
      _skipAuthLogout: true,
      ...headers,
    });
    const relativePath = response.data;

    // If backend returns a relative path, construct full URL
    if (relativePath && relativePath.startsWith('/')) {
      const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      return `${backendURL.replace(/\/$/, '')}${relativePath}`;
    }

    return relativePath || null;
  } catch (error) {
    if (error.response?.status === 404) {
      // No logo found - this is normal for commerces without custom logos
      return null;
    }
    if (error.response?.status === 401) {
      console.error('🏪 CommerceLogo Frontend: Authentication error (401):', error.response.data);
    }
    console.error('🏪 CommerceLogo Frontend: Error getting commerce logo:', error);
    throw new Error(error.response?.data?.message || 'Error al obtener el logo del comercio');
  }
};

// Get commerce logo URL for display
export const getCommerceLogoUrl = async (commerceId, logoId) => {
  if (!commerceId || !logoId) {
    console.warn('🔍 CommerceLogo: Missing parameters for logo URL:', { commerceId, logoId });
    return null;
  }

  try {
    // Make an authenticated request to get the logo blob
    const response = await requestBackend.get(`/commerce-logos/${commerceId}/${logoId}`, {
      responseType: 'blob',
      _skipAuthLogout: true,
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
        '🏪 CommerceLogo: Authentication error for full logo (401):',
        error.response.data,
      );
    }
    console.error('🔍 CommerceLogo: Error loading full logo:', error);
    return null;
  }
};

// Get commerce logo thumbnail URL
export const getCommerceLogoThumbnailUrl = async (commerceId, logoId) => {
  if (!commerceId || !logoId) {
    console.warn('🔍 CommerceLogo: Missing parameters for thumbnail URL:', { commerceId, logoId });
    return null;
  }

  try {
    // Make an authenticated request to get the thumbnail blob
    const response = await requestBackend.get(`/commerce-logos/${commerceId}/${logoId}/thumbnail`, {
      responseType: 'blob',
      _skipAuthLogout: true,
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
        '🏪 CommerceLogo: Authentication error for thumbnail (401):',
        error.response.data,
      );
    }
    console.error('🔍 CommerceLogo: Error loading thumbnail:', error);
    return null;
  }
};

// Delete commerce logo
export const deleteCommerceLogo = async (commerceId, logoId) => {
  try {
    const response = await requestBackend.delete(`/commerce-logos/${commerceId}/${logoId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting commerce logo:', error);
    throw new Error(error.response?.data?.message || 'Error al eliminar el logo del comercio');
  }
};

// Update commerce logo (replace existing)
export const updateCommerceLogo = async (commerceId, businessId, logoData) => {
  try {
    // First, try to get existing logo to replace it
    const existingLogo = await getCommerceLogo(commerceId);

    if (existingLogo && existingLogo.id) {
      // Delete existing logo first
      await deleteCommerceLogo(commerceId, existingLogo.id);
    }

    // Upload new logo
    return await uploadCommerceLogo(commerceId, businessId, logoData);
  } catch (error) {
    console.error('Error updating commerce logo:', error);
    throw new Error(error.response?.data?.message || 'Error al actualizar el logo del comercio');
  }
};

// Compress image before upload (client-side optimization)
// Optimized for commerce logos: recommended size 250x230px or similar aspect ratio
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

// Create thumbnail from image (for commerce logos)
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
  uploadCommerceLogo,
  getCommerceLogo,
  getCommerceLogoUrl,
  getCommerceLogoThumbnailUrl,
  deleteCommerceLogo,
  updateCommerceLogo,
  compressLogo,
  validateLogoFile,
  createLogoThumbnail,
};
