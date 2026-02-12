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
    formatInputDate,
    getDueDateValue,
    getSlaStatus,
    getOverdueDays,
    getShortSeverityLabel,
    getStatusLabel,
    getPriorityLevel,
    getPriorityClasses,
    generatingReport,
    generateSystemsReport,
    responsibleOptions,
    responsiblesWarning,
    fetchIssues,
    fetchOverview,
    handleAssign,
    handleStatusChange,
    handleFilterChange,
    handleToggleChange,
    handleCriticalToggle,
    clearFilters,
    setPage,
    openAssign,
    closeAssign,
    setAssignField,
    searchResponsibles,
    openStatus,
    closeStatus,
    setStatusField,
  } = useGovernance();

  const isCriticalOnly = state.filters.severity === 'ERROR';
  const canAssign = isManager;
  const canResolve = isManager;

  const handleAssignSave = (options: { createTicket?: boolean }) => {
    if (!state.assign.target) return;

    const responsibleId = state.assign.responsibleId.trim();
    const responsibleName = state.assign.value.trim() || state.assign.responsibleId.trim();

    if (!responsibleId) return;

    handleAssign(state.assign.target, {
      dueDate: state.assign.dueDate || undefined,
      createTicket: options.createTicket ?? false,
      responsibleType: state.assign.responsibleType,
      responsibleId,
      responsibleName,
    });
    closeAssign();
  };

  const handleAssignSuggestion = () => {
    if (!state.assign.target || !state.suggested.assignee) return;
    const suggested = state.suggested.assignee;
    const responsibleId = suggested.id ?? suggested.name;
    handleAssign(state.assign.target, {
      dueDate: state.assign.dueDate || undefined,
      responsibleType: state.assign.responsibleType,
      responsibleId,
      responsibleName: suggested.name,
    });
    closeAssign();
  };

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
        onRefresh={() => fetchIssues(state.filters, state.page)}
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

      <GovernanceTable
        issues={issues}
        issuesLoading={state.issuesLoading}
        issuesError={state.issuesError}
        totalPages={totalPages}
        page={state.page}
        canAssign={canAssign}
        canResolve={canResolve}
        actionLoading={state.actionLoading}
        onRefresh={() => fetchIssues(state.filters, state.page)}
        onPageChange={setPage}
        onAssignClick={openAssign}
        onStatusClick={openStatus}
        getDueDateValue={getDueDateValue}
        getSlaStatus={getSlaStatus}
        getOverdueDays={getOverdueDays}
        getShortSeverityLabel={getShortSeverityLabel}
        getStatusLabel={getStatusLabel}
        getPriorityLevel={getPriorityLevel}
        getPriorityClasses={getPriorityClasses}
        formatDate={formatDate}
        formatInputDate={formatInputDate}
        assignState={state.assign}
        statusState={state.status}
        suggested={state.suggested}
        responsibleOptions={responsibleOptions}
        responsiblesWarning={responsiblesWarning}
        onAssignFieldChange={setAssignField}
        onSearchResponsible={searchResponsibles}
        onStatusFieldChange={setStatusField}
        onAssignSave={handleAssignSave}
        onAssignSuggestion={handleAssignSuggestion}
        onAssignClose={closeAssign}
        onStatusSave={handleStatusSave}
        onStatusClose={closeStatus}
      />
    </MainLayout>
  );
}
