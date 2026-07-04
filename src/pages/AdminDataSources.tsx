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
import { Loader2, Trash2, Upload, MapPin, ShieldAlert, ArrowLeft, Lock, Gift } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/UserMenu';

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
  geojson_premium: boolean;
  kml_premium: boolean;
  shapefile_premium: boolean;
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
  const [geojsonPremium, setGeojsonPremium] = useState(false);
  const [kmlPremium, setKmlPremium] = useState(false);
  const [shpPremium, setShpPremium] = useState(false);

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
        geojson_premium: geojsonPremium,
        kml_premium: kmlPremium,
        shapefile_premium: shpPremium,
      });
      if (insErr) throw insErr;

      toast({ title: 'Fonte adicionada' });
      setName(''); setDescription(''); setUf(''); setLayerName(''); setFile(null);
      setGeojsonPremium(false); setKmlPremium(false); setShpPremium(false);
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

  const toggleFormat = async (
    row: Row,
    field: 'geojson_premium' | 'kml_premium' | 'shapefile_premium',
    value: boolean,
  ) => {
    // Optimistic UI update.
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: value } : r));
    const patch = { [field]: value } as {
      geojson_premium?: boolean; kml_premium?: boolean; shapefile_premium?: boolean;
    };
    const { error } = await supabase
      .from('custom_data_sources')
      .update(patch)
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: !value } : r));
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader onBack={() => navigate('/dashboard')} />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center p-8 rounded-2xl border bg-card shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 grid place-items-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é exclusiva para administradores. Se você acredita que deveria ter acesso, entre em contato com o suporte.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onBack={() => navigate('/dashboard')} />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
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
        <div>
          <Label className="mb-3 block">Formatos disponíveis</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Ligado = <strong className="text-primary">Premium</strong> (planos pagos) · Desligado = <strong className="text-emerald-600 dark:text-emerald-400">Grátis</strong> (todos os usuários)
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <FormatToggle label="GeoJSON" premium={geojsonPremium} onChange={setGeojsonPremium} />
            <FormatToggle label="KML" premium={kmlPremium} onChange={setKmlPremium} />
            <FormatToggle label="Shapefile" premium={shpPremium} onChange={setShpPremium} />
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
              <div className="grid sm:grid-cols-3 gap-2 mt-3">
                <FormatToggle
                  label="GeoJSON"
                  premium={r.geojson_premium}
                  onChange={(v) => toggleFormat(r, 'geojson_premium', v)}
                  compact
                />
                <FormatToggle
                  label="KML"
                  premium={r.kml_premium}
                  onChange={(v) => toggleFormat(r, 'kml_premium', v)}
                  compact
                />
                <FormatToggle
                  label="Shapefile"
                  premium={r.shapefile_premium}
                  onChange={(v) => toggleFormat(r, 'shapefile_premium', v)}
                  disabled={r.file_format !== 'shapefile'}
                  compact
                />
              </div>
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
      </main>
    </div>
  );
}

function AdminHeader({ onBack: _onBack }: { onBack: () => void }) {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Painel ADM · GeoData Brasil';
    return () => { document.title = prev; };
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Painel ADM
            </span>
            <UserMenu showPlanBadge={false} showDashboardLink />
          </div>
        </div>
      </div>
    </header>
  );
}

interface FormatToggleProps {
  label: string;
  premium: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

function FormatToggle({ label, premium, onChange, disabled, compact }: FormatToggleProps) {
  return (
    <label
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && premium && "border-primary/40 bg-primary/5",
        !disabled && !premium && "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors",
            premium ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {premium ? <Lock className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <p className={cn("font-medium leading-tight", compact ? "text-xs" : "text-sm")}>{label}</p>
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide leading-tight",
              premium ? "text-primary" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {disabled ? 'Indisponível' : premium ? 'Premium' : 'Grátis'}
          </p>
        </div>
      </div>
      <Switch checked={premium} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}