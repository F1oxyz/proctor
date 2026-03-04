/**
 * peer.service.ts
 * ─────────────────────────────────────────────────────────────────
 * Servicio SINGLETON en core/ que gestiona toda la lógica WebRTC
 * mediante PeerJS para la transmisión de pantallas en tiempo real.
 *
 * ARQUITECTURA:
 *  - providedIn: 'root' → instancia única para toda la app.
 *  - El DOCENTE usa PeerService en modo "receptor":
 *      inicializarComoReceptor() → crea un Peer con ID conocido
 *      y escucha conexiones entrantes de alumnos.
 *  - El ALUMNO usa PeerService en modo "emisor":
 *      conectarAlDocente(stream, peerId) → llama al peer del docente
 *      y le envía su MediaStream de pantalla.
 *
 * FLUJO COMPLETO:
 *  1. Docente abre Monitor → llama inicializarComoReceptor(sesionId)
 *     Su peer ID = "proctor-{sesionId}" (predecible para los alumnos)
 *  2. Alumno en SalaEspera → llama conectarAlDocente(stream, peerIdDocente)
 *     PeerJS establece la conexión WebRTC peer-to-peer
 *  3. Docente recibe la llamada → emite el stream al AlumnoTileComponent
 *     via el signal streamsPorAlumno
 *
 * RNF-01 (Latencia): video configurado a máximo 10fps y 720p
 * RNF-02 (Sin grabación): el stream nunca se persiste, solo se muestra
 *
 * INSTALACIÓN:
 *   npm install peerjs
 *   (PeerJS usa un servidor de señalización gratuito por defecto;
 *    para producción se puede usar el servidor propio o el de PeerJS)
 * ─────────────────────────────────────────────────────────────────
 */

import { Injectable, signal } from '@angular/core';

/**
 * Lazy import de PeerJS para no bloquear el bundle inicial.
 * Se importa dinámicamente solo cuando se necesita WebRTC.
 */
type PeerInstance   = import('peerjs').Peer;
type MediaConnection = import('peerjs').MediaConnection;

/** Estado de un stream recibido de un alumno */
export interface StreamAlumno {
  /** peer_id del alumno (guardado en sesion_alumnos) */
  peerId: string;
  /** UUID del alumno (para cruzar con la lista de sesion_alumnos) */
  alumnoId: string;
  /** Stream de video recibido via WebRTC */
  stream: MediaStream;
  /** Objeto de conexión PeerJS (para cerrarlo al finalizar) */
  conexion: MediaConnection;
}

@Injectable({ providedIn: 'root' })
export class PeerService {
  // ── Estado ───────────────────────────────────────────────────────

  /** Instancia activa de PeerJS */
  private peer: PeerInstance | null = null;

  /** Mapa de streams recibidos: alumnoId → StreamAlumno */
  readonly streamsPorAlumno = signal<Map<string, StreamAlumno>>(new Map());

  /** ID de este peer (del docente) */
  readonly miPeerId = signal<string | null>(null);

  /** true mientras PeerJS está inicializando */
  readonly inicializando = signal(false);

  /** true si PeerJS está listo para recibir/enviar */
  readonly listo = signal(false);

  /** Mensaje de error de PeerJS */
  readonly error = signal<string | null>(null);

  // ── Modo DOCENTE (receptor) ──────────────────────────────────────

  /**
   * Inicializa el peer del docente como receptor de streams.
   * El peer ID es determinístico: "proctor-{sesionId}" para que
   * los alumnos puedan conectarse sin intercambio previo de IDs.
   *
   * @param sesionId UUID de la sesión activa
   */
  async inicializarComoReceptor(sesionId: string): Promise<void> {
    // Limpiar instancia anterior si existe
    this.destruir();

    this.inicializando.set(true);
    this.error.set(null);

    try {
      // Import dinámico de PeerJS (evita errores SSR y reduce bundle inicial)
      const { Peer } = await import('peerjs');

      // ID predecible basado en la sesión
      const peerId = `proctor-${sesionId.slice(0, 8)}`;

      this.peer = new Peer(peerId, {
        // Configuración para reducir latencia (RNF-01)
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
        debug: 0, // Sin logs en producción
      });

      // ── Eventos del peer docente ─────────────────────────────────

      this.peer.on('open', (id) => {
        this.miPeerId.set(id);
        this.inicializando.set(false);
        this.listo.set(true);
        console.log(`[PeerService] Receptor listo. ID: ${id}`);
      });

      this.peer.on('error', (err) => {
        // Si el ID ya está en uso (otro docente con misma sesión), reintentar sin ID fijo
        if (err.type === 'unavailable-id') {
          console.warn('[PeerService] ID ocupado, reintentando sin ID fijo...');
          this.peer?.destroy();
          this.inicializarComoReceptorSinId();
        } else {
          this.error.set(`Error de conexión WebRTC: ${err.message}`);
          this.inicializando.set(false);
          console.error('[PeerService] Error Peer:', err);
        }
      });

      // Escuchar llamadas entrantes de alumnos
      this.peer.on('call', (llamada: MediaConnection) => {
        this.manejarLlamadaEntrante(llamada);
      });

      this.peer.on('disconnected', () => {
        console.warn('[PeerService] Peer desconectado. Reconectando...');
        this.peer?.reconnect();
      });

    } catch (err) {
      this.error.set('No se pudo inicializar la transmisión de pantalla.');
      this.inicializando.set(false);
      console.error('[PeerService] inicializarComoReceptor:', err);
    }
  }

  /**
   * Fallback: inicializa receptor sin ID fijo cuando el ID predecible
   * ya está en uso. PeerJS asigna un ID aleatorio.
   */
  private async inicializarComoReceptorSinId(): Promise<void> {
    const { Peer } = await import('peerjs');
    this.peer = new Peer({
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    this.peer.on('open', (id) => {
      this.miPeerId.set(id);
      this.listo.set(true);
    });

    this.peer.on('call', (llamada: MediaConnection) => {
      this.manejarLlamadaEntrante(llamada);
    });
  }

  /**
   * Maneja una llamada entrante de un alumno.
   * Responde con null (el docente no envía video, solo recibe).
   * Extrae el alumnoId del metadata de la llamada.
   *
   * @param llamada Objeto MediaConnection de PeerJS
   */
  private manejarLlamadaEntrante(llamada: MediaConnection): void {
    // Responder sin stream (docente no envía video)
    llamada.answer();

    llamada.on('stream', (streamRemoto: MediaStream) => {
      // metadata.alumnoId lo envía el alumno al hacer la llamada
      const alumnoId: string = llamada.metadata?.alumnoId ?? llamada.peer;

      const entrada: StreamAlumno = {
        peerId:  llamada.peer,
        alumnoId,
        stream:  streamRemoto,
        conexion: llamada,
      };

      // Agregar o reemplazar el stream del alumno en el mapa
      this.streamsPorAlumno.update((mapa) => {
        const nuevo = new Map(mapa);
        nuevo.set(alumnoId, entrada);
        return nuevo;
      });

      console.log(`[PeerService] Stream recibido de alumno: ${alumnoId}`);
    });

    llamada.on('close', () => {
      // Alumno cerró la conexión → remover su tile
      const alumnoId: string = llamada.metadata?.alumnoId ?? llamada.peer;
      this.streamsPorAlumno.update((mapa) => {
        const nuevo = new Map(mapa);
        nuevo.delete(alumnoId);
        return nuevo;
      });
      console.log(`[PeerService] Alumno desconectado: ${alumnoId}`);
    });

    llamada.on('error', (err) => {
      console.error('[PeerService] Error en llamada:', err);
    });
  }

  // ── Modo ALUMNO (emisor) ─────────────────────────────────────────

  /**
   * Inicializa el peer del alumno y llama al docente para enviarle
   * el stream de pantalla capturado.
   *
   * @param stream     MediaStream de getDisplayMedia() (pantalla del alumno)
   * @param alumnoId   UUID del alumno (para identificación en el monitor)
   * @param sesionId   UUID de la sesión (para construir el peer ID del docente)
   * @returns El peer ID del alumno (se guarda en sesion_alumnos.peer_id)
   */
  async conectarAlDocente(
    stream: MediaStream,
    alumnoId: string,
    sesionId: string
  ): Promise<string | null> {
    try {
      const { Peer } = await import('peerjs');

      // Peer del alumno con ID único
      const peerIdAlumno = `alumno-${alumnoId.slice(0, 8)}-${Date.now()}`;

      this.peer = new Peer(peerIdAlumno, {
        config: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      });

      return new Promise<string | null>((resolve) => {
        this.peer!.on('open', (idGenerado) => {
          this.miPeerId.set(idGenerado);

          // Construir el peer ID del docente (mismo formato que inicializarComoReceptor)
          const peerIdDocente = `proctor-${sesionId.slice(0, 8)}`;

          // Hacer la llamada al docente con metadata
          const llamada = this.peer!.call(peerIdDocente, stream, {
            metadata: { alumnoId },
          });

          if (!llamada) {
            console.error('[PeerService] No se pudo iniciar la llamada al docente.');
            resolve(null);
            return;
          }

          llamada.on('error', (err) => {
            console.error('[PeerService] Error al llamar al docente:', err);
          });

          // Manejar desconexión del stream por parte del alumno
          stream.getVideoTracks()[0]?.addEventListener('ended', () => {
            llamada.close();
          });

          console.log(`[PeerService] Alumno ${idGenerado} conectando a ${peerIdDocente}`);
          resolve(idGenerado);
        });

        this.peer!.on('error', (err) => {
          console.error('[PeerService] Error peer alumno:', err);
          resolve(null);
        });
      });

    } catch (err) {
      console.error('[PeerService] conectarAlDocente:', err);
      return null;
    }
  }

  // ── Utilidades ───────────────────────────────────────────────────

  /**
   * Cierra todas las conexiones y destruye la instancia de PeerJS.
   * Llamar en ngOnDestroy del MonitorComponent o al finalizar la sesión.
   */
  destruir(): void {
    if (this.peer) {
      // Cerrar todos los streams activos
      this.streamsPorAlumno().forEach((entrada) => {
        entrada.conexion.close();
        entrada.stream.getTracks().forEach((t) => t.stop());
      });

      this.peer.destroy();
      this.peer = null;
    }

    // Resetear signals
    this.streamsPorAlumno.set(new Map());
    this.miPeerId.set(null);
    this.listo.set(false);
    this.inicializando.set(false);
    this.error.set(null);
  }

  /**
   * Cierra la conexión de un alumno específico desde el monitor.
   * @param alumnoId UUID del alumno a desconectar
   */
  cerrarConexionAlumno(alumnoId: string): void {
    const entrada = this.streamsPorAlumno().get(alumnoId);
    if (entrada) {
      entrada.conexion.close();
      entrada.stream.getTracks().forEach((t) => t.stop());
      this.streamsPorAlumno.update((mapa) => {
        const nuevo = new Map(mapa);
        nuevo.delete(alumnoId);
        return nuevo;
      });
    }
  }
}