"use client";

import { FC, useCallback, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useParams } from "next/navigation";
import { TGroupedIssues } from "@plane/types";
// components
import { TOAST_TYPE, setToast } from "@plane/ui";
import { CalendarChart } from "@/components/issues";
//constants
import { EIssuesStoreType, EIssueGroupByToServerOptions } from "@/constants/issue";
import { EUserProjectRoles } from "@/constants/project";
// hooks
import { useIssues, useUser, useCalendarView } from "@/hooks/store";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
// types
import { IQuickActionProps } from "../list/list-view-types";
import { handleDragDrop } from "./utils";

type CalendarStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.MODULE
  | EIssuesStoreType.CYCLE
  | EIssuesStoreType.PROJECT_VIEW;

interface IBaseCalendarRoot {
  QuickActions: FC<IQuickActionProps>;
  addIssuesToView?: (issueIds: string[]) => Promise<any>;
  isCompletedCycle?: boolean;
  viewId?: string | undefined;
}

export const BaseCalendarRoot = observer((props: IBaseCalendarRoot) => {
  const { QuickActions, addIssuesToView, isCompletedCycle = false, viewId } = props;

  // router
  const { workspaceSlug, projectId } = useParams();

  // hooks
  const storeType = useIssueStoreType() as CalendarStoreType;
  const {
    membership: { currentProjectRole },
  } = useUser();
  const { issues, issuesFilter, issueMap } = useIssues(storeType);
  const {
    fetchIssues,
    fetchNextIssues,
    quickAddIssue,
    updateIssue,
    removeIssue,
    removeIssueFromView,
    archiveIssue,
    restoreIssue,
    updateFilters,
  } = useIssuesActions(storeType);

  const issueCalendarView = useCalendarView();

  const isEditingAllowed = !!currentProjectRole && currentProjectRole >= EUserProjectRoles.MEMBER;

  const displayFilters = issuesFilter.issueFilters?.displayFilters;

  const groupedIssueIds = (issues.groupedIssueIds ?? {}) as TGroupedIssues;

  const layout = displayFilters?.calendar?.layout ?? "month";
  const { startDate, endDate } = issueCalendarView.getStartAndEndDate(layout) ?? {};

  useEffect(() => {
    startDate &&
      endDate &&
      layout &&
      fetchIssues(
        "init-loader",
        {
          canGroup: true,
          perPageCount: layout === "month" ? 4 : 30,
          before: endDate,
          after: startDate,
          groupedBy: EIssueGroupByToServerOptions["target_date"],
        },
        viewId
      );
  }, [fetchIssues, storeType, startDate, endDate, layout, viewId]);

  const handleDragAndDrop = async (
    issueId: string | undefined,
    sourceDate: string | undefined,
    destinationDate: string | undefined
  ) => {
    if (!issueId || !destinationDate || !sourceDate) return;

    await handleDragDrop(
      issueId,
      sourceDate,
      destinationDate,
      workspaceSlug?.toString(),
      projectId?.toString(),
      updateIssue
    ).catch((err) => {
      setToast({
        title: "Error!",
        type: TOAST_TYPE.ERROR,
        message: err?.detail ?? "Failed to perform this action",
      });
    });
  };

  const loadMoreIssues = useCallback(
    (dateString: string) => {
      fetchNextIssues(dateString);
    },
    [fetchNextIssues]
  );

  const getPaginationData = useCallback(
    (groupId: string | undefined) => issues?.getPaginationData(groupId, undefined),
    [issues?.getPaginationData]
  );

  const getGroupIssueCount = useCallback(
    (groupId: string | undefined) => issues?.getGroupIssueCount(groupId, undefined, false),
    [issues?.getGroupIssueCount]
  );

  return (
    <>
      <div className="h-full w-full overflow-hidden bg-custom-background-100 pt-4">
        <CalendarChart
          issuesFilterStore={issuesFilter}
          issues={issueMap}
          groupedIssueIds={groupedIssueIds}
          layout={displayFilters?.calendar?.layout}
          showWeekends={displayFilters?.calendar?.show_weekends ?? false}
          issueCalendarView={issueCalendarView}
          quickActions={({ issue, parentRef, customActionButton, placement }) => (
            <QuickActions
              parentRef={parentRef}
              customActionButton={customActionButton}
              issue={issue}
              handleDelete={async () => removeIssue(issue.project_id, issue.id)}
              handleUpdate={async (data) => updateIssue && updateIssue(issue.project_id, issue.id, data)}
              handleRemoveFromView={async () => removeIssueFromView && removeIssueFromView(issue.project_id, issue.id)}
              handleArchive={async () => archiveIssue && archiveIssue(issue.project_id, issue.id)}
              handleRestore={async () => restoreIssue && restoreIssue(issue.project_id, issue.id)}
              readOnly={!isEditingAllowed || isCompletedCycle}
              placements={placement}
            />
          )}
          loadMoreIssues={loadMoreIssues}
          getPaginationData={getPaginationData}
          getGroupIssueCount={getGroupIssueCount}
          addIssuesToView={addIssuesToView}
          quickAddCallback={quickAddIssue}
          readOnly={!isEditingAllowed || isCompletedCycle}
          updateFilters={updateFilters}
          handleDragAndDrop={handleDragAndDrop}
        />
    </div>
    </>
  );
});
