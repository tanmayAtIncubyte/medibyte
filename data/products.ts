export type ProductType = "OTC" | "Rx";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: ProductType;
  category: string;
  stock: number;
  requiresPrescription: boolean;
};

export const products: readonly Product[] = [
  {
    id: "prod-ibuprofen-200",
    name: "Ibuprofen 200mg Tablets (50 ct)",
    description: "Pain reliever and fever reducer for everyday aches and pains.",
    price: 6.99,
    type: "OTC",
    category: "Pain Relief",
    stock: 240,
    requiresPrescription: false,
  },
  {
    id: "prod-acetaminophen-500",
    name: "Acetaminophen 500mg Caplets (100 ct)",
    description: "Extra-strength relief for headaches, muscle aches, and fever.",
    price: 8.49,
    type: "OTC",
    category: "Pain Relief",
    stock: 180,
    requiresPrescription: false,
  },
  {
    id: "prod-cetirizine-10",
    name: "Cetirizine 10mg Allergy Tablets (30 ct)",
    description: "24-hour non-drowsy relief from indoor and outdoor allergies.",
    price: 12.25,
    type: "OTC",
    category: "Allergy",
    stock: 95,
    requiresPrescription: false,
  },
  {
    id: "prod-vitamin-d3",
    name: "Vitamin D3 2000 IU Softgels (120 ct)",
    description: "Daily supplement supporting bone health and immune function.",
    price: 9.99,
    type: "OTC",
    category: "Vitamins",
    stock: 320,
    requiresPrescription: false,
  },
  {
    id: "prod-antacid-chewable",
    name: "Antacid Chewable Tablets (96 ct)",
    description: "Fast-acting relief from heartburn and acid indigestion.",
    price: 5.49,
    type: "OTC",
    category: "Digestive Health",
    stock: 150,
    requiresPrescription: false,
  },
  {
    id: "prod-cough-syrup",
    name: "Cough & Cold Relief Syrup (8 fl oz)",
    description: "Daytime relief for cough, congestion, and sore throat.",
    price: 11.79,
    type: "OTC",
    category: "Cold & Flu",
    stock: 88,
    requiresPrescription: false,
  },
  {
    id: "prod-amoxicillin-500",
    name: "Amoxicillin 500mg Capsules (21 ct)",
    description: "Antibiotic for bacterial infections. Prescription required.",
    price: 18.0,
    type: "Rx",
    category: "Antibiotics",
    stock: 60,
    requiresPrescription: true,
  },
  {
    id: "prod-lisinopril-10",
    name: "Lisinopril 10mg Tablets (30 ct)",
    description: "Blood pressure medication for hypertension. Prescription required.",
    price: 14.5,
    type: "Rx",
    category: "Cardiovascular",
    stock: 75,
    requiresPrescription: true,
  },
  {
    id: "prod-metformin-500",
    name: "Metformin 500mg Tablets (60 ct)",
    description: "Oral medication to manage type 2 diabetes. Prescription required.",
    price: 16.25,
    type: "Rx",
    category: "Diabetes Care",
    stock: 50,
    requiresPrescription: true,
  },
  {
    id: "prod-atorvastatin-20",
    name: "Atorvastatin 20mg Tablets (30 ct)",
    description: "Cholesterol-lowering statin. Prescription required.",
    price: 22.4,
    type: "Rx",
    category: "Cardiovascular",
    stock: 42,
    requiresPrescription: true,
  },
  {
    id: "prod-albuterol-inhaler",
    name: "Albuterol Inhaler 90mcg",
    description: "Quick-relief inhaler for asthma and bronchospasm. Prescription required.",
    price: 34.99,
    type: "Rx",
    category: "Respiratory",
    stock: 30,
    requiresPrescription: true,
  },
];
