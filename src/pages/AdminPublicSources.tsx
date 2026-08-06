import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePublicSources, PublicSourceRow } from '@/hooks/usePublicSources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserMenu } from '@/components/UserMenu';
import { Loader2, Trash2, ArrowLeft, ShieldAlert, Plus, Pencil, Save, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['geral', 'ambiente', 'territorio', 'infraestrutura', 'recursos', 'social'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  geral: 'Geral', ambiente: 'Ambiente', territorio: 'Território',
  infraestrutura: 'Infraestrutura', recursos: 'Recursos', social: 'Social',
};

type Draft = Omit<PublicSourceRow, 'id'> & { id?: string };

const EMPTY: Draft = {
  slug: '', label: '', description: '', url: '',
  category: 'geral', enabled: true, sort_order: 0,
};

export default function AdminPublicSources() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { rows, reload, loading } = usePublicSources(true);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = 'Fontes públicas · Painel ADM'; }, []);
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const toggleEnabled = async (row: PublicSourceRow, enabled: boolean) => {
    const { error } = await supabase
      .from('public_data_sources')
      .update({ enabled })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: enabled ? 'Fonte ativada' : 'Fonte desativada', description: row.label });
    reload();
  };

  const remove = async (row: PublicSourceRow) => {
    if (!confirm(`Excluir a fonte "${row.label}"?`)) return;
    const { error } = await supabase.from('public_data_sources').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fonte excluída' });
    reload();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.label || !editing.url || !editing.slug) {
      toast({ title: 'Campos obrigatórios', description: 'Identificador, nome e URL.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      slug: editing.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      label: editing.label.trim(),
      description: editing.description ?? '',
      url: editing.url.trim(),
      category: editing.category,
      enabled: editing.enabled,
      sort_order: Number(editing.sort_order) || 0,
    };
    const { error } = editing.id
      ? await supabase.from('public_data_sources').update(payload).eq('id', editing.id)
      : await supabase.from('public_data_sources').insert({ ...payload, created_by: user!.id });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Fonte atualizada' : 'Fonte adicionada' });
    setEditing(null);
    reload();
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="text-muted-foreground max-w-md">
          Esta área é restrita a administradores do GeoData Brasil.
        </p>
        <Button onClick={() => navigate('/')}>Voltar para a página inicial</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <span className="font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Fontes públicas
            </span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Fontes públicas de dados</h1>
            <p className="text-muted-foreground text-sm">
              Ative, desative, edite ou adicione as fontes (IBGE, INPE, ICMBio...) exibidas no dashboard.
            </p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY, sort_order: (rows.length + 1) * 10 })}>
            <Plus className="w-4 h-4 mr-1" /> Nova fonte
          </Button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-4',
                  row.enabled ? 'border-border bg-card' : 'border-dashed bg-muted/30 opacity-80',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] uppercase tracking-wide px-2 py-0.5 rounded',
                        row.enabled
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {row.enabled ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{row.description}</p>
                  <p className="text-xs font-mono text-muted-foreground/80 mt-1 break-all">{row.url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(v) => toggleEnabled(row, v)}
                    aria-label={`Ativar ${row.label}`}
                  />
                  <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(row)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Nenhuma fonte cadastrada.</p>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar fonte' : 'Nova fonte pública'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="IBGE — Geografia e Estatística"
                />
              </div>
              <div className="grid gap-2">
                <Label>Identificador (slug)</Label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="ibge"
                />
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label>URL do serviço (OWS/WMS)</Label>
                <Input
                  value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://geoservicos.ibge.gov.br/geoserver/ows"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v as PublicSourceRow['category'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing.enabled}
                  onCheckedChange={(v) => setEditing({ ...editing, enabled: v })}
                />
                <span className="text-sm">Fonte ativa no dashboard</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
