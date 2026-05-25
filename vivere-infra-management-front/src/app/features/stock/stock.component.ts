import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialService } from '../../core/services/material.service';
import { ToastService } from '../../core/services/toast.service';
import { Material, Structure, CreateMaterialPayload, CreateStructurePayload } from '../../shared/models/material.model';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="page-header">
      <div class="page-header__title">
        <span class="eyebrow">Inventário</span>
        <h1>Estoque e estruturas</h1>
        <p class="subtitle">Inventário global e gabaritos de composição.</p>
      </div>
      <div class="page-header__right">
        <button class="btn-primary" (click)="tab === 'inventario' ? showMaterialModal = true : abrirModalEstrutura()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ tab === 'inventario' ? 'Novo material' : 'Nova estrutura' }}
        </button>
      </div>
    </header>

    <div class="filter-tabs">
      <button [class.is-active]="tab === 'inventario'" (click)="tab = 'inventario'">
        Inventário global <span class="count tnum">{{ materiais().length }}</span>
      </button>
      <button [class.is-active]="tab === 'gabarito'" (click)="tab = 'gabarito'">
        Gabaritos de estruturas <span class="count tnum">{{ estruturas().length }}</span>
      </button>
    </div>

    <main class="stock-main">
      <div *ngIf="tab === 'inventario'">
        <article class="card no-padding">
          <header class="card__head">
            <span class="card__title">Materiais no Banco de Dados</span>
          </header>

          <table class="data-table data-table--full">
            <thead>
              <tr>
                <th style="text-align: left;">Material</th>
                <th style="text-align: center;">Unidade</th>
                <th style="text-align: center;">Total</th>
                <th style="text-align: left;">Categoria</th>
                <th style="text-align: left;">Status</th>
                <th style="text-align: center; width: 60px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="isLoading()">
                <td colspan="6" style="text-align:center; padding: 40px; color: #888;">A carregar dados do inventário...</td>
              </tr>
              <tr *ngFor="let item of materiais()">
                <td style="text-align: left;">
                  <div class="td-strong">{{ item.name }}</div>
                </td>
                <td style="text-align: center;" class="mono">UN</td>
                <td style="text-align: center;" class="mono">{{ item.stock }}</td>
                <td style="text-align: left;">{{ item.category?.name || 'Geral' }}</td>
                <td style="text-align: left;">
                  <span class="badge" [ngClass]="item.stock < 10 ? 'badge--danger' : 'badge--success'">
                    {{ item.stock < 10 ? 'Estoque baixo' : 'Estável' }}
                  </span>
                </td>
                <td style="text-align: center;">
                  <button class="btn-icon" (click)="abrirConfirmacao('material', item.id)" title="Remover Material">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="!isLoading() && materiais().length === 0">
                <td colspan="6" style="text-align:center; padding: 40px; color: #888;">Nenhum material cadastrado. Clique em "Novo material".</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>

      <div *ngIf="tab === 'gabarito'" class="gabarito-grid">
        <aside class="gabarito-sidebar card">
          <header class="card__head">
            <span class="card__title">Selecione o gabarito</span>
          </header>
          <div class="gabarito-list">
            <div *ngIf="isLoading()" style="padding: 15px; text-align: center; color: #888; font-size: 12px;">A carregar...</div>
            
            <button *ngFor="let est of estruturas()"
                    class="gabarito-item"
                    [class.is-selected]="estSelecionada?.id === est.id"
                    (click)="estSelecionada = est">
              <div class="gabarito-item__id mono" style="background: transparent; border: none; padding: 0; font-size: 16px;">📦</div>
              <div class="gabarito-item__name">{{ est.name }}</div>
              <svg class="gabarito-item__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <button class="gabarito-item gabarito-item--add" (click)="abrirModalEstrutura()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Nova estrutura</span>
            </button>
          </div>
        </aside>

        <article class="card gabarito-detail" *ngIf="estSelecionada; else emptyDetail">
          <header class="card__head">
            <div>
              <span class="detail-eyebrow mono">{{ estSelecionada.type?.name || 'Estrutura' }}</span>
              <h2 class="detail-title">{{ estSelecionada.name }}</h2>
            </div>
            <div class="detail-actions">
              <button class="btn-icon" style="color: #d32f2f" (click)="abrirConfirmacao('estrutura', estSelecionada.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Excluir
              </button>
            </div>
          </header>

          <p class="detail-hint">
            Materiais vinculados no banco para esta estrutura. Estes itens serão adicionados à OS automaticamente.
          </p>

          <table class="data-table inline-table">
            <thead>
              <tr>
                <th style="text-align: left;">Material necessário</th>
                <th style="text-align: center;">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="estSelecionada.templates.length === 0">
                <td colspan="2" style="text-align:center; padding: 20px; color: #888;">Gabarito vazio.</td>
              </tr>
              <tr *ngFor="let mat of estSelecionada.templates">
                <td style="text-align: left;" class="td-strong">{{ getNomeMaterial(mat.materialId) }}</td>
                <td style="text-align: center;" class="mono">{{ mat.quantity }} UN</td>
              </tr>
            </tbody>
          </table>
        </article>

        <ng-template #emptyDetail>
          <article class="card gabarito-detail">
            <div class="empty-block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <p>Selecione um gabarito ao lado</p>
              <span>A composição de materiais aparecerá aqui.</span>
            </div>
          </article>
        </ng-template>
      </div>
    </main>

    <div *ngIf="showMaterialModal" class="modal-overlay" (click)="showMaterialModal = false">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal__head">
          <div>
            <span class="modal__eyebrow">Novo Registro</span>
            <h3>Cadastrar Material Base</h3>
          </div>
          <button class="btn-close" (click)="showMaterialModal = false">✕</button>
        </header>
        <div class="modal__body">
          <div class="field">
            <label>Nome do material</label>
            <input [(ngModel)]="formMaterial.name" placeholder="Ex: Parafuso Sextavado" [disabled]="isSaving()" />
          </div>
          <div class="field-grid">
            <div class="field">
              <label>Categoria (Cria nova se não existir)</label>
              <input [(ngModel)]="formMaterial.categoryName" placeholder="Ex: Ferragens" [disabled]="isSaving()" />
            </div>
            <div class="field">
              <label>Quantidade Inicial</label>
              <input type="number" [(ngModel)]="formMaterial.stock" [disabled]="isSaving()" />
            </div>
          </div>
        </div>
        <footer class="modal__foot">
          <button class="btn-secondary" (click)="showMaterialModal = false" [disabled]="isSaving()">Cancelar</button>
          <button class="btn-primary" (click)="salvarMaterial()" [disabled]="isSaving() || !formMaterial.name || !formMaterial.categoryName">
            {{ isSaving() ? 'A Processar...' : 'Salvar Material' }}
          </button>
        </footer>
      </div>
    </div>

    <div *ngIf="showStructureModal" class="modal-overlay" (click)="showStructureModal = false">
      <div class="modal" style="width: 700px" (click)="$event.stopPropagation()">
        <header class="modal__head">
          <div>
            <span class="modal__eyebrow">Agrupamento lógico</span>
            <h3>Criar Estrutura / Gabarito</h3>
          </div>
          <button class="btn-close" (click)="showStructureModal = false">✕</button>
        </header>
        <div class="modal__body" style="max-height: 60vh; overflow-y: auto;">
          <div class="field-grid">
            <div class="field">
              <label>Nome da Estrutura</label>
              <input [(ngModel)]="formStructure.structureName" placeholder="Ex: Tenda 10x10" [disabled]="isSaving()" />
            </div>
            <div class="field">
              <label>Tipo (Ex: Cobertura, Palco)</label>
              <input [(ngModel)]="formStructure.typeName" placeholder="Ex: Tenda" [disabled]="isSaving()" />
            </div>
          </div>
          
          <h4 style="margin: 20px 0 5px; font-size: 13px; color: #555;">COMPOSIÇÃO (ITENS VINCULADOS)</h4>
          <div *ngFor="let item of formStructure.items; let i = index" style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <div class="field" style="flex: 1;">
              <select [(ngModel)]="item.materialId" style="padding: 9px; border: 1px solid #ccc; border-radius: 4px;" [disabled]="isSaving()">
                <option value="">Selecione o Material</option>
                <option *ngFor="let mat of materiais()" [value]="mat.id">{{ mat.name }}</option>
              </select>
            </div>
            <div class="field" style="width: 100px;">
              <input type="number" [(ngModel)]="item.quantity" placeholder="Qtd" [disabled]="isSaving()" />
            </div>
            <button class="btn-icon" (click)="removeStructureItem(i)" style="color: red; padding: 5px;" [disabled]="isSaving()">X</button>
          </div>
          <button class="btn-secondary" style="font-size: 11px; padding: 5px 10px;" (click)="addStructureItem()" [disabled]="isSaving()">+ Adicionar Linha</button>
        </div>
        <footer class="modal__foot">
          <button class="btn-secondary" (click)="showStructureModal = false" [disabled]="isSaving()">Cancelar</button>
          <button class="btn-primary" (click)="salvarEstrutura()" [disabled]="isSaving() || !formStructure.structureName">
            {{ isSaving() ? 'A Gravar...' : 'Gravar Gabarito' }}
          </button>
        </footer>
      </div>
    </div>

    <div *ngIf="confirmarExclusao.id" class="modal-overlay" (click)="confirmarExclusao.id = null">
      <div class="modal modal--small" (click)="$event.stopPropagation()">
        <div class="modal__body" style="text-align: center; padding: 32px 24px;">
          <div class="icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h3 style="margin: 16px 0 8px; font-size: 18px; color: var(--text-strong);">Excluir {{ confirmarExclusao.tipo === 'material' ? 'material' : 'estrutura' }}?</h3>
          <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
            Esta ação não poderá ser desfeita.
          </p>
        </div>
        <footer class="modal__foot" style="justify-content: center; background: transparent; border-top: none; padding-bottom: 24px;">
          <button class="btn-secondary" (click)="confirmarExclusao.id = null">Cancelar</button>
          <button class="btn-primary btn--danger" (click)="executarExclusao()">Sim, excluir</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .eyebrow { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 3px; }
    .page-header__title h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-strong); margin: 0; }
    .page-header__title .subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
    .page-header__right { display: flex; gap: 8px; }
    .btn-primary, .btn-secondary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary svg, .btn-secondary svg { width: 14px; height: 14px; }
    .btn-primary { background: var(--vivere-orange); color: white; border: 1px solid var(--vivere-orange); }
    .btn-primary:hover:not(:disabled) { background: var(--vivere-orange-hover); border-color: var(--vivere-orange-hover); }
    .btn-secondary { background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); }
    .btn-secondary:hover:not(:disabled) { border-color: var(--border-strong); background: var(--surface-hover); }
    .btn--danger { background: var(--status-danger); border-color: var(--status-danger); }
    .btn--danger:hover { background: #b91c1c; border-color: #b91c1c; }
    .filter-tabs { display: flex; gap: 0; padding: 0 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .filter-tabs button { padding: 12px 14px; background: transparent; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 13px; font-weight: 500; color: var(--text-tertiary); cursor: pointer; transition: color var(--duration) var(--ease), border-color var(--duration) var(--ease); }
    .filter-tabs button:hover { color: var(--text-primary); }
    .filter-tabs button.is-active { color: var(--text-strong); border-bottom-color: var(--vivere-orange); }
    .count { padding: 1px 6px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 10px; font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); }
    .filter-tabs button.is-active .count { background: var(--vivere-orange-soft); color: var(--vivere-orange); border-color: var(--vivere-orange-border); }
    .stock-main { padding: 20px 28px 28px; display: flex; flex-direction: column; gap: 18px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
    .card.no-padding { padding: 0; overflow: hidden; }
    .card__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
    .card__title { font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--text-secondary); }
    .data-table--full { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table--full th { padding: 10px 14px; background: var(--surface-sunken); font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-tertiary); border-bottom: 1px solid var(--border); }
    .data-table--full td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); vertical-align: middle; }
    .data-table--full tbody tr { transition: background var(--duration) var(--ease); }
    .data-table--full tbody tr:hover { background: var(--surface-hover); }
    .data-table--full tbody tr:last-child td { border-bottom: 0; }
    .td-strong { font-weight: 500; color: var(--text-primary); }
    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12.5px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; border-radius: var(--radius-sm); border: 1px solid; }
    .badge--danger { color: var(--status-danger); background: var(--status-danger-bg); border-color: var(--status-danger-border); }
    .badge--success { color: var(--status-success); background: var(--status-success-bg); border-color: var(--status-success-border); }
    .gabarito-grid { display: grid; grid-template-columns: 320px 1fr; gap: 18px; align-items: start; }
    .gabarito-sidebar { padding: 0; }
    .gabarito-list { padding: 8px; display: flex; flex-direction: column; gap: 2px; }
    .gabarito-item { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; background: transparent; border: 1px solid transparent; border-radius: var(--radius); cursor: pointer; text-align: left; transition: all var(--duration) var(--ease); position: relative; }
    .gabarito-item__name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
    .gabarito-item__chevron { width: 14px; height: 14px; color: var(--text-muted); transition: transform var(--duration) var(--ease); }
    .gabarito-item:hover { background: var(--surface-hover); border-color: var(--border-subtle); }
    .gabarito-item.is-selected { background: var(--vivere-orange-soft); border-color: var(--vivere-orange-border); }
    .gabarito-item.is-selected::before { content: ''; position: absolute; left: -1px; top: 8px; bottom: 8px; width: 2px; background: var(--vivere-orange); border-radius: 0 2px 2px 0; }
    .gabarito-item.is-selected .gabarito-item__chevron { color: var(--vivere-orange); }
    .gabarito-item--add { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; padding: 10px; border: 1px dashed var(--border-strong); color: var(--text-tertiary); font-size: 12.5px; font-weight: 500; }
    .gabarito-item--add svg { width: 14px; height: 14px; }
    .gabarito-item--add:hover { border-color: var(--vivere-orange); border-style: dashed; background: var(--vivere-orange-soft); color: var(--vivere-orange); }
    .gabarito-detail { padding: 0; }
    .gabarito-detail .card__head { align-items: flex-start; padding: 16px; }
    .detail-eyebrow { display: inline-block; padding: 2px 7px; background: var(--vivere-orange-soft); border: 1px solid var(--vivere-orange-border); color: var(--vivere-orange); font-size: 10.5px; font-weight: 600; border-radius: var(--radius-sm); margin-bottom: 5px; }
    .detail-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-strong); letter-spacing: -0.2px; }
    .detail-actions { display: flex; gap: 8px; }
    .detail-hint { margin: 0; padding: 12px 16px; background: var(--surface-sunken); border-bottom: 1px solid var(--border-subtle); font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
    .inline-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .inline-table th { padding: 10px 16px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-tertiary); border-bottom: 1px solid var(--border-subtle); }
    .inline-table td { padding: 11px 16px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
    .empty-block { padding: 80px 20px; text-align: center; color: var(--text-tertiary); }
    .empty-block svg { width: 36px; height: 36px; color: var(--text-muted); padding: 12px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 50%; box-sizing: content-box; margin: 0 auto 14px; display: block; }
    .empty-block p { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .btn-icon { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-icon:hover:not(:disabled) { background: var(--surface-sunken); border-color: var(--border); color: var(--text-primary); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(15,15,15,0.55); display: flex; align-items: center; justify-content: center; z-index: 3000; backdrop-filter: blur(2px); animation: fadeIn 150ms var(--ease); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal { width: 460px; max-width: calc(100% - 40px); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); display: flex; flex-direction: column; animation: scaleIn 150ms var(--ease); }
    .modal--small { width: 360px; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    .modal__head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; }
    .modal__eyebrow { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--vivere-orange); margin-bottom: 4px; }
    .modal__head h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-strong); }
    .btn-close { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-close:hover { background: var(--surface-sunken); color: var(--text-primary); border-color: var(--border); }
    .btn-close svg { width: 16px; height: 16px; }
    .modal__body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-secondary); }
    .field input, .field select { padding: 9px 11px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 13.5px; color: var(--text-primary); }
    .field input:focus, .field select:focus { outline: none; border-color: var(--vivere-orange); box-shadow: 0 0 0 3px rgba(255,102,0,0.12); }
    .field input:disabled, .field select:disabled { background: #f1f5f9; color: #94a3b8; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal__foot { padding: 14px 22px; border-top: 1px solid var(--border); background: var(--surface-sunken); display: flex; justify-content: flex-end; gap: 8px; }
    .icon-warning { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: var(--status-warning-bg); color: var(--status-warning); margin: 0 auto; }
    .icon-warning svg { width: 24px; height: 24px; }
  `]
})
export class StockComponent implements OnInit {
  private materialService = inject(MaterialService);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService); // INJEÇÃO DO TOAST

  tab = 'inventario';
  
  materiais = signal<Material[]>([]);
  estruturas = signal<Structure[]>([]);
  estSelecionada: Structure | null = null;

  showMaterialModal = false;
  showStructureModal = false;
  
  // Controle universal para confirmação de exclusão
  confirmarExclusao: { tipo: 'material' | 'estrutura' | null, id: string | null } = { tipo: null, id: null };
  
  isLoading = signal(true);
  isSaving = signal(false);

  formMaterial: CreateMaterialPayload = { name: '', categoryName: '', stock: 0 };
  formStructure: CreateStructurePayload = { structureName: '', typeName: '', items: [{ materialId: '', quantity: 1 }] };

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.isLoading.set(true);

    this.materialService.getMaterials()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.materiais.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.toastService.error("Erro ao carregar materiais");
          this.isLoading.set(false);
        }
      });

    this.materialService.getStructures()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.estruturas.set(data);
          if (this.estSelecionada) {
            this.estSelecionada = data.find(e => e.id === this.estSelecionada!.id) || null;
          }
        },
        error: (err) => this.toastService.error("Erro ao carregar estruturas")
      });
  }

  salvarMaterial() {
    if (!this.formMaterial.name || !this.formMaterial.categoryName) {
      this.toastService.warning('Preencha os dados obrigatórios!');
      return;
    }
    
    this.isSaving.set(true);
    
    this.materialService.createMaterial(this.formMaterial)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Material salvo com sucesso no catálogo!');
          this.showMaterialModal = false;
          this.formMaterial = { name: '', categoryName: '', stock: 0 };
          this.carregarDados();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erro ao salvar material.');
          this.isSaving.set(false);
        }
      });
  }

  abrirConfirmacao(tipo: 'material' | 'estrutura', id: string) {
    this.confirmarExclusao = { tipo, id };
  }

  executarExclusao() {
    const { tipo, id } = this.confirmarExclusao;
    if (!id || !tipo) return;

    if (tipo === 'material') {
      this.materialService.deleteMaterial(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toastService.success('Material removido do catálogo!');
            this.confirmarExclusao = { tipo: null, id: null };
            this.carregarDados();
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Erro ao excluir o material.');
            this.confirmarExclusao = { tipo: null, id: null };
          }
        });
    } else {
      this.materialService.deleteStructure(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toastService.success('Estrutura removida!');
            this.estSelecionada = null;
            this.confirmarExclusao = { tipo: null, id: null };
            this.carregarDados();
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Erro ao excluir a estrutura.');
            this.confirmarExclusao = { tipo: null, id: null };
          }
        });
    }
  }

  abrirModalEstrutura() {
    this.formStructure = { structureName: '', typeName: '', items: [{ materialId: '', quantity: 1 }] };
    this.showStructureModal = true;
  }

  addStructureItem() {
    this.formStructure.items.push({ materialId: '', quantity: 1 });
  }

  removeStructureItem(index: number) {
    this.formStructure.items.splice(index, 1);
  }

  salvarEstrutura() {
    if (!this.formStructure.structureName) {
      this.toastService.warning('Dê um nome para a estrutura');
      return;
    }
    
    this.formStructure.items = this.formStructure.items.filter(i => i.materialId && i.quantity > 0);
    
    if (this.formStructure.items.length === 0) {
      this.toastService.warning('Adicione pelo menos um material válido na composição.');
      return;
    }

    this.isSaving.set(true);

    this.materialService.createStructure(this.formStructure)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Gabarito salvo com sucesso!');
          this.showStructureModal = false;
          this.carregarDados();
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toastService.error(err.error?.message || 'Erro ao salvar a Estrutura.');
          this.isSaving.set(false);
        }
      });
  }

  getNomeMaterial(id: string): string {
    const mat = this.materiais().find(m => m.id === id);
    return mat ? mat.name : 'Desconhecido';
  }
}