import { Document } from 'mongoose';
import { CursorPaginationParams, PaginatedResult } from '@chat/shared';
import { Types } from 'mongoose';

export function buildCursorQuery(
  params: CursorPaginationParams,
  baseQuery: any = {},
): any {
  const { cursor, direction = 'before' } = params;
  if (!cursor) return baseQuery;

  const cursorObjectId = new Types.ObjectId(cursor);
  const cursorFilter =
    direction === 'before'
      ? { _id: { $lt: cursorObjectId } }
      : { _id: { $gt: cursorObjectId } };

  return { ...baseQuery, ...cursorFilter };
}

export function buildPaginatedResponse<T>(
  data: T[],
  limit: number,
  total?: number,
): PaginatedResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  // Assuming the items have an _id field. Need type casting or check.

  const lastItem = items[items.length - 1] as any;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const nextCursor = hasMore && lastItem ? lastItem._id.toString() : null;

  return {
    data: items,

    nextCursor,
    hasMore,
    total,
  };
}
