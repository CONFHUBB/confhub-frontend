/**
 * Lightweight i18n utility for dashboard page.
 * Replace hardcoded strings here — expand with full next-intl later if needed.
 */
export const dashboardMessages = {
    // Header
    title: "Dashboard",
    description: "System overview — ConfHub Conference Management",
    publicSite: "Public site",

    // Stat cards
    totalConferences: "Total Conferences",
    totalPapers: "Total Papers",
    registeredUsers: "Registered Users",
    totalRevenue: "Total Revenue",
    totalReviews: "Total Reviews",
    active: "active",
    pending: "pending",

    // Charts
    papersPerConference: "Papers per Conference",
    papersPerConferenceDesc: "Top conferences by submission count",
    paperStatusDistribution: "Paper Status Distribution",
    paperStatusDistributionDesc: "Papers grouped by current status",
    revenueTransactions: "Revenue & Transactions (Last 6 Months)",
    revenueTransactionsDesc: "VNPay completed payments aggregated by month",

    // Status labels
    submitted: "Submitted",
    underReview: "Under Review",
    accepted: "Accepted",
    rejected: "Rejected",
    published: "Published",
    other: "Other",

    // Revenue legend
    revenue: "Revenue",
    transactions: "Transactions",

    // Tables
    name: "Name",
    area: "Area",
    status: "Status",
    ref: "Ref",
    amount: "Amount",
    recentConferences: "Recent Conferences",
    recentConferencesDesc: "Latest conferences in system",
    recentPayments: "Recent Payments",
    recentPaymentsDesc: "Latest VNPay transactions",
    viewAll: "View all →",

    // States
    loading: "Loading…",
    noData: "No data available",
    noPayments: "No payment records found",

    // Error state
    errorTitle: "Failed to load dashboard",
    errorDesc: "Something went wrong while fetching data.",
    retry: "Try again",
} as const

export type DashboardMessages = typeof dashboardMessages
