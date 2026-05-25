import { Component, signal, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-operational-units',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="page-header">
      <div class="page-header__title">
        <span class="eyebrow">Administração</span>
        <h1>Gestão de Unidades (Galpões)</h1>
        <p class="subtitle">Controle os galpões de estoque e pontos de distribuição.</p>
      </div>
      <div class="page-header__right">
        <button class="btn-primary" (click)="abrirModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Nova Unidade
        </button>
      </div>
    </header>

    <main class="admin-main">
      <article class="card no-padding">
        <table class="data-table data-table--full">
          <thead>
            <tr>
              <th>Nome da Unidade</th>
              <th>Status</th>
              <th class="cell-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let unit of units()">
              <td>
                <div class="td-strong">{{ unit.name }}</div>
              </td>
              <td><span class="status-dot completed" title="Ativo"></span> Ativo</td>
              <td class="cell-center">
                <button class="btn-icon" (click)="abrirConfirmacaoExclusao(unit.id)" title="Remover">🗑️</button>
              </td>
            </tr>
            <tr *ngIf="isLoading()">
              <td colspan="3" style="text-align: center; padding: 30px; color: #888;">Carregando unidades do servidor...</td>
            </tr>
            <tr *ngIf="!isLoading() && units().length === 0">
              <td colspan="3" style="text-align: center; padding: 30px; color: #888;">Nenhuma unidade cadastrada no sistema.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </main>

    <div *ngIf="showModal" class="modal-overlay" (click)="fecharModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal__head">
          <div>
            <span class="modal__eyebrow">Logística</span>
            <h3>Cadastrar Novo Galpão</h3>
          </div>
          <button class="btn-close" (click)="fecharModal()">✕</button>
        </header>

        <div class="modal__body">
          <div class="field">
            <label>Nome do Galpão</label>
            <input [(ngModel)]="formData.name" placeholder="Ex: Galpão Principal Norte" [disabled]="isSaving()" />
          </div>
        </div>

        <footer class="modal__foot">
          <button class="btn-secondary" (click)="fecharModal()" [disabled]="isSaving()">Cancelar</button>
          <button class="btn-primary" (click)="salvarUnidade()" [disabled]="isSaving() || !formData.name">
            {{ isSaving() ? 'Processando...' : 'Criar Galpão' }}
          </button>
        </footer>
      </div>
    </div>

    <div *ngIf="confirmarId" class="modal-overlay" (click)="confirmarId = null">
      <div class="modal modal--small" (click)="$event.stopPropagation()">
        <div class="modal__body" style="text-align: center; padding: 32px 24px;">
          <div class="icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h3 style="margin: 16px 0 8px; font-size: 18px; color: var(--text-strong);">Excluir unidade?</h3>
          <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
            Esta ação não pode ser desfeita. Todos os dados associados a este galpão poderão ser afetados.
          </p>
        </div>
        <footer class="modal__foot" style="justify-content: center; background: transparent; border-top: none; padding-bottom: 24px;">
          <button class="btn-secondary" (click)="confirmarId = null">Cancelar</button>
          <button class="btn-primary btn--danger" (click)="deletarUnidade()">Sim, excluir</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .eyebrow { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 3px; }
    .page-header__title h1 { font-size: 18px; font-weight: 700; margin: 0; }
    .page-header__title .subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
    .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; background: var(--vivere-orange); color: white; border: 1px solid var(--vivere-orange); }
    .btn-primary:disabled { background: var(--surface-sunken); color: var(--text-muted); border-color: var(--border); cursor: not-allowed; }
    .btn-primary svg { width: 16px; height: 16px; }
    .btn-secondary { padding: 8px 13px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; background: var(--surface); border: 1px solid var(--border); }
    .btn--danger { background: var(--status-danger); border-color: var(--status-danger); }
    .btn--danger:hover { background: #b91c1c; border-color: #b91c1c; }
    .admin-main { padding: 20px 28px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
    .card.no-padding { padding: 0; overflow: hidden; }
    .data-table--full { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table--full th { padding: 10px 14px; background: var(--surface-sunken); text-align: left; font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); border-bottom: 1px solid var(--border); }
    .data-table--full td { padding: 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
    .td-strong { font-weight: 600; color: var(--text-primary); }
    .cell-center { text-align: center; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px;}
    .status-dot.completed { background: var(--status-success); box-shadow: 0 0 0 3px var(--status-success-bg); }
    .btn-icon { background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px; border-radius: 4px; }
    .btn-icon:hover { background: var(--surface-hover); }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3000; }
    .modal { width: 400px; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); display: flex; flex-direction: column; }
    .modal--small { width: 360px; }
    .modal__head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; }
    .modal__eyebrow { font-size: 10.5px; font-weight: 600; color: var(--vivere-orange); display: block; margin-bottom: 4px; }
    .modal__head h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .btn-close { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--text-tertiary); }
    .modal__body { padding: 20px 22px; display: flex; flex-direction: column; gap: 15px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
    .field input { padding: 10px; border: 1px solid var(--border); border-radius: 4px; outline: none; }
    .field input:focus { border-color: var(--vivere-orange); }
    .field input:disabled { background: #f1f5f9; color: #94a3b8; }
    .modal__foot { padding: 15px 22px; background: var(--surface-sunken); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 10px; }
    
    .icon-warning { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: var(--status-warning-bg); color: var(--status-warning); margin: 0 auto; }
    .icon-warning svg { width: 24px; height: 24px; }
  `]
})
export class OperationalUnitsComponent implements OnInit {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService); // INJEÇÃO DO TOAST

  units = signal<any[]>([]);
  showModal = false;
  isLoading = signal(true);
  isSaving = signal(false);
  
  confirmarId: string | null = null; // Controle da modal de exclusão
  
  formData = { name: '' };
  private apiUrl = 'http://localhost:8081/operational-units';

  ngOnInit() {
    this.carregarUnidades();
  }

  carregarUnidades() {
    this.isLoading.set(true);
    this.http.get<any[]>(this.apiUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.units.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastService.error('Falha ao buscar unidades.');
          this.isLoading.set(false);
        }
      });
  }

  abrirModal() {
    this.formData = { name: '' };
    this.showModal = true;
  }

  fecharModal() {
    this.showModal = false;
  }

  salvarUnidade() {
    if (!this.formData.name) {
      this.toastService.warning('Preencha o nome do galpão.');
      return;
    }
    this.isSaving.set(true);

    this.http.post(this.apiUrl, this.formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Galpão criado com sucesso!');
          this.carregarUnidades();
          this.fecharModal();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Falha ao salvar galpão');
          this.isSaving.set(false);
        }
      });
  }

  abrirConfirmacaoExclusao(id: string) {
    this.confirmarId = id;
  }

  deletarUnidade() {
    if (!this.confirmarId) return;

    this.http.delete(`${this.apiUrl}/${this.confirmarId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Unidade removida com sucesso!');
          this.confirmarId = null;
          this.carregarUnidades();
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erro ao excluir unidade. Pode haver itens vinculados.');
          this.confirmarId = null;
        }
      });
  }
}