/**
 * Generated RPC argument types mark every parameter as non-null, but our SQL
 * functions accept NULL for optional arguments (e.g. p_quote_id on create).
 */
export function nullable<T>(value: T | null | undefined): T {
  return (value ?? null) as T;
}
