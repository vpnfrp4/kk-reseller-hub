/**
 * Burmese-first UI translations for the Reseller Panel.
 * Pattern: Burmese primary (visible), English secondary (small label).
 * Financial numbers remain dominant. Status words are simple Burmese.
 */

/* ─── Bilingual Label helper ─── */
export interface BiLabel {
  mm: string;
  en: string;
}

export const t = {
  // Navigation
  nav: {
    dashboard: { mm: "ပင်မစာမျက်နှာ", en: "Dashboard" },
    wallet: { mm: "ပိုက်ဆံအိတ်", en: "Wallet" },
    products: { mm: "ထုတ်ကုန်များ", en: "Products" },
    orders: { mm: "မှာယူမှုများ", en: "Orders" },
    notifications: { mm: "အသိပေးချက်များ", en: "Notifications" },
    settings: { mm: "ဆက်တင်များ", en: "Settings" },
    adminPanel: { mm: "စီမံခန့်ခွဲမှု", en: "Admin Panel" },
    signOut: { mm: "ထွက်မည်", en: "Sign Out" },
    reseller: { mm: "ဒိုင်", en: "Reseller" },
  },

  // Dashboard Home
  dashboard: {
    balance: { mm: "လက်ကျန်ငွေ", en: "Available Balance" },
    spending7d: { mm: "၇ ရက်အသုံးစရိတ်", en: "7-Day Spending" },
    addFunds: { mm: "ငွေဖြည့်မည်", en: "Add Funds" },
    viewTransactions: { mm: "ငွေလွှဲမှတ်တမ်း", en: "Transactions" },
    browseProducts: { mm: "ထုတ်ကုန်ရှာမည်", en: "Browse Products" },
    viewOrders: { mm: "မှာယူမှုကြည့်မည်", en: "View Orders" },
    transactions: { mm: "ငွေစာရင်း", en: "Transactions" },
    spendingThisMonth: { mm: "ဤလအသုံးစရိတ်", en: "Spending This Month" },
    topups30d: { mm: "ငွေဖြည့်မှု (၃၀ ရက်)", en: "Top-ups (30 Days)" },
    avgOrder: { mm: "ပျမ်းမျှမှာယူတန်ဖိုး", en: "Avg. Order Value" },
    lowBalanceTitle: { mm: "လက်ကျန်ငွေနည်း", en: "Low Balance Alert" },
    lowBalanceMsg: { mm: "မှာယူမှုမပြတ်တောက်ရန် ငွေဖြည့်ပေးပါ။", en: "Top up to avoid interruptions." },
    quickTopUp: { mm: "အမြန်ငွေဖြည့်", en: "Quick Top-Up" },
    recentActivity: { mm: "လတ်တလောလုပ်ဆောင်ချက်", en: "Recent Activity" },
    allTransactions: { mm: "ငွေစာရင်းအားလုံး", en: "All Transactions" },
    allOrders: { mm: "မှာယူမှုအားလုံး", en: "All Orders" },
    noActivity: { mm: "လုပ်ဆောင်ချက်မရှိသေးပါ", en: "No activity yet" },
    approxPurchases: { mm: "ခန့်မှန်းဝယ်နိုင်မှု", en: "approx. purchases" },
  },

  // Wallet
  wallet: {
    title: { mm: "ပိုက်ဆံအိတ်", en: "Wallet" },
    subtitle: { mm: "ငွေလက်ကျန်စီမံခန့်ခွဲရန်", en: "Manage your credit balance" },
    availableBalance: { mm: "လက်ကျန်ငွေ", en: "Available Balance" },
    totalDeposited: { mm: "စုစုပေါင်းဖြည့်ငွေ", en: "Total Deposited" },
    totalSpent: { mm: "စုစုပေါင်းသုံးငွေ", en: "Total Spent" },
    txHistory: { mm: "ငွေလွှဲမှတ်တမ်း", en: "Transaction History" },
    noTx: { mm: "ငွေလွှဲမှတ်တမ်းမရှိသေးပါ", en: "No transactions yet" },
    topUp: { mm: "ငွေဖြည့်မည်", en: "Top Up" },
  },

  // Top-Up Dialog
  topup: {
    title: { mm: "လုံခြုံစွာ ငွေဖြည့်ခြင်း", en: "Secure Wallet Top-Up" },
    subtitle: { mm: "တရားဝင်အကောင့်သို့ ငွေလွှဲပြီး အထောက်အထားတင်ပါ။", en: "Transfer to official account and upload proof." },
    amount: { mm: "ပမာဏ", en: "Amount (MMK)" },
    minAmount: { mm: "အနည်းဆုံး ငွေဖြည့်ပမာဏ", en: "Minimum top-up" },
    paymentMethods: { mm: "တရားဝင်ငွေလွှဲနည်းများ", en: "Official Payment Methods" },
    uploadProof: { mm: "ငွေလွှဲပြေစာ တင်ပါ", en: "Upload Payment Proof" },
    submit: { mm: "တင်သွင်းမည်", en: "Submit Top-Up" },
    submitted: { mm: "တင်သွင်းပြီးပါပြီ", en: "Top-Up Request Submitted" },
    done: { mm: "ပြီးပါပြီ", en: "Done" },
    transferFunds: { mm: "ငွေလွှဲပါ", en: "Transfer funds" },
    uploadScreenshot: { mm: "ပြေစာတင်ပါ", en: "Upload screenshot" },
    adminVerify: { mm: "အတည်ပြုစစ်ဆေးခြင်း", en: "Admin verification" },
    walletCredited: { mm: "ငွေရောက်ပါပြီ", en: "Wallet credited" },
    verified: { mm: "အတည်ပြုပြီး", en: "Verified" },
    dragDrop: { mm: "ဖိုင်ဆွဲချပါ သို့မဟုတ် နှိပ်ပါ", en: "Drag & drop or click" },
    requestSubmitted: { mm: "တင်သွင်းပြီး", en: "Request Submitted" },
    underReview: { mm: "စစ်ဆေးနေသည်", en: "Payment Under Review" },
    walletCreditedStep: { mm: "ငွေရောက်မည်", en: "Wallet Credited" },
    reviewTime: { mm: "၅-၁၅ မိနစ်အတွင်း ပြီးမြောက်ပါမည်", en: "Usually within 5-15 minutes" },
  },

  // Products
  products: {
    title: { mm: "ထုတ်ကုန်များ", en: "Products" },
    subtitle: { mm: "လက်ကားကတ်တလောက်", en: "Wholesale catalog" },
    search: { mm: "ထုတ်ကုန်ရှာမည်...", en: "Search products..." },
    noProducts: { mm: "ထုတ်ကုန်မတွေ့ပါ", en: "No products found" },
    adjustFilter: { mm: "ရှာဖွေမှုပြင်ကြည့်ပါ", en: "Try adjusting your search or filter" },
    showing: { mm: "ပြသနေသည်", en: "Showing" },
    of: { mm: "မှ", en: "of" },
    buyNow: { mm: "ဝယ်မည်", en: "Buy Now" },
    outOfStock: { mm: "လက်ကျန်မရှိ", en: "Out of Stock" },
    processing: { mm: "ဆောင်ရွက်နေသည်...", en: "Processing..." },
    quickView: { mm: "အမြန်ကြည့်မည်", en: "Quick View" },
    inStock: { mm: "လက်ကျန်ရှိ", en: "in stock" },
    left: { mm: "ကျန်", en: "left" },
    reset: { mm: "ပြန်စမည်", en: "Reset" },
    sortName: { mm: "အမည်", en: "Name" },
    sortPriceLow: { mm: "စျေးနည်း → များ", en: "Price: Low to High" },
    sortPriceHigh: { mm: "စျေးများ → နည်း", en: "Price: High to Low" },
    all: { mm: "အားလုံး", en: "All" },
    resellAt: { mm: "ပြန်ရောင်းစျေး", en: "Resell at" },
    profit: { mm: "အမြတ်", en: "Profit" },
    perUnit: { mm: "/ ခု", en: "/ unit" },
    from: { mm: "စတင်", en: "From" },
    qty: { mm: "ခု", en: "qty" },
  },

  // Product Detail
  detail: {
    suggestedResell: { mm: "အကြံပြုပြန်ရောင်းစျေး", en: "Suggested resell price" },
    profitPerUnit: { mm: "တစ်ခုချင်းအမြတ်", en: "Profit per unit" },
    volumePricing: { mm: "အထုပ်လိုက်စျေးနှုန်း", en: "Volume Pricing" },
    bestValue: { mm: "အကျိုးအများဆုံး", en: "Best value" },
    eachMmk: { mm: "/ ခု", en: "MMK / each" },
    whatYouGet: { mm: "ရရှိမည့်အချက်များ", en: "What You Get" },
    instantActivation: { mm: "ချက်ချင်းအသက်ဝင်", en: "Instant activation" },
    officialAccount: { mm: "တရားဝင်အကောင့်", en: "Official account" },
    warranty24h: { mm: "၂၄ နာရီအာမခံ", en: "24h warranty" },
    replacement: { mm: "ပျက်ပါက အစားထိုးပေး", en: "Replacement if failed" },
    secureDelivery: { mm: "လုံခြုံစွာပေးပို့", en: "Secure delivery" },
    importantNotice: { mm: "အရေးကြီးအသိပေးချက်", en: "Important Notice" },
    noRefund: { mm: "ပို့ပြီးနောက် ပြန်မအမ်းပါ", en: "No refund after delivery" },
    incorrectInput: { mm: "မှားရိုက်ပါက အာမခံပျက်", en: "Incorrect input voids warranty" },
    doubleCheck: { mm: "အတည်မပြုမီ ပြန်စစ်ပါ", en: "Double-check before confirming" },
    insufficientBalance: { mm: "လက်ကျန်ငွေ မလုံလောက်ပါ။", en: "Insufficient balance." },
    needMore: { mm: "နောက်ထပ်လိုအပ်သည်", en: "Need" },
    moreMmk: { mm: "MMK", en: "more MMK" },
    walletLabel: { mm: "ပိုက်ဆံအိတ်", en: "Wallet" },
    description: { mm: "အကြောင်းအရာ", en: "Description" },
  },

  // Orders
  orders: {
    title: { mm: "မှာယူမှုမှတ်တမ်း", en: "Order History" },
    subtitle: { mm: "ယခင်ဝယ်ယူမှုများအားလုံး", en: "View all your previous purchases" },
    exportCsv: { mm: "ဒေတာထုတ်မည်", en: "Export CSV" },
    search: { mm: "ရှာမည်", en: "Search" },
    productName: { mm: "ထုတ်ကုန်အမည်...", en: "Product name..." },
    orderId: { mm: "မှာယူမှု ID", en: "Order ID" },
    product: { mm: "ထုတ်ကုန်", en: "Product" },
    credentials: { mm: "အချက်အလက်", en: "Credentials" },
    price: { mm: "စျေးနှုန်း", en: "Price" },
    date: { mm: "ရက်စွဲ", en: "Date" },
    noOrders: { mm: "မှာယူမှုမရှိသေးပါ", en: "No orders yet" },
    noMatch: { mm: "စစ်ထုတ်မှုနှင့် ကိုက်ညီမှုမရှိ", en: "No orders match your filters" },
    clear: { mm: "ရှင်းမည်", en: "Clear" },
    from: { mm: "မှ", en: "From" },
    to: { mm: "သို့", en: "To" },
    startDate: { mm: "စတင်ရက်", en: "Start date" },
    endDate: { mm: "ကုန်ဆုံးရက်", en: "End date" },
  },

  // Notifications
  notifs: {
    title: { mm: "အသိပေးချက်များ", en: "Notifications" },
    unread: { mm: "မဖတ်ရသေး", en: "unread" },
    allCaughtUp: { mm: "အားလုံးဖတ်ပြီးပါပြီ", en: "All caught up!" },
    all: { mm: "အားလုံး", en: "All" },
    unreadFilter: { mm: "မဖတ်ရသေး", en: "Unread" },
    markAllRead: { mm: "အားလုံးဖတ်ပြီးပါ", en: "Mark all read" },
    clearAll: { mm: "အားလုံးရှင်းမည်", en: "Clear all" },
    noUnread: { mm: "မဖတ်ရသေးသော အသိပေးချက်မရှိပါ", en: "No unread notifications" },
    noNotifs: { mm: "အသိပေးချက်မရှိသေးပါ", en: "No notifications yet" },
  },

  // Settings
  settings: {
    title: { mm: "ဆက်တင်များ", en: "Settings" },
    subtitle: { mm: "အကောင့်ဆက်တင်စီမံခန့်ခွဲရန်", en: "Manage your account preferences" },
    profile: { mm: "ကိုယ်ရေးအချက်အလက်", en: "Profile" },
    email: { mm: "အီးမေးလ်", en: "Email" },
    displayName: { mm: "အမည်", en: "Display Name" },
    updateName: { mm: "အမည်ပြင်မည်", en: "Update Name" },
    saving: { mm: "သိမ်းနေသည်...", en: "Saving..." },
    changePassword: { mm: "စကားဝှက်ပြောင်းမည်", en: "Change Password" },
    currentPw: { mm: "လက်ရှိစကားဝှက်", en: "Current Password" },
    newPw: { mm: "စကားဝှက်အသစ်", en: "New Password" },
    confirmPw: { mm: "စကားဝှက်အတည်ပြု", en: "Confirm New Password" },
    changePwBtn: { mm: "စကားဝှက်ပြောင်းမည်", en: "Change Password" },
    changing: { mm: "ပြောင်းနေသည်...", en: "Changing..." },
    notifPrefs: { mm: "အသိပေးချက်ဆက်တင်", en: "Notification Preferences" },
    deliveryMethods: { mm: "အသိပေးနည်းလမ်း", en: "Delivery Methods" },
    soundEffects: { mm: "အသံအကျိုးသက်ရောက်မှု", en: "Sound Effects" },
    soundDesc: { mm: "သတိပေးချက်များအတွက် အသံထွက်ပေးမည်", en: "Play audio chime for alerts" },
    browserNotifs: { mm: "ဘရောက်ဇာ အသိပေးချက်", en: "Browser Notifications" },
    browserDesc: { mm: "တက်ဘ်မဟုတ်သည့်အခါ အသိပေးမည်", en: "Desktop alerts when unfocused" },
    alertTypes: { mm: "သတိပေးအမျိုးအစား", en: "Alert Types" },
    topupApproved: { mm: "ငွေဖြည့်အတည်ပြုပြီး", en: "Top-Up Approved" },
    topupApprovedDesc: { mm: "ငွေဖြည့်ခြင်း အတည်ပြုသည့်အခါ", en: "When your wallet top-up is approved" },
    purchaseComplete: { mm: "ဝယ်ယူမှုပြီးမြောက်", en: "Purchase Complete" },
    purchaseCompleteDesc: { mm: "ထုတ်ကုန်ဝယ်ယူမှု ပြီးမြောက်သည့်အခါ", en: "When a product purchase is completed" },
    lowBalanceWarning: { mm: "လက်ကျန်ငွေနည်း သတိပေးချက်", en: "Low Balance Warning" },
    lowBalanceDesc: { mm: "လက်ကျန်ငွေ သတ်မှတ်ချက်အောက်ကျသည့်အခါ", en: "When balance drops below threshold" },
    alertBelow: { mm: "အောက်ဆိုရင် သတိပေးမည်", en: "Alert when below" },
    orderUpdates: { mm: "မှာယူမှုအခြေအနေ", en: "Order Updates" },
    orderUpdatesDesc: { mm: "မှာယူမှု အခြေအနေပြောင်းသည့်အခါ", en: "When your order status changes" },
  },

  // Important Notice Modal
  notice: {
    title: { mm: "အရေးကြီးအသိပေးချက်", en: "Important Notice" },
    before: { mm: "ဝယ်ယူမှုမပြုလုပ်မီ အောက်ပါအချက်များကို သေချာပါ:", en: "Before purchasing, please confirm:" },
    nonRefundable: { mm: "ဝန်ဆောင်မှု ပြန်မအမ်းနိုင်ပါ", en: "This service is non-refundable" },
    instantProcess: { mm: "ချက်ချင်းအလုပ်လုပ်ပါသည်", en: "Activation is processed instantly" },
    ensureCorrect: { mm: "အချက်အလက်အားလုံး မှန်ကန်ရန် သေချာပါ", en: "Ensure all details are correct" },
    agreeLabel: { mm: "နားလည်ပြီး ဆက်လက်ဆောင်ရွက်မည်", en: "I understand and agree to proceed" },
    continueBtn: { mm: "ဆက်လက်အတည်ပြုမည်", en: "Continue to Confirm" },
    cancelBtn: { mm: "မလုပ်တော့ပါ", en: "Cancel" },
  },

  // Statuses
  status: {
    delivered: { mm: "ပြီးမြောက်", en: "Delivered" },
    pending: { mm: "စောင့်ဆိုင်းနေ", en: "Pending" },
    pending_creation: { mm: "ပြင်ဆင်နေ", en: "Preparing" },
    pending_review: { mm: "စစ်ဆေးနေ", en: "Under Review" },
    approved: { mm: "အတည်ပြုပြီး", en: "Approved" },
    rejected: { mm: "ငြင်းပယ်", en: "Rejected" },
    cancelled: { mm: "ပယ်ဖျက်", en: "Cancelled" },
  },

  // Common
  common: {
    mmk: "MMK",
    showing: { mm: "ပြသနေသည်", en: "Showing" },
    termsAndConditions: { mm: "စည်းကမ်းသတ်မှတ်ချက်များ", en: "Terms and Conditions" },
  },
} as const;

/** Render a bilingual label: Burmese large, English small */
export function BiLabel({ label, className = "" }: { label: BiLabel; className?: string }) {
  return null; // Use the inline pattern instead
}

/** Get status label in Burmese with English fallback */
export function statusLabel(status: string): { mm: string; en: string } {
  const map = t.status as Record<string, { mm: string; en: string }>;
  return map[status] || { mm: status, en: status };
}
