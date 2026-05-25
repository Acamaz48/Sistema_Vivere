import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface VivereEvent {
  id?: string;
  osId?: string; // NOVO: Fundamental para saber qual a OS dona deste evento
  name: string;
  startDate: string;
  endDate?: string;
  latitude: number;
  longitude: number;
  local?: string;
  status: string;
  description: string;
  address?: any;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private http = inject(HttpClient);
  
  private osUrl = 'http://localhost:8081/service-orders'; 
  private eventsUrl = 'http://localhost:8081/events'; // NOVO: Rota direta de status

  getEvents(): Observable<VivereEvent[]> {
    return this.http.get<any[]>(this.osUrl).pipe(
      map(orders => orders.map(os => ({
        ...os.event,
        osId: os.id, // Mapeamos o ID da Ordem de Serviço
        status: os.event.status || os.status, 
        description: os.supplier || 'Sem fornecedor definido'
      })))
    );
  }

  updateEvent(osId: string, event: any): Observable<any> {
    return this.http.put(`${this.osUrl}/${osId}`, event);
  }

  // NOVO: Chama o back-end para alterar exclusivamente o Status do Evento
  updateEventStatus(eventId: string, status: string): Observable<any> {
    return this.http.patch(`${this.eventsUrl}/${eventId}/status`, { status });
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.osUrl}/${id}`);
  }
}