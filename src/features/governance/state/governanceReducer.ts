import {
  GovernanceIssueDto,
  GovernanceOverviewDto,
  GovernanceOverviewSystemDto,
  GovernanceResponsible,
  IssueStatus,
  KbSystem,
  PaginatedResponse,
} from '@/types';
import type { IssuesFilter } from '@/services/governance.service';
import { config } from '@/config/app-config';

export type GovernanceFilters = IssuesFilter & {
  overdue?: boolean;
  unassigned?: boolean;
};

export const createInitialFilters = (isManager: boolean, actorIdentifier: string): GovernanceFilters => ({
  systemCode: '',
  status: undefined,
  type: undefined,
  severity: undefined,
  responsibleType: '',
  responsibleId: isManager ? '' : actorIdentifier,
  q: '',
  overdue: false,
  unassigned: false,
});

export interface GovernanceState {
  overview: GovernanceOverviewDto | null;
  overviewLoading: boolean;
  overviewError: string | null;
  issuesData: PaginatedResponse<GovernanceIssueDto> | null;
  issuesLoading: boolean;
  issuesError: string | null;
  systems: KbSystem[];
  page: number;
  size: number;
  filters: GovernanceFilters;
  assign: {
    target: GovernanceIssueDto | null;
    responsibleType: string;
    responsibleId: string;
    responsibleName: string;
    dueDate: string;
  };
  status: {
    target: GovernanceIssueDto | null;
    value: IssueStatus;
    ignoredReason: string;
  };
  actionLoading: { id: string; action: string } | null;
  suggested: {
    loading: boolean;
    error: string | null;
    assignee: GovernanceResponsible | null;
    alternatives: GovernanceResponsible[];
  };
  systemRows: GovernanceOverviewSystemDto[];
}

export type GovernanceAction =
  | { type: 'SET_OVERVIEW_LOADING'; payload: boolean }
  | { type: 'SET_OVERVIEW'; payload: GovernanceOverviewDto | null }
  | { type: 'SET_OVERVIEW_ERROR'; payload: string | null }
  | { type: 'SET_ISSUES_LOADING'; payload: boolean }
  | { type: 'SET_ISSUES_DATA'; payload: PaginatedResponse<GovernanceIssueDto> | null }
  | { type: 'SET_ISSUES_ERROR'; payload: string | null }
  | { type: 'SET_SYSTEMS'; payload: KbSystem[] }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_FILTERS'; payload: GovernanceFilters }
  | { type: 'PATCH_FILTERS'; payload: Partial<GovernanceFilters> }
  | { type: 'OPEN_ASSIGN'; payload: GovernanceIssueDto }
  | { type: 'CLOSE_ASSIGN' }
  | { type: 'SET_ASSIGN_FIELD'; payload: Partial<GovernanceState['assign']> }
  | { type: 'OPEN_STATUS'; payload: GovernanceIssueDto }
  | { type: 'CLOSE_STATUS' }
  | { type: 'SET_STATUS_FIELD'; payload: Partial<GovernanceState['status']> }
  | { type: 'SET_ACTION_LOADING'; payload: { id: string; action: string } | null }
  | { type: 'SET_SUGGESTED_LOADING'; payload: boolean }
  | { type: 'SET_SUGGESTED_ERROR'; payload: string | null }
  | { type: 'SET_SUGGESTED'; payload: { assignee: GovernanceResponsible | null; alternatives: GovernanceResponsible[] } }
  | { type: 'SET_SYSTEM_ROWS'; payload: GovernanceOverviewSystemDto[] };

export const createInitialState = (filters: GovernanceFilters): GovernanceState => ({
  overview: null,
  overviewLoading: true,
  overviewError: null,
  issuesData: null,
  issuesLoading: true,
  issuesError: null,
  systems: [],
  page: 1,
  size: config.defaultPageSize,
  filters,
  assign: {
    target: null,
    responsibleType: 'USER',
    responsibleId: '',
    responsibleName: '',
    dueDate: '',
  },
  status: {
    target: null,
    value: 'OPEN',
    ignoredReason: '',
  },
  actionLoading: null,
  suggested: {
    loading: false,
    error: null,
    assignee: null,
    alternatives: [],
  },
  systemRows: [],
});

export function governanceReducer(state: GovernanceState, action: GovernanceAction): GovernanceState {
  switch (action.type) {
    case 'SET_OVERVIEW_LOADING':
      return { ...state, overviewLoading: action.payload };
    case 'SET_OVERVIEW':
      return { ...state, overview: action.payload };
    case 'SET_OVERVIEW_ERROR':
      return { ...state, overviewError: action.payload };
    case 'SET_ISSUES_LOADING':
      return { ...state, issuesLoading: action.payload };
    case 'SET_ISSUES_DATA':
      return { ...state, issuesData: action.payload };
    case 'SET_ISSUES_ERROR':
      return { ...state, issuesError: action.payload };
    case 'SET_SYSTEMS':
      return { ...state, systems: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'PATCH_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'OPEN_ASSIGN':
      return { ...state, assign: { ...state.assign, target: action.payload } };
    case 'CLOSE_ASSIGN':
      return {
        ...state,
        assign: {
          target: null,
          responsibleType: 'USER',
          responsibleId: '',
          responsibleName: '',
          dueDate: '',
        },
        suggested: {
          loading: false,
          error: null,
          assignee: null,
          alternatives: [],
        },
      };
    case 'SET_ASSIGN_FIELD':
      return { ...state, assign: { ...state.assign, ...action.payload } };
    case 'OPEN_STATUS':
      return { ...state, status: { ...state.status, target: action.payload, value: action.payload.status ?? 'OPEN' } };
    case 'CLOSE_STATUS':
      return { ...state, status: { ...state.status, target: null, ignoredReason: '' } };
    case 'SET_STATUS_FIELD':
      return { ...state, status: { ...state.status, ...action.payload } };
    case 'SET_ACTION_LOADING':
      return { ...state, actionLoading: action.payload };
    case 'SET_SUGGESTED_LOADING':
      return { ...state, suggested: { ...state.suggested, loading: action.payload } };
    case 'SET_SUGGESTED_ERROR':
      return { ...state, suggested: { ...state.suggested, error: action.payload } };
    case 'SET_SUGGESTED':
      return {
        ...state,
        suggested: {
          ...state.suggested,
          assignee: action.payload.assignee,
          alternatives: action.payload.alternatives,
        },
      };
    case 'SET_SYSTEM_ROWS':
      return { ...state, systemRows: action.payload };
    default:
      return state;
  }
}
