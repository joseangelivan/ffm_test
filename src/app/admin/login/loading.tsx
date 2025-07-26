import { Loader } from 'lucide-react';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-4 text-2xl text-muted-foreground">
        <Loader className="h-12 w-12 animate-spin" />
        <span>Cargando...</span>
      </div>
    </div>
  );
}

    