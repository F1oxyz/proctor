/**
 * sesiones.service.ts
 * ─────────────────────────────────────────────────────────────────
 * Servicio del módulo Docente para gestionar el ciclo de vida
 * completo de una sesión de examen.
 *
 * RESPONSABILIDADES:
 *  - Crear una sesión en Supabase y generar el código de acceso
 *  - Suscribirse a Supabase Realtime para ver en tiempo real
 *    cuáles alumnos se conectan y en qué estado están
 *  - Finalizar la sesión (cambia estado a 'finalizada')
 *
 * SUPABASE REALTIME:
 *  Escucha cambios en la tabla sesion_alumnos filtrada por sesion_id.
 *  Cada INSERT (alumno se une) o UPDATE (alumno envía examen) dispara
 *  una actualización en el signal `alumnosEnSesion`.
 *
 * ARQUITECTURA:
 *  - NO providedIn:'root'. Se provee en MonitorComponent.
 *  - Solo lo usa el módulo docente.
 *  - El código de acceso se genera en el cliente como 6 caracteres
 *    alfanuméricos mayúsculos para ser fáciles de dictar en clase.
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { SesionAlumnoConDatos } from '../../../shared/models/index';

/** Info básica de la sesión activa para el monitor */
export interface SesionActiva {
  id: string;
  codigo_acceso: string;
  examen_titulo: string;
  grupo_nombre: string;
  duracion_min: number;
  iniciada_en: string;
}

@Injectable()
export class SesionesService {
  // ── Dependencias ────────────────────────────────────────────────
  private readonly supabase = inject(SupabaseService);
  private readonly auth     = inject(AuthService);

  // ── Estado con signals ───────────────────────────────────────────

  /** Datos de la sesión que está activa en el monitor */
  readonly sesionActiva = signal<SesionActiva | null>(null);

  /**
   * Lista reactiva de alumnos en la sesión.
   * Se actualiza en tiempo real via Supabase Realtime.
   */
  readonly alumnosEnSesion = signal<SesionAlumnoConDatos[]>([]);

  readonly cargando = signal(false);
  readonly error    = signal<string | null>(null);

  /** Referencia al canal de Realtime para poder desuscribirse */
  private realtimeChannel: ReturnType<
    typeof this.supabase.client.channel
  > | null = null;

  // ── Métodos públicos ────────────────────────────────────────────

  /**
   * Crea una nueva sesión en Supabase para el examen/grupo dados.
   * Genera un código de acceso único de 6 caracteres.
   *
   * @param examenId UUID del examen a iniciar
   * @param grupoId  UUID del grupo que presentará el examen
   * @returns UUID de la sesión creada, o null si falló
   */
  async crearSesion(examenId: string, grupoId: string): Promise<string | null> {
    this.cargando.set(true);
    this.error.set(null);

    const maestroId = this.auth.currentUser()?.id;
    if (!maestroId) {
      this.error.set('No hay sesión activa de docente.');
      this.cargando.set(false);
      return null;
    }

    // Generar código único de 6 caracteres
    const codigoAcceso = await this.generarCodigoUnico();

    // Insertar la sesión en DB con estado inicial 'activa'
    const { data, error } = await this.supabase.client
      .from('sesiones')
      .insert({
        examen_id:     examenId,
        maestro_id:    maestroId,
        codigo_acceso: codigoAcceso,
        estado:        'activa',
        iniciada_en:   new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      this.error.set('No se pudo crear la sesión. Intenta de nuevo.');
      console.error('[SesionesService] crearSesion:', error);
      this.cargando.set(false);
      return null;
    }

    this.cargando.set(false);
    return data.id;
  }

  /**
   * Carga los datos completos de una sesión existente.
   * Útil cuando el docente navega directamente al monitor por URL.
   *
   * @param sesionId UUID de la sesión a cargar
   */
  async cargarSesion(sesionId: string): Promise<boolean> {
    this.cargando.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('sesiones')
      .select(`
        id,
        codigo_acceso,
        iniciada_en,
        examenes (
          titulo,
          duracion_min,
          grupos ( nombre )
        )
      `)
      .eq('id', sesionId)
      .single();

    if (error || !data) {
      this.error.set('No se encontró la sesión especificada.');
      this.cargando.set(false);
      return false;
    }

    const examen = (data as any).examenes;

    this.sesionActiva.set({
      id:            data.id,
      codigo_acceso: data.codigo_acceso,
      examen_titulo: examen?.titulo ?? '—',
      grupo_nombre:  examen?.grupos?.nombre ?? '—',
      duracion_min:  examen?.duracion_min ?? 30,
      iniciada_en:   data.iniciada_en ?? new Date().toISOString(),
    });

    this.cargando.set(false);
    return true;
  }

  /**
   * Carga la lista inicial de alumnos del grupo de la sesión
   * y luego activa la suscripción de Realtime para actualizaciones en vivo.
   *
   * @param sesionId UUID de la sesión activa
   */
  async iniciarMonitoreo(sesionId: string): Promise<void> {
    // 1. Carga inicial de alumnos ya unidos
    await this.cargarAlumnosIniciales(sesionId);

    // 2. Suscripción Realtime a cambios en sesion_alumnos
    this.suscribirseARealtime(sesionId);
  }

  /**
   * Finaliza la sesión: cambia estado a 'finalizada' en Supabase
   * y cancela la suscripción de Realtime.
   *
   * @param sesionId UUID de la sesión a finalizar
   */
  async finalizarSesion(sesionId: string): Promise<boolean> {
    this.cargando.set(true);

    const { error } = await this.supabase.client
      .from('sesiones')
      .update({
        estado:        'finalizada',
        finalizada_en: new Date().toISOString(),
      })
      .eq('id', sesionId);

    this.cargando.set(false);

    if (error) {
      this.error.set('No se pudo finalizar la sesión.');
      console.error('[SesionesService] finalizarSesion:', error);
      return false;
    }

    // Cancelar Realtime al finalizar
    this.desuscribirseDeRealtime();
    return true;
  }

  /**
   * Cancela la suscripción de Realtime y limpia el estado.
   * Llamar en ngOnDestroy del MonitorComponent.
   */
  destruir(): void {
    this.desuscribirseDeRealtime();
    this.sesionActiva.set(null);
    this.alumnosEnSesion.set([]);
    this.error.set(null);
  }

  // ── Métodos privados ────────────────────────────────────────────

  /**
   * Carga todos los registros de sesion_alumnos para la sesión dada,
   * incluyendo el nombre del alumno desde la tabla alumnos.
   */
  private async cargarAlumnosIniciales(sesionId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('sesion_alumnos')
      .select(`
        id,
        alumno_id,
        peer_id,
        estado,
        iniciado_en,
        enviado_en,
        tiempo_usado_min,
        porcentaje,
        total_correctas,
        total_incorrectas,
        alumnos ( nombre_completo )
      `)
      .eq('sesion_id', sesionId)
      .order('alumnos(nombre_completo)', { ascending: true });

    if (error) {
      console.error('[SesionesService] cargarAlumnosIniciales:', error);
      return;
    }

    const enriquecidos = this.enriquecerAlumnos(data ?? []);
    this.alumnosEnSesion.set(enriquecidos);
  }

  /**
   * Activa un canal de Supabase Realtime que escucha INSERT y UPDATE
   * en la tabla sesion_alumnos filtrado por sesion_id.
   *
   * Cuando llega un evento:
   *  - INSERT: agrega el alumno nuevo al signal
   *  - UPDATE: actualiza el registro existente (estado, porcentaje, etc.)
   */
  private suscribirseARealtime(sesionId: string): void {
    // Cancelar canal previo si existe
    this.desuscribirseDeRealtime();

    this.realtimeChannel = this.supabase.client
      .channel(`sesion-${sesionId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',            // INSERT y UPDATE
          schema: 'public',
          table:  'sesion_alumnos',
          filter: `sesion_id=eq.${sesionId}`,
        },
        async (payload) => {
          // Recargar la lista completa en cada cambio para tener datos frescos
          // (más simple que hacer merge manual del payload)
          await this.cargarAlumnosIniciales(sesionId);
          console.log('[SesionesService] Realtime evento:', payload.eventType);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[SesionesService] Realtime activo para sesión: ${sesionId}`);
        }
      });
  }

  /** Cancela el canal de Realtime activo */
  private desuscribirseDeRealtime(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Genera un código de acceso único de 6 caracteres alfanuméricos.
   * Verifica que no exista ya en la tabla sesiones.
   *
   * Formato: "XXXXXX" (letras mayúsculas + números, sin caracteres confusos)
   * Ejemplo: "K7M2PQ"
   */
  private async generarCodigoUnico(): Promise<string> {
    // Caracteres sin ambigüedad (sin 0/O ni 1/I/L)
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    const generarCodigo = () =>
      Array.from({ length: 6 }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
      ).join('');

    // Reintentar hasta encontrar un código no usado
    for (let intento = 0; intento < 10; intento++) {
      const codigo = generarCodigo();

      const { data } = await this.supabase.client
        .from('sesiones')
        .select('id')
        .eq('codigo_acceso', codigo)
        .maybeSingle();

      // Si no existe, usar este código
      if (!data) return codigo;
    }

    // Fallback: código con timestamp para garantizar unicidad
    return generarCodigo() + Date.now().toString(36).slice(-2).toUpperCase();
  }

  /**
   * Aplana el join de alumnos en el array de sesion_alumnos
   * para exponer alumno_nombre directamente en cada fila.
   */
  private enriquecerAlumnos(data: any[]): SesionAlumnoConDatos[] {
    return data.map((sa) => ({
      ...sa,
      alumno_nombre: sa.alumnos?.nombre_completo ?? '—',
    }));
  }
}