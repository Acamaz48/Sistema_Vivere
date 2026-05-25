import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastService.toasts()" 
           class="toast" 
           [ngClass]="'toast--' + toast.type">
        
        <div class="toast__icon">
          <svg *ngIf="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <svg *ngIf="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <svg *ngIf="toast.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <svg *ngIf="toast.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        
        <div class="toast__content">
          <p>{{ toast.message }}</p>
        </div>
        
        <button class="toast__close" (click)="toastService.remove(toast.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 10px; z-index: 9999; pointer-events: none; }
    .toast { display: flex; align-items: flex-start; gap: 12px; min-width: 300px; max-width: 400px; padding: 14px 16px; border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-modal); border-left: 4px solid; pointer-events: auto; animation: slideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    
    .toast--success { border-left-color: var(--status-success); }
    .toast--success .toast__icon { color: var(--status-success); }
    
    .toast--error { border-left-color: var(--status-danger); }
    .toast--error .toast__icon { color: var(--status-danger); }
    
    .toast--warning { border-left-color: var(--status-warning); }
    .toast--warning .toast__icon { color: var(--status-warning); }
    
    .toast--info { border-left-color: var(--status-info); }
    .toast--info .toast__icon { color: var(--status-info); }

    .toast__icon svg { width: 18px; height: 18px; }
    .toast__content { flex: 1; }
    .toast__content p { margin: 0; font-size: 13px; font-weight: 500; color: var(--text-primary); line-height: 1.4; }
    .toast__close { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 14px; padding: 0; margin-left: 8px; }
    .toast__close:hover { color: var(--text-primary); }
  `]
})
export class ToastComponent {
  public toastService = inject(ToastService);
}