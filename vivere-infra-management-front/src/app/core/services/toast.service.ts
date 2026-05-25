import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(type: Toast['type'], message: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(t => [...t, { id, type, message }]);
    
    // Auto remover após 4 segundos
    setTimeout(() => this.remove(id), 4000);
  }

  success(msg: string) { this.show('success', msg); }
  error(msg: string) { this.show('error', msg); }
  warning(msg: string) { this.show('warning', msg); }
  info(msg: string) { this.show('info', msg); }

  remove(id: string) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}