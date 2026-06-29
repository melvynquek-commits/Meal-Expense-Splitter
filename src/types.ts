export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
}

export interface ReceiptData {
  items: ReceiptItem[];
  serviceCharge: number;
  gst: number;
  total: number;
}
