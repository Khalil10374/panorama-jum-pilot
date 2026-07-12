import {
  BadgeDollarSign,
  Bike,
  CalendarCheck,
  CarFront,
  ChefHat,
  Coffee,
  FileBarChart,
  HandCoins,
  Hotel,
  Package,
  ReceiptText,
  ShoppingBasket,
  Store,
  Truck,
  UserCog,
  UsersRound,
  Warehouse
} from "lucide-react";

export const roles = ["Super Admin", "Manager", "Accountant", "Receptionist", "POS Operator", "Store Manager", "HR Officer"];

export const fieldTypes = {
  email: "email",
  phone: "tel",
  amount: "number",
  price: "number",
  date: "date",
  number: "number",
  text: "text"
};

export const modules = [
  {
    key: "user-management",
    title: "User Management",
    icon: UserCog,
    color: "bg-ink",
    roles: ["Super Admin"],
    resources: [
      {
        name: "users",
        label: "User Accounts",
        fields: [
          ["photo_url", "Photo", "image"],
          ["name", "Full Name"],
          ["email", "Email", "email"],
          ["password", "Password", "password"],
          ["role", "Role", "role"],
          ["phone", "Phone", "tel"],
          ["department", "Department"],
          ["designation", "Designation"],
          ["address", "Address", "textarea"],
          ["notes", "Notes", "textarea"],
          ["is_active", "Active", "boolean"]
        ]
      }
    ]
  },
  {
    key: "parking",
    title: "Parking Automation",
    icon: CarFront,
    color: "bg-lagoon",
    roles: ["Super Admin", "Manager", "Receptionist", "Accountant"],
    resources: [
      {
        name: "vehicles",
        label: "Parking Tickets",
        fields: [
          ["plate_number", "Plate Number"],
          ["vehicle_type", "Vehicle Type", "parking-vehicle-type"],
          ["owner_name", "Owner/User Name"],
          ["phone", "Phone"]
        ]
      },
      {
        name: "parking-tickets",
        label: "Checkout/Bill",
        fields: [
          ["ticket_code", "Ticket Code"],
          ["plate_number", "Plate Number"],
          ["owner_name", "Owner/User Name"],
          ["vehicle_type", "Vehicle Type", "parking-vehicle-type"],
          ["entry_time", "Entry Time"],
          ["charge_type", "Charge Type"],
          ["amount", "Amount", "amount"],
          ["payment_status", "Payment Status"]
        ]
      },
      {
        name: "parking-history",
        label: "Parking History",
        fields: [
          ["ticket_code", "Ticket Code"],
          ["plate_number", "Plate Number"],
          ["owner_name", "Owner/User Name"],
          ["vehicle_type", "Vehicle Type", "parking-vehicle-type"],
          ["entry_time", "Entry Time"],
          ["exit_time", "Exit Time"],
          ["amount", "Amount", "amount"],
          ["payment_status", "Payment Status"]
        ]
      },
      {
        name: "parking-rates",
        label: "Parking Price List",
        superAdminOnly: true,
        fields: [
          ["vehicle_type", "Vehicle Type", "parking-rate-type"],
          ["price", "One-time Price", "amount"],
          ["status", "Status"]
        ]
      }
    ]
  },
  {
    key: "rides",
    title: "Pass & Ride",
    icon: Bike,
    color: "bg-coral",
    roles: ["Super Admin", "Manager", "POS Operator", "Accountant"],
    resources: [
      {
        name: "ride-tickets",
        label: "Pass & Ride Tickets",
        fields: [
          ["ticket_code", "Ticket Code"],
          ["ride_id", "Ride ID", "number"],
          ["child_name", "Child Name"],
          ["quantity", "Quantity", "number"],
          ["total_amount", "Total Amount", "amount"],
          ["payment_status", "Payment Status"],
          ["is_used", "Used"],
          ["qr_payload", "QR Payload"]
        ]
      },
      {
        name: "rides",
        label: "Pass & Ride Price List",
        fields: [
          ["category", "Category", "ride-category"],
          ["name", "Ride/Pass Name"],
          ["price_30_minutes", "30 Minutes", "amount"],
          ["price_1_hour", "1 Hour", "amount"],
          ["price", "One-time Price", "amount"],
          ["pricing_type", "Pricing Type"],
          ["status", "Status"]
        ]
      }
    ]
  },
  {
    key: "coffee",
    title: "Coffee & Juices POS",
    icon: Coffee,
    color: "bg-sun",
    roles: ["Super Admin", "Manager", "POS Operator", "Store Manager", "Accountant"],
    resources: [
      {
        name: "products",
        label: "Coffee Products",
        defaultValues: { module: "Coffee" },
        fields: [
          ["name", "Product Name"],
          ["sku", "SKU"],
          ["barcode", "Barcode"],
          ["module", "Module"],
          ["sale_price", "Sale Price", "amount"],
          ["cost_price", "Cost Price", "amount"],
          ["stock_qty", "Stock Qty", "number"],
          ["reorder_level", "Reorder Level", "number"],
          ["unit", "Unit"]
        ]
      },
      {
        name: "sales",
        label: "Sales",
        fields: [
          ["invoice_number", "Invoice"],
          ["module", "Module"],
          ["customer_name", "Customer"],
          ["subtotal", "Subtotal", "amount"],
          ["discount", "Discount", "amount"],
          ["tax", "Tax", "amount"],
          ["total_amount", "Total", "amount"],
          ["paid_amount", "Paid", "amount"],
          ["payment_status", "Status"]
        ]
      }
    ]
  },
  {
    key: "cottages",
    title: "Cottage Booking",
    icon: Hotel,
    color: "bg-leaf",
    roles: ["Super Admin", "Manager", "Receptionist", "Accountant"],
    resources: [
      {
        name: "cottages",
        label: "Cottages",
        fields: [
          ["name", "Cottage Name"],
          ["type", "Type"],
          ["capacity", "Capacity", "number"],
          ["nightly_rate", "Nightly Rate", "amount"],
          ["status", "Status"]
        ]
      },
      {
        name: "guests",
        label: "Guests",
        fields: [
          ["name", "Guest Name"],
          ["phone", "Phone"],
          ["email", "Email", "email"],
          ["address", "Address"],
          ["identity_number", "Identity Number"]
        ]
      },
      {
        name: "bookings",
        label: "Bookings",
        fields: [
          ["code", "Booking Code"],
          ["guest_id", "Guest ID", "number"],
          ["cottage_id", "Cottage ID", "number"],
          ["check_in", "Check In", "date"],
          ["check_out", "Check Out", "date"],
          ["adults", "Adults", "number"],
          ["children", "Children", "number"],
          ["total_amount", "Total", "amount"],
          ["paid_amount", "Paid", "amount"],
          ["status", "Status"]
        ]
      }
    ]
  },
  {
    key: "store",
    title: "Mini Departmental Store",
    icon: Store,
    color: "bg-lagoon",
    roles: ["Super Admin", "Manager", "Store Manager", "POS Operator", "Accountant"],
    resources: [
      {
        name: "products",
        label: "Store Products",
        defaultValues: { module: "Store" },
        fields: [
          ["name", "Product Name"],
          ["sku", "SKU"],
          ["barcode", "Barcode"],
          ["module", "Module"],
          ["sale_price", "Sale Price", "amount"],
          ["cost_price", "Cost Price", "amount"],
          ["stock_qty", "Stock Qty", "number"],
          ["reorder_level", "Reorder Level", "number"],
          ["unit", "Unit"]
        ]
      }
    ]
  },
  {
    key: "accounts",
    title: "Financial Accounts",
    icon: HandCoins,
    color: "bg-coral",
    roles: ["Super Admin", "Manager", "Accountant"],
    resources: [
      {
        name: "income-expenses",
        label: "Income & Expense",
        fields: [
          ["transaction_date", "Date", "date"],
          ["type", "Type"],
          ["category", "Category"],
          ["description", "Description"],
          ["amount", "Amount", "amount"],
          ["account", "Account"]
        ]
      },
      {
        name: "payments",
        label: "Payments",
        fields: [
          ["reference_type", "Reference Type"],
          ["reference_id", "Reference ID", "number"],
          ["method", "Method"],
          ["amount", "Amount", "amount"],
          ["status", "Status"],
          ["transaction_reference", "Transaction Ref"]
        ]
      },
      {
        name: "cash-closings",
        label: "Daily Cash Closing",
        fields: [
          ["closing_date", "Closing Date", "date"],
          ["opening_cash", "Opening Cash", "amount"],
          ["cash_sales", "Cash Sales", "amount"],
          ["expenses", "Expenses", "amount"],
          ["closing_cash", "Closing Cash", "amount"],
          ["notes", "Notes"]
        ]
      }
    ]
  },
  {
    key: "inventory",
    title: "Inventory Management",
    icon: Warehouse,
    color: "bg-leaf",
    roles: ["Super Admin", "Manager", "Store Manager", "Accountant"],
    resources: [
      {
        name: "inventory-items",
        label: "Inventory Items",
        fields: [
          ["name", "Item Name"],
          ["sku", "SKU"],
          ["unit", "Unit"],
          ["opening_stock", "Opening Stock", "number"],
          ["current_stock", "Current Stock", "number"],
          ["unit_cost", "Unit Cost", "amount"],
          ["reorder_level", "Reorder Level", "number"],
          ["location", "Location"]
        ]
      },
      {
        name: "stock-movements",
        label: "Stock In/Out, Transfer, Damage",
        fields: [
          ["item_id", "Item ID", "number"],
          ["movement_type", "Movement Type"],
          ["quantity", "Quantity", "number"],
          ["reference", "Reference"],
          ["notes", "Notes"]
        ]
      }
    ]
  },
  {
    key: "scm",
    title: "Supply Chain",
    icon: Truck,
    color: "bg-sun",
    roles: ["Super Admin", "Manager", "Store Manager", "Accountant"],
    resources: [
      {
        name: "suppliers",
        label: "Suppliers",
        fields: [
          ["name", "Supplier Name"],
          ["contact_person", "Contact Person"],
          ["phone", "Phone"],
          ["email", "Email", "email"],
          ["address", "Address"],
          ["balance_due", "Balance Due", "amount"]
        ]
      },
      {
        name: "purchase-orders",
        label: "Purchase Orders / GRN",
        fields: [
          ["po_number", "PO Number"],
          ["supplier_id", "Supplier ID", "number"],
          ["order_date", "Order Date", "date"],
          ["expected_date", "Expected Date", "date"],
          ["status", "Status"],
          ["total_amount", "Total", "amount"],
          ["paid_amount", "Paid", "amount"]
        ]
      }
    ]
  },
  {
    key: "hrm",
    title: "Human Resources",
    icon: UsersRound,
    color: "bg-lagoon",
    roles: ["Super Admin", "Manager", "HR Officer", "Accountant"],
    resources: [
      {
        name: "employees",
        label: "Employees",
        fields: [
          ["employee_code", "Employee Code"],
          ["name", "Name"],
          ["department", "Department"],
          ["designation", "Designation"],
          ["phone", "Phone"],
          ["joining_date", "Joining Date", "date"],
          ["salary", "Salary", "amount"],
          ["status", "Status"]
        ]
      },
      {
        name: "attendance",
        label: "Attendance",
        fields: [
          ["employee_id", "Employee ID", "number"],
          ["attendance_date", "Date", "date"],
          ["status", "Status"],
          ["check_in", "Check In"],
          ["check_out", "Check Out"]
        ]
      },
      {
        name: "leave-requests",
        label: "Leave Management",
        fields: [
          ["employee_id", "Employee ID", "number"],
          ["start_date", "Start Date", "date"],
          ["end_date", "End Date", "date"],
          ["reason", "Reason"],
          ["status", "Status"]
        ]
      },
      {
        name: "salaries",
        label: "Salary Generation",
        fields: [
          ["employee_id", "Employee ID", "number"],
          ["salary_month", "Salary Month"],
          ["gross_salary", "Gross Salary", "amount"],
          ["deductions", "Deductions", "amount"],
          ["net_salary", "Net Salary", "amount"],
          ["payment_status", "Payment Status"]
        ]
      }
    ]
  },
  {
    key: "recipes",
    title: "Restaurant Recipes",
    icon: ChefHat,
    color: "bg-coral",
    roles: ["Super Admin", "Manager", "Store Manager", "POS Operator", "Accountant"],
    resources: [
      {
        name: "recipes",
        label: "Menu Recipes",
        fields: [
          ["menu_item_name", "Menu Item"],
          ["sale_price", "Sale Price", "amount"],
          ["food_cost", "Food Cost", "amount"],
          ["profit_margin", "Profit Margin %", "number"],
          ["notes", "Notes"]
        ]
      },
      {
        name: "recipe-ingredients",
        label: "Recipe Ingredients",
        fields: [
          ["recipe_id", "Recipe ID", "number"],
          ["inventory_item_id", "Inventory Item ID", "number"],
          ["quantity", "Quantity", "number"],
          ["wastage_percent", "Wastage %", "number"]
        ]
      }
    ]
  }
];

export const quickActions = [
  { key: "pos", title: "POS Billing", icon: ShoppingBasket },
  { key: "reports", title: "Reports", icon: FileBarChart },
  { key: "bookings", title: "Booking Invoice", icon: ReceiptText },
  { key: "calendar", title: "Availability", icon: CalendarCheck },
  { key: "finance", title: "Cash Closing", icon: BadgeDollarSign },
  { key: "stock", title: "Low Stock", icon: Package }
];
