import { Loader } from 'lucide-react';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-4 text-lg text-muted-foreground">
        <Loader className="h-8 w-8 animate-spin" />
        <span>Cargando...</span>
      </div>
    </div>
  );
}
