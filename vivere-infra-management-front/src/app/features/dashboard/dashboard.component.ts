import { Component, inject, OnInit, ElementRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapComponent, MapMarker } from './components/map/map.component';
import { EventService } from '../../core/services/event.service';
import { MaterialService } from '../../core/services/material.service';
import Chart from 'chart.js/auto';

export interface DashboardWidget {
  id: string;
  title: string;
  order: number;
  visible: boolean;
}

/**
 * DashboardComponent - Central de Inteligência do ERP Vivere
 *
 * Este componente gerencia a visualização de KPIs, mapa de eventos e agenda.
 * Foi arquitetado com suporte a Drag & Drop (FLIP Animation) para customização
 * do usuário e implementa proteção rigorosa contra vazamento de memória (Memory Leaks).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MapComponent],
  template: `
    <header class="page-header">
      <div class="page-header__title">
        <span class="eyebrow">Visão geral</span>
        <h1>Dashboard operacional</h1>
      </div>

      <div class="page-header__right">
        <button class="btn-ghost" (click)="toggleEditMode()" [ngClass]="{'is-editing-btn': isEditMode}">
          <svg *ngIf="!isEditMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <svg *ngIf="isEditMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{{ isEditMode ? 'Concluir Edição' : 'Personalizar' }}</span>
        </button>

       <button class="btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Buscar</span>
        </button>

        <div class="user-chip">
          <div class="avatar-square">V</div>
          <div class="user-meta">
            <span class="user-name">Equipe Vivere</span>
            <span class="user-role">Administrador</span>
          </div>
        </div>
      </div>
    </header>

    <div *ngIf="isEditMode" class="edit-banner">
      <div class="edit-banner-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span><strong>Modo de Edição:</strong> Arraste pelos títulos. A linha laranja mostra onde o painel vai pousar.</span>
      </div>
      <button class="btn-secondary add-gadget-btn" (click)="showLayoutModal = true">
        + Adicionar / Remover Gadgets
      </button>
    </div>

    <section class="kpi-strip">
      <div class="kpi">
        <span class="kpi-label">Eventos ativos</span>
        <span class="kpi-value tnum">{{ totalEventosAtivos }}</span>
        <span class="kpi-trend up">Neste momento</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Total de Eventos</span>
        <span class="kpi-value tnum">{{ todosEventos.length }}</span>
        <span class="kpi-trend warn">Registrados no banco</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Materiais Cadastrados</span>
        <span class="kpi-value tnum">{{ totalMateriais }}</span>
        <span class="kpi-trend muted">Itens base no estoque</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Alertas de estoque</span>
        <span class="kpi-value tnum" [class.danger]="totalMateriaisAlerta > 0">{{ totalMateriaisAlerta }}</span>
        <span class="kpi-trend" [class.danger]="totalMateriaisAlerta > 0">
          {{ totalMateriaisAlerta > 0 ? 'Reposição necessária' : 'Estoque saudável' }}
        </span>
      </div>
    </section>

    <main class="dash-main">
      <div class="dash-grid">

        <article class="card widget-card"
                 data-widget-id="map"
                 [style.order]="getOrder('map')"
                 [class.hidden]="!isVisible('map')"
                 [class.is-editing]="isEditMode"
                 [class.is-dragging]="draggedWidgetId === 'map'"
                 [class.drop-before]="dropTargetId === 'map' && dropPosition === 'before'"
                 [class.drop-after]="dropTargetId === 'map' && dropPosition === 'after'"
                 [class.drop-dim]="draggedWidgetId && draggedWidgetId !== 'map' && dropTargetId !== 'map'"
                 [draggable]="isEditMode"
                 (dragstart)="onDragStart('map', $event)"
                 (dragover)="onDragOver($event, 'map')"
                 (drop)="onDrop($event, 'map')"
                 (dragend)="onDragEnd()">
          <header class="card__head" [class.grab-handle]="isEditMode">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg *ngIf="isEditMode" class="drag-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              <span class="card__title">Localização de eventos</span>
            </div>
            <button *ngIf="isEditMode" class="btn-remove-widget" (click)="hideWidget('map')" title="Ocultar">✕</button>
            <span *ngIf="!isEditMode" class="card__hint">Atualizado agora</span>
          </header>
          <div class="card__body card__body--flush" style="position: relative;">
            <div *ngIf="isEditMode" class="widget-blocker"></div>
            <app-map [viewOnly]="true" [markers]="mapMarkers"></app-map>
          </div>
        </article>

        <article class="card widget-card"
                 data-widget-id="calendar"
                 [style.order]="getOrder('calendar')"
                 [class.hidden]="!isVisible('calendar')"
                 [class.is-editing]="isEditMode"
                 [class.is-dragging]="draggedWidgetId === 'calendar'"
                 [class.drop-before]="dropTargetId === 'calendar' && dropPosition === 'before'"
                 [class.drop-after]="dropTargetId === 'calendar' && dropPosition === 'after'"
                 [class.drop-dim]="draggedWidgetId && draggedWidgetId !== 'calendar' && dropTargetId !== 'calendar'"
                 [draggable]="isEditMode"
                 (dragstart)="onDragStart('calendar', $event)"
                 (dragover)="onDragOver($event, 'calendar')"
                 (drop)="onDrop($event, 'calendar')"
                 (dragend)="onDragEnd()">
          <header class="card__head" [class.grab-handle]="isEditMode">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg *ngIf="isEditMode" class="drag-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              <span class="card__title">Agenda — {{ mesAtualTexto }}</span>
            </div>
            <button *ngIf="isEditMode" class="btn-remove-widget" (click)="hideWidget('calendar')" title="Ocultar">✕</button>
            <button *ngIf="!isEditMode" class="btn-mini" routerLink="/eventos">Ver tudo</button>
          </header>
          <div class="card__body" style="position: relative;">
            <div *ngIf="isEditMode" class="widget-blocker"></div>
            <div class="cal">
              <div class="cal__weekdays">
                <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
              </div>
              <div class="cal__days">
                <div *ngFor="let d of calendarDays" class="cal-cell"
                  [class.is-today]="d === diaDeHoje"
                  [class.is-empty]="d <= 0">
                  <span class="cal-num mono">{{ d > 0 ? d : '' }}</span>
                  <ng-container *ngIf="d > 0">
                    <div *ngFor="let ev of getEventosDoDia(d)" class="cal-event" [title]="ev.name">
                      {{ ev.name | slice:0:10 }}{{ ev.name.length > 10 ? '...' : '' }}
                    </div>
                  </ng-container>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="card widget-card"
                 data-widget-id="chart"
                 [style.order]="getOrder('chart')"
                 [class.hidden]="!isVisible('chart')"
                 [class.is-editing]="isEditMode"
                 [class.is-dragging]="draggedWidgetId === 'chart'"
                 [class.drop-before]="dropTargetId === 'chart' && dropPosition === 'before'"
                 [class.drop-after]="dropTargetId === 'chart' && dropPosition === 'after'"
                 [class.drop-dim]="draggedWidgetId && draggedWidgetId !== 'chart' && dropTargetId !== 'chart'"
                 [draggable]="isEditMode"
                 (dragstart)="onDragStart('chart', $event)"
                 (dragover)="onDragOver($event, 'chart')"
                 (drop)="onDrop($event, 'chart')"
                 (dragend)="onDragEnd()">
          <header class="card__head" [class.grab-handle]="isEditMode">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg *ngIf="isEditMode" class="drag-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              <span class="card__title">Volume de Estoque</span>
            </div>
            <button *ngIf="isEditMode" class="btn-remove-widget" (click)="hideWidget('chart')" title="Ocultar">✕</button>
          </header>
          <div class="card__body card__body--chart" style="position: relative;">
            <div *ngIf="isEditMode" class="widget-blocker"></div>
            <canvas id="stockChart"></canvas>
          </div>
        </article>

        <article class="card widget-card"
                 data-widget-id="table"
                 [style.order]="getOrder('table')"
                 [class.hidden]="!isVisible('table')"
                 [class.is-editing]="isEditMode"
                 [class.is-dragging]="draggedWidgetId === 'table'"
                 [class.drop-before]="dropTargetId === 'table' && dropPosition === 'before'"
                 [class.drop-after]="dropTargetId === 'table' && dropPosition === 'after'"
                 [class.drop-dim]="draggedWidgetId && draggedWidgetId !== 'table' && dropTargetId !== 'table'"
                 [draggable]="isEditMode"
                 (dragstart)="onDragStart('table', $event)"
                 (dragover)="onDragOver($event, 'table')"
                 (drop)="onDrop($event, 'table')"
                 (dragend)="onDragEnd()">
          <header class="card__head" [class.grab-handle]="isEditMode">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg *ngIf="isEditMode" class="drag-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              <span class="card__title">Próximas Saídas</span>
            </div>
            <button *ngIf="isEditMode" class="btn-remove-widget" (click)="hideWidget('table')" title="Ocultar">✕</button>
            <button *ngIf="!isEditMode" class="btn-mini" routerLink="/eventos">Agenda completa</button>
          </header>
          <div class="card__body card__body--flush" style="position: relative;">
            <div *ngIf="isEditMode" class="widget-blocker"></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Status</th>
                    <th class="cell-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ev of eventosProximos">
                    <td>
                      <div class="td-strong">{{ ev.name }}</div>
                    </td>
                    <td>
                      <span class="badge"
                            [ngClass]="{
                              'badge--warn': ev.status === 'PENDING',
                              'badge--info': ev.status === 'ACTIVE',
                              'badge--success': ev.status === 'FINISHED' || ev.status === 'READY',
                              'badge--neutral': ev.status === 'DRAFT'
                            }">
                        {{ ev.status }}
                      </span>
                    </td>
                    <td class="cell-right mono">{{ ev.startDate | date:'dd/MM HH:mm' }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="table-filler" *ngIf="eventosProximos.length < 7">
                <svg class="table-filler__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span class="table-filler__title">
                  {{ eventosProximos.length === 0 ? 'Nenhum evento registrado' : 'Sem mais saídas próximas' }}
                </span>
                <span class="table-filler__sub">
                  {{ eventosProximos.length === 0 ? 'Cadastre um evento para começar.' : 'A agenda está em dia.' }}
                </span>
              </div>
            </div>
          </div>
        </article>

      </div>
    </main>

    <div *ngIf="showLayoutModal" class="modal-overlay" (click)="fecharModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal__head">
          <div>
            <span class="modal__eyebrow">Ajuste de Tela</span>
            <h3>Gerenciar Gadgets</h3>
          </div>
          <button class="btn-close" (click)="fecharModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div class="modal__body">
          <p style="font-size: 13px; color: #666; margin-top: 0;">Ative ou desative os widgets para o seu painel.</p>

          <div class="widget-list">
            <label *ngFor="let w of layoutConfig" class="widget-toggle">
              <input type="checkbox" [checked]="w.visible" (change)="toggleWidgetVisibility(w.id)">
              <div class="widget-info">
                <span class="widget-title">{{ w.title }}</span>
              </div>
            </label>
          </div>
        </div>

        <footer class="modal__foot">
          <button class="btn-primary" (click)="fecharModal()">Concluir</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    /* ============ PAGE HEADER ============ */
    .page-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .eyebrow { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 3px; }
    .page-header__title h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-strong); margin: 0; }
    .page-header__right { display: flex; align-items: center; gap: 12px; }
    .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-ghost svg { width: 14px; height: 14px; }
    .btn-ghost:hover { border-color: var(--border-strong); color: var(--text-primary); }
    .btn-ghost kbd { padding: 1px 5px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 3px; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-tertiary); }

    .is-editing-btn { background: var(--vivere-orange); color: white; border-color: var(--vivere-orange); }
    .is-editing-btn:hover { background: var(--vivere-orange-hover); color: white; }

    .user-chip { display: flex; align-items: center; gap: 10px; padding: 4px 10px 4px 4px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .avatar-square { width: 30px; height: 30px; background: var(--vivere-orange); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; }
    .user-meta { display: flex; flex-direction: column; line-height: 1.2; }
    .user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .user-role { font-size: 10.5px; font-weight: 500; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.6px; }

    /* ============ KPI STRIP ============ */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .kpi { padding: 16px 24px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
    .kpi:last-child { border-right: 0; }
    .kpi-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-tertiary); }
    .kpi-value { font-size: 26px; font-weight: 700; color: var(--text-strong); letter-spacing: -0.6px; line-height: 1.1; }
    .kpi-value.danger { color: var(--status-danger); }
    .kpi-trend { font-size: 11.5px; font-weight: 500; }
    .kpi-trend.up { color: var(--status-success); }
    .kpi-trend.warn { color: var(--status-warning); }
    .kpi-trend.danger { color: var(--status-danger); }
    .kpi-trend.muted { color: var(--text-tertiary); }

    /* ============ EDIT MODE BANNER ============ */
    .edit-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 28px; background: #fff8e1; border-bottom: 1px solid #ffeeba;
    }
    .edit-banner-info { display: flex; align-items: center; gap: 10px; color: #856404; font-size: 13px; }
    .edit-banner-info svg { width: 16px; height: 16px; }
    .add-gadget-btn { background: white; border-color: #ffeeba; color: #856404; }
    .add-gadget-btn:hover { background: #ffeeba; border-color: #eed3d7; }

    /* ============ DYNAMIC GRID & DRAG/DROP ============ */
    .dash-main { padding: 20px 28px 28px; }
    .dash-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      grid-auto-rows: minmax(360px, 1fr);
      gap: 18px;
      min-height: calc(100vh - 240px);
    }
    @media (max-width: 768px) {
      .dash-grid { min-height: 0; }
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: opacity 220ms var(--ease), border-color 180ms var(--ease), box-shadow 180ms var(--ease);
    }
    .card.hidden { display: none !important; }

    /* ---------- Edit mode look ---------- */
    .widget-card.is-editing {
      border: 1px dashed var(--vivere-orange);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .grab-handle {
      cursor: grab;
      user-select: none;
      background: linear-gradient(180deg, #fdfdfd 0%, #f7f7f7 100%);
    }
    .grab-handle:active { cursor: grabbing; }
    .drag-icon { color: var(--vivere-orange); transition: transform 200ms var(--ease); }
    .grab-handle:hover .drag-icon { transform: scale(1.15); }

    /* Blocker prevents iframes/canvas from stealing the drag */
    .widget-blocker {
      position: absolute; inset: 0; z-index: 10;
      cursor: grab;
      background: transparent;
    }

    .btn-remove-widget {
      background: #ffeeee; color: #dc3545; border: 1px solid #f5c6cb;
      width: 24px; height: 24px; border-radius: 4px; font-size: 12px; font-weight: bold;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
    }
    .btn-remove-widget:hover { background: #dc3545; color: white; }

    /* ---------- DRAG STATES ---------- */
    .widget-card.is-dragging { opacity: 0.35; transform: scale(0.97); border-style: solid !important; }
    .widget-card.drop-dim { opacity: 0.7; }
    .widget-card.drop-before, .widget-card.drop-after {
      border-color: var(--vivere-orange) !important;
      border-style: solid !important;
      box-shadow: 0 8px 24px rgba(255, 102, 0, 0.18);
      opacity: 1;
    }

    .widget-card.drop-before::before,
    .widget-card.drop-after::after {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: 4px;
      background: var(--vivere-orange);
      z-index: 100;
      box-shadow: 0 0 12px rgba(255, 102, 0, 0.85);
      animation: dropPulse 1.2s ease-in-out infinite;
    }
    .widget-card.drop-before::before { top: 0; }
    .widget-card.drop-after::after  { bottom: 0; }

    @keyframes dropPulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.55; }
    }

    .card__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
    .card__title { font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--text-secondary); }
    .card__hint { font-size: 11px; color: var(--text-tertiary); }
    .card__body { padding: 16px; background: var(--surface); flex: 1 1 auto; min-height: 0; }
    .card__body--flush { padding: 0; }
    .card__body--chart { min-height: 240px; }

    app-map { display: block; width: 100%; height: 100%; min-height: 320px; }

    .btn-mini { padding: 5px 9px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 11.5px; font-weight: 500; cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-mini:hover { border-color: var(--text-primary); color: var(--text-primary); }
    .btn-secondary { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); }

    /* ============ CALENDAR ============ */
    .cal { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; display: flex; flex-direction: column; height: 100%; }
    .cal__weekdays { display: grid; grid-template-columns: repeat(7,1fr); background: var(--surface-sunken); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .cal__weekdays span { padding: 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-tertiary); text-align: center; }
    .cal__days { display: grid; grid-template-columns: repeat(7,1fr); grid-auto-rows: 1fr; flex: 1; min-height: 0; }
    .cal-cell { min-height: 42px; padding: 6px 7px; border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-secondary); position: relative; overflow: hidden; }
    .cal-cell:nth-child(7n) { border-right: 0; }
    .cal-cell.is-empty { background: var(--surface-sunken); color: var(--text-muted); }
    .cal-cell.is-today { background: var(--vivere-orange-soft); color: var(--vivere-orange); }
    .cal-num { font-size: 11.5px; font-weight: 500; }
    .cal-event { margin-top: 4px; font-size: 10px; font-weight: 600; padding: 2px 4px; background: var(--vivere-orange); color: white; border-radius: 3px; display: inline-block; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    /* ============ DATA TABLE ============ */
    .table-wrap { display: flex; flex-direction: column; height: 100%; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; flex-shrink: 0; }
    .data-table th { padding: 10px 16px; background: var(--surface-sunken); text-align: left; font-size: 10.5px; font-weight: 600; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-tertiary); border-bottom: 1px solid var(--border); }
    .data-table td { padding: 11px 16px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
    .data-table tbody tr { transition: background var(--duration) var(--ease); }
    .data-table tbody tr:hover { background: var(--surface-hover); }
    .data-table tbody tr:last-child td { border-bottom: 0; }
    .cell-right { text-align: right; }
    .td-strong { font-weight: 500; color: var(--text-primary); }
    .td-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12.5px; }

    .table-filler {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px 16px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-sunken) 100%);
      border-top: 1px solid var(--border-subtle);
      color: var(--text-tertiary);
      text-align: center;
    }
    .table-filler__icon { width: 28px; height: 28px; color: var(--text-muted, #b8b8b8); opacity: 0.7; }
    .table-filler__title { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .table-filler__sub { font-size: 11.5px; color: var(--text-tertiary); }

    /* ============ BADGES ============ */
    .badge { display: inline-block; padding: 2px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; border-radius: var(--radius-sm); border: 1px solid; }
    .badge--warn { color: var(--status-warning); background: var(--status-warning-bg); border-color: var(--status-warning-border); }
    .badge--success { color: var(--status-success); background: var(--status-success-bg); border-color: var(--status-success-border); }
    .badge--info { color: var(--status-info); background: var(--status-info-bg); border-color: var(--status-info-border); }
    .badge--neutral { color: var(--text-secondary); background: var(--surface-hover); border-color: var(--border-strong); }
    .badge--danger { color: var(--status-danger); background: var(--status-danger-bg); border-color: var(--status-danger-border); }

    /* ============ MODAL ============ */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,15,15,0.55); display: flex; align-items: center; justify-content: center; z-index: 3000; backdrop-filter: blur(2px); animation: fadeIn 150ms var(--ease); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal { width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-modal); display: flex; flex-direction: column; animation: scaleIn 150ms var(--ease); }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    .modal__head { padding: 18px 22px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; }
    .modal__eyebrow { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: var(--vivere-orange); margin-bottom: 4px; }
    .modal__head h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-strong); }
    .btn-close { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--text-tertiary); cursor: pointer; }
    .btn-close:hover { background: var(--surface-sunken); color: var(--text-primary); border-color: var(--border); }
    .btn-close svg { width: 16px; height: 16px; }
    .modal__body { padding: 20px 22px; }
    .modal__foot { padding: 14px 22px; border-top: 1px solid var(--border); background: var(--surface-sunken); display: flex; justify-content: flex-end; }
    .btn-primary { background: var(--vivere-orange); color: white; border: 1px solid var(--vivere-orange); padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 600; cursor: pointer; }

    /* Toggle List */
    .widget-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
    .widget-toggle { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: background 0.2s; }
    .widget-toggle:hover { background: var(--surface-hover); }
    .widget-toggle input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--vivere-orange); cursor: pointer; }
    .widget-title { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
  `]
})
export class DashboardComponent implements OnInit {
  public router = inject(Router);
  public eventService = inject(EventService);
  public materialService = inject(MaterialService);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  
  /**
   * INJEÇÃO DE PROTEÇÃO DE MEMÓRIA (Memory Leak Prevention)
   * Utilizado pelo operador RxJS takeUntilDestroyed para matar as escutas
   * de rede ativas (HttpClient) no exato momento que o utilizador 
   * sai do Dashboard, liberando a RAM do navegador.
   */
  private destroyRef = inject(DestroyRef);

  // === Estado de Personalização ===
  isEditMode = false;
  showLayoutModal = false;

  // === Estado de Drag & Drop ===
  draggedWidgetId: string | null = null;
  dropTargetId: string | null = null;
  dropPosition: 'before' | 'after' | null = null;

  layoutConfig: DashboardWidget[] = [
    { id: 'map',      title: 'Localização de Eventos',     order: 1, visible: true },
    { id: 'calendar', title: 'Agenda de Montagens',        order: 2, visible: true },
    { id: 'chart',    title: 'Gráfico de Estoque',         order: 3, visible: true },
    { id: 'table',    title: 'Tabela de Próximas Saídas',  order: 4, visible: true }
  ];

  // === Variáveis de Dados ===
  totalEventosAtivos = 0;
  totalMateriais = 0;
  totalMateriaisAlerta = 0;

  todosEventos: any[] = [];
  eventosProximos: any[] = [];
  mapMarkers: MapMarker[] = [];

  chartInstance: any;
  hoje = new Date();
  diaDeHoje = this.hoje.getDate();
  mesAtualTexto = '';
  calendarDays: number[] = [];

  ngOnInit() {
    this.gerarCalendarioDoMes();
    this.carregarDadosReais();
  }

  // === MÉTODOS DE EDIÇÃO ===

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      this.cleanupDrag();
      this.dispararResizeVisual();
    }
  }

  hideWidget(id: string) {
    const widget = this.layoutConfig.find(w => w.id === id);
    if (widget) widget.visible = false;
  }

  getOrder(id: string): number {
    const widget = this.layoutConfig.find(w => w.id === id);
    return widget ? widget.order : 99;
  }

  isVisible(id: string): boolean {
    const widget = this.layoutConfig.find(w => w.id === id);
    return widget ? widget.visible : false;
  }

  // === DRAG & DROP COM INDICADOR DE POSIÇÃO E ANIMAÇÃO FLIP ===

  onDragStart(id: string, event: DragEvent) {
    this.draggedWidgetId = id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox exige data setada para iniciar o drag
      event.dataTransfer.setData('text/plain', id);
    }
  }

  onDragOver(event: DragEvent, targetId: string) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

    // Sobre si mesmo: não destaca
    if (!this.draggedWidgetId || this.draggedWidgetId === targetId) {
      this.dropTargetId = null;
      this.dropPosition = null;
      return;
    }

    // Decide "antes" ou "depois" pela posição vertical do mouse no alvo
    const targetEl = event.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    this.dropTargetId = targetId;
    this.dropPosition = event.clientY < midY ? 'before' : 'after';
  }

  onDrop(event: DragEvent, targetId: string) {
    event.preventDefault();

    if (!this.draggedWidgetId || this.draggedWidgetId === targetId) {
      this.cleanupDrag();
      return;
    }

    // Captura posições ANTES da reordenação (parte 1 do FLIP)
    const oldRects = this.captureRects();
    const position = this.dropPosition;
    const draggedId = this.draggedWidgetId;

    // Ordena por order para trabalhar com índices reais
    const sorted = [...this.layoutConfig].sort((a, b) => a.order - b.order);
    const draggedIdx = sorted.findIndex(w => w.id === draggedId);
    let targetIdx = sorted.findIndex(w => w.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) {
      this.cleanupDrag();
      return;
    }

    // Remove o item arrastado da lista
    const [item] = sorted.splice(draggedIdx, 1);

    // Compensa o índice do alvo se o item removido estava antes dele
    if (draggedIdx < targetIdx) targetIdx--;

    // Insere antes ou depois do alvo de acordo com a posição do mouse
    const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx;
    sorted.splice(insertIdx, 0, item);

    // Aplica novos valores de order
    sorted.forEach((w, i) => {
      const orig = this.layoutConfig.find(o => o.id === w.id);
      if (orig) orig.order = i + 1;
    });

    this.cleanupDrag();

    // Após o Angular atualizar o DOM, mede novas posições e anima a diferença (parte 2 do FLIP)
    requestAnimationFrame(() => this.flipAnimate(oldRects));
  }

  onDragEnd() {
    // Garante limpeza do estado mesmo se o usuário cancelar (Esc, soltar fora, etc.)
    this.cleanupDrag();
  }

  private cleanupDrag() {
    this.draggedWidgetId = null;
    this.dropTargetId = null;
    this.dropPosition = null;
  }

  private captureRects(): Map<string, DOMRect> {
    const map = new Map<string, DOMRect>();
    const cards = this.host.nativeElement.querySelectorAll<HTMLElement>('.widget-card[data-widget-id]');
    cards.forEach(el => {
      const id = el.dataset['widgetId'];
      if (id && el.offsetParent !== null) {
        map.set(id, el.getBoundingClientRect());
      }
    });
    return map;
  }

  /**
   * Animação FLIP: cada widget começa transladado pra sua posição antiga
   * e anima de volta pra translate(0,0), produzindo movimento fluido
   * mesmo com CSS `order` (que normalmente não transiciona).
   */
  private flipAnimate(oldRects: Map<string, DOMRect>) {
    const cards = this.host.nativeElement.querySelectorAll<HTMLElement>('.widget-card[data-widget-id]');
    cards.forEach(el => {
      const id = el.dataset['widgetId'];
      if (!id) return;
      const oldRect = oldRects.get(id);
      if (!oldRect) return;

      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' }
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'none'
        }
      );
    });
  }

  // === MÉTODOS DO MODAL ===

  toggleWidgetVisibility(id: string) {
    const widget = this.layoutConfig.find(w => w.id === id);
    if (widget) widget.visible = !widget.visible;
  }

  fecharModal() {
    this.showLayoutModal = false;
    this.dispararResizeVisual();
  }

  dispararResizeVisual() {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  }

  // === MÉTODOS DE DADOS REAIS ===

  gerarCalendarioDoMes() {
    const year = this.hoje.getFullYear();
    const month = this.hoje.getMonth();
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    this.mesAtualTexto = `${nomesMeses[month]}/${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.calendarDays = [];
    for (let i = 0; i < firstDay; i++) this.calendarDays.push(-i);
    for (let i = 1; i <= daysInMonth; i++) this.calendarDays.push(i);
    while (this.calendarDays.length % 7 !== 0) this.calendarDays.push(-100);
  }

  /**
   * BLINDAGEM DE TRANSAÇÕES
   * O pipe com takeUntilDestroyed garante que se o backend demorar
   * para responder e o usuário fechar a tela, o Observable será cancelado.
   */
  carregarDadosReais() {
    this.eventService.getEvents()
      .pipe(takeUntilDestroyed(this.destroyRef)) // Proteção ativada contra vazamentos
      .subscribe((eventos) => {
        this.todosEventos = eventos;

        const ativos = eventos.filter(e => e.status === 'ACTIVE' || e.status === 'PENDING');
        this.totalEventosAtivos = ativos.length;

        this.eventosProximos = eventos
          .filter(e => e.status !== 'FINISHED' && e.status !== 'CANCELLED')
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 7);

        this.mapMarkers = ativos.filter(e => e.latitude && e.longitude).map(e => {
          const dataStr = new Date(e.startDate).toLocaleDateString('pt-BR');
          const statusTraduzido = e.status === 'PENDING' ? 'Pendente/Planejamento' : 'Em andamento';

          return {
            lat: e.latitude,
            lng: e.longitude,
            title: e.name,
            info: `Status: <b>${statusTraduzido}</b><br>Data: ${dataStr}`
          };
        });
      });

    this.materialService.getMaterials()
      .pipe(takeUntilDestroyed(this.destroyRef)) // Proteção ativada contra vazamentos
      .subscribe((materiais) => {
        this.totalMateriais = materiais.length;
        this.totalMateriaisAlerta = materiais.filter(m => m.stock < 10).length;
        this.gerarGraficoMateriais(materiais);
      });
  }

  getEventosDoDia(dia: number): any[] {
    if (dia <= 0) return [];
    return this.todosEventos.filter(ev => {
      const dataEvento = new Date(ev.startDate);
      return dataEvento.getDate() === dia &&
             dataEvento.getMonth() === this.hoje.getMonth() &&
             dataEvento.getFullYear() === this.hoje.getFullYear();
    });
  }

  gerarGraficoMateriais(materiais: any[]) {
    const topMateriais = materiais.slice(0, 6);
    const labelsMateriais = topMateriais.map(m => m.name.substring(0, 15));
    const quantidades = topMateriais.map(m => m.stock);

    const ctx = document.getElementById('stockChart') as HTMLCanvasElement;
    if (ctx) {
      if (this.chartInstance) this.chartInstance.destroy(); // Evita fantasmas no canvas re-renderizado
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labelsMateriais,
          datasets: [{
            label: 'Unidades em Estoque Base',
            data: quantidades,
            backgroundColor: '#ff6600',
            borderRadius: 3,
            barThickness: 22
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', weight: 500, size: 11 }, color: '#525252' } } },
          scales: { y: { beginAtZero: true, grid: { color: '#ededed' } }, x: { grid: { display: false } } }
        }
      });
    }
  }
}