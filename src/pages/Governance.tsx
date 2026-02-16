import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { governanceTexts } from '@/governanceTexts';
import { GovernanceFilters } from '@/features/governance/components/GovernanceFilters';
import { GovernanceMetrics } from '@/features/governance/components/GovernanceMetrics';
import { GovernanceTable } from '@/features/governance/components/GovernanceTable';
import { useGovernance } from '@/features/governance/hooks/useGovernance';

export default function GovernancePage() {
  const {
    state,
    isManager,
    issues,
    totalPages,
    resolvedStatusOptions,
    resolvedTypeOptions,
    resolvedSeverityOptions,
    systemOptions,
    summaryMetrics,
    formatDate,
    getDueDateValue,
    getSlaStatus,
    getOverdueDays,
    getShortSeverityLabel,
    getStatusLabel,
    getPriorityLevel,
    getPriorityClasses,
    generatingReport,
    generateSystemsReport,
    fetchIssues,
    fetchOverview,
    handleStatusChange,
    handleFilterChange,
    handleToggleChange,
    handleCriticalToggle,
    clearFilters,
    setPage,
    openAssign,
    closeAssign,
    openStatus,
    closeStatus,
    setStatusField,
  } = useGovernance();

  const isCriticalOnly = state.filters.severity === 'ERROR';
  const canAssign = isManager;
  const canResolve = isManager;

  const handleStatusSave = () => {
    if (!state.status.target) return;
    handleStatusChange(
      state.status.target,
      state.status.value,
      state.status.value === 'IGNORED' ? state.status.ignoredReason.trim() : undefined
    );
    closeStatus();
  };

  return (
    <MainLayout>
      <PageHeader title={governanceTexts.governance.title} description={governanceTexts.governance.description} />

      <GovernanceFilters
        filters={state.filters}
        isManager={isManager}
        systemOptions={systemOptions}
        resolvedStatusOptions={resolvedStatusOptions}
        resolvedTypeOptions={resolvedTypeOptions}
        resolvedSeverityOptions={resolvedSeverityOptions}
        isCriticalOnly={isCriticalOnly}
        onFilterChange={handleFilterChange}
        onToggleChange={handleToggleChange}
        onCriticalToggle={handleCriticalToggle}
        onClearFilters={clearFilters}
        onRefresh={fetchIssues}
      />

      <GovernanceTable
        issues={issues}
        issuesLoading={state.issuesLoading}
        issuesError={state.issuesError}
        totalPages={totalPages}
        page={state.page}
        canAssign={canAssign}
        canResolve={canResolve}
        actionLoading={state.actionLoading}
        onRefresh={fetchIssues}
        onPageChange={setPage}
        onAssignClick={openAssign}
        onStatusClick={openStatus}
        onClearFilters={clearFilters}
        getDueDateValue={getDueDateValue}
        getSlaStatus={getSlaStatus}
        getOverdueDays={getOverdueDays}
        getShortSeverityLabel={getShortSeverityLabel}
        getStatusLabel={getStatusLabel}
        getPriorityLevel={getPriorityLevel}
        getPriorityClasses={getPriorityClasses}
        formatDate={formatDate}
        assignState={state.assign}
        statusState={state.status}
        onStatusFieldChange={setStatusField}
        onAssignClose={closeAssign}
        onStatusSave={handleStatusSave}
        onStatusClose={closeStatus}
      />

      <GovernanceMetrics
        overviewLoading={state.overviewLoading}
        overviewError={state.overviewError}
        summaryMetrics={summaryMetrics}
        systemRows={state.systemRows}
        onRetryOverview={fetchOverview}
        onSystemClick={(systemCode) => handleFilterChange('systemCode', systemCode)}
        onGenerateReport={generateSystemsReport}
        generatingReport={generatingReport}
      />
    </MainLayout>
  );
}
