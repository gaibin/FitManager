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
    Sets: w.sets,
    Reps: w.reps,
    Total_Volume: w.weight * w.sets * w.reps
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