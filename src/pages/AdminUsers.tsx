import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, ShieldAlert, ArrowLeft, MapPin, Search, Users, Ban, CheckCircle2,
  Pencil, Receipt, Crown, XCircle, Save,
} from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { z } from 'zod';

type Plan = 'gratuito' | 'profissional' | 'completo';

interface PaymentRow {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  blocked: boolean;
  blocked_at: string | null;
  created_at: string;
  plan: Plan;
  subStatus: string;
  expiresAt: string | null;
  payments: PaymentRow[];
  paidTotal: number;
  lastPaidAt: string | null;
}

type Filter = 'todos' | 'pagantes' | 'sem-pagamento' | 'bloqueados';

const planLabels: Record<Plan, string> = {
  gratuito: 'Gratuito',
  profissional: 'Profissional',
  completo: 'Completo',
};

const profileSchema = z.object({
  full_name: z.string().trim().max(120, 'Máximo de 120 caracteres'),
  email: z.string().trim().email('E-mail inválido').max(255),
});

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [receiptsOf, setReceiptsOf] = useState<UserRow | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Usuários e assinantes · Painel ADM · GeoData Brasil';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, subsRes, paymentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,email,full_name,blocked,blocked_at,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('user_id,plan,status,expires_at'),
        supabase
          .from('payment_records')
          .select('id,user_id,plan,amount,currency,status,payment_method,paid_at,created_at')
          .order('created_at', { ascending: false }),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (subsRes.error) throw subsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const subMap = new Map((subsRes.data ?? []).map((s) => [s.user_id, s]));
      const payMap = new Map<string, PaymentRow[]>();
      for (const p of (paymentsRes.data ?? []) as PaymentRow[]) {
        const list = payMap.get(p.user_id) ?? [];
        list.push({ ...p, amount: Number(p.amount) });
        payMap.set(p.user_id, list);
      }

      const rows: UserRow[] = (profilesRes.data ?? []).map((p) => {
        const sub = subMap.get(p.id);
        const payments = payMap.get(p.id) ?? [];
        const approved = payments.filter((x) => x.status === 'approved');
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          blocked: !!p.blocked,
          blocked_at: p.blocked_at,
          created_at: p.created_at,
          plan: (sub?.plan ?? 'gratuito') as Plan,
          subStatus: sub?.status ?? 'active',
          expiresAt: sub?.expires_at ?? null,
          payments,
          paidTotal: approved.reduce((acc, x) => acc + x.amount, 0),
          lastPaidAt: approved[0]?.paid_at ?? approved[0]?.created_at ?? null,
        };
      });
      setUsers(rows);
    } catch (err) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !`${u.full_name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q)) return false;
      if (filter === 'pagantes') return u.paidTotal > 0;
      if (filter === 'sem-pagamento') return u.paidTotal === 0;
      if (filter === 'bloqueados') return u.blocked;
      return true;
    });
  }, [users, query, filter]);

  const stats = useMemo(() => ({
    total: users.length,
    payers: users.filter((u) => u.paidTotal > 0).length,
    blocked: users.filter((u) => u.blocked).length,
    revenue: users.reduce((acc, u) => acc + u.paidTotal, 0),
  }), [users]);

  const toggleBlock = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      const next = !u.blocked;
      const { error } = await supabase
        .from('profiles')
        .update({ blocked: next, blocked_at: next ? new Date().toISOString() : null })
        .eq('id', u.id);
      if (error) throw error;
      setUsers((prev) => prev.map((x) => (x.id === u.id
        ? { ...x, blocked: next, blocked_at: next ? new Date().toISOString() : null }
        : x)));
      toast({
        title: next ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: u.email ?? u.id,
      });
    } catch (err) {
      toast({
        title: 'Erro ao atualizar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditName(u.full_name ?? '');
    setEditEmail(u.email ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const parsed = profileSchema.safeParse({ full_name: editName, email: editEmail });
    if (!parsed.success) {
      toast({
        title: 'Dados inválidos',
        description: parsed.error.issues[0]?.message,
        variant: 'destructive',
      });
      return;
    }
    setBusyId(editing.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: parsed.data.full_name || null, email: parsed.data.email })
        .eq('id', editing.id);
      if (error) throw error;
      setUsers((prev) => prev.map((x) => (x.id === editing.id
        ? { ...x, full_name: parsed.data.full_name || null, email: parsed.data.email }
        : x)));
      toast({ title: 'Perfil atualizado', description: parsed.data.email });
      setEditing(null);
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
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
        <AdminHeader />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center p-8 rounded-2xl border bg-card shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 grid place-items-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
            <p className="text-muted-foreground mb-6">Esta área é exclusiva para administradores.</p>
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
      <AdminHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Usuários e assinantes</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Consulte os cadastros, edite dados de contato, bloqueie acessos e acompanhe quem já pagou.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="Cadastros" value={String(stats.total)} icon={Users} />
          <StatCard label="Já pagaram" value={String(stats.payers)} icon={CheckCircle2} />
          <StatCard label="Bloqueados" value={String(stats.blocked)} icon={Ban} />
          <StatCard label="Total recebido" value={brl(stats.revenue)} icon={Receipt} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os usuários</SelectItem>
              <SelectItem value="pagantes">Quem já pagou</SelectItem>
              <SelectItem value="sem-pagamento">Sem pagamentos</SelectItem>
              <SelectItem value="bloqueados">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Recarregar'}
          </Button>
        </div>

        {/* List */}
        <div className="grid gap-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-lg border bg-card grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium truncate">{u.full_name || 'Sem nome'}</p>
                  {u.blocked ? (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="w-3 h-3" /> Bloqueado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    {u.plan !== 'gratuito' && <Crown className="w-3 h-3 text-primary" />}
                    {planLabels[u.plan]}
                  </Badge>
                  {u.paidTotal > 0 ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Pagou {brl(u.paidTotal)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <XCircle className="w-3 h-3" /> Sem pagamento
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-1">{u.email || u.id}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cadastro: {dateFmt(u.created_at)} · Último pagamento: {dateFmt(u.lastPaidAt)} ·
                  {' '}Assinatura: {u.subStatus} · Expira: {dateFmt(u.expiresAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReceiptsOf(u)}
                  disabled={u.payments.length === 0}
                >
                  <Receipt className="w-4 h-4 mr-2" /> Pagamentos ({u.payments.length})
                </Button>
                <Button
                  variant={u.blocked ? 'secondary' : 'destructive'}
                  size="sm"
                  onClick={() => toggleBlock(u)}
                  disabled={busyId === u.id}
                >
                  {busyId === u.id
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : u.blocked
                      ? <CheckCircle2 className="w-4 h-4 mr-2" />
                      : <Ban className="w-4 h-4 mr-2" />}
                  {u.blocked ? 'Desbloquear' : 'Bloquear'}
                </Button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </div>
      </main>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados de contato exibidos no portal. O login do usuário não é alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="admin-user-name">Nome completo</Label>
              <Input
                id="admin-user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div>
              <Label htmlFor="admin-user-email">E-mail de contato</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={busyId === editing?.id}>
              {busyId === editing?.id
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payments dialog */}
      <Dialog open={!!receiptsOf} onOpenChange={(o) => !o && setReceiptsOf(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagamentos</DialogTitle>
            <DialogDescription>{receiptsOf?.email ?? receiptsOf?.id}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            {(receiptsOf?.payments ?? []).map((p) => (
              <div key={p.id} className="p-3 rounded-lg border bg-muted/30 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{brl(p.amount)}</span>
                  <Badge variant={p.status === 'approved' ? 'secondary' : 'outline'}>
                    {p.status === 'approved' ? 'Aprovado' : p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Plano {p.plan} · {p.payment_method ?? 'método não informado'} ·
                  {' '}{dateFmt(p.paid_at ?? p.created_at)}
                </p>
              </div>
            ))}
            {(receiptsOf?.payments.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
          </a>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/plans')}
              className="hidden sm:inline-flex text-secondary-foreground hover:bg-secondary-foreground/10"
            >
              Planos
            </Button>
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
