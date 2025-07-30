
"use client";

import React, { useState, useEffect, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    sendEmailChangePin, 
    updateAdminAccount, 
    verifyAdminEmailChangePin,
} from '@/actions/auth';
import {
  Loader,
  AlertCircle,
  KeyRound,
  Send,
  Eye,
} from 'lucide-react';
import { LoadingOverlay } from './admin-header';
import { useAdminDashboard } from '../admin-dashboard-client';

function ManageAccountFields({ formState }: { formState: any }) {
    const { pending } = useFormStatus();
    const { t, locale } = useLocale();
    const { toast } = useToast();
    const { session } = useAdminDashboard();


    const [emailValue, setEmailValue] = useState(session.email);
    const [pinValue, setPinValue] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isPinLoading, startPinTransition] = useTransition();
    const [pinVerificationState, setPinVerificationState] = useState<{ status: 'idle' | 'verified' | 'error', message: string }>({ status: 'idle', message: t('adminDashboard.account.pinValidation.initial') });

    const isEmailChanged = emailValue !== session.email;

    useEffect(() => {
        if (!isEmailChanged) {
             setPinVerificationState({ status: 'idle', message: t('adminDashboard.account.pinValidation.initial') });
             setPinValue('');
        }
    }, [isEmailChanged, t]);

    const handleSendPin = () => {
        startPinTransition(async () => {
            const result = await sendEmailChangePin(emailValue);
            if (result.success) {
                toast({ title: t('toast.successTitle'), description: result.message });
                setPinVerificationState({ status: 'idle', message: t('adminDashboard.account.pinValidation.sent') });
            } else {
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };
    
    const handleVerifyPin = () => {
        startPinTransition(async () => {
            const result = await verifyAdminEmailChangePin(emailValue, pinValue);
             if (result.success) {
                setPinVerificationState({ status: 'verified', message: t('adminDashboard.account.pinValidation.success') });
                toast({ title: t('toast.successTitle'), description: result.message });
            } else {
                setPinVerificationState({ status: 'error', message: result.message });
                toast({ title: t('toast.errorTitle'), description: result.message, variant: 'destructive' });
            }
        });
    };

    const isSaveChangesDisabled = pending || (isEmailChanged && pinVerificationState.status !== 'verified');
    
    return (
         <div className={cn("relative transition-opacity", pending && "opacity-50")}>
            {pending && <LoadingOverlay text={t('adminDashboard.loadingOverlay.updating')} />}
            <DialogHeader>
                <DialogTitle>{t('adminDashboard.account.title')}</DialogTitle>
                <DialogDescription>{t('adminDashboard.account.description')}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-2 mt-4">
                    <TabsTrigger value="profile">{t('adminDashboard.account.profileTab')}</TabsTrigger>
                    <TabsTrigger value="security">{t('adminDashboard.account.securityTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-4 pt-4">
                     {formState?.success === false && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('toast.errorTitle')}</AlertTitle>
                            <AlertDescription variant="destructive">{formState.message}</AlertDescription>
                        </Alert>
                    )}
                    <Card>
                        <CardHeader><CardTitle>{t('adminDashboard.account.profileTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <input type="hidden" name="locale" value={locale} />
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('adminDashboard.account.nameLabel')}</Label>
                                <Input id="name" name="name" defaultValue={session.name} required disabled={pending}/>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('adminDashboard.account.emailLabel')}</Label>
                                <Input id="email" name="email" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} required disabled={pending}/>
                            </div>
                        </CardContent>
                    </Card>
                    {isEmailChanged && (
                        <Card className="p-4 bg-muted/50 border-dashed">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base">{t('adminDashboard.account.pinVerificationTitle')}</CardTitle>
                                <CardDescription className="text-xs">{t('adminDashboard.account.pinVerificationDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                <div className="flex gap-2">
                                    <Input id="email_pin" name="email_pin" placeholder={t('adminDashboard.account.pinPlaceholder')} value={pinValue} onChange={e => setPinValue(e.target.value)} disabled={isPinLoading || pinVerificationState.status === 'verified'}/>
                                    <Button type="button" variant="outline" onClick={handleSendPin} disabled={isPinLoading}>
                                        {isPinLoading && pinVerificationState.status === 'idle' ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                        {t('adminDashboard.account.sendPinButton')}
                                    </Button>
                                </div>
                                <Button type="button" className="w-full" onClick={handleVerifyPin} disabled={!pinValue || isPinLoading || pinVerificationState.status === 'verified'}>
                                    {isPinLoading && pinVerificationState.status !== 'verified' ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                    {t('adminDashboard.account.verifyPinButton')}
                                </Button>
                                <div className={cn("text-sm text-center p-2 rounded-md", 
                                    pinVerificationState.status === 'idle' && 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
                                    pinVerificationState.status === 'verified' && 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
                                    pinVerificationState.status === 'error' && 'bg-destructive/10 text-destructive'
                                )}>
                                    {pinVerificationState.message}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="security" className="pt-4">
                     <Card>
                        <CardHeader><CardTitle>{t('adminDashboard.account.passwordTitle')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid gap-2">
                                <Label htmlFor="current_password">{t('adminDashboard.account.currentPasswordLabel')}</Label>
                                <div className="relative">
                                    <Input id="current_password" name="current_password" type={showPassword ? "text" : "password"} autoComplete="current-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new_password">{t('adminDashboard.account.newPasswordLabel')}</Label>
                                 <div className="relative">
                                    <Input id="new_password" name="new_password" type={showNewPassword ? "text" : "password"} autoComplete="new-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="confirm_password">{t('adminDashboard.account.confirmPasswordLabel')}</Label>
                                <div className="relative">
                                    <Input id="confirm_password" name="confirm_password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" disabled={pending}/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(p => !p)} disabled={pending}><Eye className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-4 mt-4 border-t">
                 <Button type="button" variant="outline" asChild>
                    <DialogClose disabled={pending}>{t('common.cancel')}</DialogClose>
                 </Button>
                <Button type="submit" disabled={isSaveChangesDisabled}>{t('common.saveChanges')}</Button>
            </DialogFooter>
        </div>
    );
}

export function ManageAccountDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: any) => void;
}) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [state, formAction] = useActionState(updateAdminAccount, undefined);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: t('toast.successTitle'),
        description: state.message,
      });
      onSuccess(state.data);
      onOpenChange(false);
    }
  }, [state, toast, t, onSuccess, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <ManageAccountFields formState={state} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
