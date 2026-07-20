/**
 * 训练记录管理 hook — 负责训练的增删改查
 */

import React, { useState, useCallback } from 'react';
import type { Workout, PostureAssessment } from '../types';

interface UseWorkoutsOptions {
  db: {
    addWorkouts: (memberId: string, workouts: Omit<Workout, 'id'>[]) => Promise<Workout[]>;
    updateWorkout: (memberId: string, workout: Workout) => Promise<void>;
    deleteWorkout: (memberId: string, workoutId: string) => Promise<void>;
    updateMemberPhoto: (memberId: string, photoUrl: string) => Promise<void>;
    saveAssessment: (memberId: string, assessment: PostureAssessment) => Promise<void>;
  };
  selectedMemberId: string | null;
  setMembers: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useWorkouts({ db, selectedMemberId, setMembers }: UseWorkoutsOptions) {
  const [editingSession, setEditingSession] = useState<{ date: string; workouts: Workout[] } | null>(null);

  const handleSaveSession = useCallback(async (
    workoutsData: (Omit<Workout, 'id'> & { id?: string })[],
    mode: 'add' | 'edit'
  ) => {
    if (!selectedMemberId) return;
    try {
      if (mode === 'edit' && editingSession) {
        setMembers(prev => {
          const member = prev.find(m => m.id === selectedMemberId);
          const originalWorkoutsOnDate = member?.workouts.filter((w: Workout) => w.date === editingSession.date) || [];

          // 异步操作不能在 setState 回调里做，这里用闭包捕获
          (async () => {
            for (const ow of originalWorkoutsOnDate) {
              await db.deleteWorkout(selectedMemberId, ow.id);
            }
            const workoutsToInsert = workoutsData.map(({
              date, exercise, weight, sets, reps, durationSeconds, rpe, completed, note, bodyWeightKg,
            }) => ({
              date, exercise, weight, sets, reps, durationSeconds, rpe, completed, note, bodyWeightKg,
            }));
            const newWorkouts = await db.addWorkouts(selectedMemberId, workoutsToInsert);
            setMembers(p => p.map((m: any) => {
              if (m.id === selectedMemberId) {
                const filtered = m.workouts.filter((w: Workout) => w.date !== editingSession.date);
                return { ...m, workouts: [...filtered, ...newWorkouts].sort((a: Workout, b: Workout) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                )};
              }
              return m;
            }));
          })();

          return prev;
        });
        setEditingSession(null);
      } else {
        const newWorkouts = await db.addWorkouts(selectedMemberId, workoutsData as Omit<Workout, 'id'>[]);
        setMembers(prev => prev.map(m => {
          if (m.id === selectedMemberId) {
            return { ...m, workouts: [...m.workouts, ...newWorkouts].sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            )};
          }
          return m;
        }));
      }
    } catch (error) {
      console.error("Failed to save workouts", error);
    }
  }, [db, selectedMemberId, editingSession, setMembers]);

  const handleUpdateWorkout = useCallback(async (workout: Workout) => {
    if (!selectedMemberId) return;
    await db.updateWorkout(selectedMemberId, workout);
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMemberId) {
        return { ...m, workouts: m.workouts.map(w => w.id === workout.id ? workout : w) };
      }
      return m;
    }));
  }, [db, selectedMemberId, setMembers]);

  const handleDeleteWorkout = useCallback(async (workoutId: string) => {
    if (!selectedMemberId) return;
    await db.deleteWorkout(selectedMemberId, workoutId);
    setMembers(prev => prev.map(m => {
      if (m.id === selectedMemberId) {
        return { ...m, workouts: m.workouts.filter(w => w.id !== workoutId) };
      }
      return m;
    }));
  }, [db, selectedMemberId, setMembers]);

  const handleUploadPhoto = useCallback(async (base64: string) => {
    if (!selectedMemberId) return;
    await db.updateMemberPhoto(selectedMemberId, base64);
    setMembers(prev => prev.map(m => m.id === selectedMemberId ? { ...m, photoUrl: base64 } : m));
  }, [db, selectedMemberId, setMembers]);

  const handleSaveAssessment = useCallback(async (memberId: string, assessment: PostureAssessment) => {
    await db.saveAssessment(memberId, assessment);
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const existingIdx = m.assessments.findIndex((a: PostureAssessment) => a.id === assessment.id || a.date === assessment.date);
        const updated = [...m.assessments];
        if (existingIdx >= 0) {
          updated[existingIdx] = assessment;
        } else {
          updated.unshift(assessment);
        }
        updated.sort((a, b) => b.date.localeCompare(a.date));
        return { ...m, assessments: updated };
      }
      return m;
    }));
  }, [db, setMembers]);

  return {
    editingSession,
    setEditingSession,
    handleSaveSession,
    handleUpdateWorkout,
    handleDeleteWorkout,
    handleUploadPhoto,
    handleSaveAssessment,
  };
}
