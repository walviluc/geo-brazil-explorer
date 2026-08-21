import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlans, PlanRecord, PlanInput, emptyPlan } from '@/hooks/usePlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Star, Check, Minus } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  slug: z.string().trim().min(2, 'Identificador obrigatório').max(40)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  name: z.string().trim().min(2, 'Nome obrigatório').max(60),
  description: z.string().trim().max(200),
  monthly_price: z.number().min(0).max(100000),
  yearly_price: z.number().min(0).max(100000),
  features: z.array(z.string().trim().min(1)).max(30),
  excluded: z.array(z.string().trim().min(1)).max(30),
  cta: z.string().trim().min(2).max(40),
  popular: z.boolean(),
  enabled: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

const toLines = (arr: string[]) => arr.join('\n');
const fromLines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);

export function PlanCatalogManager() {
  const { plans, loading, reload } = usePlans(true);
  const [editing, setEditing] = useState<PlanRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanInput>(emptyPlan());
  const [featuresText, setFeaturesText] = useState('');
  const [excludedText, setExcludedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PlanRecord | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyPlan(), sort_order: plans.length + 1 });
    setFeaturesText('');
    setExcludedText('');
    setCreating(true);
  };

  const openEdit = (p: PlanRecord) => {
    setEditing(p);
    const { id, ...rest } = p;
    setForm(rest);
    setFeaturesText(toLines(p.features));
    setExcludedText(toLines(p.excluded));
    setCreating(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      features: fromLines(featuresText),
      excluded: fromLines(excludedText),
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('plans').update(parsed.data).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(parsed.data);
        if (error) throw error;
      }
      toast({ title: editing ? 'Plano atualizado' : 'Plano criado', description: parsed.data.name });
      setCreating(false);
      setEditing(null);
      await reload();
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (p: PlanRecord, enabled: boolean) => {
    const { error } = await supabase.from('plans').update({ enabled }).eq('id', p.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return;
    }
    reload();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('plans').delete().eq('id', deleting.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plano excluído', description: deleting.name });
      reload();
    }
    setDeleting(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Catálogo de planos</h2>
          <p className="text-sm text-muted-foreground">
            Estes planos alimentam a seção “Planos de Acesso” da home e a página de assinatura.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo plano
        </Button>
      </div>

      {loading ? (
        <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    {p.popular && (
                      <Badge className="gap-1"><Star className="w-3 h-3" />Popular</Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-[10px]">{p.slug}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                </div>
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(v) => toggleEnabled(p, v)}
                  aria-label={`Ativar plano ${p.name}`}
                />
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold">R$ {p.monthly_price.toFixed(2).replace('.', ',')}</span>
                <span className="text-xs text-muted-foreground">/mês</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  anual: R$ {p.yearly_price.toFixed(2).replace('.', ',')}/mês
                </span>
              </div>

              <ul className="mt-3 space-y-1 flex-1">
                {p.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{f}</span>
                  </li>
                ))}
                {p.excluded.slice(0, 2).map((f, i) => (
                  <li key={`x-${i}`} className="text-xs flex gap-2 text-muted-foreground">
                    <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-1 line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(p)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
          )}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.name}` : 'Novo plano'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Identificador (slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                placeholder="profissional"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Preço mensal (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.monthly_price}
                onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Preço anual (R$/mês)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.yearly_price}
                onChange={(e) => setForm({ ...form, yearly_price: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Itens incluídos (um por linha)</Label>
              <Textarea rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Itens não incluídos (um por linha)</Label>
              <Textarea rows={3} value={excludedText} onChange={(e) => setExcludedText(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Texto do botão</Label>
              <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Ordem</Label>
              <Input
                type="number" min="0"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Mais popular</Label>
              <Switch checked={form.popular} onCheckedChange={(v) => setForm({ ...form, popular: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Ativo</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              O plano “{deleting?.name}” deixará de aparecer no site. Assinaturas existentes não são alteradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
