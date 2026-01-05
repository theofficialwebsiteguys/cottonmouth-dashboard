import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';

import { DataService } from '../../services/data.service';
import { UserDetailComponent } from '../user-detail/user-detail.component';
import { OrderDetailsComponent } from '../order-details/order-details.component';

@Component({
  selector: 'lib-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UserDetailComponent,
    OrderDetailsComponent
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {

  users: any[] = [];
  orders: any[] = [];
  filteredUsers: any[] = [];

  selectedUser: any = null;
  selectedOrder: any = null;

  searchTerm = '';

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.fetchUserData().subscribe();
    this.dataService.fetchOrdersData().subscribe();

    this.dataService.users$.subscribe(users => {
      this.users = users || [];
      this.syncUsers();
    });

    this.dataService.orders$.subscribe(orders => {
      this.orders = orders || [];
      this.syncUsers();
    });
  }

  /* ============================
     DATA SYNC
  ============================ */
  syncUsers() {
    if (!this.users.length || !this.orders.length) return;

    this.filteredUsers = this.users.map(user =>
      this.enrichUserData(user)
    );
  }

  /* ============================
     SEARCH FILTER
  ============================ */
  get displayedUsers(): any[] {
    if (!this.searchTerm) return this.filteredUsers;

    const term = this.searchTerm.toLowerCase();

    return this.filteredUsers.filter(user => {
      return [
        user.id,
        user.fname,
        user.lname,
        user.email,
        user.phone,
        user.points,
        user.averageSpend,
        user.totalSpent
      ]
        .filter(v => v !== null && v !== undefined)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }


  /* ============================
     CSV EXPORT
  ============================ */
  exportToCSV() {
    if (!this.filteredUsers.length) return;

    const data = this.filteredUsers.map(user => ({
      ID: user.id,
      Name: `${user.fname} ${user.lname}`,
      Email: user.email,
      Phone: user.phone,
      Points: user.points,
      'Most Ordered Product': user.mostOrderedProduct,
      'Most Ordered Category': user.mostOrderedCategory,
      'Average Spend': user.averageSpend,
      'Total Spent': user.totalSpent,
      'Created At': user.createdAt
    }));

    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data
      .map(row => Object.values(row).map(v => `"${v}"`).join(','))
      .join('\n');

    const blob = new Blob([header + rows], {
      type: 'text/csv;charset=utf-8;'
    });

    saveAs(blob, `Users_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  /* ============================
     USER ENRICHMENT
  ============================ */
  enrichUserData(user: any) {
    const userOrders = this.orders.filter(o => o.user_id === user.id);

    if (!userOrders.length) {
      return {
        ...user,
        mostOrderedProduct: 'N/A',
        mostOrderedCategory: 'N/A',
        averageSpend: '0.00',
        totalSpent: '0.00',
        orders: []
      };
    }

    const allItems = userOrders.flatMap(o => o.items || []);

    const productCounts = this.countOccurrences(allItems, 'title');
    const categoryCounts = this.countOccurrences(allItems, 'category');

    const totalSpent = userOrders.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0
    );

    return {
      ...user,
      mostOrderedProduct: this.getMostFrequent(productCounts),
      mostOrderedCategory: this.getMostFrequent(categoryCounts),
      averageSpend: (totalSpent / userOrders.length).toFixed(2),
      totalSpent: totalSpent.toFixed(2),
      orders: userOrders
    };
  }

  countOccurrences(items: any[], key: string) {
    return items.reduce((acc, item) => {
      const value = item[key];
      if (value) acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  getMostFrequent(counts: Record<string, number>): string {
    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    );
  }

  /* ============================
     UI ACTIONS
  ============================ */
  selectUser(user: any) {
    this.selectedUser = user;
    this.selectedOrder = null;
  }

  selectOrder(order: any) {
    this.selectedOrder = order;
  }

  closeDetail() {
    if (this.selectedOrder) {
      this.selectedOrder = null;
    } else {
      this.selectedUser = null;
    }
  }
}
