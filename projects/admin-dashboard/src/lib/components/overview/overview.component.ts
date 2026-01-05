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

  chartOptions: ChartOptions<'line' | 'pie' | 'bar' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
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
    'Loyalty Users',
    'Budtender Metrics'
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
    const salesOverTime: { [date: string]: number } = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      salesOverTime[date] = (salesOverTime[date] || 0) + order.total_amount;
    });

    this.salesChartData = {
      labels: Object.keys(salesOverTime),
      datasets: [
        {
          label: 'Sales Over Time',
          data: Object.values(salesOverTime),
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.1)',
          fill: true,
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
            '#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff',
            '#ff9f40', '#ff6384', '#c9cbcf', '#ff6384', '#4bc0c0'
          ],
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
          label: 'Sales Per Hour ($)',
          data: Object.values(hoursMap),
          borderColor: 'red',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true
        }
      ]
    };
  }

  
generateCustomerRetentionTrend(users: any[], orders: any[]) {
    const retentionData: { 
        [month: string]: { newCustomers: Set<string>; returningCustomers: Set<string>; dormantCustomers: Set<string> } 
    } = {};

    const userFirstPurchase: { [userId: string]: string } = {};
    const lastPurchase: { [userId: string]: string } = {};

    orders.forEach(order => {
        if (!order.createdAt) return;
        const date = new Date(order.createdAt);
        if (isNaN(date.getTime())) return;
        
        const month = date.toISOString().slice(0, 7);
        if (!userFirstPurchase[order.user_id]) {
            userFirstPurchase[order.user_id] = month;
        }
        lastPurchase[order.user_id] = month;
    });

    const currentDate = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 7);

    users.forEach(user => {
        const userId = user.id;
        if (!lastPurchase[userId] || lastPurchase[userId] > sixMonthsAgoStr) return;
        
        const inactiveMonth = new Date(lastPurchase[userId]);
        inactiveMonth.setMonth(inactiveMonth.getMonth() + 6);
        const inactiveMonthStr = inactiveMonth.toISOString().slice(0, 7);

        if (!retentionData[inactiveMonthStr]) {
            retentionData[inactiveMonthStr] = { newCustomers: new Set(), returningCustomers: new Set(), dormantCustomers: new Set() };
        }
        retentionData[inactiveMonthStr].dormantCustomers.add(userId);
    });

    orders.forEach(order => {
        const userId = order.user_id;
        if (!order.createdAt) return;
        
        const orderMonth = new Date(order.createdAt).toISOString().slice(0, 7);
        const firstPurchaseMonth = userFirstPurchase[userId];

        if (!retentionData[orderMonth]) {
            retentionData[orderMonth] = { newCustomers: new Set(), returningCustomers: new Set(), dormantCustomers: new Set() };
        }

        if (orderMonth === firstPurchaseMonth) {
            retentionData[orderMonth].newCustomers.add(userId);
        } else {
            retentionData[orderMonth].returningCustomers.add(userId);
        }
    });

    const labels = Object.keys(retentionData).sort(); 

    const totalUsersEachMonth = labels.map(month => {
        return (retentionData[month]?.newCustomers.size || 0) + 
               (retentionData[month]?.returningCustomers.size || 0) +
               (retentionData[month]?.dormantCustomers.size || 0);
    });

    const newCustomersData = labels.map((month, index) => 
        totalUsersEachMonth[index] ? ((retentionData[month]?.newCustomers.size || 0) / totalUsersEachMonth[index]) * 100 : 0
    );

    const returningCustomersData = labels.map((month, index) => 
        totalUsersEachMonth[index] ? ((retentionData[month]?.returningCustomers.size || 0) / totalUsersEachMonth[index]) * 100 : 0
    );

    const dormantCustomersData = labels.map((month, index) =>
        totalUsersEachMonth[index] ? ((retentionData[month]?.dormantCustomers.size || 0) / totalUsersEachMonth[index]) * 100 : 0
    );

    const latestIndex = labels.length - 1;
    const latestNewCustomers = newCustomersData[latestIndex]?.toFixed(1) || "0";
    const latestReturningCustomers = returningCustomersData[latestIndex]?.toFixed(1) || "0";
    const latestDormantCustomers = dormantCustomersData[latestIndex]?.toFixed(1) || "0";

    this.customerRetentionTrendData = {
        labels: labels,
        datasets: [
            {
                label: `New (${latestNewCustomers}%)`,
                data: newCustomersData,
                backgroundColor: 'rgba(255, 205, 86, 0.5)',
                borderColor: 'rgba(255, 205, 86, 1)',
                fill: true
            },
            {
                label: `Returning (${latestReturningCustomers}%)`,
                data: returningCustomersData,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: true
            },
            {
                label: `Not Active (${latestDormantCustomers}%)`,
                data: dormantCustomersData,
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: true
            }
        ]
    };

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
    this.dataService.orders$.subscribe(orders => {
      const filtered = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= from && orderDate <= to;
      });
  
      this.generateSalesChart(filtered);
      this.generatePeakHoursChart(filtered);
    });
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

