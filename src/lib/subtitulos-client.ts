import { 
  SubtitulosJob, 
  SubtitulosReviewResponse, 
  SubtitulosCorrection, 
  SubtitulosHealth 
} from '@/types/subtitulos';

export class SubtitulosApiError extends Error {
  status: number;
  detail: any;

  constructor(status: number, message: string, detail?: any) {
    super(message);
    this.name = 'SubtitulosApiError';
    this.status = status;
    this.detail = detail;
  }
}

class SubtitulosClient {
  private get baseUrl(): string {
    return (process.env.SUBTITULOS_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  }

  private get apiKey(): string | undefined {
    return process.env.SUBTITULOS_API_KEY;
  }

  private getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...additionalHeaders };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMsg = `Error en la API de subtítulos: ${res.status} ${res.statusText}`;
      let detail = null;
      try {
        const json = await res.json();
        detail = json;
        if (json.detail) {
          errorMsg = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
        } else if (json.error) {
          errorMsg = json.error;
        }
      } catch {
        const text = await res.text().catch(() => '');
        if (text) errorMsg = text;
      }
      throw new SubtitulosApiError(res.status, errorMsg, detail);
    }

    if (res.status === 204) {
      return null as T;
    }

    return (await res.json()) as T;
  }

  /**
   * Comprobación de estado y modelo de la API (no requiere clave)
   */
  async getHealth(): Promise<SubtitulosHealth> {
    const res = await fetch(`${this.baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
    });
    return this.handleResponse<SubtitulosHealth>(res);
  }

  /**
   * Listar todos los trabajos existentes
   */
  async listJobs(): Promise<SubtitulosJob[]> {
    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<SubtitulosJob[]>(res);
  }

  /**
   * Obtener detalle de un trabajo
   */
  async getJob(id: string): Promise<SubtitulosJob> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<SubtitulosJob>(res);
  }

  /**
   * Crear nuevo trabajo subiendo el vídeo y sus opciones (multipart/form-data)
   */
  async createJob(formData: FormData): Promise<SubtitulosJob> {
    // Nota: Al pasar FormData a fetch, no se debe añadir cabecera Content-Type manual
    // para que el runtime genere el boundary multipart correcto.
    const headers = this.getHeaders();
    delete headers['Content-Type'];

    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<SubtitulosJob>(res);
  }

  /**
   * Obtener revisión (transcripción Whisper y correcciones propuestas de Claude)
   */
  async getReview(id: string): Promise<SubtitulosReviewResponse> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}/review`, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store',
    });
    return this.handleResponse<SubtitulosReviewResponse>(res);
  }

  /**
   * Sustituir correcciones durante el estado awaiting_review
   */
  async updateReview(id: string, corrections: SubtitulosCorrection[]): Promise<SubtitulosJob> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}/review`, {
      method: 'PUT',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(corrections),
    });
    return this.handleResponse<SubtitulosJob>(res);
  }

  /**
   * Aprobar revisión para continuar con la traducción y renderizado
   */
  async approveJob(id: string): Promise<SubtitulosJob> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubtitulosJob>(res);
  }

  /**
   * Reintentar un trabajo fallido desde la fase donde se detuvo
   */
  async retryJob(id: string): Promise<SubtitulosJob> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubtitulosJob>(res);
  }

  /**
   * Eliminar un trabajo y sus archivos asociados
   */
  async deleteJob(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  /**
   * Descargar archivo generado de la carpeta del trabajo (retorna el Response nativo con stream)
   */
  async fetchFileResponse(id: string, filename: string): Promise<Response> {
    const res = await fetch(
      `${this.baseUrl}/jobs/${encodeURIComponent(id)}/files/${encodeURIComponent(filename)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    if (!res.ok) {
      let errorMsg = `No se pudo descargar el archivo: ${res.statusText}`;
      try {
        const j = await res.json();
        if (j.detail) errorMsg = j.detail;
      } catch {}
      throw new SubtitulosApiError(res.status, errorMsg);
    }
    return res;
  }
}

export const subtitulosClient = new SubtitulosClient();
