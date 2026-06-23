import { Document } from 'mongoose';
import { CursorPaginationParams, PaginatedResult } from '@chat/shared';
import { Types } from 'mongoose';

export function buildCursorQuery(
  params: CursorPaginationParams,
  baseQuery: any = {},
): any {
  const { cursor, direction = 'before' } = params;
  if (!cursor) return baseQuery;

  if (!Types.ObjectId.isValid(cursor)) {
    return baseQuery;
  }

  const cursorObjectId = new Types.ObjectId(cursor);
  const cursorFilter =
    direction === 'before'
      ? { _id: { $lt: cursorObjectId } }
      : { _id: { $gt: cursorObjectId } };

  return { ...baseQuery, ...cursorFilter };
}

interface Identifiable {
  _id: { toString(): string };
}

export function buildPaginatedResponse<T extends Identifiable>(
  data: T[],
  limit: number,
  total?: number,
): PaginatedResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem._id.toString() : null;

  return {
    data: items,
    nextCursor,
    hasMore,
    total,
  };
}
