import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "~/lib/firebase";

interface Tag {
  id: string;
  name: string;
  createdAt?: any;
}

interface TagsState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  isInitialized: boolean;
}

const initialState: TagsState = {
  tags: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,
};

export const addTag = createAsyncThunk(
  "tags/addTag",
  async (tagData: Omit<Tag, "id">) => {
    const docRef = await addDoc(collection(db, "tags"), tagData);
    return { id: docRef.id, ...tagData };
  }
);

export const updateTag = createAsyncThunk(
  "tags/updateTag",
  async ({ id, data }: { id: string; data: Partial<Tag> }) => {
    await updateDoc(doc(db, "tags", id), data);
    return { id, data };
  }
);

export const deleteTag = createAsyncThunk(
  "tags/deleteTag",
  async (id: string) => {
    await deleteDoc(doc(db, "tags", id));
    return id;
  }
);

export const tagsSlice = createSlice({
  name: "tags",
  initialState,
  reducers: {
    setTags: (state, action: PayloadAction<Tag[]>) => {
      state.tags = action.payload;
      state.lastFetched = new Date().toISOString();
      state.isInitialized = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags.push(action.payload);
      })
      .addCase(addTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add tag";
      })
      .addCase(updateTag.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.tags.findIndex(tag => tag.id === action.payload.id);
        if (index !== -1) {
          state.tags[index] = { ...state.tags[index], ...action.payload.data };
        }
      })
      .addCase(updateTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update tag";
      })
      .addCase(deleteTag.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = state.tags.filter(tag => tag.id !== action.payload);
      })
      .addCase(deleteTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete tag";
      });
  },
});

export const { setTags, clearError } = tagsSlice.actions;
export default tagsSlice.reducer;
