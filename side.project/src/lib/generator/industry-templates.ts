import type { IndustryType } from '../types/scraper'
import type { KPIItem, QuickActionItem, ListItem, MenuItem } from '../types/generator'

export interface IndustryTemplate {
  kpis: KPIItem[]
  quickActions: QuickActionItem[]
  listTitle: string
  listItems: ListItem[]
  detailedListItems: ListItem[]
  filters: string[]
  activityItems: { text: string; time: string; color: string }[]
  menuItems: MenuItem[]
  detailTitle: string
  detailStats: { label: string; value: string }[]
  detailDescription: string
  detailPrimaryAction: string
}

export const INDUSTRY_TEMPLATES: Record<IndustryType, IndustryTemplate> = {
  construction: {
    kpis: [
      { label: 'Projects', value: '12', icon: 'building', color: 'var(--blue)' },
      { label: 'This Week', value: '38.5h', icon: 'clock', color: 'var(--green)' },
      { label: 'Team', value: '47', icon: 'users', color: 'var(--amber)' },
      { label: 'Alerts', value: '3', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [
      { label: 'Clock In', icon: 'clock' },
      { label: 'Daily Log', icon: 'clipboard' },
      { label: 'Photo', icon: 'camera' },
      { label: 'Safety', icon: 'shield' },
    ],
    listTitle: 'Active Projects',
    listItems: [
      { title: 'Oceanview Tower', subtitle: 'Miami, FL', badge: 'Active', badgeType: 'active' },
      { title: 'Highland Park Bridge', subtitle: 'Houston, TX', badge: 'Planning', badgeType: 'planning' },
      { title: 'Metro Station Reno', subtitle: 'New York, NY', badge: 'Active', badgeType: 'active' },
    ],
    detailedListItems: [
      { title: 'Oceanview Tower', subtitle: 'Miami, FL — PRJ-2024-001', badge: 'Active', badgeType: 'active', stats: [{ label: 'Budget', value: '$12.5M' }, { label: 'Complete', value: '67%' }], progress: 67 },
      { title: 'Highland Park Bridge', subtitle: 'Houston, TX — PRJ-2024-002', badge: 'Planning', badgeType: 'planning', stats: [{ label: 'Budget', value: '$8.2M' }, { label: 'Complete', value: '15%' }], progress: 15 },
      { title: 'Metro Station Reno', subtitle: 'New York, NY — PRJ-2024-003', badge: 'Active', badgeType: 'active', stats: [{ label: 'Budget', value: '$45M' }, { label: 'Complete', value: '89%' }], progress: 89 },
      { title: 'Downtown Mall', subtitle: 'Chicago, IL — PRJ-2024-004', badge: 'Pending', badgeType: 'pending', stats: [{ label: 'Budget', value: '$22M' }, { label: 'Complete', value: '5%' }], progress: 5 },
    ],
    filters: ['All', 'Active', 'Planning', 'On Hold', 'Completed'],
    activityItems: [
      { text: 'Change Order #47 approved', time: '2 hours ago', color: 'var(--green)' },
      { text: 'Daily log submitted — Oceanview Tower', time: 'Yesterday', color: 'var(--blue)' },
      { text: 'Safety inspection completed', time: '2 days ago', color: 'var(--amber)' },
    ],
    menuItems: [
      { label: 'Safety', icon: 'shield', color: 'var(--red)' },
      { label: 'Equipment', icon: 'tool', color: 'var(--amber)' },
      { label: 'Financial', icon: 'dollar', color: 'var(--green)' },
      { label: 'Documents', icon: 'file', color: 'var(--blue)' },
      { label: 'People', icon: 'users', color: 'var(--blue)' },
      { label: 'Approvals', icon: 'check', color: 'var(--amber)' },
      { label: 'Photos', icon: 'camera', color: 'var(--blue)' },
      { label: 'Search', icon: 'search', color: 'var(--green)' },
      { label: 'Alerts', icon: 'bell', color: 'var(--blue)' },
    ],
    detailTitle: 'Project Details',
    detailStats: [
      { label: 'Budget', value: '$12.5M' },
      { label: 'Complete', value: '67%' },
      { label: 'Team', value: '23' },
    ],
    detailDescription: 'This project involves construction and development work with multiple phases, milestones, and subcontractor coordination.',
    detailPrimaryAction: 'View Timeline',
  },

  restaurant: {
    kpis: [
      { label: 'Orders', value: '47', icon: 'clipboard', color: 'var(--blue)' },
      { label: 'Revenue', value: '$2,340', icon: 'dollar', color: 'var(--green)' },
      { label: 'Tables', value: '12/18', icon: 'grid', color: 'var(--amber)' },
      { label: 'Rating', value: '4.8', icon: 'star', color: 'var(--red)' },
    ],
    quickActions: [
      { label: 'New Order', icon: 'plus' },
      { label: 'Menu', icon: 'clipboard' },
      { label: 'Reserve', icon: 'calendar' },
      { label: 'Staff', icon: 'users' },
    ],
    listTitle: 'Menu',
    listItems: [
      { title: 'Signature Pasta', subtitle: 'Chef\'s Special', badge: 'Popular', badgeType: 'active' },
      { title: 'Grilled Salmon', subtitle: 'Fresh catch daily', badge: 'New', badgeType: 'planning' },
      { title: 'Classic Burger', subtitle: 'House favorite', badge: 'Featured', badgeType: 'active' },
    ],
    detailedListItems: [
      { title: 'Signature Pasta', subtitle: 'Homemade fettuccine, truffle cream', badge: 'Popular', badgeType: 'active', stats: [{ label: 'Price', value: '$24' }, { label: 'Orders', value: '156' }], progress: 90 },
      { title: 'Grilled Salmon', subtitle: 'Atlantic salmon, seasonal vegs', badge: 'New', badgeType: 'planning', stats: [{ label: 'Price', value: '$32' }, { label: 'Orders', value: '89' }], progress: 65 },
      { title: 'Classic Burger', subtitle: 'Angus beef, brioche bun', badge: 'Featured', badgeType: 'active', stats: [{ label: 'Price', value: '$18' }, { label: 'Orders', value: '234' }], progress: 95 },
      { title: 'Caesar Salad', subtitle: 'Romaine, parmesan, croutons', badge: 'Healthy', badgeType: 'active', stats: [{ label: 'Price', value: '$14' }, { label: 'Orders', value: '178' }], progress: 80 },
    ],
    filters: ['All', 'Appetizers', 'Entrees', 'Desserts', 'Drinks'],
    activityItems: [
      { text: 'New reservation for 6 at 7:30 PM', time: '30 min ago', color: 'var(--blue)' },
      { text: 'Order #234 completed', time: '1 hour ago', color: 'var(--green)' },
      { text: '5-star review received', time: '3 hours ago', color: 'var(--amber)' },
    ],
    menuItems: [
      { label: 'Orders', icon: 'clipboard', color: 'var(--blue)' },
      { label: 'Menu', icon: 'grid', color: 'var(--amber)' },
      { label: 'Reserve', icon: 'calendar', color: 'var(--green)' },
      { label: 'Staff', icon: 'users', color: 'var(--blue)' },
      { label: 'Reviews', icon: 'star', color: 'var(--amber)' },
      { label: 'Reports', icon: 'bar-chart', color: 'var(--green)' },
      { label: 'Delivery', icon: 'package', color: 'var(--blue)' },
      { label: 'Photos', icon: 'camera', color: 'var(--red)' },
      { label: 'Alerts', icon: 'bell', color: 'var(--blue)' },
    ],
    detailTitle: 'Dish Details',
    detailStats: [{ label: 'Price', value: '$24' }, { label: 'Orders', value: '156' }, { label: 'Rating', value: '4.9' }],
    detailDescription: 'Our signature dish prepared with the finest locally sourced ingredients and traditional cooking techniques.',
    detailPrimaryAction: 'Order Now',
  },

  ecommerce: {
    kpis: [
      { label: 'Orders', value: '156', icon: 'package', color: 'var(--blue)' },
      { label: 'Revenue', value: '$8,420', icon: 'dollar', color: 'var(--green)' },
      { label: 'Products', value: '342', icon: 'grid', color: 'var(--amber)' },
      { label: 'Returns', value: '5', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [
      { label: 'New Order', icon: 'plus' },
      { label: 'Products', icon: 'grid' },
      { label: 'Customers', icon: 'users' },
      { label: 'Reports', icon: 'bar-chart' },
    ],
    listTitle: 'Products',
    listItems: [
      { title: 'Premium Widget', subtitle: '$49.99', badge: 'In Stock', badgeType: 'active' },
      { title: 'Deluxe Package', subtitle: '$129.99', badge: 'Popular', badgeType: 'active' },
      { title: 'Starter Kit', subtitle: '$29.99', badge: 'Low Stock', badgeType: 'pending' },
    ],
    detailedListItems: [
      { title: 'Premium Widget', subtitle: 'SKU: WDG-001', badge: 'In Stock', badgeType: 'active', stats: [{ label: 'Price', value: '$49.99' }, { label: 'Sold', value: '1,234' }], progress: 85 },
      { title: 'Deluxe Package', subtitle: 'SKU: DLX-002', badge: 'Popular', badgeType: 'active', stats: [{ label: 'Price', value: '$129.99' }, { label: 'Sold', value: '567' }], progress: 72 },
      { title: 'Starter Kit', subtitle: 'SKU: STR-003', badge: 'Low Stock', badgeType: 'pending', stats: [{ label: 'Price', value: '$29.99' }, { label: 'Sold', value: '2,341' }], progress: 95 },
      { title: 'Pro Bundle', subtitle: 'SKU: PRO-004', badge: 'New', badgeType: 'planning', stats: [{ label: 'Price', value: '$199.99' }, { label: 'Sold', value: '89' }], progress: 30 },
    ],
    filters: ['All', 'In Stock', 'Low Stock', 'Out of Stock'],
    activityItems: [
      { text: 'New order #1234 received', time: '10 min ago', color: 'var(--green)' },
      { text: 'Product restocked — Starter Kit', time: '2 hours ago', color: 'var(--blue)' },
      { text: 'Return request #567', time: 'Yesterday', color: 'var(--amber)' },
    ],
    menuItems: [
      { label: 'Orders', icon: 'package', color: 'var(--blue)' },
      { label: 'Products', icon: 'grid', color: 'var(--amber)' },
      { label: 'Customers', icon: 'users', color: 'var(--green)' },
      { label: 'Analytics', icon: 'bar-chart', color: 'var(--blue)' },
      { label: 'Reviews', icon: 'star', color: 'var(--amber)' },
      { label: 'Shipping', icon: 'package', color: 'var(--green)' },
      { label: 'Coupons', icon: 'dollar', color: 'var(--red)' },
      { label: 'Search', icon: 'search', color: 'var(--blue)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Product Details',
    detailStats: [{ label: 'Price', value: '$49.99' }, { label: 'In Stock', value: '234' }, { label: 'Rating', value: '4.7' }],
    detailDescription: 'High-quality product with premium materials and expert craftsmanship. Free shipping on orders over $50.',
    detailPrimaryAction: 'Add to Cart',
  },

  healthcare: {
    kpis: [
      { label: 'Patients', value: '28', icon: 'users', color: 'var(--blue)' },
      { label: 'Today', value: '12', icon: 'calendar', color: 'var(--green)' },
      { label: 'Pending', value: '5', icon: 'clock', color: 'var(--amber)' },
      { label: 'Urgent', value: '2', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [
      { label: 'Book', icon: 'calendar' }, { label: 'Records', icon: 'file' },
      { label: 'Messages', icon: 'mail' }, { label: 'Rx', icon: 'clipboard' },
    ],
    listTitle: 'Appointments',
    listItems: [
      { title: 'Dr. Smith — Checkup', subtitle: 'Today, 2:00 PM', badge: 'Confirmed', badgeType: 'active' },
      { title: 'Dr. Johnson — Follow-up', subtitle: 'Tomorrow, 10:00 AM', badge: 'Pending', badgeType: 'pending' },
      { title: 'Lab Results Review', subtitle: 'Friday, 3:30 PM', badge: 'Scheduled', badgeType: 'planning' },
    ],
    detailedListItems: [
      { title: 'Dr. Smith — Checkup', subtitle: 'General Health', badge: 'Confirmed', badgeType: 'active', stats: [{ label: 'Time', value: '2:00 PM' }, { label: 'Duration', value: '30 min' }], progress: 100 },
      { title: 'Dr. Johnson — Follow-up', subtitle: 'Cardiology', badge: 'Pending', badgeType: 'pending', stats: [{ label: 'Time', value: '10:00 AM' }, { label: 'Duration', value: '45 min' }], progress: 50 },
    ],
    filters: ['All', 'Today', 'This Week', 'Upcoming'],
    activityItems: [
      { text: 'Appointment confirmed with Dr. Smith', time: '1 hour ago', color: 'var(--green)' },
      { text: 'Lab results available', time: 'Yesterday', color: 'var(--blue)' },
      { text: 'Prescription ready for pickup', time: '2 days ago', color: 'var(--amber)' },
    ],
    menuItems: [
      { label: 'Doctors', icon: 'users', color: 'var(--blue)' }, { label: 'Records', icon: 'file', color: 'var(--green)' },
      { label: 'Prescriptions', icon: 'clipboard', color: 'var(--amber)' }, { label: 'Insurance', icon: 'shield', color: 'var(--blue)' },
      { label: 'Messages', icon: 'mail', color: 'var(--green)' }, { label: 'Billing', icon: 'dollar', color: 'var(--red)' },
      { label: 'Lab Results', icon: 'bar-chart', color: 'var(--blue)' }, { label: 'Search', icon: 'search', color: 'var(--green)' },
      { label: 'Emergency', icon: 'phone', color: 'var(--red)' },
    ],
    detailTitle: 'Appointment Details', detailStats: [{ label: 'Date', value: 'Today' }, { label: 'Time', value: '2:00 PM' }, { label: 'Duration', value: '30 min' }],
    detailDescription: 'Regular health checkup appointment. Please arrive 15 minutes early and bring your insurance card.',
    detailPrimaryAction: 'Check In',
  },

  technology: {
    kpis: [
      { label: 'Users', value: '2.4K', icon: 'users', color: 'var(--blue)' },
      { label: 'Uptime', value: '99.9%', icon: 'check', color: 'var(--green)' },
      { label: 'API Calls', value: '12M', icon: 'external-link', color: 'var(--amber)' },
      { label: 'Issues', value: '7', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [
      { label: 'Dashboard', icon: 'grid' }, { label: 'Deploy', icon: 'external-link' },
      { label: 'Logs', icon: 'file' }, { label: 'Team', icon: 'users' },
    ],
    listTitle: 'Projects',
    listItems: [
      { title: 'API Gateway v2', subtitle: 'Backend', badge: 'Active', badgeType: 'active' },
      { title: 'Mobile SDK', subtitle: 'iOS & Android', badge: 'In Progress', badgeType: 'planning' },
      { title: 'Dashboard Redesign', subtitle: 'Frontend', badge: 'Review', badgeType: 'pending' },
    ],
    detailedListItems: [
      { title: 'API Gateway v2', subtitle: 'Backend Infrastructure', badge: 'Active', badgeType: 'active', stats: [{ label: 'Sprint', value: '#14' }, { label: 'Tasks', value: '23/31' }], progress: 74 },
      { title: 'Mobile SDK', subtitle: 'Cross-platform', badge: 'In Progress', badgeType: 'planning', stats: [{ label: 'Sprint', value: '#8' }, { label: 'Tasks', value: '12/20' }], progress: 60 },
      { title: 'Dashboard Redesign', subtitle: 'Frontend UI', badge: 'Review', badgeType: 'pending', stats: [{ label: 'Sprint', value: '#3' }, { label: 'Tasks', value: '18/18' }], progress: 100 },
    ],
    filters: ['All', 'Active', 'In Progress', 'Review', 'Done'],
    activityItems: [
      { text: 'Deployment v2.3.1 successful', time: '30 min ago', color: 'var(--green)' },
      { text: 'Pull request #234 merged', time: '2 hours ago', color: 'var(--blue)' },
      { text: 'Critical bug reported — API Gateway', time: 'Yesterday', color: 'var(--red)' },
    ],
    menuItems: [
      { label: 'Analytics', icon: 'bar-chart', color: 'var(--blue)' }, { label: 'Deploys', icon: 'external-link', color: 'var(--green)' },
      { label: 'Logs', icon: 'file', color: 'var(--amber)' }, { label: 'Team', icon: 'users', color: 'var(--blue)' },
      { label: 'API Keys', icon: 'lock', color: 'var(--red)' }, { label: 'Billing', icon: 'dollar', color: 'var(--green)' },
      { label: 'Docs', icon: 'file', color: 'var(--blue)' }, { label: 'Search', icon: 'search', color: 'var(--green)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Project Details', detailStats: [{ label: 'Sprint', value: '#14' }, { label: 'Velocity', value: '42pts' }, { label: 'Team', value: '8' }],
    detailDescription: 'Core infrastructure project powering the API gateway. Includes rate limiting, auth, and caching layers.',
    detailPrimaryAction: 'View Board',
  },

  // Simplified templates for remaining industries
  education: {
    kpis: [
      { label: 'Courses', value: '24', icon: 'file', color: 'var(--blue)' },
      { label: 'Students', value: '1.2K', icon: 'users', color: 'var(--green)' },
      { label: 'Progress', value: '72%', icon: 'bar-chart', color: 'var(--amber)' },
      { label: 'Due Soon', value: '3', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'Courses', icon: 'file' }, { label: 'Schedule', icon: 'calendar' }, { label: 'Grades', icon: 'bar-chart' }, { label: 'Chat', icon: 'mail' }],
    listTitle: 'Courses',
    listItems: [
      { title: 'Introduction to Design', subtitle: 'Prof. Williams', badge: 'Active', badgeType: 'active' },
      { title: 'Advanced Mathematics', subtitle: 'Prof. Chen', badge: 'In Progress', badgeType: 'planning' },
    ],
    detailedListItems: [
      { title: 'Introduction to Design', subtitle: 'Prof. Williams — MWF 10:00 AM', badge: 'Active', badgeType: 'active', stats: [{ label: 'Grade', value: 'A-' }, { label: 'Progress', value: '78%' }], progress: 78 },
      { title: 'Advanced Mathematics', subtitle: 'Prof. Chen — TTh 2:00 PM', badge: 'In Progress', badgeType: 'planning', stats: [{ label: 'Grade', value: 'B+' }, { label: 'Progress', value: '65%' }], progress: 65 },
    ],
    filters: ['All', 'Active', 'Completed', 'Upcoming'],
    activityItems: [{ text: 'Assignment submitted — Design Principles', time: '1 hour ago', color: 'var(--green)' }, { text: 'New grade posted', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Library', icon: 'file', color: 'var(--blue)' }, { label: 'Calendar', icon: 'calendar', color: 'var(--green)' },
      { label: 'Grades', icon: 'bar-chart', color: 'var(--amber)' }, { label: 'Study', icon: 'file', color: 'var(--blue)' },
      { label: 'Groups', icon: 'users', color: 'var(--green)' }, { label: 'Help', icon: 'help', color: 'var(--blue)' },
      { label: 'Maps', icon: 'map', color: 'var(--amber)' }, { label: 'Events', icon: 'calendar', color: 'var(--red)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Course Details', detailStats: [{ label: 'Grade', value: 'A-' }, { label: 'Hours', value: '45' }, { label: 'Rank', value: '#12' }],
    detailDescription: 'Comprehensive course covering fundamentals and advanced topics with hands-on projects and assessments.',
    detailPrimaryAction: 'Continue Learning',
  },

  'real-estate': {
    kpis: [
      { label: 'Listings', value: '48', icon: 'building', color: 'var(--blue)' },
      { label: 'Viewings', value: '12', icon: 'calendar', color: 'var(--green)' },
      { label: 'Offers', value: '5', icon: 'dollar', color: 'var(--amber)' },
      { label: 'Closings', value: '2', icon: 'check', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'Search', icon: 'search' }, { label: 'Saved', icon: 'heart' }, { label: 'Tours', icon: 'calendar' }, { label: 'Agent', icon: 'phone' }],
    listTitle: 'Listings',
    listItems: [
      { title: '4BR Modern Home', subtitle: '$750,000 — Downtown', badge: 'New', badgeType: 'active' },
      { title: '2BR Condo', subtitle: '$425,000 — Midtown', badge: 'Popular', badgeType: 'planning' },
    ],
    detailedListItems: [
      { title: '4BR Modern Home', subtitle: '2,400 sq ft — Downtown', badge: 'New', badgeType: 'active', stats: [{ label: 'Price', value: '$750K' }, { label: 'Beds', value: '4' }], progress: 100 },
      { title: '2BR Condo', subtitle: '1,200 sq ft — Midtown', badge: 'Popular', badgeType: 'planning', stats: [{ label: 'Price', value: '$425K' }, { label: 'Beds', value: '2' }], progress: 100 },
    ],
    filters: ['All', 'For Sale', 'For Rent', 'New', 'Open House'],
    activityItems: [{ text: 'New listing — 4BR Modern Home', time: '2 hours ago', color: 'var(--green)' }, { text: 'Viewing scheduled for 2BR Condo', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Saved', icon: 'heart', color: 'var(--red)' }, { label: 'Tours', icon: 'calendar', color: 'var(--green)' },
      { label: 'Mortgage', icon: 'dollar', color: 'var(--amber)' }, { label: 'Agent', icon: 'phone', color: 'var(--blue)' },
      { label: 'Documents', icon: 'file', color: 'var(--green)' }, { label: 'Maps', icon: 'map', color: 'var(--blue)' },
      { label: 'Compare', icon: 'grid', color: 'var(--amber)' }, { label: 'Alerts', icon: 'bell', color: 'var(--red)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Property Details', detailStats: [{ label: 'Price', value: '$750K' }, { label: 'Size', value: '2,400ft' }, { label: 'Year', value: '2023' }],
    detailDescription: 'Stunning modern home with open floor plan, high ceilings, and premium finishes. Walking distance to shops and restaurants.',
    detailPrimaryAction: 'Schedule Tour',
  },

  fitness: {
    kpis: [
      { label: 'Workouts', value: '12', icon: 'check', color: 'var(--blue)' },
      { label: 'Streak', value: '5 days', icon: 'star', color: 'var(--green)' },
      { label: 'Calories', value: '2,340', icon: 'bar-chart', color: 'var(--amber)' },
      { label: 'Goals', value: '3/4', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'Start', icon: 'clock' }, { label: 'Classes', icon: 'calendar' }, { label: 'Plans', icon: 'clipboard' }, { label: 'Progress', icon: 'bar-chart' }],
    listTitle: 'Classes',
    listItems: [{ title: 'HIIT Training', subtitle: 'Today 6:00 PM', badge: 'Open', badgeType: 'active' }, { title: 'Yoga Flow', subtitle: 'Tomorrow 8:00 AM', badge: '3 spots', badgeType: 'pending' }],
    detailedListItems: [{ title: 'HIIT Training', subtitle: 'Coach Mike — Studio A', badge: 'Open', badgeType: 'active', stats: [{ label: 'Duration', value: '45 min' }, { label: 'Spots', value: '8/20' }], progress: 40 }],
    filters: ['All', 'Today', 'This Week', 'My Bookings'],
    activityItems: [{ text: 'Workout completed — 45 min', time: '3 hours ago', color: 'var(--green)' }, { text: 'New class available — Boxing', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Classes', icon: 'calendar', color: 'var(--blue)' }, { label: 'Trainers', icon: 'users', color: 'var(--green)' },
      { label: 'Plans', icon: 'clipboard', color: 'var(--amber)' }, { label: 'Progress', icon: 'bar-chart', color: 'var(--blue)' },
      { label: 'Nutrition', icon: 'heart', color: 'var(--red)' }, { label: 'Shop', icon: 'cart', color: 'var(--green)' },
      { label: 'Photos', icon: 'camera', color: 'var(--blue)' }, { label: 'Maps', icon: 'map', color: 'var(--amber)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Class Details', detailStats: [{ label: 'Duration', value: '45 min' }, { label: 'Intensity', value: 'High' }, { label: 'Spots', value: '8/20' }],
    detailDescription: 'High-intensity interval training designed to burn calories and build endurance. All fitness levels welcome.',
    detailPrimaryAction: 'Book Class',
  },

  legal: {
    kpis: [
      { label: 'Cases', value: '18', icon: 'file', color: 'var(--blue)' },
      { label: 'Hearings', value: '4', icon: 'calendar', color: 'var(--green)' },
      { label: 'Billable', value: '142h', icon: 'clock', color: 'var(--amber)' },
      { label: 'Pending', value: '7', icon: 'alert', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'Cases', icon: 'file' }, { label: 'Calendar', icon: 'calendar' }, { label: 'Docs', icon: 'clipboard' }, { label: 'Billing', icon: 'dollar' }],
    listTitle: 'Cases',
    listItems: [{ title: 'Smith v. Johnson', subtitle: 'Civil Litigation', badge: 'Active', badgeType: 'active' }, { title: 'Estate of Williams', subtitle: 'Probate', badge: 'Pending', badgeType: 'pending' }],
    detailedListItems: [{ title: 'Smith v. Johnson', subtitle: 'Case #2024-CV-1234', badge: 'Active', badgeType: 'active', stats: [{ label: 'Hours', value: '42' }, { label: 'Billed', value: '$12,600' }], progress: 65 }],
    filters: ['All', 'Active', 'Pending', 'Closed'],
    activityItems: [{ text: 'Motion filed — Smith v. Johnson', time: '2 hours ago', color: 'var(--green)' }, { text: 'Client meeting scheduled', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Cases', icon: 'file', color: 'var(--blue)' }, { label: 'Calendar', icon: 'calendar', color: 'var(--green)' },
      { label: 'Documents', icon: 'clipboard', color: 'var(--amber)' }, { label: 'Clients', icon: 'users', color: 'var(--blue)' },
      { label: 'Billing', icon: 'dollar', color: 'var(--green)' }, { label: 'Research', icon: 'search', color: 'var(--amber)' },
      { label: 'Contacts', icon: 'phone', color: 'var(--blue)' }, { label: 'Tasks', icon: 'check', color: 'var(--red)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Case Details', detailStats: [{ label: 'Hours', value: '42' }, { label: 'Filed', value: 'Jan 15' }, { label: 'Status', value: 'Discovery' }],
    detailDescription: 'Civil litigation case involving breach of contract. Currently in discovery phase with depositions scheduled.',
    detailPrimaryAction: 'View Documents',
  },

  services: {
    kpis: [
      { label: 'Clients', value: '34', icon: 'users', color: 'var(--blue)' },
      { label: 'Projects', value: '12', icon: 'grid', color: 'var(--green)' },
      { label: 'Revenue', value: '$45K', icon: 'dollar', color: 'var(--amber)' },
      { label: 'Tasks', value: '8', icon: 'check', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'New Job', icon: 'plus' }, { label: 'Schedule', icon: 'calendar' }, { label: 'Invoice', icon: 'dollar' }, { label: 'Team', icon: 'users' }],
    listTitle: 'Recent Projects',
    listItems: [
      { title: 'Website Redesign', subtitle: 'Acme Corp', badge: 'Active', badgeType: 'active' },
      { title: 'Brand Strategy', subtitle: 'TechStart Inc', badge: 'Proposal', badgeType: 'planning' },
    ],
    detailedListItems: [
      { title: 'Website Redesign', subtitle: 'Acme Corp — $15,000', badge: 'Active', badgeType: 'active', stats: [{ label: 'Budget', value: '$15K' }, { label: 'Progress', value: '60%' }], progress: 60 },
    ],
    filters: ['All', 'Active', 'Proposal', 'Completed'],
    activityItems: [{ text: 'Invoice #1234 paid', time: '2 hours ago', color: 'var(--green)' }, { text: 'New inquiry received', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Clients', icon: 'users', color: 'var(--blue)' }, { label: 'Projects', icon: 'grid', color: 'var(--green)' },
      { label: 'Invoices', icon: 'dollar', color: 'var(--amber)' }, { label: 'Calendar', icon: 'calendar', color: 'var(--blue)' },
      { label: 'Documents', icon: 'file', color: 'var(--green)' }, { label: 'Reports', icon: 'bar-chart', color: 'var(--amber)' },
      { label: 'Messages', icon: 'mail', color: 'var(--blue)' }, { label: 'Search', icon: 'search', color: 'var(--green)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Project Details', detailStats: [{ label: 'Budget', value: '$15K' }, { label: 'Progress', value: '60%' }, { label: 'Due', value: 'Apr 30' }],
    detailDescription: 'Full website redesign including UX research, visual design, and frontend development.',
    detailPrimaryAction: 'View Details',
  },

  nonprofit: {
    kpis: [
      { label: 'Donors', value: '1.2K', icon: 'heart', color: 'var(--blue)' },
      { label: 'Raised', value: '$45K', icon: 'dollar', color: 'var(--green)' },
      { label: 'Volunteers', value: '89', icon: 'users', color: 'var(--amber)' },
      { label: 'Events', value: '4', icon: 'calendar', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'Donate', icon: 'heart' }, { label: 'Events', icon: 'calendar' }, { label: 'Volunteer', icon: 'users' }, { label: 'Impact', icon: 'bar-chart' }],
    listTitle: 'Campaigns',
    listItems: [{ title: 'Spring Fundraiser', subtitle: '$12,000 raised', badge: 'Active', badgeType: 'active' }, { title: 'Volunteer Drive', subtitle: '45 sign-ups', badge: 'Open', badgeType: 'planning' }],
    detailedListItems: [{ title: 'Spring Fundraiser', subtitle: 'Goal: $50,000', badge: 'Active', badgeType: 'active', stats: [{ label: 'Raised', value: '$12K' }, { label: 'Donors', value: '234' }], progress: 24 }],
    filters: ['All', 'Active', 'Upcoming', 'Past'],
    activityItems: [{ text: 'New donation — $500', time: '1 hour ago', color: 'var(--green)' }, { text: 'Volunteer sign-up — Sarah M.', time: 'Yesterday', color: 'var(--blue)' }],
    menuItems: [
      { label: 'Donate', icon: 'heart', color: 'var(--red)' }, { label: 'Events', icon: 'calendar', color: 'var(--green)' },
      { label: 'Impact', icon: 'bar-chart', color: 'var(--amber)' }, { label: 'Stories', icon: 'file', color: 'var(--blue)' },
      { label: 'Volunteer', icon: 'users', color: 'var(--green)' }, { label: 'Shop', icon: 'cart', color: 'var(--amber)' },
      { label: 'News', icon: 'mail', color: 'var(--blue)' }, { label: 'Contact', icon: 'phone', color: 'var(--blue)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Campaign Details', detailStats: [{ label: 'Goal', value: '$50K' }, { label: 'Raised', value: '$12K' }, { label: 'Days Left', value: '18' }],
    detailDescription: 'Help us reach our fundraising goal to support community programs and make a lasting impact.',
    detailPrimaryAction: 'Donate Now',
  },

  general: {
    kpis: [
      { label: 'Items', value: '24', icon: 'grid', color: 'var(--blue)' },
      { label: 'Active', value: '12', icon: 'check', color: 'var(--green)' },
      { label: 'Pending', value: '5', icon: 'clock', color: 'var(--amber)' },
      { label: 'Alerts', value: '3', icon: 'bell', color: 'var(--red)' },
    ],
    quickActions: [{ label: 'New', icon: 'plus' }, { label: 'Search', icon: 'search' }, { label: 'Calendar', icon: 'calendar' }, { label: 'Messages', icon: 'mail' }],
    listTitle: 'Items',
    listItems: [
      { title: 'Item One', subtitle: 'Description', badge: 'Active', badgeType: 'active' },
      { title: 'Item Two', subtitle: 'Description', badge: 'New', badgeType: 'planning' },
      { title: 'Item Three', subtitle: 'Description', badge: 'Pending', badgeType: 'pending' },
    ],
    detailedListItems: [
      { title: 'Item One', subtitle: 'Category A', badge: 'Active', badgeType: 'active', stats: [{ label: 'Status', value: 'Active' }, { label: 'Updated', value: 'Today' }], progress: 75 },
      { title: 'Item Two', subtitle: 'Category B', badge: 'New', badgeType: 'planning', stats: [{ label: 'Status', value: 'New' }, { label: 'Updated', value: 'Yesterday' }], progress: 30 },
    ],
    filters: ['All', 'Active', 'Pending', 'Completed'],
    activityItems: [
      { text: 'New item added', time: '2 hours ago', color: 'var(--green)' },
      { text: 'Update available', time: 'Yesterday', color: 'var(--blue)' },
      { text: 'Action required', time: '2 days ago', color: 'var(--amber)' },
    ],
    menuItems: [
      { label: 'Dashboard', icon: 'grid', color: 'var(--blue)' }, { label: 'Calendar', icon: 'calendar', color: 'var(--green)' },
      { label: 'Reports', icon: 'bar-chart', color: 'var(--amber)' }, { label: 'Files', icon: 'file', color: 'var(--blue)' },
      { label: 'People', icon: 'users', color: 'var(--green)' }, { label: 'Messages', icon: 'mail', color: 'var(--amber)' },
      { label: 'Photos', icon: 'camera', color: 'var(--blue)' }, { label: 'Search', icon: 'search', color: 'var(--green)' },
      { label: 'Settings', icon: 'settings', color: 'var(--blue)' },
    ],
    detailTitle: 'Details', detailStats: [{ label: 'Status', value: 'Active' }, { label: 'Updated', value: 'Today' }, { label: 'Views', value: '234' }],
    detailDescription: 'Detailed information about this item, including history, related items, and configuration options.',
    detailPrimaryAction: 'Take Action',
  },
}

export function getDefaultKPIs(industry: IndustryType): KPIItem[] {
  return INDUSTRY_TEMPLATES[industry]?.kpis || INDUSTRY_TEMPLATES.general.kpis
}

export function getDefaultQuickActions(industry: IndustryType): QuickActionItem[] {
  return INDUSTRY_TEMPLATES[industry]?.quickActions || INDUSTRY_TEMPLATES.general.quickActions
}

export function getDefaultListItems(industry: IndustryType): ListItem[] {
  return INDUSTRY_TEMPLATES[industry]?.listItems || INDUSTRY_TEMPLATES.general.listItems
}

export function getDefaultMenuItems(industry: IndustryType): MenuItem[] {
  return INDUSTRY_TEMPLATES[industry]?.menuItems || INDUSTRY_TEMPLATES.general.menuItems
}
