import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useFirebaseStorage() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      setUploading(true);
      
      // Create a reference to the file
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadBusinessPhoto = (file: File) => {
    return uploadFile(file, 'business-photos');
  };

  const uploadReviewPhoto = (file: File) => {
    return uploadFile(file, 'review-photos');
  };

  const uploadClaimProof = (file: File) => {
    return uploadFile(file, 'claim-proofs');
  };

  return {
    uploading,
    uploadFile,
    uploadBusinessPhoto,
    uploadReviewPhoto,
    uploadClaimProof,
  };
}
