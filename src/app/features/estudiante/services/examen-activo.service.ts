/**
 * examen-activo.service.ts
 * ─────────────────────────────────────────────────────────────────
 * Signal store que gestiona todo el estado del examen mientras
 * el alumno lo está resolviendo.
 *
 * RESPONSABILIDADES:
 *  - Cargar el examen desde Supabase usando el código de sesión
 *  - Registrar al alumno en sesion_alumnos (INSERT anon)
 *  - Guardar respuestas pregunta por pregunta en la tabla `respuestas`
 *  - Controlar la navegación entre preguntas (anterior / siguiente)
 *  - Calcular y guardar el resultado final al enviar
 *
 * ARQUITECTURA:
 *  - Injectable SIN providedIn:'root'. Se provee SOLO en ExamenComponent
 *    (y en SalaEsperaComponent para arrancar la sesión).
 *    Esto garantiza que el estado se destruye al salir de la ruta.
 *  - Todos los estados son signals para compatibilidad con OnPush.
 *  - No cruza con servicios del módulo docente.
 *
 * TABLAS QUE TOCA:
 *  - sesiones          → SELECT por codigo_acceso (anon)
 *  - alumnos           → SELECT lista del grupo (anon)
 *  - preguntas         → SELECT del examen (anon)
 *  - opciones          → SELECT de preguntas (anon)
 *  - sesion_alumnos    → INSERT y UPDATE (anon, políticas permiten)
 *  - respuestas        → INSERT por cada pregunta respondida (anon)
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';

// ── Tipos locales ─────────────────────────────────────────────────

/** Opción de respuesta tal como viene de la DB */
export interface OpcionActiva {
  id: string;
  texto: string;
  es_correcta: boolean;
  orden: number;
}

/** Pregunta con sus opciones */
export interface PreguntaActiva {
  id: string;
  texto: string;
  tipo: 'opcion_multiple' | 'texto_abierto';
  opciones: OpcionActiva[];
}

/** Datos del alumno seleccionado de la lista */
export interface AlumnoActivo {
  id: string;
  nombre_completo: string;
}

/** Datos de la sesión cargada por código de acceso */
export interface SesionActiva {
  id: string;            // UUID de la sesión
  examen_id: string;
  examen_titulo: string;
  grupo_id: string;
  duracion_min: number;
  codigo_acceso: string;
}

/** Respuesta guardada localmente mientras el alumno navega */
export interface RespuestaLocal {
  pregunta_id: string;
  opcion_id: string | null;       // null si es texto_abierto
  respuesta_abierta: string | null;
  respondido_en: string;           // ISO timestamp
}

/** Resultado final calculado al enviar */
export interface ResultadoFinal {
  porcentaje: number;
  total_correctas: number;
  total_incorrectas: number;
  total_sin_contestar: number;
  tiempo_usado_seg: number;
  segundos_promedio: number;
  sesion_alumno_id: string;
}

@Injectable()
export class ExamenActivoService {
  // ── Dependencias ────────────────────────────────────────────────
  private readonly supabase = inject(SupabaseService);

  // ── Estado principal (signals) ───────────────────────────────────

  /** Datos de la sesión activa */
  readonly sesion = signal<SesionActiva | null>(null);

  /** Alumno que seleccionó su nombre en la sala de espera */
  readonly alumno = signal<AlumnoActivo | null>(null);

  /** Lista de alumnos del grupo (para el dropdown de sala-espera) */
  readonly listaAlumnos = signal<AlumnoActivo[]>([]);

  /** Preguntas del examen en orden aleatorio */
  readonly preguntas = signal<PreguntaActiva[]>([]);

  /** Índice de la pregunta actualmente visible (0-based) */
  readonly indicePreguntaActual = signal(0);

  /** Mapa de respuestas: pregunta_id → RespuestaLocal */
  readonly respuestas = signal<Map<string, RespuestaLocal>>(new Map());

  /** ID del registro sesion_alumnos (se crea al empezar el examen) */
  readonly sesionAlumnoId = signal<string | null>(null);

  /** Timestamp (ms) de cuando el alumno presionó "Comenzar" */
  readonly tiempoInicio = signal<number | null>(null);

  /** Resultado final (disponible después de enviar) */
  readonly resultadoFinal = signal<ResultadoFinal | null>(null);

  /** Estado de carga general */
  readonly cargando = signal(false);

  /** Mensaje de error actual */
  readonly error = signal<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────

  /** Pregunta que se está mostrando actualmente */
  readonly preguntaActual = computed(() => {
    const lista = this.preguntas();
    const idx   = this.indicePreguntaActual();
    return lista[idx] ?? null;
  });

  /** Total de preguntas del examen */
  readonly totalPreguntas = computed(() => this.preguntas().length);

  /** Número de pregunta visible para el usuario (1-based) */
  readonly numeroPreguntaVisible = computed(() => this.indicePreguntaActual() + 1);

  /** Respuesta guardada para la pregunta actual, si existe */
  readonly respuestaActual = computed(() => {
    const p = this.preguntaActual();
    if (!p) return null;
    return this.respuestas().get(p.id) ?? null;
  });

  /** Cantidad de preguntas respondidas */
  readonly cantidadRespondidas = computed(() => this.respuestas().size);

  /** true si ya respondió todas las preguntas */
  readonly todasRespondidas = computed(
    () => this.respuestas().size >= this.preguntas().length
  );

  // ── Métodos públicos ────────────────────────────────────────────

  /**
   * Carga los datos de la sesión a partir del código de acceso.
   * También carga la lista de alumnos del grupo para el dropdown.
   *
   * @param codigo Código de acceso ingresado por el alumno (ej: "MATH-101")
   * @returns true si la sesión existe y está activa, false si no
   */
  async cargarSesionPorCodigo(codigo: string): Promise<boolean> {
    this.cargando.set(true);
    this.error.set(null);

    // 1. Buscar la sesión por código
    const { data: sesionData, error: sesionError } = await this.supabase.client
      .from('sesiones')
      .select(`
        id,
        examen_id,
        grupo_id,
        codigo_acceso,
        estado,
        examenes ( titulo, duracion_min )
      `)
      .eq('codigo_acceso', codigo.trim().toUpperCase())
      .single();

    if (sesionError || !sesionData) {
      this.error.set('Código de examen inválido o no encontrado.');
      this.cargando.set(false);
      return false;
    }

    // Solo permitir acceso a sesiones activas o en espera
    if (!['esperando', 'activa'].includes(sesionData.estado)) {
      this.error.set('Este examen ya ha finalizado.');
      this.cargando.set(false);
      return false;
    }

    // Guardar datos de la sesión
    this.sesion.set({
      id:            sesionData.id,
      examen_id:     sesionData.examen_id,
      examen_titulo: (sesionData as any).examenes?.titulo ?? '—',
      grupo_id:      sesionData.grupo_id,
      duracion_min:  (sesionData as any).examenes?.duracion_min ?? 30,
      codigo_acceso: sesionData.codigo_acceso,
    });

    // 2. Cargar alumnos del grupo para el dropdown
    const { data: alumnosData, error: alumnosError } = await this.supabase.client
      .from('alumnos')
      .select('id, nombre_completo')
      .eq('grupo_id', sesionData.grupo_id)
      .order('nombre_completo', { ascending: true });

    if (alumnosError) {
      this.error.set('No se pudo cargar la lista de alumnos.');
      this.cargando.set(false);
      return false;
    }

    this.listaAlumnos.set(alumnosData ?? []);
    this.cargando.set(false);
    return true;
  }

  /**
   * Carga las preguntas del examen en orden aleatorio.
   * Se llama DESPUÉS de que el alumno compartió su pantalla y presionó
   * "Comenzar".
   *
   * @param examenId UUID del examen
   */
  async cargarPreguntas(examenId: string): Promise<boolean> {
    this.cargando.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('preguntas')
      .select(`
        id,
        texto,
        tipo,
        opciones ( id, texto, es_correcta, orden )
      `)
      .eq('examen_id', examenId);

    if (error || !data) {
      this.error.set('No se pudieron cargar las preguntas del examen.');
      this.cargando.set(false);
      return false;
    }

    // Mezclar orden de preguntas aleatoriamente (Fisher-Yates)
    const mezcladas = [...data].sort(() => Math.random() - 0.5);

    // Para cada pregunta, mezclar también sus opciones
    const conOpcionesMezcladas: PreguntaActiva[] = mezcladas.map((p: any) => ({
      id:      p.id,
      texto:   p.texto,
      tipo:    p.tipo,
      opciones: [...(p.opciones ?? [])].sort(() => Math.random() - 0.5),
    }));

    this.preguntas.set(conOpcionesMezcladas);
    this.indicePreguntaActual.set(0);
    this.cargando.set(false);
    return true;
  }

  /**
   * Registra al alumno en la tabla sesion_alumnos e inicia el temporizador.
   * Debe llamarse justo cuando el alumno presiona "Comenzar examen".
   *
   * @param alumno Alumno seleccionado del dropdown
   * @param peerId ID de PeerJS para la conexión WebRTC (puede ser vacío en Paso 6)
   */
  async iniciarExamen(alumno: AlumnoActivo, peerId = ''): Promise<boolean> {
    const sesion = this.sesion();
    if (!sesion) {
      this.error.set('No hay sesión activa.');
      return false;
    }

    this.cargando.set(true);
    this.error.set(null);
    this.alumno.set(alumno);

    // INSERT en sesion_alumnos (política anon permite)
    const { data, error } = await this.supabase.client
      .from('sesion_alumnos')
      .insert({
        sesion_id:   sesion.id,
        alumno_id:   alumno.id,
        peer_id:     peerId || null,
        estado:      'en_progreso',
        iniciado_en: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      // Si ya existe un registro (alumno recargó la página), recuperarlo
      if (error?.code === '23505') {
        // UNIQUE constraint: ya estaba registrado, buscar el ID
        const { data: existente } = await this.supabase.client
          .from('sesion_alumnos')
          .select('id')
          .eq('sesion_id', sesion.id)
          .eq('alumno_id', alumno.id)
          .single();

        if (existente) {
          this.sesionAlumnoId.set(existente.id);
          this.tiempoInicio.set(Date.now());
          await this.cargarPreguntas(sesion.examen_id);
          this.cargando.set(false);
          return true;
        }
      }

      this.error.set('No se pudo registrar en el examen. Intenta de nuevo.');
      console.error('[ExamenActivoService] iniciarExamen:', error);
      this.cargando.set(false);
      return false;
    }

    this.sesionAlumnoId.set(data.id);
    this.tiempoInicio.set(Date.now());

    // Cargar preguntas una vez registrado
    const ok = await this.cargarPreguntas(sesion.examen_id);
    this.cargando.set(false);
    return ok;
  }

  /**
   * Guarda la respuesta de la pregunta actual en el mapa local
   * Y la persiste en Supabase inmediatamente (para no perder datos
   * si el alumno cierra el navegador).
   *
   * @param opcionId         UUID de la opción seleccionada (null si abierta)
   * @param respuestaAbierta Texto si es pregunta abierta (null si múltiple)
   */
  async guardarRespuesta(
    opcionId: string | null,
    respuestaAbierta: string | null = null
  ): Promise<void> {
    const pregunta      = this.preguntaActual();
    const sesionAlumno  = this.sesionAlumnoId();

    if (!pregunta || !sesionAlumno) return;

    const registro: RespuestaLocal = {
      pregunta_id:       pregunta.id,
      opcion_id:         opcionId,
      respuesta_abierta: respuestaAbierta,
      respondido_en:     new Date().toISOString(),
    };

    // Guardar en mapa local (para UI inmediata)
    this.respuestas.update((mapa) => {
      const nuevo = new Map(mapa);
      nuevo.set(pregunta.id, registro);
      return nuevo;
    });

    // Persistir en Supabase (UPSERT por constraint uq_respuesta_por_pregunta)
    const { error } = await this.supabase.client
      .from('respuestas')
      .upsert(
        {
          sesion_alumno_id:  sesionAlumno,
          pregunta_id:       pregunta.id,
          opcion_id:         opcionId,
          respuesta_abierta: respuestaAbierta,
          respondido_en:     registro.respondido_en,
          // es_correcta se calcula aquí para opcion_multiple
          es_correcta: opcionId
            ? (pregunta.opciones.find((o) => o.id === opcionId)?.es_correcta ?? null)
            : null,
        },
        { onConflict: 'sesion_alumno_id,pregunta_id' }
      );

    if (error) {
      // No bloquear al alumno por un error de red en la persistencia
      console.warn('[ExamenActivoService] guardarRespuesta upsert:', error);
    }
  }

  /** Avanza a la siguiente pregunta si existe */
  siguientePregunta(): void {
    const total = this.totalPreguntas();
    const actual = this.indicePreguntaActual();
    if (actual < total - 1) {
      this.indicePreguntaActual.set(actual + 1);
    }
  }

  /** Retrocede a la pregunta anterior si existe */
  preguntaAnterior(): void {
    const actual = this.indicePreguntaActual();
    if (actual > 0) {
      this.indicePreguntaActual.set(actual - 1);
    }
  }

  /** Navega directamente a la pregunta en el índice dado */
  irAPregunta(indice: number): void {
    const total = this.totalPreguntas();
    if (indice >= 0 && indice < total) {
      this.indicePreguntaActual.set(indice);
    }
  }

  /**
   * Envía el examen: calcula el resultado, actualiza sesion_alumnos
   * con las métricas finales y retorna el ResultadoFinal.
   *
   * @param tiempoRestanteSeg Segundos que quedaban en el temporizador
   */
  async enviarExamen(tiempoRestanteSeg: number): Promise<ResultadoFinal | null> {
    const sesionAlumnoId = this.sesionAlumnoId();
    const sesion         = this.sesion();
    const preguntas      = this.preguntas();
    const respuestas     = this.respuestas();
    const tiempoInicio   = this.tiempoInicio();

    if (!sesionAlumnoId || !sesion || !tiempoInicio) return null;

    this.cargando.set(true);

    // ── Calcular métricas ───────────────────────────────────────

    const duracionTotalSeg = sesion.duracion_min * 60;
    const tiempoUsadoSeg   = duracionTotalSeg - tiempoRestanteSeg;

    let totalCorrectas   = 0;
    let totalIncorrectas = 0;
    let totalSinContestar = 0;

    for (const pregunta of preguntas) {
      const respuesta = respuestas.get(pregunta.id);

      if (!respuesta) {
        totalSinContestar++;
        continue;
      }

      if (pregunta.tipo === 'opcion_multiple') {
        const opcionElegida = pregunta.opciones.find(
          (o) => o.id === respuesta.opcion_id
        );
        if (opcionElegida?.es_correcta) {
          totalCorrectas++;
        } else {
          totalIncorrectas++;
        }
      } else {
        // Pregunta abierta: se cuenta como "cumplida" si escribió algo
        if (respuesta.respuesta_abierta?.trim()) {
          totalCorrectas++; // se revisará manualmente por el maestro
        } else {
          totalSinContestar++;
        }
      }
    }

    const totalRespondidas = totalCorrectas + totalIncorrectas;
    const porcentaje       = preguntas.length > 0
      ? Math.round((totalCorrectas / preguntas.length) * 100)
      : 0;
    const segundosPromedio = totalRespondidas > 0
      ? Math.round(tiempoUsadoSeg / totalRespondidas)
      : 0;

    // ── Actualizar sesion_alumnos ────────────────────────────────

    const { error: updateError } = await this.supabase.client
      .from('sesion_alumnos')
      .update({
        estado:             'enviado',
        enviado_en:         new Date().toISOString(),
        tiempo_usado_min:   Math.ceil(tiempoUsadoSeg / 60),
        porcentaje:         porcentaje,
        total_correctas:    totalCorrectas,
        total_incorrectas:  totalIncorrectas,
      })
      .eq('id', sesionAlumnoId);

    if (updateError) {
      console.error('[ExamenActivoService] enviarExamen - update sesion_alumno:', updateError);
    }

    // ── Construir resultado final ────────────────────────────────

    const resultado: ResultadoFinal = {
      porcentaje,
      total_correctas:    totalCorrectas,
      total_incorrectas:  totalIncorrectas,
      total_sin_contestar: totalSinContestar,
      tiempo_usado_seg:   tiempoUsadoSeg,
      segundos_promedio:  segundosPromedio,
      sesion_alumno_id:   sesionAlumnoId,
    };

    this.resultadoFinal.set(resultado);
    this.cargando.set(false);
    return resultado;
  }

  /** Limpia todo el estado (llamar al salir de la ruta) */
  reset(): void {
    this.sesion.set(null);
    this.alumno.set(null);
    this.listaAlumnos.set([]);
    this.preguntas.set([]);
    this.indicePreguntaActual.set(0);
    this.respuestas.set(new Map());
    this.sesionAlumnoId.set(null);
    this.tiempoInicio.set(null);
    this.resultadoFinal.set(null);
    this.error.set(null);
  }
}