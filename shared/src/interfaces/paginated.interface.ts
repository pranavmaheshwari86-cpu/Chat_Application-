export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'before' | 'after';
}
