// app/services/storageService.ts
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject
} from "firebase/storage";
import type { UploadTaskSnapshot } from "firebase/storage";
import { app } from "~/lib/firebase";

class StorageService {
  private storage = getStorage(app);

  /**
   * Upload client logo to Firebase Storage
   * @param file - The image file to upload
   * @param clientId - The client ID for organizing files
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to download URL
   */
  async uploadClientLogo(
    file: File, 
    clientId: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(this.storage, `client-logos/${clientId}/${fileName}`);
    
    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Calculate progress percentage
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(new Error('Failed to upload image. Please try again.'));
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(new Error('Failed to get image URL. Please try again.'));
          }
        }
      );
    });
  }

  /**
   * Delete client logo from Firebase Storage
   * @param logoUrl - The full URL of the logo to delete
   */
  async deleteClientLogo(logoUrl: string): Promise<void> {
    try {
      // Extract the path from the URL
      const url = new URL(logoUrl);
      const pathMatch = url.pathname.match(/\/b\/[^\/]+\/o\/(.+)\?/);
      
      if (!pathMatch) {
        throw new Error('Invalid logo URL format');
      }
      
      const path = decodeURIComponent(pathMatch[1]);
      const logoRef = ref(this.storage, path);
      
      await deleteObject(logoRef);
    } catch (error) {
      console.error('Error deleting logo:', error);
      // Don't throw error for delete failures as it's not critical
      console.warn('Failed to delete old logo, continuing...');
    }
  }

  /**
   * Update client logo - deletes old and uploads new
   * @param file - New image file
   * @param clientId - Client ID
   * @param oldLogoUrl - URL of existing logo to delete
   * @param onProgress - Progress callback
   * @returns Promise resolving to new download URL
   */
  async updateClientLogo(
    file: File,
    clientId: string,
    oldLogoUrl?: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Delete old logo if it exists
    if (oldLogoUrl) {
      await this.deleteClientLogo(oldLogoUrl);
    }
    
    // Upload new logo
    return this.uploadClientLogo(file, clientId, onProgress);
  }

  /**
   * Validate image file
   * @param file - File to validate
   * @returns Validation result
   */
  async validateImageFile(file: File): Promise<{ isValid: boolean; error?: string }> {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Please select a valid image file' };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { isValid: false, error: 'Image size must be less than 5MB' };
    }

    // Check image dimensions (optional - you can adjust these)
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        
        // Recommended dimensions: at least 100x100, max 2000x2000
        if (width < 100 || height < 100) {
          resolve({ isValid: false, error: 'Image should be at least 100x100 pixels' });
        } else if (width > 2000 || height > 2000) {
          resolve({ isValid: false, error: 'Image should not exceed 2000x2000 pixels' });
        } else {
          resolve({ isValid: true });
        }
      };
      
      img.onerror = () => {
        resolve({ isValid: false, error: 'Invalid image file' });
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate a placeholder logo URL for clients without logos
   * @param companyName - Company name for generating initials
   * @returns Placeholder logo URL
   */
  generatePlaceholderLogo(companyName: string): string {
    const initials = companyName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    
    // Use a service like DiceBear or create a simple colored background
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=3b82f6&color=ffffff&format=svg`;
  }
}

export const storageService = new StorageService();
