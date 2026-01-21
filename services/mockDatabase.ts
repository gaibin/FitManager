import { Member, Workout } from '../types';
import { INITIAL_MEMBERS } from '../constants';

class MockDatabase {
  private members: Member[] = [...INITIAL_MEMBERS];

  // --- Members ---
  async getMembers(): Promise<Member[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.members), 300));
  }

  async addMember(name: string): Promise<Member> {
    return new Promise((resolve) => {
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
        joinDate: new Date().toISOString().split('T')[0],
        workouts: [],
      };
      this.members.push(newMember);
      resolve(newMember);
    });
  }

  async deleteMember(id: string): Promise<void> {
    return new Promise((resolve) => {
      this.members = this.members.filter(m => m.id !== id);
      resolve();
    });
  }

  async updateMemberPhoto(memberId: string, photoUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const member = this.members.find(m => m.id === memberId);
      if (member) member.photoUrl = photoUrl;
      resolve();
    });
  }

  // --- Workouts ---
  async addWorkouts(memberId: string, workouts: Omit<Workout, 'id'>[]): Promise<Workout[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const memberIndex = this.members.findIndex((m) => m.id === memberId);
        if (memberIndex === -1) {
          reject(new Error("Member not found"));
          return;
        }

        const newWorkouts = workouts.map(w => ({
          ...w,
          id: Math.random().toString(36).substring(7),
        }));

        const updatedMember = {
          ...this.members[memberIndex],
          workouts: [...this.members[memberIndex].workouts, ...newWorkouts],
        };

        this.members[memberIndex] = updatedMember;
        resolve(newWorkouts);
      }, 300);
    });
  }

  async updateWorkout(memberId: string, workout: Workout): Promise<void> {
    return new Promise((resolve) => {
      const member = this.members.find(m => m.id === memberId);
      if (member) {
        member.workouts = member.workouts.map(w => w.id === workout.id ? workout : w);
      }
      resolve();
    });
  }

  async deleteWorkout(memberId: string, workoutId: string): Promise<void> {
    return new Promise((resolve) => {
      const member = this.members.find(m => m.id === memberId);
      if (member) {
        member.workouts = member.workouts.filter(w => w.id !== workoutId);
      }
      resolve();
    });
  }
}

export const db = new MockDatabase();