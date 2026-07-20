import * as XLSX from 'xlsx';
import { Member } from '../types';

export const exportMemberHistory = (member: Member) => {
  if (!member.workouts || member.workouts.length === 0) {
    alert("No workout data to export.");
    return;
  }

  // Format data for Excel
  const data = member.workouts.map(w => ({
    Date: w.date,
    Exercise: w.exercise,
    Weight_KG: w.weight,
    Body_Weight_KG: w.bodyWeightKg ?? '',
    Sets: w.sets,
    Reps: w.reps,
    Duration_Seconds: w.durationSeconds ?? '',
    RPE: w.rpe ?? '',
    Completed: w.completed !== false ? 'Yes' : 'No',
    Note: w.note ?? '',
    Total_Volume: w.completed !== false ? w.weight * w.sets * w.reps : 0,
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Training History");

  // Generate file name
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${member.name.replace(/\s+/g, '_')}_History_${dateStr}.xlsx`;

  // Download
  XLSX.writeFile(workbook, fileName);
};
