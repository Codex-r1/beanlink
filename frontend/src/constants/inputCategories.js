import { Sprout, Beaker, Leaf, ShieldAlert, Tractor, Package, ShoppingBag, Wheat } from "lucide-react";

export const INPUT_CATEGORIES = [
  { id: "seed",            label: "Certified Seeds",   icon: Sprout },
  { id: "fertilizer",      label: "Fertilizers",       icon: Beaker },
  { id: "soil_amendment",  label: "Soil Amendments",   icon: Leaf },
  { id: "crop_protection", label: "Crop Protection",   icon: ShieldAlert },
  { id: "equipment",       label: "Farm Equipment",    icon: Tractor },
  { id: "other_input",     label: "Other Inputs",      icon: Package },
];

export const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: ShoppingBag },
  ...INPUT_CATEGORIES,
  { id: "produce", label: "Bean Produce", icon: Wheat },
];