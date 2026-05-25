import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { UserStore } from './core/stores/user.store';
import { ToastComponent } from './shared/components/toast.component'; // IMPORTANTE

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, ToastComponent], // ADD AQUI
  template: `
    <app-toast></app-toast>

    <div class="app-shell" [class.is-auth-screen]="isLoginPage()">
      <aside class="sidebar" *ngIf="!isLoginPage()">
        <div class="sidebar__brand" (click)="router.navigate(['/dashboard'])">
          <div class="brand-mark"><span class="brand-dot"></span><span class="brand-name">VIVERE</span></div>
          <span class="brand-sub">INFRA MANAGEMENT</span>
        </div>

        <nav class="sidebar__nav">
          <span class="nav-section-title">Operação</span>
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="is-active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
          <a class="nav-item" routerLink="/eventos" routerLinkActive="is-active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <span>Eventos</span>
          </a>
          <a class="nav-item" routerLink="/ordens" routerLinkActive="is-active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
            <span>Ordens de Serviço</span>
          </a>
          <a class="nav-item" routerLink="/estoque" routerLinkActive="is-active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span>Estoque</span>
          </a>

          <ng-container *ngIf="userStore.isAdmin()">
            <span class="nav-section-title" style="margin-top: 15px; color: var(--vivere-orange);">Administração</span>
            
            <a class="nav-item" routerLink="/usuarios" routerLinkActive="is-active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Gestão de Pessoas</span>
            </a>

            <a class="nav-item" routerLink="/unidades" routerLinkActive="is-active">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              <span>Unidades Operacionais</span>
            </a>
          </ng-container>
        </nav>

        <div class="sidebar__footer">
          <button class="btn-logout" (click)="logout()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
      <main class="main-area"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg-app); }
    .app-shell.is-auth-screen { background: var(--surface); }
    .sidebar { width: 240px; flex-shrink: 0; background: var(--sidebar-bg); color: var(--sidebar-text); display: flex; flex-direction: column; border-right: 1px solid var(--sidebar-border); z-index: 100; }
    .sidebar__brand { padding: 20px 20px 18px; border-bottom: 1px solid var(--sidebar-border); cursor: pointer; user-select: none; }
    .brand-mark { display: flex; align-items: center; gap: 10px; }
    .brand-dot { width: 8px; height: 8px; background: var(--vivere-orange); border-radius: 2px; box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.18); }
    .brand-name { color: var(--sidebar-text-strong); font-size: 15px; font-weight: 700; letter-spacing: 0.6px; }
    .brand-sub { display: block; margin-top: 6px; margin-left: 18px; font-size: 9.5px; font-weight: 600; letter-spacing: 1.4px; color: #5e5e5e; }
    .sidebar__nav { flex: 1; padding: 16px 10px; display: flex; flex-direction: column; gap: 1px; overflow-y: auto; }
    .nav-section-title { padding: 8px 12px 6px; font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #5a5a5a; }
    .nav-item { display: flex; align-items: center; gap: 11px; padding: 9px 12px; font-size: 13.5px; font-weight: 500; color: var(--sidebar-text); text-decoration: none; border-radius: var(--radius); cursor: pointer; position: relative; transition: background var(--duration) var(--ease), color var(--duration) var(--ease); }
    .nav-icon { width: 17px; height: 17px; flex-shrink: 0; stroke: currentColor; }
    .nav-item:hover { background: var(--sidebar-bg-hover); color: #d4d4d4; }
    .nav-item.is-active { background: var(--sidebar-bg-active); color: var(--sidebar-text-strong); }
    .nav-item.is-active::before { content: ''; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 2px; background: var(--vivere-orange); border-radius: 0 2px 2px 0; }
    .nav-item.is-active .nav-icon { color: var(--vivere-orange); }
    .sidebar__footer { padding: 12px; border-top: 1px solid var(--sidebar-border); }
    .btn-logout { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: transparent; color: var(--sidebar-text); border: 1px solid transparent; border-radius: var(--radius); cursor: pointer; font-size: 13px; font-weight: 500; transition: all var(--duration) var(--ease); }
    .btn-logout svg { width: 16px; height: 16px; }
    .btn-logout:hover { background: var(--sidebar-bg-hover); color: #ffaaaa; border-color: var(--sidebar-border); }
    .main-area { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; position: relative; z-index: 1; }
  `]
})
export class AppComponent {
  public router = inject(Router);
  public userStore = inject(UserStore);

  isLoginPage() { return this.router.url === '/login' || this.router.url === '/'; }
  logout() { this.userStore.logout(); this.router.navigate(['/login']); }
}