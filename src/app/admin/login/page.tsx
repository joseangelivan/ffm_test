import AdminLoginForm from '@/components/admin-login-form';
import { Suspense } from 'react';
import Loading from '@/app/loading';

// Esta página renderiza únicamente el formulario de login de administrador.
// La lógica para inicializar la base de datos se maneja en el arranque del servidor.
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminLoginForm />
    </Suspense>
  );
}
