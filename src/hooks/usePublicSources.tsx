import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DATA_SOURCES, DataSource } from "@/lib/data-sources";

export interface PublicSourceRow {
  id: string;
  slug: string;
  label: string;
  description: string;
  url: string;
  category: DataSource["category"];
  enabled: boolean;
  sort_order: number;
}

const INTERNAL = DATA_SOURCES.filter((s) => s.internal);

export function rowToSource(row: PublicSourceRow): DataSource {
  return {
    id: row.slug,
    label: row.label,
    description: row.description ?? "",
    url: row.url,
    category: row.category,
  };
}

/** Loads the admin-managed public data sources from the backend. */
export function usePublicSources(includeDisabled = false) {
  const [rows, setRows] = useState<PublicSourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("public_data_sources")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) {
      setRows(data as unknown as PublicSourceRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = includeDisabled ? rows : rows.filter((r) => r.enabled);
  const sources: DataSource[] = [...INTERNAL, ...visible.map(rowToSource)];

  return { rows, sources: sources.length > INTERNAL.length ? sources : DATA_SOURCES, loading, reload: load };
}
