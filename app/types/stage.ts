// app/types/stage.ts
export interface Stage {
  id: string;
  title: string;
  order: number;
  color: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
