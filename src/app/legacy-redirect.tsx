import { Navigate, useLocation, useParams } from 'react-router';

/** Arma la URL nueva a partir de los parámetros y la query de la vieja. */
export type Translate = (params: Readonly<Record<string, string | undefined>>, search: URLSearchParams) => string;

/** Redirige una URL vieja a su equivalente nueva, sin dejar la vieja en el historial. */
export function LegacyRedirect({ to }: { to: Translate }) {
  const params = useParams();
  const location = useLocation();

  return <Navigate to={to(params, new URLSearchParams(location.search))} replace />;
}
