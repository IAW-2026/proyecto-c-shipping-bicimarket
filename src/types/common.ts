// Types compartidos por todos los dominios. Ver docs/07 "Convenciones de naming".

export interface Address {
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
}

/**
 * Shape del body de error que devuelven nuestros route handlers
 * (formato definido en docs/03 §0.3). Útil para tipar AxiosError<ApiErrorBody>
 * en el helper useApiMutation.
 */
export interface ApiErrorBody {
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  // Algunos errores genéricos (ej: 500 sin handler) pueden venir con
  // solo { message }. El parser de useApiMutation cubre ambos shapes.
  message?: string;
}
