export interface Shift {
  id: number;
  employee_id: number;
  employee_name: string;
  title: string;
  start: string;
  end: string;
  start_time?: string;
  end_time?: string;
  status: string;
  is_late: boolean;
  location?: string;
  description?: string;
  department?: string;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  status: string;
  department?: string;
}

export interface EmployeeSchedule {
  employee_id: number;
  employee_name: string;
  position: string;
  status: string;
  department?: string;
  shifts: {
    [key: string]: Shift[];  // Always array of shifts
  };
}

export interface BulkShift {
  employee_id: number;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  department?: string;
  date: string;
}

export interface Template {
  title: string;
  start_time: string;
  end_time: string;
  days_of_week: string;
  department: string;
}

export interface NewShift {
  employee_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  department: string;
  date: string;
}