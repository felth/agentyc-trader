import { MemoryIndex } from "@/lib/constants/memory";

export type LibraryIndex = MemoryIndex; // CORPUS | PLAYBOOK

export interface LibraryDocument {
  id: string;
  fileName: string;
  title: string;
  author?: string | null;
  index: LibraryIndex | "hybrid"; // "hybrid" == feeds both
  createdAt: string;
  sizeBytes?: number;
  status: "ready" | "processing" | "error";
  mimeType?: string;
  storageUrl?: string;
}

