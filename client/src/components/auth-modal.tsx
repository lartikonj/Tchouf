import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { Chrome } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ open, onOpenChange, mode, onModeChange }: AuthModalProps) {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password);
      } else {
        await signUp(formData.email, formData.password, formData.displayName);
      }
      onOpenChange(false);
      setFormData({ email: '', password: '', displayName: '' });
    } catch (error) {
      // Error is handled in useAuth hook
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onOpenChange(false);
    } catch (error) {
      // Error is handled in useAuth hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {mode === 'login' ? t('auth.welcomeBack') : t('auth.joinTchouf')}
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            {mode === 'login' ? t('auth.signInAccount') : t('auth.createAccount')}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          
          <Button type="submit" className="w-full bg-[#D32F2F] hover:bg-[#B71C1C]" disabled={loading}>
            {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('auth.continueWith')}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
        >
          <Chrome className="mr-2 h-4 w-4 text-red-500" />
          {t('auth.signInGoogle')}
        </Button>

        <div className="text-center text-sm">
          {mode === 'login' ? (
            <>
              {t('auth.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className="text-[#D32F2F] hover:underline"
              >
                {t('auth.signUp')}
              </button>
            </>
          ) : (
            <>
              {t('auth.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className="text-[#D32F2F] hover:underline"
              >
                {t('auth.signIn')}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
