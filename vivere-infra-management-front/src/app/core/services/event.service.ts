import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface VivereEvent {
  id?: string;
  osId?: string;
  name: string;
  startDate: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  local?: string;
  status: string;
  description: string;
  supplier?: string;
  address?: any;
  items?: any[];
  producer?: any;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);

  private osUrl     = 'http://localhost:8081/service-orders';
  private eventsUrl = 'http://localhost:8081/events';

  getEvents(): Observable<VivereEvent[]> {
    return this.http.get<any[]>(this.osUrl).pipe(
      map(orders => orders.map(os => ({
        ...os.event,
        osId:        os.id,
        // ─────────────────────────────────────────────────────────────
        // Lógica de status combinada:
        //
        //  1. READY sempre vence (OS foi finalizada, evento virou ACTIVE)
        //  2. Se o event.status foi manualmente alterado para algo diferente
        //     de PENDING (valor default de criação do backend), usa-o —
        //     isso mantém as edições do modal funcionando
        //  3. Caso contrário, usa o os.status (DRAFT quando recém-criada,
        //     ACTIVE ou PENDING quando em fluxo no galpão)
        // ─────────────────────────────────────────────────────────────
        status: computarStatus(os.status, os.event?.status),
        description: os.supplier || 'Sem fornecedor definido',
        supplier:    os.supplier,
        items:       os.items  || [],
        producer:    os.user   || null
      })))
    );
  }

  updateEvent(osId: string, event: any): Observable<any> {
    return this.http.put(`${this.osUrl}/${osId}`, event);
  }

  updateEventStatus(eventId: string, status: string): Observable<any> {
    return this.http.patch(`${this.eventsUrl}/${eventId}/status`, { status });
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.osUrl}/${id}`);
  }
}

/**
 * Determina o status visível de um evento a partir de duas fontes:
 *   osStatus    — status da Ordem de Serviço (DRAFT / ACTIVE / PENDING / READY)
 *   eventStatus — status do evento em si, editável manualmente
 *
 * Regras de prioridade (da mais alta para a mais baixa):
 *   1. READY   → OS finalizada; sempre exibe READY
 *   2. eventStatus diferente de PENDING → editado manualmente; usa esse valor
 *   3. osStatus → estado real do fluxo (ex: DRAFT quando recém-criada)
 */
function computarStatus(osStatus: string, eventStatus?: string): string {
  if (osStatus === 'READY') return 'READY';
  if (eventStatus && eventStatus !== 'PENDING') return eventStatus;
  return osStatus || 'DRAFT';
}