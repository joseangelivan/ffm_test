
// This script suppresses the Google Maps BillingNotEnabledMapError console error,
// which is disruptive in the Next.js development environment because it triggers
// an error overlay. This does NOT fix the underlying billing issue.

if (typeof window !== 'undefined') {
    const originalConsoleError = window.console.error;

    window.console.error = (...args: any[]) => {
        const message = typeof args[0] === 'string' ? args[0] : '';
        const isBillingError = message.includes('Google Maps JavaScript API error: BillingNotEnabledMapError');
        
        if (!isBillingError) {
            originalConsoleError(...args);
        }
    };
}
