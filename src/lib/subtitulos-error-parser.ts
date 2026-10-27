export type SubtitulosErrorCategory =
  | 'CREDITS_DEPLETED'
  | 'API_KEY_MISSING'
  | 'API_KEY_INVALID'
  | 'RATE_LIMIT'
  | 'MODEL_OVERLOADED'
  | 'VIDEO_FORMAT_ERROR'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'UNKNOWN';

export interface ParsedSubtitulosError {
  category: SubtitulosErrorCategory;
  title: string;
  humanMessage: string;
  recommendation: string;
  actionLabel?: string;
  actionUrl?: string;
  isSafetyStop: boolean;
  rawError: string;
}

/**
 * Analiza el error en bruto devuelto por el pipeline de subtitulado (Python / Anthropic / ffmpeg)
 * y lo convierte en una explicación humana, empática y con pasos claros, evitando volcar códigos
 * gigantescos o trazas de pila técnicas ininteligibles.
 */
export function parseSubtitulosError(rawError?: string | null): ParsedSubtitulosError {
  const errorStr = (rawError || '').trim();
  const lower = errorStr.toLowerCase();

  // 1. Caso crítico: Cuenta de Claude sin créditos / saldo agotado
  const isCreditsDepleted =
    lower.includes('credit_balance_too_low') ||
    lower.includes('credit balance is too low') ||
    lower.includes('insufficient_quota') ||
    lower.includes('purchase credits') ||
    lower.includes('plans & billing') ||
    (lower.includes('balance') && (lower.includes('too low') || lower.includes('insufficient'))) ||
    (lower.includes('credit') && (lower.includes('zero') || lower.includes('empty') || lower.includes('depleted')));

  if (isCreditsDepleted) {
    return {
      category: 'CREDITS_DEPLETED',
      title: 'Saldo de Claude agotado en Anthropic',
      humanMessage:
        'El proceso se ha detenido de forma inmediata para proteger tu cuenta y evitar llamadas en bucle o cobros imprevistos. Tu cuenta de Anthropic (Claude) no dispone de créditos suficientes para procesar la revisión o traducción de este vídeo.',
      recommendation:
        'Recarga saldo en el panel de facturación de Anthropic. Una vez realizada la recarga, pulsa «Reintentar»: el vídeo continuará directamente desde la fase donde se detuvo sin tener que volver a subirlo ni repetir la transcripción.',
      actionLabel: 'Abrir panel de facturación de Anthropic ↗',
      actionUrl: 'https://console.anthropic.com/settings/plans',
      isSafetyStop: true,
      rawError: errorStr,
    };
  }

  // 2. Clave no configurada en el servidor (.env vacío o no definido)
  const isKeyMissing =
    lower.includes('could not resolve authentication method') ||
    lower.includes('expected one of api_key') ||
    lower.includes('authorization header to be explicitly omitted');

  if (isKeyMissing) {
    return {
      category: 'API_KEY_MISSING',
      title: 'Falta configurar la clave de Claude (Anthropic API Key)',
      humanMessage:
        'La transcripción local con Whisper finalizó con éxito, pero para las fases de revisión y traducción se necesita la clave de Claude. Actualmente el campo ANTHROPIC_API_KEY en el servidor está vacío.',
      recommendation:
        'Abre el archivo brainup-subtitulos-api/.env y añade tu clave en ANTHROPIC_API_KEY=sk-ant-.... Después pulsa «Reintentar» en esta tarjeta.',
      actionLabel: 'Obtener clave en Anthropic Console ↗',
      actionUrl: 'https://console.anthropic.com/settings/keys',
      isSafetyStop: true,
      rawError: errorStr,
    };
  }

  // 3. Clave rechazada o inválida
  const isKeyInvalid =
    lower.includes('authentication_error') ||
    lower.includes('invalid x-api-key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('incorrect api key') ||
    lower.includes('401 unauthorized');

  if (isKeyInvalid) {
    return {
      category: 'API_KEY_INVALID',
      title: 'Clave de Claude no válida o revocada',
      humanMessage:
        'Anthropic ha rechazado la clave de API configurada en el servidor. La clave puede haber caducado, haber sido revocada o contener caracteres extra.',
      recommendation:
        'Verifica que la clave en brainup-subtitulos-api/.env sea correcta y esté activa en console.anthropic.com. Tras actualizarla, pulsa «Reintentar».',
      actionLabel: 'Gestionar claves en Anthropic ↗',
      actionUrl: 'https://console.anthropic.com/settings/keys',
      isSafetyStop: true,
      rawError: errorStr,
    };
  }

  // 4. Límite de velocidad / peticiones por minuto
  const isRateLimit =
    lower.includes('rate_limit_error') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('429');

  if (isRateLimit) {
    return {
      category: 'RATE_LIMIT',
      title: 'Límite de velocidad alcanzado temporalmente',
      humanMessage:
        'Tu cuenta de Anthropic ha alcanzado el límite máximo de peticiones o tokens por minuto fijado para tu plan.',
      recommendation:
        'Espera aproximadamente 1 minuto para que la cuota temporal se restablezca y pulsa «Reintentar». El trabajo continuará normalmente.',
      isSafetyStop: false,
      rawError: errorStr,
    };
  }

  // 5. Servidores de Claude temporalmente saturados
  const isOverloaded =
    lower.includes('overloaded_error') ||
    lower.includes('529') ||
    lower.includes('temporarily overloaded');

  if (isOverloaded) {
    return {
      category: 'MODEL_OVERLOADED',
      title: 'Servidores de Claude temporalmente ocupados',
      humanMessage:
        'Los servidores de Anthropic están experimentando un pico de demanda en este instante y no pudieron responder a tiempo.',
      recommendation:
        'Espera unos instantes y pulsa «Reintentar». El sistema continuará la revisión o traducción sin reiniciar desde cero.',
      isSafetyStop: false,
      rawError: errorStr,
    };
  }

  // 6. Límite de longitud de subtítulos (tokens)
  const isTokenLimit =
    lower.includes('max_tokens') ||
    lower.includes('reduce translation_chunk') ||
    lower.includes('longitud');

  if (isTokenLimit) {
    return {
      category: 'TOKEN_LIMIT_EXCEEDED',
      title: 'Fragmento de subtítulos demasiado extenso',
      humanMessage:
        'La respuesta generada por el modelo superó el número máximo de tokens de salida permitidos para una sola llamada.',
      recommendation:
        'En brainup-subtitulos-api/.env reduce el valor de TRANSLATION_CHUNK a un número menor (por ejemplo 100) y pulsa «Reintentar».',
      isSafetyStop: false,
      rawError: errorStr,
    };
  }

  // 7. Errores de ffmpeg / códec / archivo dañado
  const isVideoError =
    lower.includes('ffmpeg') ||
    lower.includes('moov atom') ||
    lower.includes('invalid data') ||
    lower.includes('codec') ||
    lower.includes('corrupt');

  if (isVideoError) {
    return {
      category: 'VIDEO_FORMAT_ERROR',
      title: 'Incidencia al leer o codificar el archivo de vídeo',
      humanMessage:
        'ffmpeg no ha podido procesar correctamente el archivo de vídeo subido. El archivo podría estar corrupto, incompleto o utilizar un códec de audio incompatible.',
      recommendation:
        'Asegúrate de que el vídeo original se reproduce correctamente en tu ordenador o prueba a exportarlo en formato estándar MP4 (H.264 / AAC).',
      isSafetyStop: false,
      rawError: errorStr,
    };
  }

  // 8. Error genérico desconocido
  return {
    category: 'UNKNOWN',
    title: 'El trabajo se ha detenido por una incidencia',
    humanMessage:
      'Se ha producido un error durante la ejecución del pipeline. El proceso se ha detenido de forma segura para no generar cobros innecesarios ni bucles de reintento.',
    recommendation:
      'Puedes revisar el detalle técnico desplegable a continuación y pulsar «Reintentar» si se trataba de un fallo de conexión temporal.',
    isSafetyStop: false,
    rawError: errorStr || 'No se han proporcionado detalles del fallo en el servidor.',
  };
}
