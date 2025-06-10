import { useQuery } from "@tanstack/react-query";

export interface HoursByEmployeeData {
  employee: string;
  hours: number;
}

export interface ProjectsPerEmployeeData {
  employee: string;
  projects: number;
}

export interface SalesData {
  month: string;
  total: number;
}

export interface ScheduleLoadData {
  date: string;
  installations: number;
  surveys: number;
}

export interface EmployeePerformanceData {
  employee: string;
  projects_managed: number;
  total_hours: number;
  timesheet_entries: number;
}

export function useHoursByEmployee(dateRange: { start: string; end: string }) {
  return useQuery<HoursByEmployeeData[]>({
    queryKey: ["reports", "hoursByEmployee", dateRange],
    queryFn: () =>
      fetch(`/api/reports/hours-by-employee?start=${dateRange.start}&end=${dateRange.end}`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProjectsPerEmployee(status: string = 'active') {
  return useQuery<ProjectsPerEmployeeData[]>({
    queryKey: ["reports", "projectsPerEmployee", status],
    queryFn: () =>
      fetch(`/api/reports/projects-per-employee?status=${status}`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesData(year: number = new Date().getFullYear()) {
  return useQuery<SalesData[]>({
    queryKey: ["reports", "sales", year],
    queryFn: () =>
      fetch(`/api/reports/sales?year=${year}`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduleLoad(dateRange: { start: string; end: string }) {
  return useQuery<ScheduleLoadData[]>({
    queryKey: ["reports", "scheduleLoad", dateRange],
    queryFn: () =>
      fetch(`/api/reports/schedule-load?start=${dateRange.start}&end=${dateRange.end}`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeePerformance() {
  return useQuery<EmployeePerformanceData[]>({
    queryKey: ["reports", "employeePerformance"],
    queryFn: () =>
      fetch(`/api/reports/employee-performance`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurveysReport(period: string = 'year') {
  return useQuery({
    queryKey: ["reports", "surveys", period],
    queryFn: () =>
      fetch(`/api/surveys`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstallationsReport(period: string = 'year') {
  return useQuery({
    queryKey: ["reports", "installations", period],
    queryFn: () =>
      fetch(`/api/installations`)
        .then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}