import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { UF_NAMES } from '@/lib/wms-explorer';
import { Loader2, Trash2, Upload } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  description: string | null;
  uf: string | null;
  layer_name: string;
  storage_path: string;
  file_format: 'geojson' | 'shapefile';
  required_plan: 'profissional' | 'completo';
  created_at: string;
}

export default function AdminDataSources() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uf, setUf] = useState<string>('');
  const [layerName, setLayerName] = useState('');
  const [requiredPlan, setRequiredPlan] = useState<'profissional' | 'completo'>('profissional');
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('custom_data_sources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao listar', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !layerName) {
      toast({ title: 'Campos obrigatórios', description: 'Nome, camada e arquivo.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const format: 'geojson' | 'shapefile' =
        file.name.toLowerCase().endsWith('.zip') ? 'shapefile' : 'geojson';
      const path = `${uf || 'BR'}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: upErr } = await supabase.storage
        .from('custom-geodata')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('custom_data_sources').insert({
        name,
        description: description || null,
        uf: uf || null,
        layer_name: layerName,
        storage_path: path,
        file_format: format,
        required_plan: requiredPlan,
        created_by: user!.id,
      });
      if (insErr) throw insErr;

      toast({ title: 'Fonte adicionada' });
      setName(''); setDescription(''); setUf(''); setLayerName(''); setFile(null);
      await load();
    } catch (err) {
      toast({
        title: 'Erro no upload',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: Row) => {
    if (!confirm(`Remover "${row.name}"?`)) return;
    await supabase.storage.from('custom-geodata').remove([row.storage_path]);
    const { error } = await supabase.from('custom_data_sources').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground mb-4">
            Esta área é exclusiva para administradores.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">Fontes Personalizadas</h1>
      <p className="text-muted-foreground mb-8">
        Envie shapefiles (.zip) ou GeoJSON (.json/.geojson) por estado. Disponíveis para planos premium.
      </p>

      <form onSubmit={handleUpload} className="grid gap-4 p-6 rounded-xl border bg-card mb-10">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nome da fonte</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Nome técnico da camada</Label>
            <Input value={layerName} onChange={e => setLayerName(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>UF</Label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger><SelectValue placeholder="Nacional" /></SelectTrigger>
              <SelectContent>
                {Object.entries(UF_NAMES).map(([code, n]) => (
                  <SelectItem key={code} value={code}>{code} — {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plano mínimo</Label>
            <Select value={requiredPlan} onValueChange={(v) => setRequiredPlan(v as 'profissional' | 'completo')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="completo">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo (.zip shapefile ou .geojson)</Label>
            <Input
              type="file"
              accept=".zip,.geojson,.json"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-fit">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Enviar
        </Button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Fontes cadastradas ({rows.length})</h2>
      <div className="grid gap-3">
        {rows.map(r => (
          <div key={r.id} className="p-4 rounded-lg border bg-card flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {r.uf || 'Nacional'} · {r.layer_name} · {r.file_format} · plano {r.required_plan}
              </p>
              {r.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma fonte cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}