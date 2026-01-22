import { Component, ViewChild } from '@angular/core';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartConfiguration, ChartData, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';


Chart.register(...registerables);

@Component({
  selector: 'lib-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, BaseChartDirective, MatDialogModule, MatTableModule, MatSortModule, MatButtonModule, MatOptionModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatInputModule, MatNativeDateModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  allOrders: any[] = [];
  allUsers: any[] = [];
  
  totalOrders: number = 0;
  totalRevenue: number = 0;
  avgOrderValue: number = 0;
  avgDailySales: number = 0;
  avgWeeklySales: number = 0;
  avgMonthlySales: number = 0;
  topProduct: string = '';
  topCategory: string = '';
  topBrand: string = '';

  salesChartData: ChartData<'line'> = { datasets: [] };
  categoryChartData: ChartData<'pie'> = { datasets: [] };
  topProductsChartData: ChartData<'bar'> = { datasets: [] };
  peakHoursChartData: ChartData<'line'> = { datasets: [] };
  employeeSalesChartData: ChartData<'bar'> = { datasets: [] };  // ✅ Fixed missing property
  customerRetentionTrendData: ChartData<'line'> = { datasets: [] };
  loyaltyRedemptionsChartData: ChartData<'bar'> = { datasets: [] };

  latestNewCustomers = 0;
  latestReturningCustomers = 0;
  latestDormantCustomers = 0;


  private readonly gridColor = 'rgba(17, 24, 39, 0.08)';   // subtle gray
  private readonly tickColor = 'rgba(17, 24, 39, 0.55)';
  private readonly titleColor = '#111827';

  chartOptions: ChartOptions<'line' | 'pie' | 'bar' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: this.tickColor,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { size: 12, weight: 600 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: true,
        cornerRadius: 10,
        callbacks: {
          // optional: format numbers nicely
          label: (ctx: any) => {
            const label = ctx.dataset?.label ? `${ctx.dataset.label}: ` : '';
            const val = ctx.raw;
            if (typeof val === 'number') {
              return label + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
            }
            return label + val;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: this.gridColor, drawTicks: false },
        ticks: {
          color: this.tickColor,
          maxTicksLimit: 8
        },
        border: { display: false }
      },
      y: {
        grid: { color: this.gridColor, drawTicks: false },
        ticks: {
          color: this.tickColor,
          font: { size: 11 },
          callback: (v: any) => {
            // if these are dollars
            const num = Number(v);
            if (Number.isFinite(num)) return '$' + num.toLocaleString();
            return v;
          }
        },
        border: { display: false }
      }
    },
    elements: {
      line: { tension: 0.35, borderWidth: 2 },
      point: { radius: 0, hoverRadius: 5, hitRadius: 12 }
    }
  };

  pieChartOptions: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true, // 🔑 CRITICAL
    aspectRatio: 1.4,          // nice wide look
    plugins: {
      legend: {
        position: 'right',     // 🔑 avoids vertical squash
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          font: {
            size: 12,
            weight: 600
          },
          color: this.tickColor,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 10
      }
    }
  };

  retentionChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: this.tickColor,
          font: { size: 12, weight: 600 },
          usePointStyle: true,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw;
            return `${ctx.dataset.label}: ${val.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: this.tickColor }
      },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        ticks: {
          color: this.tickColor,
          callback: (v: any) => `${v}%`
        },
        grid: {
          color: 'rgba(17, 24, 39, 0.06)'
        }
      }
    },
    elements: {
      line: { tension: 0.35, borderWidth: 1.5 },
      point: { radius: 0 }
    }
  };


  topCategories: { name: string; sales: number }[] = [];
  topProducts: { name: string; sales: number }[] = [];
  top5Products: { name: string; sales: number }[] = [];

  allProductSales: {
    title: string;
    category: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
    avgUnitsPerOrder: number;
    percentOfTotalUnits: number;
    percentOfTotalRevenue: number;
  }[] = [];

  metricsRanges = [
    { label: 'YTD', value: 'ytd' },
    { label: '30D', value: '30d' },
    { label: '7D', value: '7d' },
    { label: 'Custom', value: 'custom' }
  ] as const;

  showModal = false;

  sortColumn: string = 'revenue';
  sortDirection: 'asc' | 'desc' = 'desc';

  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'title',
    'category',
    'unitsSold',
    'revenue',
    'avgUnitsPerOrder',
    'percentOfTotalRevenue'
  ];

  productSalesDataSource = new MatTableDataSource<any>();

  tabs: string[] = [
    'Overall Sales',
    'Product Metrics',
    'Loyalty Users'
  ];
  selectedTab = 0;
  selectedDateRange: string = '30d';
  selectedMetricsRange: string = 'ytd';

  customStartDate: Date | null = null;
customEndDate: Date | null = null;


  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    combineLatest([
      this.dataService.orders$,
      this.dataService.users$
    ]).subscribe(([orders, users]) => {
      this.allOrders = orders;
      this.allUsers = users;
  
      // Now safe to generate retention and metrics
      this.generateCustomerRetentionTrend(this.allUsers, this.allOrders);
  
      this.calculateMetrics(orders);
      this.calculateSalesAverages(orders);
      this.generateSalesChart(orders);
      this.generateCategoryChart(orders);
      this.generateTopProductsChart(orders);
      this.generatePeakHoursChart(orders);
    });
  
  
    this.dataService.employeeOrders$.subscribe(employeeOrders => {
      if (employeeOrders.length) {
        this.generateEmployeeSalesChart(employeeOrders);
      }
    });
  
    // this.dataService.fetchOrdersData().subscribe();
    // this.dataService.fetchOrdersByEmployeesData().subscribe();
    // this.dataService.fetchUserData().subscribe();

    this.chartOptions = {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (tooltipItem: any) => {
              const categoryIndex = tooltipItem.dataIndex;
              const categoryName = this.categoryChartData?.labels?.[categoryIndex] ?? 'Unknown';
              const topProduct = this.topProducts?.[categoryIndex];
    
              const tooltipLines = [`Value: ${tooltipItem.raw}`];
    
              if (topProduct) {
                tooltipLines.push(`Top Product: ${topProduct.name} (${topProduct.sales})`);
              }
    
              return tooltipLines; // Returning an array ensures each line is rendered separately
            }
          }
        }
      }
    };
    
    // Apply default range filter on init
    this.onDateRangeChange(this.selectedDateRange);

  }
  
  setMetricsRange(range: 'ytd' | '30d' | '7d' | 'custom') {
    this.selectedMetricsRange = range;

    if (range !== 'custom') {
      this.customStartDate = null;
      this.customEndDate = null;
      this.onMetricsRangeChange(range);
    }
  }

  openProductBreakdownModal() {
    const productMap: { [key: string]: {
      title: string;
      category: string;
      unitsSold: number;
      revenue: number;
      orderCount: number;
    }} = {};
  
    let totalUnitsSold = 0;
    let totalRevenue = 0;
  
    this.dataService.orders$.subscribe(orders => {
      orders.forEach(order => {
        order.items.forEach((item: any) => {
          const key = `${item.title}-${item.category}`;
          if (!productMap[key]) {
            productMap[key] = {
              title: item.title,
              category: item.category,
              unitsSold: 0,
              revenue: 0,
              orderCount: 0
            };
          }
          productMap[key].unitsSold += item.quantity;
          productMap[key].revenue += item.quantity * item.price;
          productMap[key].orderCount += 1;
  
          totalUnitsSold += item.quantity;
          totalRevenue += item.quantity * item.price;
        });
      });


  
      // Prepare final metrics list
      this.allProductSales = Object.values(productMap)
        .map(product => ({
          ...product,
          avgUnitsPerOrder: product.unitsSold / product.orderCount,
          percentOfTotalUnits: (product.unitsSold / totalUnitsSold) * 100,
          percentOfTotalRevenue: (product.revenue / totalRevenue) * 100
        }))
        .sort((a, b) => b.revenue - a.revenue); // sort by top earning
  
        this.productSalesDataSource.data = this.allProductSales;
        this.showModal = true;
        console.log("here")
        setTimeout(() => {
          this.productSalesDataSource.sort = this.sort;
        });
        
    });
  }

  calculateMetrics(orders: any[]) {
    let productCount: { [key: string]: number } = {};
    let categoryCount: { [key: string]: number } = {};
    let totalSales = 0;
  
    orders.forEach(order => {
      totalSales += parseFloat(order.total_amount);
      this.totalOrders++;
  
      order.items.forEach((item: any) => {
        productCount[item.title] = (productCount[item.title] || 0) + item.quantity;
        categoryCount[item.category] = (categoryCount[item.category] || 0) + item.quantity;
      });
    });
  
    this.totalRevenue = totalSales;
    this.avgOrderValue = this.totalOrders ? this.totalRevenue / this.totalOrders : 0;
  
    this.topCategories = Object.entries(categoryCount)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  
    this.top5Products = Object.entries(productCount)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }
  

  calculateSalesAverages(orders: any[]) {
    if (!orders.length) return;

    // Convert order dates to Date objects
    const ordersWithDates = orders.map((order: any) => ({
        ...order,
        date: new Date(order.createdAt),
    }));

    // Create a map to store total sales per unique day
    const dailySalesMap = new Map<string, number>();
    const weeklySalesMap = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    ordersWithDates.forEach(order => {
        const orderDate = new Date(order.date);
        orderDate.setHours(0, 0, 0, 0); // Normalize time for comparison
        const dateKey = orderDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD

        // Sum up daily sales
        dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) || 0) + order.total_amount);

        // Determine the start of the week for each order
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay()); // Get Sunday of the week
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split("T")[0]; // Format: YYYY-MM-DD

        // Sum up weekly sales
        weeklySalesMap.set(weekKey, (weeklySalesMap.get(weekKey) || 0) + order.total_amount);
    });

    // Calculate cumulative daily average
    const totalDailySales = Array.from(dailySalesMap.values()).reduce((sum, value) => sum + value, 0);
    const totalDays = dailySalesMap.size; // Number of unique days with sales
    this.avgDailySales = totalDays > 0 ? totalDailySales / totalDays : 0;

    // Calculate cumulative weekly average
    const totalWeeklySales = Array.from(weeklySalesMap.values()).reduce((sum, value) => sum + value, 0);
    const totalWeeks = weeklySalesMap.size; // Number of unique weeks with sales
    this.avgWeeklySales = totalWeeks > 0 ? totalWeeklySales / totalWeeks : 0;

    // Calculate cumulative monthly average
    const monthlySalesMap = new Map<string, number>();

    ordersWithDates.forEach(order => {
        const orderDate = new Date(order.date);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`; // Format: YYYY-MM

        // Sum up monthly sales
        monthlySalesMap.set(monthKey, (monthlySalesMap.get(monthKey) || 0) + order.total_amount);
    });

    const totalMonthlySales = Array.from(monthlySalesMap.values()).reduce((sum, value) => sum + value, 0);
    const totalMonths = monthlySalesMap.size; // Number of unique months with sales
    this.avgMonthlySales = totalMonths > 0 ? totalMonthlySales / totalMonths : 0;
  }

  generateSalesChart(orders: any[]) {
    const salesOverTime: Record<string, number> = {};

    orders.forEach(o => {
      const d = new Date(o.createdAt).toISOString().split('T')[0];
      salesOverTime[d] = (salesOverTime[d] || 0) + Number(o.total_amount);
    });

    this.salesChartData = {
      labels: Object.keys(salesOverTime),
      datasets: [
        {
          label: 'Sales',
          data: Object.values(salesOverTime),
          borderColor: '#6E9277',
          backgroundColor: 'rgba(110, 146, 119, 0.18)',
          fill: true
        }
      ]
    };
  }


  generateCategoryChart(orders: any[]) {
    const categoryData: { 
      [key: string]: { 
        totalSales: number; 
        productSales: { [product: string]: number }; // Track total sales for each product 
      } 
    } = {};
  
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (!categoryData[item.category]) {
          categoryData[item.category] = {
            totalSales: 0,
            productSales: {}
          };
        }
  
        // Aggregate total sales per category
        categoryData[item.category].totalSales += item.quantity;
  
        // Aggregate total sales per product in the category
        if (!categoryData[item.category].productSales[item.title]) {
          categoryData[item.category].productSales[item.title] = 0;
        }
        categoryData[item.category].productSales[item.title] += item.quantity;
      });
    });
  
    // Prepare chart labels, data, and top products
    const labels = Object.keys(categoryData);
    const totalSalesData = labels.map(category => categoryData[category].totalSales);
    
    // Determine the top-selling product per category
    const topProducts = labels.map(category => {
      const products = categoryData[category].productSales;
      const topProduct = Object.entries(products).reduce((a, b) => (b[1] > a[1] ? b : a)); // Find max sold product
      return { name: topProduct[0], sales: topProduct[1] }; // Fix: Renamed quantity to sales
    });
  
    this.categoryChartData = {
      labels, // Keep only category names
      datasets: [
        {
          label: 'Category Sales',
          data: totalSalesData,
          backgroundColor: [
            '#6E9277',
            '#9BB6A3',
            '#C7D9CE',
            '#E3EEE8',
            '#BFD1C5'
          ],
          borderWidth: 0

        }
      ]
    };
  
    // Store top products for tooltip customization
    this.topProducts = topProducts;
  }
  
  
  
  

  generateTopProductsChart(orders: any[]) {
    const productCount: { [key: string]: number } = {};

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        productCount[item.title] = (productCount[item.title] || 0) + item.quantity;
      });
    });

    const sortedProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.topProductsChartData = {
      labels: sortedProducts.map(p => p[0]),
      datasets: [
        {
          label: 'Top 10 Products Sold',
          data: sortedProducts.map(p => p[1]),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  generatePeakHoursChart(orders: any[]) {
    const hoursMap: { [hour: string]: number } = {};
  
    for (let i = 0; i < 24; i++) hoursMap[i.toString()] = 0; // Initialize all hours
  
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hoursMap[hour.toString()] += order.total_amount;
    });
  
    this.peakHoursChartData = {
      labels: Object.keys(hoursMap),
      datasets: [
        {
          label: 'Sales / Hour',
          data: Object.values(hoursMap),
          borderColor: '#111827',
          backgroundColor: 'rgba(17, 24, 39, 0.08)',
          fill: true
        }
      ]
    };

  }

  generateCustomerRetentionTrend(users: any[], orders: any[]) {
    if (!orders.length) return;

    // ---------------------------------------------
    // 1️⃣ Build user purchase history
    // ---------------------------------------------
    const userHistory: Record<string, { first: string; last: string }> = {};

    orders.forEach(order => {
      if (!order.createdAt || !order.user_id) return;

      const month = new Date(order.createdAt).toISOString().slice(0, 7);
      const id = order.user_id;

      if (!userHistory[id]) {
        userHistory[id] = { first: month, last: month };
      } else {
        userHistory[id].last = month;
      }
    });

    // ---------------------------------------------
    // 2️⃣ Build full month range (ALL TIME)
    // ---------------------------------------------
    const firstOrderMonth = Object.values(userHistory)
      .map(u => u.first)
      .sort()[0];

    const start = new Date(firstOrderMonth + '-01');
    const end = new Date();

    const months: string[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      months.push(cursor.toISOString().slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // ---------------------------------------------
    // 3️⃣ Classify users PER MONTH
    // ---------------------------------------------
    const newData: number[] = [];
    const returningData: number[] = [];
    const inactiveData: number[] = [];

    months.forEach(month => {
      let newCount = 0;
      let returningCount = 0;
      let inactiveCount = 0;

      Object.values(userHistory).forEach(user => {
        if (user.first === month) {
          newCount++;
        } else if (user.last === month) {
          returningCount++;
        } else if (user.last < month) {
          inactiveCount++;
        }
      });

      const total = newCount + returningCount + inactiveCount || 1;

      newData.push((newCount / total) * 100);
      returningData.push((returningCount / total) * 100);
      inactiveData.push((inactiveCount / total) * 100);
    });

    // ---------------------------------------------
    // 4️⃣ Latest summary values (for UI)
    // ---------------------------------------------
    const lastIndex = months.length - 1;

    this.latestNewCustomers = Number(newData[lastIndex].toFixed(1));
    this.latestReturningCustomers = Number(returningData[lastIndex].toFixed(1));
    this.latestDormantCustomers = Number(inactiveData[lastIndex].toFixed(1));

    // ---------------------------------------------
    // 5️⃣ Assign chart data (STACKED % AREA)
    // ---------------------------------------------
    this.customerRetentionTrendData = {
      labels: months,
      datasets: [
        {
          label: 'New',
          data: newData,
          backgroundColor: 'rgba(110, 146, 119, 0.6)',
          borderColor: '#6E9277',
          fill: true,
          stack: 'retention'
        },
        {
          label: 'Returning',
          data: returningData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: '#3B82F6',
          fill: true,
          stack: 'retention'
        },
        {
          label: 'Inactive',
          data: inactiveData,
          backgroundColor: 'rgba(239, 68, 68, 0.55)',
          borderColor: '#EF4444',
          fill: true,
          stack: 'retention'
        }
      ]
    };
  }


  private getMonthRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      months.push(current.toISOString().slice(0, 7)); // YYYY-MM
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  
  

  generateEmployeeSalesChart(employeeOrders: any[]) {
    const employeeSales = employeeOrders.map(employee => ({
      name: `${employee.fname} ${employee.lname}`,
      sales: employee.EmployeeOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount), 0),
    }));
  
    employeeSales.sort((a, b) => b.sales - a.sales);
  
    this.employeeSalesChartData = {
      labels: employeeSales.map(emp => emp.name),
      datasets: [
        {
          label: 'Total Sales per Employee ($)',
          data: employeeSales.map(emp => emp.sales),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  }
  
  onDateRangeChange(range: string) {
    const now = new Date();
    let fromDate = new Date();
  
    switch (range) {
      case '7d':
        fromDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(now.getDate() - 30);
        break;
      default:
        return;
    }
  
    this.filterSalesData(fromDate, now);
  }
  
  filterSalesData(from: Date, to: Date) {
    const filtered = this.allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= from && d <= to;
    });

    this.generateSalesChart(filtered);
    this.generatePeakHoursChart(filtered);
    this.chart?.update(); // make sure redraw happens
  }

  onMetricsRangeChange(range: string) {
    const now = new Date();
    let from = new Date();

    switch (range) {
      case '30d':
        from.setDate(now.getDate() - 30);
        break;
      case '7d':
        from.setDate(now.getDate() - 7);
        break;
      case 'custom':
        return; // wait for Apply button
      case 'ytd':
      default:
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // 🔥 ONE RANGE → EVERYTHING
    this.filterMetricsData(from, now);
    this.filterSalesData(from, now);
  }

  
  filterMetricsData(from: Date, to: Date) {
    const filtered = this.allOrders.filter(order => {
      const date = new Date(order.createdAt);
      return date >= from && date <= to;
    });
  
    // Reset the metrics before recalculating
    this.totalOrders = 0;
    this.totalRevenue = 0;
    this.avgOrderValue = 0;
    this.avgDailySales = 0;
    this.avgWeeklySales = 0;
    this.avgMonthlySales = 0;
  
    this.calculateMetrics(filtered);
    this.calculateSalesAverages(filtered);
  }
  
  applyCustomRange() {
    if (!this.customStartDate || !this.customEndDate) return;

    const start = new Date(this.customStartDate);
    const end = new Date(this.customEndDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    this.filterMetricsData(start, end);
    this.filterSalesData(start, end);
  }

}

