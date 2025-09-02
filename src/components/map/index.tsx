
"use client";

import React, { useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker as GoogleAdvancedMarker } from '@vis.gl/react-google-maps';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/lib/i18n';
import { Loader } from 'lucide-react';
import { getAppSetting } from '@/actions/settings';

const MapComponent: React.FC<{ mapId?: string, children?: React.ReactNode }> = ({ mapId, children }) => {
    const { toast } = useToast();
    const { t } = useLocale();
    const [apiKey, setApiKey] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    useEffect(() => {
        const fetchKey = async () => {
            const key = await getAppSetting('google_maps_api_key');
            setApiKey(key);
            setIsLoading(false);
        };
        fetchKey();
    }, []);
    
    useEffect(() => {
        const handleBillingError = () => {
            toast({
                title: t('toast.mapsBillingError.title'),
                description: t('toast.mapsBillingError.description'),
                variant: 'destructive',
                duration: 10000,
            });
        };
        
        window.gm_authFailure = handleBillingError;

        return () => {
            delete (window as any).gm_authFailure;
        }
    }, [toast, t]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-muted">
                <Loader className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    
    if (!apiKey) {
        return (
            <div className="flex items-center justify-center h-full bg-muted-foreground/10">
                <div className="text-center p-4">
                    <p className="text-muted-foreground font-semibold">
                       {t('condoDashboard.map.apiKeyMissing.title')}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {t('condoDashboard.map.apiKeyMissing.description')}
                    </p>
                </div>
            </div>
        );
    }

    return (
       <APIProvider apiKey={apiKey}>
           <Map
                mapId={mapId}
                defaultCenter={{ lat: -14.235, lng: -51.9253 }}
                defaultZoom={4}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
               {children}
            </Map>
       </APIProvider>
    );
};

export const AdvancedMarker = GoogleAdvancedMarker;
export default MapComponent;
