import type { GameState } from '../types'

/**
 * The app keeps localStorage as its source of truth. This small interface is
 * the seam for an optional Supabase adapter, so cloud sync can be added later
 * without changing the Zustand store or the local save format.
 */
export interface SyncStore {
  pull(userId: string): Promise<GameState | null>
  push(userId: string, state: GameState): Promise<void>
}

export interface SupabaseLikeClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
    upsert(values: Record<string, unknown>, options?: { onConflict?: string }): Promise<{ error: { message: string } | null }>
  }
}

export function createSupabaseStore(client: SupabaseLikeClient, table = 'life_rpg_saves'): SyncStore {
  return {
    async pull(userId) {
      const result = await client.from(table).select('payload').eq('user_id', userId).maybeSingle()
      if (result.error) throw new Error(result.error.message)
      const payload = result.data as { payload?: unknown } | null
      return (payload?.payload as GameState | null | undefined) ?? null
    },
    async push(userId, state) {
      const result = await client.from(table).upsert(
        { user_id: userId, payload: state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      if (result.error) throw new Error(result.error.message)
    },
  }
}
