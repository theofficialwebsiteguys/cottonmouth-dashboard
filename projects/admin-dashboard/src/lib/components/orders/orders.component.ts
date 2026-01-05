import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { saveAs } from 'file-saver';

import { DataService } from '../../services/data.service';
import { OrderDetailsComponent } from '../order-details/order-details.component';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';

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
    OrderDetailsComponent,
    MatInputModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  filteredOrdersCache: any[] = [];
  selectedOrder: any = null;

  searchTerm = '';
  customStartDate: Date | null = null;
  customEndDate: Date | null = null;

  // Metrics
  topProduct = '';
  topCategory = '';
  topBrand = '';
  totalOrders = 0;
  totalAmount = 0;
  avgOrderAmount = 0;
  avgDailySales = 0;
  avgWeeklySales = 0;
  avgMonthlySales = 0;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.orders$.subscribe(orders => {
      this.orders = orders || [];
      this.filteredOrdersCache = this.orders; // ← IMPORTANT
      this.calculateMetrics();
    });
  }

  /* =======================
     FILTERED ORDERS (FINAL)
  ======================= */
  get filteredOrders(): any[] {
    return this.filteredOrdersCache.filter(order =>
      `${order.Customer?.fname ?? ''} 
       ${order.Customer?.lname ?? ''} 
       ${order.id} 
       ${order.pos_order_id ?? ''}`
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase())
    );
  }

  /* =======================
     DATE RANGE APPLY
  ======================= */
  applyCustomRange() {
    if (!this.customStartDate || !this.customEndDate) return;

    const start = new Date(this.customStartDate);
    const end = new Date(this.customEndDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    this.filteredOrdersCache = this.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });
  }

  /* =======================
     CLEAR RANGE (OPTIONAL)
  ======================= */
  clearRange() {
    this.customStartDate = null;
    this.customEndDate = null;
    this.filteredOrdersCache = this.orders;
  }

  /* =======================
     CSV EXPORT
  ======================= */
  exportToCSV() {
    const data = this.filteredOrders.map(order => ({
      ID: order.id,
      Customer: `${order.Customer?.fname ?? ''} ${order.Customer?.lname ?? ''}`,
      POS: order.pos_order_id,
      Status: order.status || 'Pending',
      Total: order.total_amount,
      Date: new Date(order.createdAt).toLocaleString()
    }));

    if (!data.length) return;

    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data
      .map(row => Object.values(row).map(v => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Orders_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  /* =======================
     METRICS (UNCHANGED)
  ======================= */
  calculateMetrics() {
    this.totalOrders = this.orders.length;
    this.totalAmount = 0;

    const productCount: any = {};
    const categoryCount: any = {};
    const brandCount: any = {};

    this.orders.forEach(order => {
      this.totalAmount += Number(order.total_amount || 0);

      order.items?.forEach((item: any) => {
        productCount[item.title] = (productCount[item.title] || 0) + item.quantity;
        categoryCount[item.category] = (categoryCount[item.category] || 0) + item.quantity;
        brandCount[item.brand] = (brandCount[item.brand] || 0) + item.quantity;
      });
    });

    this.avgOrderAmount =
      this.totalOrders > 0 ? this.totalAmount / this.totalOrders : 0;

    this.topProduct = this.getTopKey(productCount);
    this.topCategory = this.getTopKey(categoryCount);
    this.topBrand = this.getTopKey(brandCount);

    this.calculateSalesAverages();
  }

  getTopKey(map: any): string {
    return Object.keys(map).reduce((a, b) => (map[a] > map[b] ? a : b), '');
  }

  calculateSalesAverages() {
    const daily = new Map<string, number>();
    const weekly = new Map<string, number>();
    const monthly = new Map<string, number>();

    this.orders.forEach(order => {
      const date = new Date(order.createdAt);
      const dayKey = date.toISOString().split('T')[0];

      daily.set(dayKey, (daily.get(dayKey) || 0) + order.total_amount);

      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weekly.set(weekKey, (weekly.get(weekKey) || 0) + order.total_amount);

      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthly.set(monthKey, (monthly.get(monthKey) || 0) + order.total_amount);
    });

    this.avgDailySales = this.avgFromMap(daily);
    this.avgWeeklySales = this.avgFromMap(weekly);
    this.avgMonthlySales = this.avgFromMap(monthly);
  }

  avgFromMap(map: Map<string, number>) {
    const values = Array.from(map.values());
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  /* =======================
     UI ACTIONS
  ======================= */
  selectOrder(order: any) {
    this.selectedOrder = order;
  }

  clearSelection() {
    this.selectedOrder = null;
  }

  get pendingTotal(): number {
    return this.filteredOrdersCache
      .filter(o => !o.status || o.status === 'pending')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
  }
}
