import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStorage } from '@/hooks/use-firebase-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ClaimBusinessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  businessName: string;
}

export function ClaimBusinessForm({ 
  open, 
  onOpenChange, 
  businessId, 
  businessName 
}: ClaimBusinessFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadClaimProof, uploading } = useFirebaseStorage();
  const queryClient = useQueryClient();

  const [proofFile, setProofFile] = useState<File | null>(null);

  const createClaimMutation = useMutation({
    mutationFn: async (data: { proofUrl: string }) => {
      if (!businessId || !user?.id) {
        throw new Error('Missing required information');
      }

      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: Number(businessId),
          userId: user.id,
          proofUrl: data.proofUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit claim');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: 'Business claim submitted successfully! We will review your request.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses', businessId] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/claims`] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to submit claim',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setProofFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: t('common.error'),
        description: 'Please sign in to claim a business',
        variant: 'destructive',
      });
      return;
    }

    if (!proofFile) {
      toast({
        title: t('common.error'),
        description: 'Please upload proof of ownership',
        variant: 'destructive',
      });
      return;
    }

    try {
      const proofUrl = await uploadClaimProof(proofFile);

      const claimData = {
        businessId,
        userId: user.id!,
        proofUrl,
      };

      createClaimMutation.mutate(claimData);
    } catch (error) {
      // Error handled by uploadClaimProof
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Business</DialogTitle>
          <p className="text-muted-foreground">{businessName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Business Information</Label>
            <p className="text-sm text-muted-foreground">
              To claim this business, you need to provide proof that you are the owner or authorized representative.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof">Proof of Ownership *</Label>
            <p className="text-xs text-muted-foreground">
              Upload business license, registration document, or official business documents
            </p>
            <div className="flex items-center space-x-2">
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('proof')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {proofFile ? proofFile.name : 'Upload Proof Document'}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• We'll review your proof documents</li>
              <li>• Verification typically takes 1-3 business days</li>
              <li>• You'll receive an email with the decision</li>
              <li>• Once approved, you can manage your business listing</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!proofFile || createClaimMutation.isPending || uploading}
              className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C]"
            >
              Submit Claim
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}