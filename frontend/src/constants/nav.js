import {
  Home, ShoppingBag, Sprout, Wheat, Plus, TrendingUp,
  ClipboardList, Receipt, User, Users, Package, Flag, Beaker,
} from "lucide-react";

export const NAV_BY_ROLE = {
  farmer: [
    { id: "dashboard",      label: "Dashboard",             icon: Home },
    { id: "marketplace",    label: "Marketplace",           icon: ShoppingBag },
    { id: "recommendation", label: "Input Recommendations", icon: Sprout },
    { id: "my-listings",    label: "My Listings",           icon: Wheat },
    { id: "list-produce",   label: "List Produce",          icon: Plus },
    { id: "prices",         label: "Market Prices",         icon: TrendingUp },
    { id: "orders",         label: "Orders",                icon: ClipboardList },
    { id: "transactions",   label: "Transactions",          icon: Receipt },
    { id: "profile",        label: "Profile",               icon: User },
  ],
  buyer: [
    { id: "dashboard",   label: "Dashboard",     icon: Home },
    { id: "marketplace", label: "Marketplace",   icon: ShoppingBag },
    { id: "prices",      label: "Market Prices", icon: TrendingUp },
    { id: "orders",      label: "Orders",        icon: ClipboardList },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "profile",     label: "Profile",       icon: User },
  ],
  supplier: [
    { id: "dashboard",   label: "Dashboard",     icon: Home },
    { id: "marketplace", label: "Marketplace",   icon: ShoppingBag },
    { id: "my-listings", label: "My Listings",   icon: Package },
    { id: "list-input",  label: "Add Listing",   icon: Plus },
    { id: "orders",      label: "Orders",        icon: ClipboardList },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "profile",     label: "Profile",       icon: User },
  ],
  admin: [
    { id: "dashboard",    label: "Dashboard",     icon: Home },
    { id: "admin-users",  label: "Users",         icon: Users },
    { id: "marketplace",  label: "Listings",      icon: ShoppingBag },
    { id: "admin-prices", label: "Market Prices", icon: TrendingUp },
    { id: "transactions", label: "Transactions",  icon: Receipt },
    { id: "admin-reports", label: "Reports",      icon: Flag },
  ],
};