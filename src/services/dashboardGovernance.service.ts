// =====================================================
// DASHBOARD GOVERNANCE SERVICE - Consisa KB Governance
// =====================================================

import { API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from './api-client.service';
import {
  DashboardGovernanceDto,
  DashboardGovernanceSummary,
  DashboardGovernanceSystem,
  DashboardGovernanceIssueItem,
  DashboardGovernanceTrend,
} from '@/types';

const toNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeIssueItem = (raw: unknown): DashboardGovernanceIssueItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = obj.id ? String(obj.id) : obj.issueId ? String(obj.issueId) : '';
  if (!id) return null;

  return {
    id,
    title: (obj.title as string) ?? (obj.issueTitle as string) ?? (obj.articleTitle as string) ?? null,
    systemCode: (obj.systemCode as string) ?? (obj.system as string) ?? null,
    systemName: (obj.systemName as string) ?? (obj.system as string) ?? null,
    type: (obj.type as string) ?? (obj.issueType as string) ?? null,
    severity: (obj.severity as string) ?? (obj.issueSeverity as string) ?? null,
    slaDueAt: (obj.slaDueAt as string) ?? (obj.dueAt as string) ?? (obj.dueDate as string) ?? null,
    createdAt: (obj.createdAt as string) ?? (obj.openedAt as string) ?? null,
    slaDays: typeof obj.slaDays === 'number' ? obj.slaDays : null,
    ageDays: typeof obj.ageDays === 'number' ? obj.ageDays : null,
  };
};

const normalizeTrend = (raw: unknown): DashboardGovernanceTrend | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const key =
    (obj.key as DashboardGovernanceTrend['key']) ??
    (obj.type as DashboardGovernanceTrend['key']) ??
    (obj.metric as DashboardGovernanceTrend['key']) ??
    null;
  const label = (obj.label as string) ?? (obj.title as string) ?? '';
  const delta = toNumber(obj.delta ?? obj.change ?? obj.diff ?? 0, 0);
  const direction =
    (obj.direction as DashboardGovernanceTrend['direction']) ??
    (delta >= 0 ? 'up' : 'down');

  if (!key && !label) return null;

  return {
    key: key ?? 'openIssues',
    label: label || 'Variação de issues',
    delta,
    direction,
    context: (obj.context as string) ?? (obj.period as string) ?? null,
  };
};

const normalizeSummary = (raw: Record<string, unknown>): DashboardGovernanceSummary => ({
  openIssues: toNumber(raw.openIssues ?? raw.openTotal ?? raw.totalOpen ?? raw.issuesOpen, 0),
  errorIssues: toNumber(raw.errorIssues ?? raw.errorOpen ?? raw.criticalOpen ?? raw.errorTotal, 0),
  overdueIssues: toNumber(raw.overdueIssues ?? raw.overdueOpen ?? raw.lateOpen ?? raw.overdueTotal, 0),
  unassignedIssues: toNumber(raw.unassignedIssues ?? raw.unassignedOpen ?? raw.withoutResponsible ?? raw.unassignedTotal, 0),
  slaCompliancePercent: toNumber(raw.slaCompliancePercent ?? raw.slaWithinPercent ?? raw.percentWithinSla ?? raw.slaWithin, 0),
});

const normalizeSystems = (items: unknown): DashboardGovernanceSystem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      const systemCode = (obj.systemCode as string) ?? (obj.code as string) ?? '';
      if (!systemCode) return null;

      return {
        systemCode,
        systemName: (obj.systemName as string) ?? (obj.name as string) ?? systemCode,
        healthScore: toNumber(obj.healthScore ?? obj.qualityScore ?? obj.score, 0),
        errorIssues: toNumber(obj.errorIssues ?? obj.errorOpen ?? obj.criticalOpen ?? obj.errors, 0),
        overdueIssues: toNumber(obj.overdueIssues ?? obj.overdueOpen ?? obj.lateOpen ?? obj.overdue, 0),
        unassignedIssues: toNumber(obj.unassignedIssues ?? obj.unassignedOpen ?? obj.withoutResponsible ?? obj.unassigned, 0),
      };
    })
    .filter((item): item is DashboardGovernanceSystem => Boolean(item));
};

const normalizeTrendsFromSummary = (raw: Record<string, unknown>): DashboardGovernanceTrend[] => {
  const trends: DashboardGovernanceTrend[] = [];
  const openChange = toNumber(raw.openChangePercent ?? raw.openIssuesChangePercent, 0);
  const resolvedChange = toNumber(raw.resolvedChangePercent ?? raw.resolvedIssuesChangePercent, 0);
  const slaChange = toNumber(raw.slaOverdueDelta ?? raw.slaWorsenedDelta ?? raw.overdueDelta, 0);

  if (openChange || openChange === 0) {
    trends.push({
      key: 'openIssues',
      label: 'Issues abertas',
      delta: openChange,
      direction: openChange >= 0 ? 'up' : 'down',
      context: '7 dias',
    });
  }
  if (resolvedChange || resolvedChange === 0) {
    trends.push({
      key: 'resolvedIssues',
      label: 'Issues resolvidas',
      delta: resolvedChange,
      direction: resolvedChange >= 0 ? 'up' : 'down',
      context: '7 dias',
    });
  }
  if (slaChange || slaChange === 0) {
    trends.push({
      key: 'sla',
      label: 'SLA piorou',
      delta: slaChange,
      direction: slaChange >= 0 ? 'up' : 'down',
      context: 'vencidas',
    });
  }

  return trends;
};

const normalizeDashboardGovernance = (response: unknown): DashboardGovernanceDto => {
  if (!response || typeof response !== 'object') {
    return {
      summary: normalizeSummary({}),
      systemsAtRisk: [],
      overdueToday: [],
      unassigned: [],
      trends: [],
    };
  }

  const raw = response as Record<string, unknown>;
  const summaryRaw = (raw.summary as Record<string, unknown>) ?? (raw.overview as Record<string, unknown>) ?? raw;

  const systemsAtRisk = normalizeSystems(raw.systemsAtRisk ?? raw.systems ?? raw.bySystem ?? raw.systemStats ?? []);
  const overdueToday = (Array.isArray(raw.overdueToday) ? raw.overdueToday : raw.overdue ?? [])
    .map((item) => normalizeIssueItem(item))
    .filter((item): item is DashboardGovernanceIssueItem => Boolean(item));
  const unassigned = (Array.isArray(raw.unassigned) ? raw.unassigned : raw.unassignedIssues ?? [])
    .map((item) => normalizeIssueItem(item))
    .filter((item): item is DashboardGovernanceIssueItem => Boolean(item));

  const trendItems = Array.isArray(raw.trends) ? raw.trends : [];
  const trends =
    trendItems.length > 0
      ? trendItems
          .map((item) => normalizeTrend(item))
          .filter((item): item is DashboardGovernanceTrend => Boolean(item))
      : normalizeTrendsFromSummary(summaryRaw);

  return {
    summary: normalizeSummary(summaryRaw),
    systemsAtRisk,
    overdueToday,
    unassigned,
    trends,
  };
};

class DashboardGovernanceService {
  async getDashboard(): Promise<DashboardGovernanceDto> {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.DASHBOARD_GOVERNANCE);
    return normalizeDashboardGovernance(response);
  }
}

export const dashboardGovernanceService = new DashboardGovernanceService();
