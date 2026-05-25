import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventService } from '../../../core/services/event.service';
import { UserStore } from '../../../core/stores/user.store';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="page-header">
      <div class="page-header__title">
        <span class="eyebrow">Operação</span>
        <h1>Gestão de eventos</h1>
        <p class="subtitle">Controle de montagens sincronizado com a Ordem de Serviço.</p>
      </div>
      <div class="page-header__right">
        <button class="btn-primary" (click)="router.navigate(['/ordens'])">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo planejamento (OS)
        </button>
      </div>
    </header>

    <div class="filter-tabs">
      <button [class.is-active]="filter === 'ALL'" (click)="filter = 'ALL'">
        Todos <span class="count tnum">{{ events().length }}</span>
      </button>
      <button [class.is-active]="filter === 'DRAFT'" (click)="filter = 'DRAFT'">
        Rascunhos <span class="count tnum">{{ countByStatus('DRAFT') }}</span>
      </button>
      <button [class.is-active]="filter === 'ACTIVE'" (click)="filter = 'ACTIVE'">
        No Galpão <span class="count tnum">{{ countByStatus('ACTIVE') }}</span>
      </button>
      <button [class.is-active]="filter === 'READY'" (click)="filter = 'READY'">
        Aprovados <span class="count tnum">{{ countByStatus('READY') }}</span>
      </button>
    </div>

    <main class="list-main">
      <div class="card no-padding">
        <table class="data-table data-table--full">
          <thead>
            <tr>
              <th class="col-status"></th>
              <th>Evento / projeto</th>
              <th>Status Atual</th>
              <th class="col-date">Data início</th>
              <th>Local</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let event of filteredEvents()" (click)="abrirEdicao(event)" class="row-clickable">
              <td class="col-status">
                <span class="status-dot" [ngClass]="event.status.toLowerCase()"></span>
              </td>
              <td>
                <div class="td-strong">{{ event.name }}</div>
                <div class="td-sub">{{ event['description'] || 'Sem fornecedor definido' }}</div>
              </td>
              <td>
                <span class="badge" [ngClass]="badgeClass(event.status)">{{ statusLabel(event.status) }}</span>
              </td>
              <td class="col-date mono">{{ event.startDate | date:'dd/MM/yyyy' }}</td>
              <td class="td-muted">{{ formatAddress(event) }}</td>
              <td class="col-actions">
                <button class="btn-icon" (click)="abrirEdicao(event); $event.stopPropagation()" title="Editar Evento">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="filteredEvents().length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3>Nenhum evento encontrado</h3>
          <p>Não há registros para este filtro.</p>
        </div>
      </div>
    </main>

    <div *ngIf="editForm" class="modal-overlay" (click)="editForm = null">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal__head">
          <div>
            <span class="modal__eyebrow">Editar registro</span>
            <h3>{{ editForm.name }}</h3>
          </div>
          <button class="btn-close" (click)="editForm = null" aria-label="Fechar">✕</button>
        </header>

        <div class="modal__body">
          <div class="field">
            <label>Nome do evento / projeto</label>
            <input [(ngModel)]="editForm.name" />
          </div>

          <div class="field-grid">
            <div class="field">
              <label>Status Operacional</label>
              
              <select [(ngModel)]="editForm.status" [disabled]="!podeEditarStatus()">
                <option value="DRAFT">Rascunho / Planeamento</option>
                <option value="ACTIVE">Ativo / No Galpão</option>
                <option value="PENDING">Pendente / Devolvido</option>
                <option value="READY">Aprovado / Finalizado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>

              <small *ngIf="!podeEditarStatus()" style="font-size: 10px; color: var(--status-danger); margin-top: 4px;">
                O seu cargo não permite alterar o status.
              </small>
            </div>
            
            <div class="field">
              <label>Data início</label>
              <input type="date"
                [ngModel]="editForm.startDate | date:'yyyy-MM-dd'"
                (ngModelChange)="editForm.startDate=$event" />
            </div>
          </div>
        </div>

        <footer class="modal__foot">
          <button class="btn-secondary" (click)="editForm = null">Cancelar</button>
          <button class="btn-primary" (click)="salvarAlteracoes()">Guardar Alterações</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .page-header__title h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-strong); margin: 0; }
    .page-header__title .subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
    .eyebrow { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 3px; }
    .page-header__right { display: flex; gap: 8px; }
    .btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-primary svg, .btn-secondary svg { width: 14px; height: 14px; }
    .btn-primary { background: var(--vivere-orange); color: white; border: 1px solid var(--vivere-orange); }
    .btn-primary:hover { background: var(--vivere-orange-hover); border-color: var(--vivere-orange-hover); }
    .btn-secondary { background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); }
    .btn-secondary:hover { border-color: var(--border-strong); background: var(--surface-hover); }
    .filter-tabs { display: flex; gap: 0; padding: 0 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .filter-tabs button { display: inline-flex; align-items: center; gap: 8px; padding: 12px 14px; background: transparent; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 13px; font-weight: 500; color: var(--text-tertiary); cursor: pointer; transition: color var(--duration) var(--ease), border-color var(--duration) var(--ease); }
    .filter-tabs button:hover { color: var(--text-primary); }
    .filter-tabs button.is-active { color: var(--text-strong); border-bottom-color: var(--vivere-orange); }
    .count { padding: 1px 6px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 10px; font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); }
    .filter-tabs button.is-active .count { background: var(--vivere-orange-soft); color: var(--vivere-orange); border-color: var(--vivere-orange-border); }
    .list-main { padding: 20px 28px 28px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
    .card.no-padding { padding: 0; overflow: hidden; }
    .data-table--full { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table--full th { padding: 10px 14px; background: var(--surface-sunken); text-align: left; font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-tertiary); border-bottom: 1px solid var(--border); }
    .data-table--full td { padding: 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); vertical-align: middle; }
    .data-table--full tbody tr.row-clickable { cursor: pointer; transition: background var(--duration) var(--ease); }
    .data-table--full tbody tr:hover { background: var(--surface-hover); }
    .col-status { width: 32px; padding-left: 18px !important; }
    .col-date { white-space: nowrap; color: var(--text-secondary); }
    .col-actions { width: 50px; text-align: right; padding-right: 18px !important; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
    .status-dot.draft { background: var(--text-secondary); }
    .status-dot.pending { background: var(--status-warning); box-shadow: 0 0 0 3px var(--status-warning-bg); }
    .status-dot.active { background: var(--status-info); box-shadow: 0 0 0 3px var(--status-info-bg); }
    .status-dot.ready { background: var(--status-success); box-shadow: 0 0 0 3px var(--status-success-bg); }
    .status-dot.cancelled { background: var(--status-danger); box-shadow: 0 0 0 3px var(--status-danger-bg); }
    .td-strong { font-weight: 500; color: var(--text-primary); }
    .td-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-muted { color: var(--text-tertiary); }
    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12.5px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; border-radius: var(--radius-sm); border: 1px solid; }
    .badge.draft { color: var(--text-secondary); background: var(--surface-hover); border-color: var(--border-strong); }
    .badge.active { color: var(--status-info); background: var(--status-info-bg); border-color: var(--status-info-border); }
    .badge.pending { color: var(--status-warning); background: var(--status-warning-bg); border-color: var(--status-warning-border); }
    .badge.ready { color: var(--status-success); background: var(--status-success-bg); border-color: var(--status-success-border); }
    .badge.cancelled { color: var(--status-danger); background: var(--status-danger-bg); border-color: var(--status-danger-border); }
    .btn-icon { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-icon svg { width: 14px; height: 14px; }
    .btn-icon:hover { background: var(--surface-sunken); border-color: var(--border); color: var(--text-primary); }
    .empty-state { padding: 80px 20px; text-align: center; color: var(--text-tertiary); }
    .empty-state svg { width: 36px; height: 36px; color: var(--text-muted); padding: 12px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 50%; box-sizing: content-box; margin: 0 auto 14px; display: block; }
    .empty-state h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .empty-state p { margin: 0; font-size: 13px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,15,15,0.55); display: flex; align-items: center; justify-content: center; z-index: 3000; backdrop-filter: blur(2px); animation: fadeIn 150ms var(--ease); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal { width: 560px; max-width: calc(100% - 40px); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); display: flex; flex-direction: column; animation: scaleIn 150ms var(--ease); }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    .modal__head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; }
    .modal__eyebrow { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--vivere-orange); margin-bottom: 4px; }
    .modal__head h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-strong); }
    .btn-close { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-close:hover { background: var(--surface-sunken); color: var(--text-primary); border-color: var(--border); }
    .modal__body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-secondary); }
    .field input, .field select, .field textarea { padding: 9px 11px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 13.5px; color: var(--text-primary); transition: border-color var(--duration) var(--ease); }
    .field input:focus, .field select:focus { outline: none; border-color: var(--vivere-orange); box-shadow: 0 0 0 3px rgba(255,102,0,0.12); }
    .field input:disabled, .field select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal__foot { padding: 14px 22px; border-top: 1px solid var(--border); background: var(--surface-sunken); display: flex; justify-content: flex-end; gap: 8px; }
  `]
})
export class EventListComponent implements OnInit {
  private eventService = inject(EventService);
  private toastService = inject(ToastService);
  public userStore = inject(UserStore); // INJEÇÃO PARA VERIFICAR CARGO
  public router = inject(Router);
  private destroyRef = inject(DestroyRef);

  filter = 'ALL';
  events = signal<any[]>([]);
  editForm: any | null = null; 
  originalStatus = '';

  ngOnInit() { this.loadEvents(); }

  loadEvents() {
    this.eventService.getEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.events.set(data),
        error: (err) => this.toastService.error('Falha ao carregar eventos.')
      });
  }

  filteredEvents() {
    if (this.filter === 'ALL') return this.events();
    return this.events().filter(e => e.status === this.filter);
  }

  countByStatus(status: string): number {
    return this.events().filter(e => e.status === status).length;
  }

  statusLabel(status: string): string {
    return ({
      'DRAFT': 'Rascunho (OS)',
      'ACTIVE': 'No Galpão',
      'PENDING': 'Pendente',
      'READY': 'Aprovado',
      'CANCELLED': 'Cancelado'
    } as Record<string, string>)[status] || status;
  }

  badgeClass(status: string): string {
    return status?.toLowerCase() || '';
  }

  formatAddress(event: any): string {
    if (event.address?.city) {
      return event.address.state ? `${event.address.city} - ${event.address.state}` : event.address.city;
    }
    return '—';
  }

  // Lógica de Permissão
  podeEditarStatus(): boolean {
    const role = this.userStore.currentUser()?.role;
    return role === 'ADMIN' || role === 'PRODUCAO';
  }

  abrirEdicao(event: any) {
    this.editForm = { ...event };
    this.originalStatus = event.status; // Guardamos para saber se foi alterado
  }

  salvarAlteracoes() {
    if (!this.editForm || !this.editForm.id) return;

    let startStr = this.editForm.startDate as string;
    if (!startStr.includes('T')) startStr += 'T12:00:00';

    // 1. Prepara a atualização de Nome e Data (Vai para a Rota de OS usando o osId)
    const payloadLimpo = {
      eventName: this.editForm.name,
      startDate: new Date(startStr).toISOString()
    };

    // Dispara a primeira chamada...
    this.eventService.updateEvent(this.editForm.osId, payloadLimpo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // 2. Se o utilizador mexeu no status, fazemos a segunda chamada em sequência
          if (this.editForm.status !== this.originalStatus) {
            this.eventService.updateEventStatus(this.editForm.id, this.editForm.status)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => {
                  this.toastService.success('Evento e Status alterados!');
                  this.finalizarSalvamento();
                },
                error: (err) => this.toastService.error('Erro ao atualizar status: ' + err.error?.message)
              });
          } else {
            this.toastService.success('Dados atualizados com sucesso!');
            this.finalizarSalvamento();
          }
        },
        error: (err: any) => this.toastService.error('❌ Erro ao salvar dados: ' + (err.error?.message || err.message))
      });
  }

  finalizarSalvamento() {
    this.editForm = null;
    this.loadEvents();
  }
}