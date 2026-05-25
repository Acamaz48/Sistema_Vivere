import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialService } from '../../../core/services/material.service';
import { ServiceOrderService, CreateOsPayload } from '../../../core/services/service-order.service';
import { OperationalUnitService } from '../../../core/services/operational-unit.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-os-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="page-header">
      <div class="page-header__title">
        <span class="eyebrow">Documento operacional</span>
        <h1>{{ osAtual ? 'Gestão da Ordem de Serviço' : 'Nova ordem de serviço' }}</h1>
        <p class="subtitle">{{ osAtual ? 'Acompanhe o status logístico e liberação de estoque.' : 'Carga, montagem e logística do evento.' }}</p>
      </div>
      <div class="page-header__right" *ngIf="!osAtual">
        <div class="meta-pill">
          <span class="meta-pill__label">Emissão</span>
          <span class="meta-pill__value mono">{{ today | date:'dd/MM/yyyy' }}</span>
        </div>
      </div>
      <div class="page-header__right" *ngIf="osAtual">
        <button class="btn-secondary" (click)="voltarParaCriacao()">+ Nova OS</button>
      </div>
    </header>

    <main class="os-page">
      <section class="os-doc" *ngIf="osAtual" style="padding: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0 0 5px; font-size: 22px;">OS: {{ osAtual.id }}</h2>
            <p style="margin: 0; color: #666;">Fornecedor/Org: {{ osAtual.supplier || 'Não informado' }}</p>
          </div>
          <span class="badge" 
                [ngClass]="{
                  'badge--neutral': osAtual.status === 'DRAFT',
                  'badge--info': osAtual.status === 'ACTIVE',
                  'badge--warn': osAtual.status === 'PENDING',
                  'badge--success': osAtual.status === 'READY'
                }" style="font-size: 14px; padding: 6px 12px;">
            STATUS: {{ osAtual.status }}
          </span>
        </div>

        <div style="background: var(--surface-sunken); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase;">Guia de Fluxo</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #555;">
            <li><strong>DRAFT:</strong> Rascunho da Produção.</li>
            <li><strong>ACTIVE:</strong> Submetida ao Galpão. Aguardando.</li>
            <li><strong>PENDING:</strong> Retornou do Galpão.</li>
            <li><strong>READY:</strong> Aprovada.</li>
          </ul>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
          <button class="btn-primary" style="background: #17a2b8; border-color: #17a2b8;" *ngIf="osAtual.status === 'DRAFT' || osAtual.status === 'PENDING'" (click)="submeterOS()">
            📤 Enviar p/ Galpão (ACTIVE)
          </button>
          <button class="btn-primary" style="background: #ffc107; border-color: #ffc107; color: #000;" *ngIf="osAtual.status === 'ACTIVE'" (click)="submeterOS()">
            🛠️ Processar e Devolver (PENDING)
          </button>
          <button class="btn-primary" style="background: var(--status-success); border-color: var(--status-success);" *ngIf="osAtual.status === 'PENDING'" (click)="finalizarAprovacao()">
            ✅ Finalizar e Aprovar OS (READY)
          </button>
        </div>
      </section>

      <section class="os-doc" *ngIf="!osAtual">
        <div class="os-section">
          <div class="os-section__head">
            <span class="os-section__num">01</span>
            <div>
              <h2>Dados do Evento e Localização</h2>
            </div>
          </div>

          <div class="field-grid">
            <div class="field">
              <label>Evento / projeto</label>
              <input [(ngModel)]="osForm.nome" placeholder="Ex: Festival de Verão" />
            </div>
            <div class="field">
              <label>Organizador / Fornecedor</label>
              <input [(ngModel)]="osForm.organizador" placeholder="Nome do fornecedor" />
            </div>
          </div>

          <div class="field-grid" style="margin-top: 15px;">
            <div class="field">
              <label>Data início (montagem)</label>
              <input type="date" [(ngModel)]="osForm.dataInicio" />
            </div>

            <div class="field">
              <label>Data fim (desmontagem)</label>
              <input type="date" [(ngModel)]="osForm.dataFim" />
            </div>
          </div>

          <div class="field-grid" style="margin-top: 15px;">
            <div class="field">
              <label>Unidade Operacional / Galpão</label>
              <select [(ngModel)]="selectedOperationalUnitId">
                <option value="">Selecione a unidade</option>
                <option *ngFor="let unit of operationalUnits()" [value]="unit.id">{{ unit.name }}</option>
              </select>
            </div>
          </div>

          <h4 style="margin: 25px 0 10px; font-size: 12px; color: #666; text-transform: uppercase;">Endereço de Entrega</h4>
          <div class="field-grid" style="grid-template-columns: 2fr 1fr;">
            <div class="field">
              <label>Rua / Logradouro</label>
              <input [(ngModel)]="osForm.street" placeholder="Av. Principal, 1000" />
            </div>
            <div class="field">
              <label>CEP</label>
              <input [(ngModel)]="osForm.zipCode" placeholder="00000-000" />
            </div>
          </div>
          
          <div class="field-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top: 15px;">
            <div class="field">
              <label>Cidade</label>
              <input [(ngModel)]="osForm.city" placeholder="Ex: São Paulo" />
            </div>
            <div class="field">
              <label>Estado (UF)</label>
              <select [(ngModel)]="osForm.state" style="padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);">
                <option value="">Selecione...</option>
                <option *ngFor="let uf of estados" [value]="uf">{{ uf }}</option>
              </select>
            </div>
            <div class="field">
              <label>Complemento</label>
              <input [(ngModel)]="osForm.descricao" placeholder="Galpão 2" />
            </div>
          </div>
        </div>

        <div class="os-section">
          <div class="os-section__head">
            <span class="os-section__num">02</span>
            <div>
              <h2>Estruturas e materiais</h2>
              <p>Componentes que serão planificados e enviados na OS.</p>
            </div>
          </div>

          <div class="add-row">
            <select [(ngModel)]="tipoItemSelecionado" class="add-row__select">
              <option value="estrutura">🏗️ Estrutura</option>
              <option value="material">📦 Material Avulso</option>
            </select>

            <select *ngIf="tipoItemSelecionado === 'estrutura'" [(ngModel)]="estruturaSelecionadaId" class="add-row__select">
              <option value="">— Escolha uma estrutura —</option>
              <option *ngFor="let est of estruturasDoBanco()" [value]="est.id">{{ est.name }}</option>
            </select>

            <select *ngIf="tipoItemSelecionado === 'material'" [(ngModel)]="materialSelecionadoId" class="add-row__select">
              <option value="">— Escolha um material —</option>
              <option *ngFor="let mat of materiaisDoBanco()" [value]="mat.id">{{ mat.name }}</option>
            </select>

            <button class="btn-secondary" (click)="adicionarItem()">Adicionar</button>
          </div>

          <div class="structures">
            <div *ngFor="let est of estruturasAdicionadas(); let gIndex = index" class="structure">
              <header class="structure__head">
                <div class="structure__title"><span>{{ est.name }}</span></div>
                <button class="btn-remove" (click)="removeEstrutura(gIndex)">Remover</button>
              </header>

              <table class="data-table inline-table">
                <thead>
                  <tr>
                    <th style="text-align: left;">Nome do material</th>
                    <th class="cell-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of est.templates">
                    <td class="locked-text" style="font-weight: 500;">📦 {{ getNomeMaterial(item.materialId) }}</td>
                    <td class="cell-right mono">{{ item.quantity }} UN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer class="os-doc__foot">
          <div class="foot-summary">
            <span class="foot-label">Total de pacotes / blocos</span>
            <span class="foot-value mono">{{ estruturasAdicionadas().length }}</span>
          </div>
          <button class="btn-primary btn-primary--large" [disabled]="isSaving()" (click)="finalizarOS()">
            <span>{{ isSaving() ? 'Salvando...' : 'Salvar OS como Rascunho (DRAFT)' }}</span>
          </button>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 28px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .eyebrow { display: block; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 3px; }
    .page-header__title h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-strong); margin: 0; }
    .page-header__title .subtitle { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
    .page-header__right { display: flex; gap: 8px; }
    .meta-pill { display: inline-flex; flex-direction: column; padding: 5px 12px; background: var(--surface-sunken); border: 1px solid var(--border); border-radius: var(--radius); line-height: 1.2; }
    .meta-pill__label { font-size: 9.5px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); }
    .meta-pill__value { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
    
    .os-page { padding: 24px 28px 36px; background: var(--bg-app); min-height: calc(100vh - 70px); }
    .os-doc { max-width: 900px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
    
    .os-section { padding: 25px 35px; border-bottom: 1px solid var(--border); }
    .os-section__head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
    .os-section__num { flex-shrink: 0; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; background: var(--vivere-orange-soft); color: var(--vivere-orange); border: 1px solid var(--vivere-orange-border); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
    .os-section__head h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-strong); letter-spacing: -0.1px; line-height: 28px; }
    .os-section__head p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-tertiary); }
    
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 11.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: baseline; }
    .field input, .field select { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 13.5px; color: var(--text-primary); transition: border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease); }
    .field input:focus, .field select:focus { outline: none; border-color: var(--vivere-orange); box-shadow: 0 0 0 3px rgba(255,102,0,0.12); }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

    .add-row { display: flex; gap: 8px; margin-bottom: 14px; }
    .add-row__select { flex: 1; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 13.5px; color: var(--text-primary); cursor: pointer; }
    .btn-secondary, .btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: var(--radius); font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all var(--duration) var(--ease); }
    .btn-secondary { background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); }
    .btn-secondary:hover:not(:disabled) { border-color: var(--border-strong); background: var(--surface-hover); }
    .btn-primary { background: var(--vivere-orange); color: white; border: 1px solid var(--vivere-orange); }
    .btn-primary:hover:not(:disabled) { background: var(--vivere-orange-hover); border-color: var(--vivere-orange-hover); }
    .btn-primary:disabled { background: var(--surface-sunken); color: var(--text-muted); border-color: var(--border); cursor: not-allowed; }
    
    .structures { display: flex; flex-direction: column; gap: 12px; }
    .structure { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface); }
    .structure__head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--surface-sunken); border-bottom: 1px solid var(--border); }
    .structure__title { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
    .btn-remove { padding: 4px 9px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 11.5px; font-weight: 500; cursor: pointer; }
    .btn-remove:hover { color: var(--status-danger); border-color: var(--status-danger-border); background: var(--status-danger-bg); }
    
    .inline-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .inline-table th { padding: 8px 14px; text-align: left; font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); border-bottom: 1px solid var(--border-subtle); }
    .inline-table td { padding: 9px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
    .cell-right { text-align: right; }
    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 12.5px; }
    
    .os-doc__foot { display: flex; align-items: center; justify-content: space-between; padding: 18px 35px; background: var(--surface-sunken); border-top: 1px solid var(--border); }
    .foot-summary { display: flex; flex-direction: column; line-height: 1.2; }
    .foot-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); }
    .foot-value { font-size: 18px; font-weight: 700; color: var(--text-strong); margin-top: 2px; }
    
    .badge { border-radius: var(--radius-sm); border: 1px solid; font-weight: 600; }
    .badge--info { color: var(--status-info); background: var(--status-info-bg); border-color: var(--status-info-border); }
    .badge--warn { color: var(--status-warning); background: var(--status-warning-bg); border-color: var(--status-warning-border); }
    .badge--danger { color: var(--status-danger); background: var(--status-danger-bg); border-color: var(--status-danger-border); }
    .badge--success { color: var(--status-success); background: var(--status-success-bg); border-color: var(--status-success-border); }
    .badge--neutral { color: var(--text-secondary); background: var(--surface-hover); border-color: var(--border-strong); }
  `]
})
export class OSListComponent implements OnInit {
  private materialService = inject(MaterialService);
  private osService = inject(ServiceOrderService);
  private operationalUnitService = inject(OperationalUnitService);
  private toastService = inject(ToastService); // INJEÇÃO DO TOAST
  public router = inject(Router);
  private destroyRef = inject(DestroyRef);

  today = new Date();
  isSaving = signal(false);
  osAtual: any = null;
   
  estados = [ 'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO' ];

  osForm = { 
    nome: '', organizador: '', dataInicio: '', dataFim: '', 
    street: '', city: '', state: '', zipCode: '', descricao: '' 
  };

  estruturasDoBanco = signal<any[]>([]);
  materiaisDoBanco = signal<any[]>([]);
  estruturaSelecionadaId = '';
  tipoItemSelecionado = 'estrutura';
  materialSelecionadoId = '';
  estruturasAdicionadas = signal<any[]>([]);
  selectedOperationalUnitId = '';
  operationalUnits = signal<any[]>([]);

  ngOnInit() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('Sem token');
      return;
    }
    
    this.operationalUnitService.getAll()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (data) => {
        this.operationalUnits.set(data);
        if (data.length > 0) {
          this.selectedOperationalUnitId = data[0].id;
        }
      },
      error: (err) => console.error(err)
    });

    this.materialService.getStructures()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.estruturasDoBanco.set(data));
      
    this.materialService.getMaterials()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.materiaisDoBanco.set(data));
  }

  getNomeMaterial(id: string): string {
    const mat = this.materiaisDoBanco().find(m => m.id === id);
    return mat ? mat.name : 'Material Desconhecido';
  }

  // CORREÇÃO: Função roteadora de ações do botão principal
  adicionarItem() {
    if (this.tipoItemSelecionado === 'estrutura') {
      this.addEstrutura();
    } else {
      this.addMaterialAvulso();
    }
  }

  addEstrutura() {
    if (!this.estruturaSelecionadaId) {
      this.toastService.warning("Por favor, selecione uma estrutura.");
      return;
    }
    const estrutura = this.estruturasDoBanco().find(e => e.id === this.estruturaSelecionadaId);
    if (estrutura) {
      // Usamos JSON parse/stringify para garantir que adicionamos uma CÓPIA INDEPENDENTE 
      // da estrutura, evitando bugs se a mesma for adicionada 2 vezes.
      this.estruturasAdicionadas.update(prev => [...prev, JSON.parse(JSON.stringify(estrutura))]);
      this.estruturaSelecionadaId = '';
    }
  }

  addMaterialAvulso() {
    if (!this.materialSelecionadoId) {
      this.toastService.warning("Por favor, selecione um material.");
      return;
    }
    const material = this.materiaisDoBanco().find((m: any) => m.id === this.materialSelecionadoId);
    if (!material) return;
    
    this.estruturasAdicionadas.update(lista => {
      // verifica se já existe na lista como avulso
      const existente = lista.find(item => item.id === material.id && item.isMaterialAvulso);
      // se existir → soma quantidade
      if (existente) {
        existente.templates[0].quantity++;
        return [...lista];
      }
      // se não existir → cria um pacote visual (mock) que finge ser uma estrutura para o HTML
      return [
        ...lista,
        {
          id: material.id,
          name: material.name,
          isMaterialAvulso: true,
          templates: [
            { materialId: material.id, quantity: 1 }
          ]
        }
      ];
    });

    this.materialSelecionadoId = '';
  }

  removeEstrutura(index: number) {
    this.estruturasAdicionadas.update(prev => prev.filter((_, i) => i !== index));
  }

  prepararPayloadItens() {
    const contadorMateriais: Record<string, number> = {};

    // Como padronizamos tanto Estruturas quanto Materiais Avulsos dentro de "estruturasAdicionadas",
    // apenas este bloco lida perfeitamente com toda a extração de dados!
    this.estruturasAdicionadas().forEach(est => {
      if (est.templates) {
        est.templates.forEach((template: any) => {
          const id = template.materialId;
          contadorMateriais[id] = (contadorMateriais[id] || 0) + template.quantity;
        });
      }
    });

    const payload = Object.keys(contadorMateriais).map(materialId => ({
      materialId: materialId,
      operationalUnitId: this.selectedOperationalUnitId,
      quantity: contadorMateriais[materialId]
    }));

    return payload;
  }

  finalizarOS() {
    if (!this.osForm.nome || !this.osForm.dataInicio) {
      this.toastService.warning("Preencha pelo menos o Nome do Evento e a Data de Início.");
      return;
    }

    if (!this.selectedOperationalUnitId) {
      this.toastService.warning("Selecione uma Unidade Operacional / Galpão responsável.");
      return;
    }

    this.isSaving.set(true);

    let startStr = this.osForm.dataInicio;
    if (!startStr.includes('T')) startStr += 'T12:00:00';
    let endStr = this.osForm.dataFim ? this.osForm.dataFim : this.osForm.dataInicio;
    if (!endStr.includes('T')) endStr += 'T12:00:00';

    const unifiedPayload: CreateOsPayload = {
      eventName: this.osForm.nome,
      startDate: new Date(startStr).toISOString(),
      endDate: new Date(endStr).toISOString(),
      supplier: this.osForm.organizador,
      street: this.osForm.street,
      city: this.osForm.city,
      state: this.osForm.state,
      zipCode: this.osForm.zipCode,
      items: this.prepararPayloadItens()
    };

    this.osService.createOS(unifiedPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (osCriada) => {
          this.toastService.success("Ordem de Serviço e Evento criados com sucesso.");
          this.osAtual = osCriada;
          this.isSaving.set(false);
        },
        error: (err) => { 
          this.toastService.error("Falha ao criar OS: " + (err.error?.message || 'Erro desconhecido.')); 
          this.isSaving.set(false); 
        }
      });
  }

  submeterOS() {
    this.osService.submitOS(this.osAtual.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (osAtualizada) => {
          this.osAtual = osAtualizada;
          this.toastService.info(`O status da OS mudou para: ${osAtualizada.status}`);
        },
        error: (err) => this.toastService.error(err.error?.message || "Erro ao processar.")
      });
  }

  finalizarAprovacao() {
    this.osService.finalizeOS(this.osAtual.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (osAtualizada) => {
          this.osAtual = osAtualizada;
          this.toastService.success("OS Validada e Pronta!");
        },
        error: (err) => this.toastService.error(err.error?.message || "Erro ao finalizar OS.")
      });
  }

  voltarParaCriacao() {
    this.osAtual = null;
    this.osForm = { nome: '', organizador: '', dataInicio: '', dataFim: '', street: '', city: '', state: '', zipCode: '', descricao: '' };
    this.estruturasAdicionadas.set([]);
  }
}