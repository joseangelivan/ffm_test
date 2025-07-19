import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label="Follow For Me Logo">
      <MapPin className="h-8 w-8 text-accent" />
      <span className="text-2xl font-bold text-primary font-headline">
        Follow For Me
      </span>
    </div>
  );
}
