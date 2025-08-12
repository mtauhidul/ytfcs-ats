import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "~/lib/firebase";

interface Category {
  id: string;
  name: string;
  createdAt?: any;
}

interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  isInitialized: boolean;
}

const initialState: CategoriesState = {
  categories: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,
};

export const addCategory = createAsyncThunk(
  "categories/addCategory",
  async (categoryData: Omit<Category, "id">) => {
    const docRef = await addDoc(collection(db, "categories"), categoryData);
    return { id: docRef.id, ...categoryData };
  }
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async ({ id, data }: { id: string; data: Partial<Category> }) => {
    await updateDoc(doc(db, "categories", id), data);
    return { id, data };
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id: string) => {
    await deleteDoc(doc(db, "categories", id));
    return id;
  }
);

export const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
      state.lastFetched = new Date().toISOString();
      state.isInitialized = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.push(action.payload);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add category";
      })
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.categories.findIndex(category => category.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = { ...state.categories[index], ...action.payload.data };
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update category";
      })
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(category => category.id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete category";
      });
  },
});

export const { setCategories, clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;
