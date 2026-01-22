import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { saveAs } from 'file-saver';

import { DataService } from '../../services/data.service';
import { OrderDetailsComponent } from '../order-details/order-details.component';

type OrdersDateRange = 'all' | '7d' | '30d' | 'ytd' | 'custom';

@Component({
  selector: 'lib-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    OrderDetailsComponent
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  /* =======================
     DATA
  ======================= */
  orders: any[] = [];
  filteredOrders: any[] = [];
  selectedOrder: any = null;

  /* =======================
     FILTER STATE
  ======================= */
  searchTerm = '';
  activeRange: OrdersDateRange = 'all';
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  readonly RANGE_PRESETS: Array<'all' | '7d' | '30d' | 'ytd'> = [
    'all',
    '7d',
    '30d',
    'ytd'
  ];

  /* =======================
     METRICS
  ======================= */
  totalOrders = 0;
  totalAmount = 0;
  avgOrderAmount = 0;

  constructor(private dataService: DataService) {}

  /* =======================
     INIT
  ======================= */
  ngOnInit(): void {
    this.dataService.orders$.subscribe(orders => {
      this.orders = orders ?? [];
      this.applyFilters();
    });
  }

  /* =======================
     FILTER PIPELINE
  ======================= */
  applyFilters(): void {
    let data = [...this.orders];

    // 🔍 Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(o =>
        `${o.Customer?.fname ?? ''} ${o.Customer?.lname ?? ''} ${o.id} ${o.pos_order_id ?? ''}`
          .toLowerCase()
          .includes(term)
      );
    }

    // 📅 Date filter
    data = this.applyDateFilter(data);

    this.filteredOrders = data;
    this.calculateMetrics();
  }

  private applyDateFilter(data: any[]): any[] {
    if (this.activeRange === 'all') return data;

    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (this.activeRange) {
      case '7d':
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;

      case '30d':
        from = new Date(now);
        from.setDate(now.getDate() - 30);
        break;

      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1);
        break;

      case 'custom':
        if (this.customStartDate && this.customEndDate) {
          from = new Date(this.customStartDate);
          to = new Date(this.customEndDate);
          to.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (!from) return data;

    from.setHours(0, 0, 0, 0);

    return data.filter(o => {
      const d = new Date(o.createdAt);
      return to ? d >= from! && d <= to : d >= from!;
    });
  }

  /* =======================
     RANGE ACTIONS
  ======================= */
  setRange(range: 'all' | '7d' | '30d' | 'ytd'): void {
    this.activeRange = range;
    this.customStartDate = null;
    this.customEndDate = null;
    this.applyFilters();
  }

  applyCustomRange(): void {
    if (!this.customStartDate || !this.customEndDate) return;
    this.activeRange = 'custom';
    this.applyFilters();
  }

  clearRange(): void {
    this.activeRange = 'all';
    this.customStartDate = null;
    this.customEndDate = null;
    this.applyFilters();
  }

  /* =======================
     METRICS
  ======================= */
  private calculateMetrics(): void {
    const data = this.filteredOrders;

    this.totalOrders = data.length;
    this.totalAmount = data.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0
    );

    this.avgOrderAmount =
      this.totalOrders > 0 ? this.totalAmount / this.totalOrders : 0;
  }

  get pendingTotal(): number {
    return this.filteredOrders
      .filter(o => !o.status || o.status === 'pending')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }

  /* =======================
     UI ACTIONS
  ======================= */
  selectOrder(order: any): void {
    this.selectedOrder = order;
  }

  clearSelection(): void {
    this.selectedOrder = null;
  }

  /* =======================
     EXPORT
  ======================= */
  exportToCSV(): void {
    if (!this.filteredOrders.length) return;

    const data = this.filteredOrders.map(o => ({
      ID: o.id,
      Customer: `${o.Customer?.fname ?? ''} ${o.Customer?.lname ?? ''}`,
      POS: o.pos_order_id,
      Status: o.status || 'Pending',
      Total: o.total_amount,
      Date: new Date(o.createdAt).toLocaleString()
    }));

    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data
      .map(row => Object.values(row).map(v => `"${v}"`).join(','))
      .join('\n');

    saveAs(
      new Blob([header + rows], { type: 'text/csv;charset=utf-8;' }),
      `Orders_${new Date().toISOString().slice(0, 10)}.csv`
    );
  }
}
